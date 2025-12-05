import type {
  InstantUploadConfig,
  InstantUploadProgress,
  UploadedPart,
} from "../../types/instantUpload";
import { DEFAULT_RETRY_CONFIG, exponentialBackoff } from "./retryUtils";
import { addUploadedPart, saveUploadState } from "./uploadStateManager";

const MIN_PART_SIZE_BYTES = 5 * 1024 * 1024;
const DEFAULT_MIME_TYPE = "video/webm";

export class InstantUploader {
  private readonly videoId: string;
  public readonly uploadId: string;
  public readonly key: string;
  private readonly apiBaseUrl: string;
  private readonly authToken: string;
  private readonly mimeType: string;
  private readonly config: InstantUploadConfig;
  private readonly onProgress: (progress: InstantUploadProgress) => void;

  private bufferedChunks: Blob[] = [];
  private bufferedBytes: number = 0;
  private uploadedBytes: number = 0;
  private totalRecordedBytes: number = 0;
  private parts: UploadedPart[] = [];
  private nextPartNumber: number = 1;
  private uploadPromise: Promise<void> = Promise.resolve();
  private finished: boolean = false;
  private lastProgressUpdate: number = 0;
  private failedParts: Map<number, { part: Blob; attempts: number }> =
    new Map();

  constructor(options: {
    videoId: string;
    uploadId: string;
    key: string;
    apiBaseUrl: string;
    authToken: string;
    mimeType: string;
    config: InstantUploadConfig;
    onProgress: (progress: InstantUploadProgress) => void;
  }) {
    this.videoId = options.videoId;
    this.uploadId = options.uploadId;
    this.key = options.key;
    this.apiBaseUrl = options.apiBaseUrl;
    this.authToken = options.authToken;
    this.mimeType = options.mimeType || DEFAULT_MIME_TYPE;
    this.config = options.config;
    this.onProgress = options.onProgress;
  }

  public handleChunk(blob: Blob, totalRecordedBytes: number): void {
    if (this.finished || blob.size === 0) return;

    this.totalRecordedBytes = totalRecordedBytes;
    this.bufferedChunks.push(blob);
    this.bufferedBytes += blob.size;

    console.log(
      `[InstantUploader] Buffering: ${(this.bufferedBytes / 1024 / 1024).toFixed(2)}MB / ${(MIN_PART_SIZE_BYTES / 1024 / 1024).toFixed(2)}MB`,
    );

    if (this.bufferedBytes >= MIN_PART_SIZE_BYTES) {
      console.log(
        `[InstantUploader] Buffer full, flushing part ${this.nextPartNumber}`,
      );
      this.flushBuffer();
    }
  }

  private flushBuffer(force: boolean = false): void {
    if (this.bufferedBytes === 0) return;
    if (!force && this.bufferedBytes < MIN_PART_SIZE_BYTES) return;

    const chunk = new Blob(this.bufferedChunks, { type: this.mimeType });
    this.bufferedChunks = [];
    this.bufferedBytes = 0;

    this.enqueueUpload(chunk);
  }

  private enqueueUpload(part: Blob): void {
    const partNumber = this.nextPartNumber++;

    this.uploadPromise = this.uploadPromise
      .then(() => this.uploadPart(partNumber, part))
      .catch((error) => {
        console.error(
          `[InstantUploader] Failed to upload part ${partNumber}:`,
          {
            partNumber,
            partSize: part.size,
            error: error.message || error,
          },
        );
        throw error;
      });
  }

  private async uploadPart(partNumber: number, part: Blob): Promise<void> {
    console.log(
      `[InstantUploader] Uploading part ${partNumber}, size: ${(part.size / 1024 / 1024).toFixed(2)}MB`,
    );

    try {
      // part-url取得（リトライ付き）
      const uploadUrl = await exponentialBackoff(
        async () => {
          const response = await fetch(
            `${this.apiBaseUrl}/api/s3/multipart/part-url`,
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${this.authToken}`,
              },
              body: JSON.stringify({
                uploadId: this.uploadId,
                key: this.key,
                partNumber: partNumber,
              }),
            },
          );

          if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            type ErrorWithStatus = Error & { status?: number };
            const error: ErrorWithStatus = new Error(
              `Failed to get presigned URL: ${errorData.error || response.statusText}`,
            );
            error.status = response.status;
            throw error;
          }

          const { uploadUrl } = await response.json();
          return uploadUrl;
        },
        DEFAULT_RETRY_CONFIG.partUrl,
        `part-url for part ${partNumber}`,
      );

      // S3へのアップロード（リトライ付き）
      const etag = await this.uploadBlobWithProgressRetry({
        url: uploadUrl,
        partNumber,
        part,
      });

      this.parts.push({
        partNumber,
        etag,
        size: part.size,
        uploadedAt: Date.now(),
      });
      this.uploadedBytes += part.size;

      // Chrome Storageに保存
      await addUploadedPart({
        partNumber,
        etag,
        size: part.size,
        uploadedAt: Date.now(),
      });

      console.log(
        `[InstantUploader] ✅ Part ${partNumber} uploaded successfully, ETag: ${etag.substring(0, 8)}...`,
      );
      this.emitProgress();

      // 失敗キューから削除
      this.failedParts.delete(partNumber);
    } catch (error) {
      console.error(
        `[InstantUploader] ❌ Failed to upload part ${partNumber} after retries:`,
        error,
      );

      // 失敗したパートをキューに追加
      const attempts = this.failedParts.get(partNumber)?.attempts || 0;
      this.failedParts.set(partNumber, { part, attempts: attempts + 1 });

      // ★重要: エラーをthrowしない（uploadPromiseチェーンを切らない）
      // 録画終了時に再試行する
    }
  }

  /**
   * S3へのアップロード（リトライ付き）
   */
  private async uploadBlobWithProgressRetry({
    url,
    partNumber,
    part,
  }: {
    url: string;
    partNumber: number;
    part: Blob;
  }): Promise<string> {
    return await exponentialBackoff(
      async () => {
        try {
          return await this.uploadBlobWithProgress({ url, partNumber, part });
        } catch (error) {
          // 403エラー（署名URL期限切れ）の場合、part-urlを再取得
          if (error instanceof Error && error.message.includes("403")) {
            console.warn(
              `[InstantUploader] Part ${partNumber} - Presigned URL expired, getting new URL...`,
            );

            const response = await fetch(
              `${this.apiBaseUrl}/api/s3/multipart/part-url`,
              {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  Authorization: `Bearer ${this.authToken}`,
                },
                body: JSON.stringify({
                  uploadId: this.uploadId,
                  key: this.key,
                  partNumber: partNumber,
                }),
              },
            );

            if (!response.ok) {
              throw new Error(
                `Failed to refresh presigned URL: ${response.statusText}`,
              );
            }

            const { uploadUrl: newUrl } = await response.json();

            // 新しいURLで再試行
            return await this.uploadBlobWithProgress({
              url: newUrl,
              partNumber,
              part,
            });
          }

          throw error;
        }
      },
      DEFAULT_RETRY_CONFIG.s3Put,
      `S3 PUT for part ${partNumber}`,
    );
  }

  private uploadBlobWithProgress({
    url,
    partNumber,
    part,
  }: {
    url: string;
    partNumber: number;
    part: Blob;
  }): Promise<string> {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open("PUT", url);
      xhr.responseType = "text";
      xhr.timeout = 60000; // 60 seconds

      if (this.mimeType) {
        xhr.setRequestHeader("Content-Type", this.mimeType);
      }

      xhr.upload.onprogress = (event) => {
        const uploaded = event.lengthComputable
          ? event.loaded
          : Math.min(part.size, event.loaded);
        const total = event.lengthComputable ? event.total : part.size;
        const ratio = total > 0 ? Math.min(1, uploaded / total) : 0;

        const now = Date.now();
        if (
          now - this.lastProgressUpdate >= this.config.progressThrottleMs ||
          ratio === 1
        ) {
          this.lastProgressUpdate = now;
        }
      };

      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          const etagHeader = xhr.getResponseHeader("ETag");
          const etag = etagHeader?.replace(/"/g, "");

          if (!etag) {
            reject(new Error(`Missing ETag for part ${partNumber}`));
            return;
          }

          resolve(etag);
          return;
        }

        reject(
          new Error(
            `Failed to upload part ${partNumber}: ${xhr.status} ${xhr.statusText}`,
          ),
        );
      };

      xhr.onerror = () => {
        reject(new Error(`Failed to upload part ${partNumber}: network error`));
      };

      xhr.ontimeout = () => {
        reject(new Error(`Upload timeout for part ${partNumber}`));
      };

      xhr.send(part);
    });
  }

  private emitProgress(): void {
    const now = Date.now();
    if (now - this.lastProgressUpdate < this.config.progressThrottleMs) {
      return;
    }

    this.lastProgressUpdate = now;

    const totalBytes = Math.max(this.totalRecordedBytes, this.uploadedBytes);
    const percentage =
      totalBytes > 0 ? (this.uploadedBytes / totalBytes) * 100 : 0;

    const estimatedTotalParts = Math.ceil(totalBytes / this.config.minPartSize);

    this.onProgress({
      uploadedBytes: this.uploadedBytes,
      totalBytes: totalBytes,
      percentage: Math.min(100, percentage),
      currentPart: this.parts.length,
      totalParts: Math.max(estimatedTotalParts, this.parts.length),
      isComplete: false,
    });
  }

  public async finalize(): Promise<
    { key: string; location: string } | undefined
  > {
    if (this.finished) return;

    // Flush any remaining buffered data as the final part
    if (this.bufferedBytes > 0) {
      console.log(
        `[InstantUploader] Flushing final part: ${(this.bufferedBytes / 1024 / 1024).toFixed(2)}MB`,
      );
      this.flushBuffer(true);
    }

    // Wait for all uploads (including the final part) to complete
    await this.uploadPromise;

    // ★追加: 失敗したパートを再試行
    if (this.failedParts.size > 0) {
      console.warn(
        `[InstantUploader] ${this.failedParts.size} parts failed during recording, retrying...`,
      );
      await this.retryFailedParts();
    }

    // ★追加: 再試行後も失敗したパートがある場合はエラー
    if (this.failedParts.size > 0) {
      console.error(
        `[InstantUploader] ${this.failedParts.size} parts still failed after retry`,
      );
      throw new Error(
        `Failed to upload ${this.failedParts.size} parts. Please try again.`,
      );
    }

    if (this.parts.length === 0) {
      console.warn("[InstantUploader] No parts uploaded, skipping completion");
      this.finished = true;
      return;
    }

    console.log(
      `[InstantUploader] Completing multipart upload with ${this.parts.length} parts`,
    );

    // complete実行（リトライ付き）
    const result = await exponentialBackoff(
      async () => {
        const response = await fetch(
          `${this.apiBaseUrl}/api/s3/multipart/complete`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${this.authToken}`,
            },
            body: JSON.stringify({
              uploadId: this.uploadId,
              key: this.key,
              parts: this.parts.map((p) => ({
                PartNumber: p.partNumber,
                ETag: p.etag,
              })),
            }),
          },
        );

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          type ErrorWithStatus = Error & { status?: number };
          const error: ErrorWithStatus = new Error(
            `Failed to complete multipart upload: ${errorData.error || response.statusText}`,
          );
          error.status = response.status;
          throw error;
        }

        return await response.json();
      },
      DEFAULT_RETRY_CONFIG.complete,
      "complete multipart upload",
    );

    this.finished = true;

    console.log(
      `[InstantUploader] ✅ Multipart upload completed successfully`,
      {
        location: result.location,
        key: result.key,
        etag: result.etag,
        totalParts: this.parts.length,
        totalBytes: this.uploadedBytes,
      },
    );

    this.onProgress({
      uploadedBytes: this.uploadedBytes,
      totalBytes: this.uploadedBytes,
      percentage: 100,
      currentPart: this.parts.length,
      totalParts: this.parts.length,
      isComplete: true,
    });

    // Chrome Storageの状態を更新
    await saveUploadState({
      status: "completed",
      result: {
        location: result.location,
        key: result.key,
        etag: result.etag,
      },
    });

    return {
      key: result.key,
      location: result.location,
    };
  }

  public async cancel(): Promise<void> {
    if (this.finished) return;

    this.finished = true;
    this.bufferedChunks = [];
    this.bufferedBytes = 0;

    try {
      await fetch(`${this.apiBaseUrl}/api/s3/multipart/abort`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.authToken}`,
        },
        body: JSON.stringify({
          uploadId: this.uploadId,
          key: this.key,
        }),
      });
    } catch (error) {
      console.error("Failed to abort multipart upload", error);
    }

    await this.uploadPromise.catch(() => {});
  }

  /**
   * 失敗したパートを再試行
   */
  public async retryFailedParts(): Promise<void> {
    if (this.failedParts.size === 0) {
      console.log("[InstantUploader] No failed parts to retry");
      return;
    }

    console.log(
      `[InstantUploader] Retrying ${this.failedParts.size} failed parts...`,
    );

    const failedPartsArray = Array.from(this.failedParts.entries());

    for (const [partNumber, { part, attempts }] of failedPartsArray) {
      if (attempts >= 10) {
        console.error(
          `[InstantUploader] Part ${partNumber} exceeded max retry attempts (10)`,
        );
        continue;
      }

      console.log(
        `[InstantUploader] Retrying part ${partNumber} (attempt ${attempts + 1})...`,
      );
      await this.uploadPart(partNumber, part);
    }
  }

  /**
   * 失敗したパートの数を取得
   */
  public getFailedPartsCount(): number {
    return this.failedParts.size;
  }
}

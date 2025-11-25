import type {
  InstantUploadConfig,
  InstantUploadProgress,
  UploadedPart,
} from "../../types/instantUpload";

const MIN_PART_SIZE_BYTES = 5 * 1024 * 1024;
const DEFAULT_MIME_TYPE = "video/webm";

export class InstantUploader {
  private readonly videoId: string;
  private readonly uploadId: string;
  private readonly key: string;
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

    console.log(`[InstantUploader] Buffering: ${(this.bufferedBytes / 1024 / 1024).toFixed(2)}MB / ${(MIN_PART_SIZE_BYTES / 1024 / 1024).toFixed(2)}MB`);

    if (this.bufferedBytes >= MIN_PART_SIZE_BYTES) {
      console.log(`[InstantUploader] Buffer full, flushing part ${this.nextPartNumber}`);
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
        console.error(`[InstantUploader] Failed to upload part ${partNumber}:`, {
          partNumber,
          partSize: part.size,
          error: error.message || error,
        });
        throw error;
      });
  }

  private async uploadPart(partNumber: number, part: Blob): Promise<void> {
    console.log(`[InstantUploader] Uploading part ${partNumber}, size: ${(part.size / 1024 / 1024).toFixed(2)}MB`);

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
      }
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const errorType = response.status >= 500 ? "Server error" : "Client error";
      const errorMessage = `Failed to get presigned URL (${errorType} ${response.status}): ${errorData.error || response.statusText}`;
      console.error(`[InstantUploader] ${errorMessage}`, { partNumber, errorData });
      throw new Error(errorMessage);
    }

    const { uploadUrl } = await response.json();

    const etag = await this.uploadBlobWithProgress({
      url: uploadUrl,
      partNumber,
      part,
    });

    this.parts.push({ partNumber, etag, size: part.size });
    this.uploadedBytes += part.size;
    console.log(`[InstantUploader] ✅ Part ${partNumber} uploaded successfully, ETag: ${etag.substring(0, 8)}...`);
    this.emitProgress();
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
            `Failed to upload part ${partNumber}: ${xhr.status} ${xhr.statusText}`
          )
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

    const estimatedTotalParts = Math.ceil(
      totalBytes / this.config.minPartSize
    );

    this.onProgress({
      uploadedBytes: this.uploadedBytes,
      totalBytes: totalBytes,
      percentage: Math.min(100, percentage),
      currentPart: this.parts.length,
      totalParts: Math.max(estimatedTotalParts, this.parts.length),
      isComplete: false,
    });
  }

  public async finalize(): Promise<void> {
    if (this.finished) return;

    // Flush any remaining buffered data as the final part
    if (this.bufferedBytes > 0) {
      console.log(`[InstantUploader] Flushing final part: ${(this.bufferedBytes / 1024 / 1024).toFixed(2)}MB`);
      this.flushBuffer(true);
    }

    // Wait for all uploads (including the final part) to complete
    await this.uploadPromise;

    if (this.parts.length === 0) {
      console.warn("[InstantUploader] No parts uploaded, skipping completion");
      this.finished = true;
      return;
    }

    console.log(`[InstantUploader] Completing multipart upload with ${this.parts.length} parts`);

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
      }
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const errorType = response.status >= 500 ? "Server error" : "Client error";
      const errorMessage = `Failed to complete multipart upload (${errorType} ${response.status}): ${errorData.error || response.statusText}`;
      console.error(`[InstantUploader] ${errorMessage}`, {
        videoId: this.videoId,
        uploadId: this.uploadId,
        partsCount: this.parts.length,
        errorData,
      });
      throw new Error(errorMessage);
    }

    const result = await response.json();
    this.finished = true;

    console.log(`[InstantUploader] ✅ Multipart upload completed successfully`, {
      location: result.location,
      key: result.key,
      etag: result.etag,
      totalParts: this.parts.length,
      totalBytes: this.uploadedBytes,
    });

    this.onProgress({
      uploadedBytes: this.uploadedBytes,
      totalBytes: this.uploadedBytes,
      percentage: 100,
      currentPart: this.parts.length,
      totalParts: this.parts.length,
      isComplete: true,
    });
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
}

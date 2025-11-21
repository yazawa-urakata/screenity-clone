/**
 * MultipartUploader - Handles TRUE S3 multipart upload using AWS API
 *
 * This class implements the correct 3-step AWS S3 multipart upload process:
 * 1. Initiate multipart upload (get UploadId)
 * 2. Upload each part (get ETags)
 * 3. Complete multipart upload (assemble all parts)
 *
 * Memory efficient: generates blob slices on-demand and cleans up immediately after upload.
 */

import type {
  MultipartCompleteResponse,
  MultipartInitiateResponse,
  MultipartPartUrlResponse,
  MultipartUploadConfig,
  MultipartUploadPart,
  UploadProgress,
} from "../types/s3Upload";

export class MultipartUploader {
  private blob: Blob;
  private apiBaseUrl: string;
  private authToken: string;
  private fileName: string;
  private uploadPath: string;
  private config: MultipartUploadConfig;
  private onProgress: (progress: UploadProgress) => void;
  private abortController: AbortController;
  private uploadedBytes: number = 0;
  private startTime: number = 0;
  private totalParts: number = 0;

  // プログレス更新のスロットリング用
  private lastProgressUpdate: number = 0;
  private readonly PROGRESS_THROTTLE_MS = 200; // 200ms間隔（1秒に最大5回）

  // Multipart upload state
  private uploadId: string | null = null;
  private s3Key: string | null = null;
  private uploadedParts: MultipartUploadPart[] = [];

  /**
   * Normalize MIME type by removing codec information
   * e.g., "video/webm; codecs=vp8, opus" -> "video/webm"
   */
  private getNormalizedMimeType(mimeType: string): string {
    return mimeType.split(";")[0].trim();
  }

  /**
   * Creates a new MultipartUploader instance
   * @param blob - The file blob to upload
   * @param apiBaseUrl - Base URL of the API server (e.g., "https://example.com")
   * @param authToken - JWT auth token for API requests
   * @param fileName - Name of the file
   * @param uploadPath - S3 directory path (e.g., "recordings")
   * @param config - Upload configuration (part size, queue size, retry settings)
   * @param onProgress - Callback for progress updates
   */
  constructor(
    blob: Blob,
    apiBaseUrl: string,
    authToken: string,
    fileName: string,
    uploadPath: string,
    config: MultipartUploadConfig,
    onProgress: (progress: UploadProgress) => void
  ) {
    this.blob = blob;
    this.apiBaseUrl = apiBaseUrl;
    this.authToken = authToken;
    this.fileName = fileName;
    this.uploadPath = uploadPath;
    this.config = config;
    this.onProgress = onProgress;
    this.abortController = new AbortController();
  }

  /**
   * Main upload method - orchestrates the entire multipart upload process
   * @returns Promise that resolves with the S3 key when upload is complete
   * @throws Error if upload fails after all retries
   */
  async upload(): Promise<string> {
    this.startTime = Date.now();
    const fileSize = this.blob.size;
    this.totalParts = Math.ceil(fileSize / this.config.partSize);

    try {
      // Step 1: Initiate multipart upload
      await this.initiateMultipartUpload();

      // Step 2: Upload all parts
      if (fileSize <= this.config.partSize) {
        // Single part upload
        await this.uploadSinglePart(this.blob, 1);
      } else {
        // Multiple parts upload
        await this.uploadPartsInParallel(fileSize);
      }

      // Step 3: Complete multipart upload
      await this.completeMultipartUpload();

      // Return the S3 key
      if (!this.s3Key) {
        throw new Error("S3 key not available after upload completion");
      }
      return this.s3Key;
    } catch (error) {
      // Abort multipart upload on error
      if (this.uploadId && this.s3Key) {
        try {
          await this.abortMultipartUpload();
        } catch (abortError) {
          console.error("Failed to abort multipart upload:", abortError);
        }
      }
      throw error;
    }
  }

  /**
   * Step 1: Initiate multipart upload and get UploadId
   */
  private async initiateMultipartUpload(): Promise<void> {
    const response = await fetch(`${this.apiBaseUrl}/api/s3/multipart/initiate`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.authToken}`,
      },
      body: JSON.stringify({
        fileName: this.fileName,
        fileType: this.getNormalizedMimeType(this.blob.type),
        fileSize: this.blob.size,
        uploadPath: this.uploadPath,
        partSize: this.config.partSize, // 動的partSizeを送信
      }),
      signal: this.abortController.signal,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(`Failed to initiate multipart upload: ${errorData.error || response.statusText}`);
    }

    const data: MultipartInitiateResponse = await response.json();
    this.uploadId = data.uploadId;
    this.s3Key = data.key;
    this.totalParts = data.totalParts;
  }

  /**
   * Step 2: Upload parts in parallel with queue control
   * Memory-efficient: generates blob slices on-demand and cleans up immediately after upload
   * @param fileSize - Total file size in bytes
   */
  private async uploadPartsInParallel(fileSize: number): Promise<void> {
    const activeTasks = new Map<number, Promise<void>>();
    let partIndex = 0;

    while (partIndex < this.totalParts || activeTasks.size > 0) {
      // Fill queue up to queueSize
      while (activeTasks.size < this.config.queueSize && partIndex < this.totalParts) {
        const currentPartIndex = partIndex;
        const partNumber = currentPartIndex + 1;

        // Generate blob slice on-demand (not pre-generated)
        const start = currentPartIndex * this.config.partSize;
        const end = Math.min(start + this.config.partSize, fileSize);
        const part = this.blob.slice(start, end);

        // Create upload promise with automatic cleanup
        const uploadPromise = this.uploadSinglePart(part, partNumber).finally(() => {
          // Remove from active tasks immediately after completion
          // This allows GC to reclaim memory from uploaded blob slice
          activeTasks.delete(currentPartIndex);
        });

        activeTasks.set(currentPartIndex, uploadPromise);
        partIndex++;
      }

      // All parts have been queued, wait for remaining uploads to complete
      if (partIndex >= this.totalParts) {
        break;
      }

      // Wait for at least one upload to complete
      if (activeTasks.size > 0) {
        await Promise.race(activeTasks.values());
        // Flush microtask queue to ensure finally() has executed
        // This guarantees activeTasks.delete() has been called before next iteration
        await Promise.resolve();
      }
    }

    // Wait for all remaining uploads to complete
    if (activeTasks.size > 0) {
      await Promise.all(activeTasks.values());
    }
  }

  /**
   * Upload a single part with retry logic
   * @param part - Blob part to upload
   * @param partNumber - Part number (1-indexed)
   * @throws Error if upload fails after all retry attempts
   */
  private async uploadSinglePart(part: Blob, partNumber: number): Promise<void> {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= this.config.retryAttempts; attempt++) {
      try {
        // Check if upload was cancelled
        if (this.abortController.signal.aborted) {
          throw new Error("UPLOAD_CANCELLED");
        }

        // Get presigned URL for this part
        const uploadUrl = await this.getPartUploadUrl(partNumber);

        // Upload the part
        const response = await fetch(uploadUrl, {
          method: "PUT",
          body: part,
          headers: {
            "Content-Type": this.getNormalizedMimeType(this.blob.type),
          },
          signal: this.abortController.signal,
          // Note: keepalive is NOT used here because Chrome limits keepalive requests to 64KiB
          // Our part sizes (10MB-100MB) far exceed this limit
          cache: "no-store", // キャッシュ無効化（presigned URLは一度きり）
        });

        if (!response.ok) {
          throw new Error(`Upload failed with status ${response.status}: ${response.statusText}`);
        }

        // Extract ETag from response headers (required for CompleteMultipartUpload)
        const etag = response.headers.get("ETag");
        if (!etag) {
          throw new Error("ETag not found in response headers");
        }

        // Store the uploaded part info
        this.uploadedParts.push({
          PartNumber: partNumber,
          ETag: etag,
        });

        // Update progress
        this.uploadedBytes += part.size;
        this.updateProgress(partNumber);
        return; // Success

      } catch (error) {
        // Handle abort error specially
        if (error instanceof Error && error.name === "AbortError") {
          throw new Error("UPLOAD_CANCELLED");
        }

        lastError = error instanceof Error ? error : new Error(String(error));

        // If we haven't exhausted retries, wait and retry
        if (attempt < this.config.retryAttempts) {
          const delayMs = this.config.retryDelay * (attempt + 1); // Exponential backoff
          await this.delay(delayMs);
        }
      }
    }

    // All retries exhausted
    throw new Error(
      `Failed to upload part ${partNumber} after ${this.config.retryAttempts} retries: ${lastError?.message}`
    );
  }

  /**
   * Get presigned URL for uploading a specific part
   * @param partNumber - Part number (1-indexed)
   * @returns Presigned URL
   */
  private async getPartUploadUrl(partNumber: number): Promise<string> {
    const response = await fetch(`${this.apiBaseUrl}/api/s3/multipart/part-url`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.authToken}`,
      },
      body: JSON.stringify({
        uploadId: this.uploadId,
        key: this.s3Key,
        partNumber,
      }),
      signal: this.abortController.signal,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(`Failed to get part upload URL: ${errorData.error || response.statusText}`);
    }

    const data: MultipartPartUrlResponse = await response.json();
    return data.uploadUrl;
  }

  /**
   * Step 3: Complete multipart upload by assembling all parts
   */
  private async completeMultipartUpload(): Promise<void> {
    const response = await fetch(`${this.apiBaseUrl}/api/s3/multipart/complete`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.authToken}`,
      },
      body: JSON.stringify({
        uploadId: this.uploadId,
        key: this.s3Key,
        parts: this.uploadedParts,
      }),
      signal: this.abortController.signal,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(`Failed to complete multipart upload: ${errorData.error || response.statusText}`);
    }

    const data: MultipartCompleteResponse = await response.json();
    console.log("Multipart upload completed successfully:", data);
  }

  /**
   * Abort multipart upload (cleanup incomplete parts)
   */
  private async abortMultipartUpload(): Promise<void> {
    const response = await fetch(`${this.apiBaseUrl}/api/s3/multipart/abort`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.authToken}`,
      },
      body: JSON.stringify({
        uploadId: this.uploadId,
        key: this.s3Key,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error("Failed to abort multipart upload:", errorData);
    }
  }

  /**
   * Updates progress and notifies via callback
   * Throttled to reduce UI updates (max 5 updates per second)
   * @param currentPart - Current part number being uploaded
   */
  private updateProgress(currentPart: number): void {
    // スロットリング: 200ms以内の連続更新はスキップ
    const now = Date.now();
    const isLastPart = currentPart === this.totalParts;

    // 最後のパートは必ず通知、それ以外はスロットリング
    if (!isLastPart && now - this.lastProgressUpdate < this.PROGRESS_THROTTLE_MS) {
      return; // スキップ
    }

    this.lastProgressUpdate = now;

    const totalBytes = this.blob.size;
    const percentage = Math.min(100, Math.round((this.uploadedBytes / totalBytes) * 100));
    const elapsedSeconds = (now - this.startTime) / 1000;
    const bytesPerSecond = elapsedSeconds > 0 ? this.uploadedBytes / elapsedSeconds : 0;
    const remainingBytes = totalBytes - this.uploadedBytes;
    const estimatedTimeRemaining = bytesPerSecond > 0 ? remainingBytes / bytesPerSecond : 0;

    const progress: UploadProgress = {
      uploadedBytes: this.uploadedBytes,
      totalBytes,
      percentage,
      currentPart,
      totalParts: this.totalParts,
      bytesPerSecond,
      estimatedTimeRemaining,
    };

    this.onProgress(progress);
  }

  /**
   * Cancels the ongoing upload
   */
  cancel(): void {
    this.abortController.abort();
  }

  /**
   * Delays execution for the specified duration
   * @param ms - Delay duration in milliseconds
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

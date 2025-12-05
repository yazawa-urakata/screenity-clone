export type InstantUploadState =
  | "idle"
  | "initializing"
  | "uploading"
  | "finalizing"
  | "completed"
  | "error"
  | "cancelled";

export interface InstantUploadProgress {
  uploadedBytes: number;
  totalBytes: number;
  percentage: number;
  currentPart: number;
  totalParts: number;
  isComplete: boolean;
}

export interface InstantUploadConfig {
  minPartSize: number;
  maxPartSize: number;
  retryAttempts: number;
  retryDelay: number;
  progressThrottleMs: number;
}

export interface InstantUploadError {
  code: string;
  message: string;
  originalError?: Error;
}

export interface UploadedPart {
  partNumber: number;
  etag: string;
  size: number;
  uploadedAt: number;
}

export interface RetryConfig {
  maxAttempts: number;
  initialDelayMs: number;
  maxDelayMs: number;
  backoffMultiplier: number;
  retryableStatusCodes: number[];
}

export interface UploadState {
  recordingId: string;
  uploadId: string;
  key: string;
  initiatedAt: number;
  status: "initializing" | "uploading" | "finalizing" | "completed" | "error";
  uploadedParts: UploadedPart[];
  error?: {
    code: string;
    message: string;
    timestamp: number;
  };
  result?: {
    location: string;
    key: string;
    etag: string;
  };
  aborted?: boolean;
  abortedAt?: number;
  abortReason?: string;
}

export interface OrphanedUpload {
  uploadId: string;
  key: string;
  createdAt: number;
  abortAttempts: number;
  lastAttemptAt?: number;
}

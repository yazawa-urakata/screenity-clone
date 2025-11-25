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
}

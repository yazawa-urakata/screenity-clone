/**
 * Type definitions for S3 multipart upload functionality
 */

/**
 * Request payload for obtaining a presigned URL from the API
 */
export interface PresignedUrlRequest {
  /** Name of the file to upload (e.g., "recording.webm") */
  fileName: string;
  /** MIME type of the file (e.g., "video/webm") */
  fileType: string;
  /** File size in bytes */
  fileSize: number;
  /** S3 directory path (default: "uploads") */
  uploadPath?: string;
}

/**
 * Response from the presigned URL API endpoint
 */
export interface PresignedUrlResponse {
  /** Presigned URL for uploading to S3 */
  url: string;
  /** S3 object key where the file will be stored */
  key: string;
  /** Expiration time in seconds (default: 300 = 5 minutes) */
  expiresIn: number;
}

/**
 * Upload status states throughout the upload lifecycle
 */
export type UploadStatus =
  | "idle"             // Initial state, no upload in progress
  | "authenticating"   // Checking Supabase authentication
  | "requesting-url"   // Requesting presigned URL from API
  | "uploading"        // Uploading file to S3
  | "completed"        // Upload completed successfully
  | "failed"           // Upload failed with error
  | "cancelled";       // Upload cancelled by user

/**
 * Progress information during multipart upload
 */
export interface UploadProgress {
  /** Number of bytes uploaded so far */
  uploadedBytes: number;
  /** Total file size in bytes */
  totalBytes: number;
  /** Upload progress percentage (0-100) */
  percentage: number;
  /** Current part number being uploaded */
  currentPart: number;
  /** Total number of parts */
  totalParts: number;
  /** Upload speed in bytes per second */
  bytesPerSecond: number;
  /** Estimated time remaining in seconds */
  estimatedTimeRemaining: number;
}

/**
 * Configuration for multipart upload behavior
 */
export interface MultipartUploadConfig {
  /** Size of each part in bytes (default: 10MB = 10 * 1024 * 1024) */
  partSize: number;
  /** Number of concurrent uploads (default: 3) */
  queueSize: number;
  /** Maximum number of retry attempts per part (default: 3) */
  retryAttempts: number;
  /** Initial delay in milliseconds between retries (default: 1000) */
  retryDelay: number;
}

/**
 * Error types that can occur during upload
 */
export interface UploadError {
  /** Error code for categorization */
  code:
    | "AUTH_ERROR"           // Authentication failed
    | "PRESIGNED_URL_ERROR"  // Failed to obtain presigned URL
    | "NETWORK_ERROR"        // Network connection error
    | "UPLOAD_ERROR"         // Upload failed
    | "CANCELLED";           // Upload cancelled by user
  /** Human-readable error message */
  message: string;
  /** Original error object (if available) */
  originalError?: Error;
}

/**
 * Supabase authentication state
 */
export interface SupabaseAuthState {
  /** Whether the user is authenticated */
  isAuthenticated: boolean;
  /** Access token for API requests */
  accessToken: string | null;
  /** Refresh token for obtaining new access tokens */
  refreshToken: string | null;
  /** Token expiration timestamp (Unix epoch in milliseconds) */
  expiresAt: number | null;
}

/**
 * Multipart upload initiate response from API
 */
export interface MultipartInitiateResponse {
  /** S3 multipart upload ID */
  uploadId: string;
  /** S3 object key where the file will be stored */
  key: string;
  /** Total number of parts to upload */
  totalParts: number;
}

/**
 * Multipart upload part URL response from API
 */
export interface MultipartPartUrlResponse {
  /** Presigned URL for uploading this part */
  uploadUrl: string;
  /** Expiration time in seconds */
  expiresIn: number;
}

/**
 * Multipart upload complete response from API
 */
export interface MultipartCompleteResponse {
  /** S3 object location URL */
  location?: string;
  /** S3 bucket name */
  bucket?: string;
  /** S3 object key */
  key?: string;
  /** Final object ETag */
  etag?: string;
}

/**
 * Part information for multipart upload completion
 */
export interface MultipartUploadPart {
  /** Part number (1-indexed) */
  PartNumber: number;
  /** ETag from PUT response header */
  ETag: string;
}

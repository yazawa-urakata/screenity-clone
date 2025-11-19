/**
 * S3アップロード統合フック
 *
 * 認証、Presigned URL取得、マルチパートアップロード、履歴保存を
 * 統合したフックです。
 */

import { useState, useCallback } from "react";
import { useSupabaseAuth } from "./useSupabaseAuth";
import { useMultipartUpload } from "./useMultipartUpload";
import { saveS3Key, generateFileName } from "../utils/s3Upload";
import { getWebAppUrl } from "../../../utils/supabaseClient";
import type {
  UploadStatus,
  UploadProgress,
  UploadError,
  MultipartUploadConfig,
} from "../types/s3Upload";

interface UploadParams {
  /** アップロードするBlob */
  blob: Blob;
  /** 元のファイル名（拡張子含む） */
  fileName: string;
  /** ファイルのMIMEタイプ */
  fileType: string;
  /** S3のアップロードパス（デフォルト: "uploads"） */
  uploadPath?: string;
  /** マルチパートアップロード設定（オプション） */
  config?: Partial<MultipartUploadConfig>;
}

interface UseS3UploadReturn {
  /** S3へのアップロード実行関数 */
  uploadToS3: (params: UploadParams) => Promise<void>;
  /** アップロードキャンセル関数 */
  cancel: () => void;
  /** 状態リセット関数 */
  reset: () => void;
  /** 現在のアップロード状態 */
  status: UploadStatus;
  /** アップロード中かどうか */
  isUploading: boolean;
  /** プログレス情報 */
  progress: UploadProgress | null;
  /** エラー情報 */
  error: UploadError | null;
  /** アップロード済みのS3キー */
  uploadedKey: string | null;
  /** 認証されているかどうか */
  isAuthenticated: boolean;
  /** ログインページを開く */
  openLoginPage: () => void;
  /** 認証状態を再取得 */
  refreshAuth: () => void;
}

/**
 * エラーメッセージからエラーコードを判定
 */
function classifyError(errorMessage: string): UploadError["code"] {
  const lowerMessage = errorMessage.toLowerCase();

  if (lowerMessage.includes("authenticated") || lowerMessage.includes("auth")) {
    return "AUTH_ERROR";
  }
  if (lowerMessage.includes("presigned url") || lowerMessage.includes("presigned")) {
    return "PRESIGNED_URL_ERROR";
  }
  if (lowerMessage.includes("network") || lowerMessage.includes("fetch")) {
    return "NETWORK_ERROR";
  }
  if (lowerMessage.includes("cancelled") || lowerMessage.includes("abort")) {
    return "CANCELLED";
  }

  return "UPLOAD_ERROR";
}

/**
 * S3アップロード統合フック
 *
 * @returns アップロード関数と状態
 */
export function useS3Upload(): UseS3UploadReturn {
  const { authState, loading: authLoading, openLoginPage, refreshAuth } = useSupabaseAuth();
  const {
    upload: multipartUpload,
    cancel: cancelMultipart,
    reset: resetMultipart,
    isUploading: isMultipartUploading,
    progress,
    error: multipartError,
  } = useMultipartUpload();

  const [status, setStatus] = useState<UploadStatus>("idle");
  const [error, setError] = useState<UploadError | null>(null);
  const [uploadedKey, setUploadedKey] = useState<string | null>(null);

  /**
   * S3へのアップロード実行
   *
   * Step 1: 認証チェック
   * Step 2: マルチパートアップロード実行（内部でinitiate/part-url/completeを呼び出し）
   * Step 3: S3キー保存
   */
  const uploadToS3 = useCallback(
    async ({ blob, fileName, fileType, uploadPath = "uploads", config }: UploadParams): Promise<void> => {
      try {
        // エラーをクリア
        setError(null);
        setUploadedKey(null);

        // Step 1: 認証チェック
        setStatus("authenticating");

        if (!authState.isAuthenticated || !authState.accessToken) {
          throw new Error("User is not authenticated. Please log in.");
        }

        // Step 2: マルチパートアップロード実行
        setStatus("uploading");

        const timestampedFileName = generateFileName(fileName);
        const apiBaseUrl = getWebAppUrl();

        // 新しいマルチパートアップロードAPIを使用
        const uploadedS3Key = await multipartUpload({
          blob,
          apiBaseUrl,
          authToken: authState.accessToken,
          fileName: timestampedFileName,
          uploadPath,
          config,
        });

        // Step 3: S3キーを保存
        await saveS3Key(uploadedS3Key);
        setUploadedKey(uploadedS3Key);

        // 完了
        setStatus("completed");
      } catch (err) {
        // エラーハンドリング
        const errorMessage = err instanceof Error ? err.message : String(err);
        const errorCode = classifyError(errorMessage);

        const uploadError: UploadError = {
          code: errorCode,
          message: errorMessage,
          originalError: err instanceof Error ? err : undefined,
        };

        setError(uploadError);
        setStatus("failed");

        // エラーを再スロー
        throw err;
      }
    },
    [authState, multipartUpload]
  );

  /**
   * アップロードキャンセル
   */
  const cancel = useCallback(() => {
    cancelMultipart();
    setStatus("cancelled");
    setError({
      code: "CANCELLED",
      message: "Upload was cancelled by user",
    });
  }, [cancelMultipart]);

  /**
   * 状態リセット
   */
  const reset = useCallback(() => {
    resetMultipart();
    setStatus("idle");
    setError(null);
    setUploadedKey(null);
  }, [resetMultipart]);

  // multipartErrorが発生した場合はerrorに反映
  const finalError = error || multipartError;

  // アップロード中の判定
  const isUploading =
    status === "authenticating" ||
    status === "requesting-url" ||
    status === "uploading" ||
    isMultipartUploading;

  return {
    uploadToS3,
    cancel,
    reset,
    status,
    isUploading,
    progress,
    error: finalError,
    uploadedKey,
    isAuthenticated: authState.isAuthenticated,
    openLoginPage,
    refreshAuth,
  };
}

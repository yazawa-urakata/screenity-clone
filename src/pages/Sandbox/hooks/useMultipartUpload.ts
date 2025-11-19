/**
 * マルチパートアップロードフック
 *
 * MultipartUploaderクラスを使用して、Blobをマルチパートでアップロードします。
 * プログレス管理、エラーハンドリング、キャンセル機能を提供します。
 */

import { useState, useRef, useCallback } from "react";
import { MultipartUploader } from "../utils/multipartUploader";
import type { MultipartUploadConfig, UploadProgress, UploadError } from "../types/s3Upload";

/**
 * デフォルトのアップロード設定
 */
const DEFAULT_CONFIG: MultipartUploadConfig = {
  partSize: 10 * 1024 * 1024, // 10MB
  queueSize: 3, // 3並列アップロード
  retryAttempts: 3, // 3回までリトライ
  retryDelay: 1000, // 1秒（指数バックオフで増加）
};

interface UploadParams {
  /** アップロードするBlob */
  blob: Blob;
  /** APIサーバーのベースURL */
  apiBaseUrl: string;
  /** JWT認証トークン */
  authToken: string;
  /** ファイル名 */
  fileName: string;
  /** S3アップロードパス */
  uploadPath: string;
  /** マルチパートアップロード設定（オプション） */
  config?: Partial<MultipartUploadConfig>;
}

interface UseMultipartUploadReturn {
  /** アップロード実行関数 */
  upload: (params: UploadParams) => Promise<string>;
  /** アップロードキャンセル関数 */
  cancel: () => void;
  /** 状態リセット関数 */
  reset: () => void;
  /** アップロード中かどうか */
  isUploading: boolean;
  /** プログレス情報 */
  progress: UploadProgress | null;
  /** エラー情報 */
  error: UploadError | null;
}

/**
 * マルチパートアップロードフック
 *
 * @returns アップロード関数と状態
 */
export function useMultipartUpload(): UseMultipartUploadReturn {
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState<UploadProgress | null>(null);
  const [error, setError] = useState<UploadError | null>(null);
  const uploaderRef = useRef<MultipartUploader | null>(null);

  /**
   * アップロード実行
   *
   * @param params - アップロードパラメータ
   * @returns アップロードされたS3キー
   */
  const upload = useCallback(
    async ({ blob, apiBaseUrl, authToken, fileName, uploadPath, config }: UploadParams): Promise<string> => {
      // 既にアップロード中の場合はエラー
      if (isUploading) {
        throw new Error("Upload already in progress");
      }

      // 状態をリセット
      setError(null);
      setProgress(null);
      setIsUploading(true);

      // 設定をマージ
      const mergedConfig: MultipartUploadConfig = {
        ...DEFAULT_CONFIG,
        ...config,
      };

      try {
        // MultipartUploaderインスタンス作成
        const uploader = new MultipartUploader(
          blob,
          apiBaseUrl,
          authToken,
          fileName,
          uploadPath,
          mergedConfig,
          (progressData) => {
            // プログレスコールバック
            setProgress(progressData);
          }
        );

        // useRefに保存（キャンセル用）
        uploaderRef.current = uploader;

        // アップロード実行してS3キーを取得
        const s3Key = await uploader.upload();

        // 完了時に100%のプログレスを設定
        setProgress({
          uploadedBytes: blob.size,
          totalBytes: blob.size,
          percentage: 100,
          currentPart: mergedConfig.partSize > 0 ? Math.ceil(blob.size / mergedConfig.partSize) : 1,
          totalParts: mergedConfig.partSize > 0 ? Math.ceil(blob.size / mergedConfig.partSize) : 1,
          bytesPerSecond: 0,
          estimatedTimeRemaining: 0,
        });

        setIsUploading(false);
        uploaderRef.current = null;

        return s3Key;
      } catch (err) {
        // エラーハンドリング
        const errorMessage = err instanceof Error ? err.message : String(err);

        // エラー分類
        if (errorMessage.includes("UPLOAD_CANCELLED") || errorMessage.includes("CANCELLED")) {
          setError({
            code: "CANCELLED",
            message: "Upload was cancelled",
            originalError: err instanceof Error ? err : undefined,
          });
        } else {
          setError({
            code: "UPLOAD_ERROR",
            message: errorMessage,
            originalError: err instanceof Error ? err : undefined,
          });
        }

        setIsUploading(false);
        uploaderRef.current = null;

        // エラーを再スロー
        throw err;
      }
    },
    [isUploading]
  );

  /**
   * アップロードキャンセル
   */
  const cancel = useCallback(() => {
    if (uploaderRef.current) {
      uploaderRef.current.cancel();
      uploaderRef.current = null;
    }
  }, []);

  /**
   * 状態リセット
   */
  const reset = useCallback(() => {
    setIsUploading(false);
    setProgress(null);
    setError(null);
    uploaderRef.current = null;
  }, []);

  return {
    upload,
    cancel,
    reset,
    isUploading,
    progress,
    error,
  };
}

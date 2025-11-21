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
 * ファイルサイズに基づいて最適なpartSizeを計算
 *
 * AWS S3の制約:
 * - 最小partSize: 5MB
 * - 最大パート数: 10,000
 * - 最大partSize: 100MB（推奨）
 *
 * AWS ベストプラクティス (2024-2025):
 * - 推奨partSize: 16-64MB（API呼び出し削減と並列化のバランス）
 * - 大きいpartSizeはAPI呼び出し回数を削減し、スループット向上
 *
 * @param fileSize - ファイルサイズ（バイト）
 * @returns 最適なpartSize（バイト）
 */
function calculateOptimalPartSize(fileSize: number): number {
  const MIN_PART_SIZE = 5 * 1024 * 1024; // 5MB
  const MAX_PART_SIZE = 100 * 1024 * 1024; // 100MB
  const MAX_PARTS = 10000;

  // 100MB未満: 25MB（小さいファイルでも効率的に）
  if (fileSize < 100 * 1024 * 1024) {
    return 25 * 1024 * 1024;
  }

  // 100MB～1GB: 50MB（API呼び出し削減）
  if (fileSize < 1 * 1024 * 1024 * 1024) {
    return 50 * 1024 * 1024;
  }

  // 1GB以上: 100MB（最大パートサイズで最速アップロード）
  if (fileSize < 10 * 1024 * 1024 * 1024) {
    return 100 * 1024 * 1024;
  }

  // 10GB以上: ファイルサイズ / MAX_PARTSで計算
  // ただし、MIN_PART_SIZE～MAX_PART_SIZEの範囲内に収める
  const calculatedSize = Math.ceil(fileSize / MAX_PARTS);
  return Math.min(Math.max(calculatedSize, MIN_PART_SIZE), MAX_PART_SIZE);
}

/**
 * デフォルトのアップロード設定
 *
 * 並列数の根拠:
 * - HTTP/1.1: 同一ドメインへの最大接続数は6（Chrome）
 * - AWS推奨: max_concurrent_requests = 10
 * - メモリ効率: partSize × queueSize = 最大同時メモリ使用量
 * - 6並列 × 50MB = 300MB（メモリ使用量の上限目安）
 */
const DEFAULT_CONFIG: MultipartUploadConfig = {
  partSize: 50 * 1024 * 1024, // 50MB（動的に上書きされる）
  queueSize: 6, // 6並列アップロード（HTTP/1.1の最大接続数に合わせて最適化）
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

      // ファイルサイズに応じて最適なpartSizeを計算
      const optimalPartSize = calculateOptimalPartSize(blob.size);

      // 設定をマージ（動的partSizeを使用）
      const mergedConfig: MultipartUploadConfig = {
        ...DEFAULT_CONFIG,
        partSize: optimalPartSize, // 動的に計算されたpartSizeを使用
        ...config, // ユーザー指定の設定で上書き可能
      };

      // デバッグログ（開発時のみ）
      if (process.env.NODE_ENV === "development") {
        console.log(
          `[S3 Upload] File size: ${(blob.size / 1024 / 1024).toFixed(2)}MB, ` +
            `Part size: ${(optimalPartSize / 1024 / 1024).toFixed(2)}MB`
        );
      }

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

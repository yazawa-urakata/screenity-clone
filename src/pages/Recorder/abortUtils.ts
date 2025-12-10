/**
 * abort処理ユーティリティ
 * マルチパートアップロードのabort処理を提供
 */

import { DEFAULT_RETRY_CONFIG, exponentialBackoff } from "./retryUtils";
import { addOrphanedUpload, saveUploadState } from "./uploadStateManager";

type AbortReason =
  | "user_cancel"
  | "max_retry"
  | "expired"
  | "error"
  | "tab_closed";

interface ErrorWithStatus {
  status?: number;
}

/**
 * マルチパートアップロードをabort（リトライ付き）
 *
 * @param uploadId - アップロードID
 * @param key - S3キー
 * @param apiBaseUrl - APIベースURL
 * @param authToken - 認証トークン
 * @param reason - abort理由
 * @returns abort成功時true、失敗時false
 */
export async function abortMultipartUpload(
  uploadId: string,
  key: string,
  apiBaseUrl: string,
  authToken: string,
  reason: AbortReason = "error",
): Promise<boolean> {
  console.log(`[AbortMultipartUpload] Aborting upload (reason: ${reason})`);

  try {
    await exponentialBackoff(
      async () => {
        const response = await fetch(`${apiBaseUrl}/api/s3/multipart/abort`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${authToken}`,
          },
          body: JSON.stringify({
            uploadId,
            key,
          }),
        });

        if (!response.ok) {
          // NoSuchUpload (404) は成功として扱う
          if (response.status === 404) {
            console.log(
              "[AbortMultipartUpload] Upload already aborted or completed",
            );
            return;
          }

          const errorData = await response.json().catch(() => ({}));
          const error = new Error(
            `Failed to abort: ${errorData.error || response.statusText}`,
          ) as Error & ErrorWithStatus;
          error.status = response.status;
          throw error;
        }
      },
      DEFAULT_RETRY_CONFIG.abort,
      "abort multipart upload",
    );

    console.log("[AbortMultipartUpload] ✅ Successfully aborted");

    // Chrome Storageの状態を更新
    await saveUploadState({
      status: "error",
      aborted: true,
      abortedAt: Date.now(),
      abortReason: reason,
    });

    return true;
  } catch (error) {
    console.error("[AbortMultipartUpload] ❌ Failed after retries:", error);

    // abort失敗時は孤立uploadIdリストに追加（後でクリーンアップ）
    await addOrphanedUpload({
      uploadId,
      key,
      createdAt: Date.now(),
      abortAttempts: DEFAULT_RETRY_CONFIG.abort.maxAttempts,
    });

    return false;
  }
}

/**
 * 古いuploadIdを自動abort
 *
 * @param existingUploadId - 既存のアップロードID
 * @param existingKey - 既存のS3キー
 * @param initiatedAt - アップロード開始時刻
 * @param apiBaseUrl - APIベースURL
 * @param authToken - 認証トークン
 */
export async function abortExpiredUpload(
  existingUploadId: string,
  existingKey: string,
  initiatedAt: number,
  apiBaseUrl: string,
  authToken: string,
): Promise<void> {
  const ageInHours = ((Date.now() - initiatedAt) / (1000 * 60 * 60)).toFixed(1);
  console.log(
    `[AbortExpiredUpload] Aborting expired upload (age: ${ageInHours}h, initiated: ${new Date(initiatedAt).toISOString()})`,
  );

  const success = await abortMultipartUpload(
    existingUploadId,
    existingKey,
    apiBaseUrl,
    authToken,
    "expired",
  );

  if (!success) {
    console.warn(
      `[AbortExpiredUpload] Failed to abort (age: ${ageInHours}h), added to orphaned list`,
    );
  }
}

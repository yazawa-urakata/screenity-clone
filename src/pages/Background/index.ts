import { messageRouter } from "../../messaging/messageRouter";
import { getSupabaseAuthState, getWebAppUrl } from "../../utils/supabaseClient";
import {
  DEFAULT_RETRY_CONFIG,
  exponentialBackoff,
} from "../Recorder/retryUtils";
import {
  addOrphanedUpload,
  getOrphanedUploads,
  removeOrphanedUpload,
} from "../Recorder/uploadStateManager";
import { initializeListeners } from "./listeners";
import { setupHandlers } from "./messaging/handlers";

// Initialize message router
messageRouter();

// Start all listeners
initializeListeners();

// Set up message handlers
setupHandlers();

/**
 * 孤立したuploadIdを定期的にクリーンアップ
 * 1日1回実行
 */
async function cleanupOrphanedUploads(): Promise<void> {
  console.log("[CleanupOrphanedUploads] Starting cleanup...");

  const orphanedUploads = await getOrphanedUploads();

  if (orphanedUploads.length === 0) {
    console.log("[CleanupOrphanedUploads] No orphaned uploads to clean");
    return;
  }

  console.log(
    `[CleanupOrphanedUploads] Found ${orphanedUploads.length} orphaned uploads`,
  );

  const { isAuthenticated, accessToken } = await getSupabaseAuthState();
  if (!isAuthenticated || !accessToken) {
    console.warn(
      "[CleanupOrphanedUploads] Not authenticated, skipping cleanup",
    );
    return;
  }

  const apiBaseUrl = getWebAppUrl();

  for (const upload of orphanedUploads) {
    // 最大10回リトライ済みの場合はスキップ
    if (upload.abortAttempts >= 10) {
      console.warn(
        `[CleanupOrphanedUploads] Upload ${upload.uploadId} exceeded max abort attempts, skipping`,
      );
      continue;
    }

    try {
      await exponentialBackoff(
        async () => {
          const response = await fetch(`${apiBaseUrl}/api/s3/multipart/abort`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${accessToken}`,
            },
            body: JSON.stringify({
              uploadId: upload.uploadId,
              key: upload.key,
            }),
          });

          if (!response.ok && response.status !== 404) {
            const errorData = await response.json().catch(() => ({}));
            interface ErrorWithStatus extends Error {
              status?: number;
            }
            const error: ErrorWithStatus = new Error(
              `Failed to abort: ${errorData.error || response.statusText}`,
            );
            error.status = response.status;
            throw error;
          }
        },
        DEFAULT_RETRY_CONFIG.abort,
        `cleanup orphaned upload ${upload.uploadId}`,
      );

      console.log(
        `[CleanupOrphanedUploads] ✅ Successfully aborted ${upload.uploadId}`,
      );
      await removeOrphanedUpload(upload.uploadId);
    } catch (error) {
      console.error(
        `[CleanupOrphanedUploads] ❌ Failed to abort ${upload.uploadId}:`,
        error,
      );

      // リトライ回数を更新
      await addOrphanedUpload({
        ...upload,
        lastAttemptAt: Date.now(),
        abortAttempts:
          upload.abortAttempts + DEFAULT_RETRY_CONFIG.abort.maxAttempts,
      });
    }
  }

  console.log("[CleanupOrphanedUploads] Cleanup completed");
}

// Chrome Alarms APIで1日1回実行
chrome.alarms.create("cleanupOrphanedUploads", {
  delayInMinutes: 1, // 1分後に初回実行
  periodInMinutes: 24 * 60, // 24時間ごと
});

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === "cleanupOrphanedUploads") {
    cleanupOrphanedUploads().catch((error) => {
      console.error("[CleanupOrphanedUploads] Error:", error);
    });
  }
});

import { useCallback, useMemo, useRef, useState } from "react";
import type {
  InstantUploadConfig,
  InstantUploadError,
  InstantUploadProgress,
  InstantUploadState,
} from "../../types/instantUpload";
import { getSupabaseAuthState, getWebAppUrl } from "../../utils/supabaseClient";
import { abortExpiredUpload } from "./abortUtils";
import { InstantUploader } from "./InstantUploader";
import { DEFAULT_RETRY_CONFIG, retryWithAuthRefresh } from "./retryUtils";
import {
  clearUploadState,
  isUploadStateValid,
  loadUploadState,
  saveUploadState,
} from "./uploadStateManager";

const DEFAULT_CONFIG: InstantUploadConfig = {
  minPartSize: 5 * 1024 * 1024,
  maxPartSize: 20 * 1024 * 1024,
  retryAttempts: 3,
  retryDelay: 1000,
  progressThrottleMs: 200,
};

export function useInstantUpload(config?: Partial<InstantUploadConfig>) {
  const [state, setState] = useState<InstantUploadState>("idle");
  const [progress, setProgress] = useState<InstantUploadProgress | null>(null);
  const [error, setError] = useState<InstantUploadError | null>(null);
  const [isEnabled, setIsEnabled] = useState<boolean>(false);

  const uploaderRef = useRef<InstantUploader | null>(null);
  const videoIdRef = useRef<string | null>(null);
  const keyRef = useRef<string | null>(null);

  // configの各プロパティが変更されたときだけ再計算
  const mergedConfig = useMemo(
    () => ({
      minPartSize: config?.minPartSize ?? DEFAULT_CONFIG.minPartSize,
      maxPartSize: config?.maxPartSize ?? DEFAULT_CONFIG.maxPartSize,
      retryAttempts: config?.retryAttempts ?? DEFAULT_CONFIG.retryAttempts,
      retryDelay: config?.retryDelay ?? DEFAULT_CONFIG.retryDelay,
      progressThrottleMs:
        config?.progressThrottleMs ?? DEFAULT_CONFIG.progressThrottleMs,
    }),
    [
      config?.minPartSize,
      config?.maxPartSize,
      config?.retryAttempts,
      config?.retryDelay,
      config?.progressThrottleMs,
    ],
  );

  const initializeUpload = useCallback(
    async (videoId: string): Promise<void> => {
      setState("initializing");
      setError(null);
      setProgress(null);

      try {
        // 既存の状態を確認
        const existingState = await loadUploadState();

        // 有効な状態が存在する場合は再利用
        if (
          existingState &&
          existingState.status === "initializing" &&
          isUploadStateValid(existingState)
        ) {
          console.log(
            "[InitializeUpload] Reusing existing upload state:",
            existingState,
          );

          const authToken = await getAuthToken();
          const uploader = new InstantUploader({
            videoId,
            uploadId: existingState.uploadId,
            key: existingState.key,
            apiBaseUrl: getWebAppUrl(),
            authToken,
            mimeType: "video/webm",
            config: mergedConfig,
            onProgress: (progressData) => {
              setProgress(progressData);
            },
          });

          uploaderRef.current = uploader;
          videoIdRef.current = videoId;
          keyRef.current = existingState.key;
          setState("idle");
          setIsEnabled(true);
          return;
        }

        // 期限切れの uploadId を abort（24時間以上経過）
        if (existingState && !isUploadStateValid(existingState)) {
          console.log(
            "[InitializeUpload] Existing upload is expired, aborting...",
          );

          // abort処理（ベストエフォート）
          try {
            const { isAuthenticated, accessToken } =
              await getSupabaseAuthState();
            if (isAuthenticated && accessToken) {
              await abortExpiredUpload(
                existingState.uploadId,
                existingState.key,
                existingState.initiatedAt,
                getWebAppUrl(),
                accessToken,
              );
              console.log(
                "[InitializeUpload] ✅ Successfully aborted expired upload",
              );
            }
          } catch (error) {
            console.error(
              "[InitializeUpload] ❌ Failed to abort expired upload:",
              error,
            );
            // abort失敗しても継続（孤立uploadIdリストに追加済み）
          }

          // 状態をクリア
          await clearUploadState();
        }

        // 新規アップロードの初期化（リトライ付き）
        const { uploadId, key } = await retryWithAuthRefresh(
          async () => {
            const { isAuthenticated, accessToken } =
              await getSupabaseAuthState();
            if (!isAuthenticated || !accessToken) {
              throw new Error("Not authenticated");
            }

            const apiBaseUrl = getWebAppUrl();
            const recordingId = `${Date.now()}`;

            const response = await fetch(
              `${apiBaseUrl}/api/s3/multipart/initiate`,
              {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  Authorization: `Bearer ${accessToken}`,
                },
                body: JSON.stringify({
                  fileName: "video.webm",
                  fileType: "video/webm",
                  uploadPath: `recordings/${recordingId}`,
                }),
              },
            );

            if (!response.ok) {
              const errorData = await response.json().catch(() => ({}));
              type ErrorWithStatus = Error & { status?: number };
              const error: ErrorWithStatus = new Error(
                `Failed to initiate upload: ${errorData.error || response.statusText}`,
              );
              error.status = response.status;
              throw error;
            }

            return await response.json();
          },
          async () => {
            const { accessToken } = await getSupabaseAuthState();
            if (!accessToken) {
              throw new Error("Failed to refresh auth token");
            }
            return accessToken;
          },
          DEFAULT_RETRY_CONFIG.initiate,
          "initiate multipart upload",
        );

        // 状態を保存
        await saveUploadState({
          recordingId: videoId,
          uploadId,
          key,
          initiatedAt: Date.now(),
          status: "initializing",
          uploadedParts: [],
        });

        const authToken = await getAuthToken();
        const uploader = new InstantUploader({
          videoId,
          uploadId,
          key,
          apiBaseUrl: getWebAppUrl(),
          authToken,
          mimeType: "video/webm",
          config: mergedConfig,
          onProgress: (progressData) => {
            setProgress(progressData);
          },
        });

        uploaderRef.current = uploader;
        videoIdRef.current = videoId;
        keyRef.current = key;
        setState("idle");
        setIsEnabled(true);

        // 状態を更新
        await saveUploadState({ status: "uploading" });
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : String(err);
        setState("error");
        setError({
          code: "INIT_ERROR",
          message: errorMessage,
          originalError: err instanceof Error ? err : undefined,
        });

        // エラー状態を保存
        await saveUploadState({
          status: "error",
          error: {
            code: "INIT_ERROR",
            message: errorMessage,
            timestamp: Date.now(),
          },
        });

        throw err;
      }
    },
    [mergedConfig],
  );

  const finalizeUpload = useCallback(async (): Promise<
    | {
        key: string;
        location: string;
      }
    | undefined
  > => {
    if (!uploaderRef.current) return;

    setState("finalizing");

    try {
      const result = await uploaderRef.current.finalize();
      setState("completed");
      uploaderRef.current = null;
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      setState("error");
      setError({
        code: "FINALIZE_ERROR",
        message: errorMessage,
        originalError: err instanceof Error ? err : undefined,
      });
      throw err;
    }
  }, []);

  const cancelUpload = useCallback(async (): Promise<void> => {
    if (!uploaderRef.current) return;

    try {
      await uploaderRef.current.cancel();
      setState("cancelled");
      uploaderRef.current = null;
    } catch (err) {
      console.error("Failed to cancel upload:", err);
    }
  }, []);

  return {
    uploaderRef,
    state,
    progress,
    error,
    isEnabled,
    initializeUpload,
    finalizeUpload,
    cancelUpload,
  };
}

/**
 * 認証トークンを取得するヘルパー関数
 */
async function getAuthToken(): Promise<string> {
  const { isAuthenticated, accessToken } = await getSupabaseAuthState();
  if (!isAuthenticated || !accessToken) {
    throw new Error("Not authenticated");
  }
  return accessToken;
}

import { useState, useRef, useCallback } from "react";
import { InstantUploader } from "./InstantUploader";
import { getSupabaseAuthState, getWebAppUrl } from "../../utils/supabaseClient";
import type {
  InstantUploadConfig,
  InstantUploadProgress,
  InstantUploadState,
  InstantUploadError,
} from "../../types/instantUpload";

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

  const mergedConfig = { ...DEFAULT_CONFIG, ...config };

  const initializeUpload = useCallback(
    async (videoId: string): Promise<void> => {
      setState("initializing");
      setError(null);
      setProgress(null);

      try {
        const { isAuthenticated, accessToken } = await getSupabaseAuthState();

        if (!isAuthenticated || !accessToken) {
          throw new Error("Not authenticated");
        }

        const apiBaseUrl = getWebAppUrl();

        const response = await fetch(`${apiBaseUrl}/api/s3/multipart/initiate`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify({
            fileName: `recording-${Date.now()}.webm`,
            fileType: "video/webm",
            uploadPath: "recordings",
          }),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(
            `Failed to initiate upload: ${errorData.error || response.statusText}`
          );
        }

        const { uploadId, key } = await response.json();

        const uploader = new InstantUploader({
          videoId,
          uploadId,
          key,
          apiBaseUrl,
          authToken: accessToken,
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
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : String(err);
        setState("error");
        setError({
          code: "INIT_ERROR",
          message: errorMessage,
          originalError: err instanceof Error ? err : undefined,
        });
        throw err;
      }
    },
    [mergedConfig]
  );

  const finalizeUpload = useCallback(async (): Promise<void> => {
    if (!uploaderRef.current) return;

    setState("finalizing");

    try {
      await uploaderRef.current.finalize();
      setState("completed");
      uploaderRef.current = null;
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

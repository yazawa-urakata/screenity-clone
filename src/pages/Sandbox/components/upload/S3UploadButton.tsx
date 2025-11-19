/**
 * S3UploadButtonコンポーネント
 *
 * 録画したWebMファイルをS3にアップロードするボタンです。
 * 認証、アップロード進行状況、エラーハンドリング、トースト通知を含みます。
 */

import React, { useContext, useState, useEffect } from "react";
import { ReactSVG } from "react-svg";
import * as Toast from "@radix-ui/react-toast";
import styles from "./S3UploadButton.module.scss";
import { useS3Upload } from "../../hooks/useS3Upload";
import { UploadProgressBar } from "./UploadProgressBar";
import { ContentStateContext } from "../../context/ContentState";

const URL =
  "chrome-extension://" + chrome.i18n.getMessage("@@extension_id") + "/assets/";

type ToastType = "success" | "error";

/**
 * S3UploadButtonコンポーネント
 */
export const S3UploadButton: React.FC = () => {
  const [contentState] = useContext(ContentStateContext);
  const {
    uploadToS3,
    cancel,
    reset,
    status,
    isUploading,
    progress,
    error,
    uploadedKey,
    isAuthenticated,
    openLoginPage,
  } = useS3Upload();

  // トースト状態
  const [toastOpen, setToastOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  const [toastType, setToastType] = useState<ToastType>("success");

  /**
   * アップロード処理
   */
  const handleUpload = async (): Promise<void> => {
    // 認証チェック
    if (!isAuthenticated) {
      openLoginPage();
      showToast("Please log in to upload to S3", "error");
      return;
    }

    // WebM存在チェック
    if (!contentState.webm) {
      showToast("No recording available to upload", "error");
      return;
    }

    try {
      // アップロード実行
      await uploadToS3({
        blob: contentState.webm,
        fileName: `${contentState.title || "recording"}.webm`,
        fileType: "video/webm",
        uploadPath: "recordings",
      });

      // 成功トースト
      showToast("Upload completed successfully!", "success");

      // 3秒後に状態リセット
      setTimeout(() => {
        reset();
      }, 3000);
    } catch (err) {
      // エラーは useS3Upload 内で処理されるため、ここでは何もしない
      console.error("Upload failed:", err);
    }
  };

  /**
   * キャンセル処理
   */
  const handleCancel = (): void => {
    cancel();
    showToast("Upload cancelled", "error");
  };

  /**
   * トースト表示
   */
  const showToast = (message: string, type: ToastType): void => {
    setToastMessage(message);
    setToastType(type);
    setToastOpen(true);
  };

  /**
   * エラー発生時にトースト表示
   */
  useEffect(() => {
    if (error && error.code !== "CANCELLED") {
      showToast(error.message, "error");
    }
  }, [error]);

  /**
   * ボタン無効化条件
   */
  const isDisabled =
    !contentState.webm ||
    isUploading ||
    contentState.isFfmpegRunning ||
    contentState.offline;

  return (
    <Toast.Provider swipeDirection="right">
      <div className={styles.container}>
        {/* アップロードボタン */}
        <div
          role="button"
          className={styles.button}
          onClick={handleUpload}
          {...({ disabled: isDisabled } as React.HTMLAttributes<HTMLDivElement>)}
        >
          <div className={styles.buttonLeft}>
            <ReactSVG src={URL + "editor/icons/upload.svg"} />
          </div>
          <div className={styles.buttonMiddle}>
            <div className={styles.buttonTitle}>
              {isUploading
                ? chrome.i18n.getMessage("uploadingLabel") || "Uploading..."
                : "Upload to S3"}
            </div>
            <div className={styles.buttonDescription}>
              {contentState.offline
                ? chrome.i18n.getMessage("noConnectionLabel") || "No connection"
                : !contentState.webm
                  ? "No recording available"
                  : isUploading
                    ? `${status.charAt(0).toUpperCase() + status.slice(1)}...`
                    : "Upload recording to cloud storage"}
            </div>
          </div>
          <div className={styles.buttonRight}>
            <ReactSVG src={URL + "editor/icons/right-arrow.svg"} />
          </div>
        </div>

        {/* プログレスバー（アップロード中のみ表示） */}
        {isUploading && progress && (
          <UploadProgressBar progress={progress} onCancel={handleCancel} />
        )}

        {/* エラーメッセージ */}
        {error && error.code !== "CANCELLED" && !isUploading && (
          <div className={styles.errorMessage}>
            <div className={styles.errorText}>{error.message}</div>
            <button className={styles.retryButton} onClick={handleUpload} type="button">
              Retry
            </button>
          </div>
        )}

        {/* 成功メッセージ（uploadedKeyがある場合） */}
        {uploadedKey && status === "completed" && !isUploading && (
          <div className={styles.successMessage}>
            <div className={styles.successText}>
              Upload completed! Key: {uploadedKey.split("/").pop()}
            </div>
          </div>
        )}
      </div>

      {/* トースト通知 */}
      <Toast.Root
        className={`${styles.toastRoot} ${toastType === "success" ? styles.toastSuccess : styles.toastError}`}
        open={toastOpen}
        onOpenChange={setToastOpen}
      >
        <Toast.Title className={styles.toastTitle}>{toastMessage}</Toast.Title>
      </Toast.Root>
      <Toast.Viewport className={styles.toastViewport} />
    </Toast.Provider>
  );
};

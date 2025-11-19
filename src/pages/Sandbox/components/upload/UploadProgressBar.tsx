/**
 * UploadProgressBarコンポーネント
 *
 * S3マルチパートアップロードのプログレス情報を表示します。
 * アップロード量、速度、残り時間、パート番号などを表示し、
 * キャンセルボタンも提供します。
 */

import React from "react";
import styles from "./UploadProgressBar.module.scss";
import type { UploadProgress } from "../../types/s3Upload";

interface UploadProgressBarProps {
  /** プログレス情報 */
  progress: UploadProgress;
  /** キャンセルボタンのクリックハンドラー */
  onCancel: () => void;
}

/**
 * バイト数を人間が読みやすい形式にフォーマット
 *
 * @param bytes - バイト数
 * @returns フォーマット済み文字列（例: "1.5 MB"）
 */
function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";

  const units = ["B", "KB", "MB", "GB"];
  const k = 1024;
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  const value = bytes / Math.pow(k, i);

  return `${value.toFixed(1)} ${units[i]}`;
}

/**
 * 秒数をmm:ss形式にフォーマット
 *
 * @param seconds - 秒数
 * @returns フォーマット済み文字列（例: "02:35"）
 */
function formatTime(seconds: number): string {
  if (!isFinite(seconds) || seconds < 0) return "--:--";

  const minutes = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);

  return `${String(minutes).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
}

/**
 * UploadProgressBarコンポーネント
 */
export const UploadProgressBar: React.FC<UploadProgressBarProps> = ({ progress, onCancel }) => {
  return (
    <div className={styles.progressContainer}>
      {/* プログレスヘッダー */}
      <div className={styles.progressHeader}>
        <div className={styles.progressPercentage}>{progress.percentage}%</div>
        <button className={styles.cancelButton} onClick={onCancel} type="button">
          {chrome.i18n.getMessage("cancelLabel") || "Cancel"}
        </button>
      </div>

      {/* プログレスバー */}
      <div className={styles.progressBar}>
        <div
          className={styles.progressFill}
          style={{ width: `${progress.percentage}%` }}
        />
      </div>

      {/* プログレス詳細 */}
      <div className={styles.progressDetails}>
        <div className={styles.progressDetailItem}>
          <span className={styles.progressDetailLabel}>
            {chrome.i18n.getMessage("uploadingLabel") || "Uploading"}:
          </span>
          <span className={styles.progressDetailValue}>
            {formatBytes(progress.uploadedBytes)} / {formatBytes(progress.totalBytes)}
          </span>
        </div>
        <div className={styles.progressDetailItem}>
          <span className={styles.progressDetailLabel}>Part:</span>
          <span className={styles.progressDetailValue}>
            {progress.currentPart} / {progress.totalParts}
          </span>
        </div>
        <div className={styles.progressDetailItem}>
          <span className={styles.progressDetailLabel}>Speed:</span>
          <span className={styles.progressDetailValue}>
            {formatBytes(progress.bytesPerSecond)}/s
          </span>
        </div>
        <div className={styles.progressDetailItem}>
          <span className={styles.progressDetailLabel}>Remaining:</span>
          <span className={styles.progressDetailValue}>
            {formatTime(progress.estimatedTimeRemaining)}
          </span>
        </div>
      </div>
    </div>
  );
};

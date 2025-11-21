/**
 * S3アップロードユーティリティ関数
 *
 * S3キーの保存、ファイル名生成などの
 * S3アップロードに関連するユーティリティ関数を提供します。
 */

/**
 * S3キーをChrome Storageに保存
 *
 * アップロード履歴として最新50件を保持し、最後にアップロードした
 * キーとタイムスタンプも個別に保存します。
 *
 * @param key - S3オブジェクトキー
 */
export async function saveS3Key(key: string): Promise<void> {
  return new Promise((resolve, reject) => {
    // 現在の履歴を取得
    chrome.storage.sync.get(["s3_upload_history"], (data) => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
        return;
      }

      // 既存の履歴を取得（配列として）
      const history = (data["s3_upload_history"] as string[] | undefined) || [];

      // 新しいキーを先頭に追加
      const newHistory = [key, ...history];

      // 最新50件のみを保持
      const limitedHistory = newHistory.slice(0, 50);

      // 現在のタイムスタンプ（Unix秒）
      const timestamp = Math.floor(Date.now() / 1000);

      // Chrome Storageに保存
      chrome.storage.sync.set(
        {
          s3_upload_history: limitedHistory,
          last_s3_upload_key: key,
          last_s3_upload_time: timestamp,
        },
        () => {
          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message));
          } else {
            resolve();
          }
        }
      );
    });
  });
}

/**
 * タイムスタンプ付きファイル名を生成
 *
 * @param originalFileName - 元のファイル名（拡張子含む）
 * @returns タイムスタンプ付きファイル名
 *
 * @example
 * generateFileName("recording.webm")
 * // => "recording_20250119_123456.webm"
 */
export function generateFileName(originalFileName: string): string {
  // 拡張子を抽出
  const lastDotIndex = originalFileName.lastIndexOf(".");
  const nameWithoutExt = lastDotIndex > 0 ? originalFileName.slice(0, lastDotIndex) : originalFileName;
  const extension = lastDotIndex > 0 ? originalFileName.slice(lastDotIndex) : "";

  // タイムスタンプを生成（YYYYMMDD_HHMMSS形式）
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  const hours = String(now.getHours()).padStart(2, "0");
  const minutes = String(now.getMinutes()).padStart(2, "0");
  const seconds = String(now.getSeconds()).padStart(2, "0");
  const timestamp = `${year}${month}${day}_${hours}${minutes}${seconds}`;

  // ファイル名を組み立て
  return `${nameWithoutExt}_${timestamp}${extension}`;
}

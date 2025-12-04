/**
 * 単一ファイルをアップロード (Presigned URLを使用)
 *
 * @param blob - アップロードするBlob
 * @param fileName - ファイル名
 * @param fileType - MIMEタイプ
 * @param uploadPath - アップロードパス
 * @param apiBaseUrl - APIのベースURL
 * @param authToken - 認証トークン
 * @returns アップロードされたS3キー
 */
export async function uploadSingleFile(
  blob: Blob,
  fileName: string,
  fileType: string,
  uploadPath: string,
  apiBaseUrl: string,
  authToken: string,
): Promise<string> {
  // 1. Presigned URLを取得
  const response = await fetch(`${apiBaseUrl}/api/s3/presigned-url`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${authToken}`,
    },
    body: JSON.stringify({
      fileName,
      fileType,
      uploadPath,
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(
      `Failed to get presigned URL: ${errorData.error || response.statusText}`,
    );
  }

  const { url, key } = await response.json();

  // 2. ファイルをアップロード
  const uploadResponse = await fetch(url, {
    method: "PUT",
    body: blob,
    headers: {
      "Content-Type": fileType,
    },
    cache: "no-store",
  });

  if (!uploadResponse.ok) {
    throw new Error(
      `Failed to upload file to S3: ${uploadResponse.statusText}`,
    );
  }

  return key;
}

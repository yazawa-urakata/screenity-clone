/**
 * アップロード状態管理ユーティリティ
 * Chrome Storageを使用してアップロード状態を永続化
 */

import type {
  OrphanedUpload,
  UploadedPart,
  UploadState,
} from "../../types/instantUpload";

const STORAGE_KEY = "currentUploadState";

/**
 * アップロード状態を保存
 */
export async function saveUploadState(
  state: Partial<UploadState>,
): Promise<void> {
  const currentState = await loadUploadState();
  const newState = { ...currentState, ...state };
  await chrome.storage.local.set({ [STORAGE_KEY]: newState });
  console.log("[UploadState] Saved:", newState);
}

/**
 * アップロード状態を読み込み
 */
export async function loadUploadState(): Promise<UploadState | null> {
  const result = await chrome.storage.local.get([STORAGE_KEY]);
  const state = result[STORAGE_KEY] as UploadState | undefined;
  if (!state) {
    return null;
  }
  console.log("[UploadState] Loaded:", state);
  return state;
}

/**
 * アップロード状態をクリア
 */
export async function clearUploadState(): Promise<void> {
  await chrome.storage.local.remove([STORAGE_KEY]);
  console.log("[UploadState] Cleared");
}

/**
 * アップロード済みパートを追加
 */
export async function addUploadedPart(part: UploadedPart): Promise<void> {
  const state = await loadUploadState();
  if (!state) {
    console.warn("[UploadState] No state found, cannot add part");
    return;
  }

  const existingPartIndex = state.uploadedParts.findIndex(
    (p) => p.partNumber === part.partNumber,
  );
  if (existingPartIndex >= 0) {
    // 既存のパートを更新
    state.uploadedParts[existingPartIndex] = part;
  } else {
    // 新しいパートを追加
    state.uploadedParts.push(part);
  }

  await saveUploadState({ uploadedParts: state.uploadedParts });
}

/**
 * アップロード状態の有効期限をチェック
 * 24時間以上経過している場合は無効
 */
export function isUploadStateValid(state: UploadState): boolean {
  const MAX_AGE_MS = 24 * 60 * 60 * 1000; // 24時間
  return Date.now() - state.initiatedAt < MAX_AGE_MS;
}

/**
 * 孤立したuploadIdをChrome Storageに追加
 */
export async function addOrphanedUpload(upload: OrphanedUpload): Promise<void> {
  const result = await chrome.storage.local.get(["orphanedUploads"]);
  const orphanedUploads = (result.orphanedUploads as OrphanedUpload[]) || [];

  // 既に存在する場合は更新
  const existingIndex = orphanedUploads.findIndex(
    (u: OrphanedUpload) => u.uploadId === upload.uploadId,
  );
  if (existingIndex >= 0) {
    orphanedUploads[existingIndex] = {
      ...orphanedUploads[existingIndex],
      lastAttemptAt: Date.now(),
      abortAttempts:
        orphanedUploads[existingIndex].abortAttempts + upload.abortAttempts,
    };
  } else {
    orphanedUploads.push(upload);
  }

  await chrome.storage.local.set({ orphanedUploads });
  console.log("[OrphanedUpload] Added:", upload);
}

/**
 * 孤立したuploadIdを取得
 */
export async function getOrphanedUploads(): Promise<OrphanedUpload[]> {
  const result = await chrome.storage.local.get(["orphanedUploads"]);
  const orphanedUploads = (result.orphanedUploads as OrphanedUpload[]) || [];
  return orphanedUploads;
}

/**
 * 孤立したuploadIdを削除
 */
export async function removeOrphanedUpload(uploadId: string): Promise<void> {
  const result = await chrome.storage.local.get(["orphanedUploads"]);
  const orphanedUploads = (result.orphanedUploads as OrphanedUpload[]) || [];
  const filtered = orphanedUploads.filter(
    (u: OrphanedUpload) => u.uploadId !== uploadId,
  );
  await chrome.storage.local.set({ orphanedUploads: filtered });
  console.log("[OrphanedUpload] Removed:", uploadId);
}

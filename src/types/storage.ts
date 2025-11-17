// Chrome Storage関連の型定義

import type { ClipList } from './clip';

// Chrome Storageに保存されるデータの型
export interface StorageData {
  // 録画設定
  recording: boolean;
  offscreenRecording: boolean;
  zoomEnabled: boolean;
  recordingType: string;
  recordingStartTime: number;
  recordingTab: number;
  recordedTabDomain: string;
  recordingToScene: boolean;
  recordingProjectTitle: string;
  customRegion: boolean;
  regionWidth: number;
  regionHeight: number;
  regionX: number;
  regionY: number;
  region: boolean;
  wasRegion: boolean;
  restarting: boolean;

  // クリップ録画関連
  clips: ClipList;
  /** クロップ選択中フラグ */
  clipSelecting?: boolean;
  clipRecording: boolean;
  clipStartTime: number | null;
  clipCrop: {
    x: number;
    y: number;
    width: number;
    height: number;
  } | null;

  // カメラ・オーディオ設定
  audioInput: string;
  videoInput: string;
  defaultAudioInput: string;
  defaultVideoInput: string;
  cameraDimensions: {
    width: number;
    height: number;
    x?: number;
    y?: number;
  };
  cameraFlipped: boolean;
  cameraActive: boolean;
  micActive: boolean;
  systemAudio: boolean;
  systemAudioVolume: number;
  setDevices: boolean;
  backgroundEffect: string;
  backgroundEffectsActive: boolean;

  // UI設定
  toolbarPosition: {
    x: number;
    y: number;
  };
  hideToolbar: boolean;
  hideUIAlerts: boolean;
  hideUI: boolean;
  bigTab: boolean;
  toolbarHover: boolean;
  popupPosition: {
    x: number;
    y: number;
  };
  color: string;
  strokeWidth: number;
  swatch: number;
  cursorMode: string;
  surface: string;
  tabPreferred: boolean;

  // 品質・パフォーマンス設定
  quality: string;
  qualityValue: number;
  fpsValue: number;

  // タイマー・アラーム設定
  countdown: boolean;
  countdownActive: boolean;
  countdownCancelled: boolean;
  isCountdownVisible: boolean;
  alarm: boolean;
  alarmTime: number;

  // ユーザー認証・サブスクリプション
  isLoggedIn: boolean;
  screenityToken: string;
  screenityUser: {
    id: string;
    name: string;
    email: string;
    avatar?: string;
    subscription?: string;
  };
  isSubscribed: boolean;
  proSubscription: {
    active: boolean;
    plan?: string;
    expiresAt?: number;
  };
  hasSubscribedBefore: boolean;
  wasLoggedIn: boolean;
  lastAuthCheck: number;
  token: string;

  // バックアップ・ストレージ
  backup: boolean;
  backupSetup: boolean;
  backupTab: number;
  failedRecording: {
    projectId?: string;
    timestamp?: number;
  };
  memoryError: boolean;

  // プロジェクト・マルチモード
  projectId: string;
  multiMode: boolean;
  multiSceneCount: number;
  multiProjectId: string;
  multiLastSceneId: string;
  sceneId: string;
  activeSceneId: string;
  uploadMeta: {
    fileName?: string;
    fileSize?: number;
    duration?: number;
  };
  clickEvents: Array<{
    x: number;
    y: number;
    timestamp: number;
  }>;

  // タブ・ウィンドウ管理
  activeTab: number;
  editorTab: number;
  tabRecordedID: number;
  sandboxTab: number;
  originalTabId: number;
  offscreen: boolean;
  displays: Array<{
    id: string;
    name: string;
    bounds: {
      left: number;
      top: number;
      width: number;
      height: number;
    };
  }>;
  recordedMonitorId: string;
  monitorBounds: {
    left: number;
    top: number;
    width: number;
    height: number;
  };

  // オンボーディング・通知
  onboarding: boolean;
  showProSplash: boolean;
  firstTime: boolean;
  firstTimePro: boolean;
  bannerSupport: boolean;
  updatingFromOld: boolean;
  askForPermissions: boolean;
  askMicrophone: boolean;
  askDismiss: boolean;
  pendingRecording: boolean;

  // その他の設定
  sortBy: string;
  instantMode: boolean;
  hasSeenInstantModeModal: boolean;
  sendingChunks: boolean;
  learntAboutPro: boolean;

  // 拡張性のため、追加のプロパティを許可
  [key: string]: unknown;
}

// ストレージキーの型
export type StorageKey = keyof StorageData;

// 型安全なストレージアクセスヘルパー
export async function getStorageItem<K extends StorageKey>(
  key: K
): Promise<StorageData[K] | undefined> {
  const result = await chrome.storage.local.get(key);
  return result[key] as StorageData[K] | undefined;
}

export async function getStorageItems<K extends StorageKey>(
  keys: K[]
): Promise<Pick<StorageData, K>> {
  const result = await chrome.storage.local.get(keys);
  return result as Pick<StorageData, K>;
}

export async function setStorageItem<K extends StorageKey>(
  key: K,
  value: StorageData[K]
): Promise<void> {
  await chrome.storage.local.set({ [key]: value });
}

export async function setStorageItems(
  items: Partial<StorageData>
): Promise<void> {
  await chrome.storage.local.set(items);
}

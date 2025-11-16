// メッセージング関連の型定義

// メッセージタイプの定義
export type MessageType =
  // 録画制御関連
  | 'start-recording'
  | 'stop-recording-tab'
  | 'stop-recording-tab-backup'
  | 'pause-recording-tab'
  | 'resume-recording-tab'
  | 'start-recording-tab'
  | 'cancel-recording'
  | 'restart-recording-tab'
  | 'dismiss-recording-tab'
  | 'dismiss-recording'
  | 'recording-error'
  | 'recording-complete'
  | 'recording-ended'
  | 'recording-check'
  | 'check-recording'
  | 'pause-recording'
  | 'restart-recording'
  // ストリーム/録画タイプ関連
  | 'start-stream'
  | 'ready-to-record'
  | 'stop-pending'
  | 'desktop-capture'
  | 'get-streaming-data'
  | 'streaming-data'
  | 'screen-update'
  // カメラ関連
  | 'switch-camera'
  | 'camera-only-update'
  | 'camera-toggled-toolbar'
  | 'toggle-pip'
  | 'pip-started'
  | 'pip-ended'
  | 'turn-off-pip'
  // 背景エフェクト関連
  | 'toggle-blur'
  | 'set-background-effect'
  | 'load-custom-effect'
  | 'background-effects-active'
  | 'background-effects-inactive'
  | 'backgroundEffectsActive'
  // ファイル処理関連
  | 'write-file'
  | 'video-ready'
  | 'new-chunk'
  | 'close-writable'
  // バックアップ関連
  | 'backup-created'
  | 'backup-error'
  | 'discard-backup'
  | 'discard-backup-restart'
  | 'init-backup'
  | 'restore-recording'
  | 'check-restore'
  // タブ/ウィンドウ管理関連
  | 'reset-active-tab'
  | 'reset-active-tab-restart'
  | 'focus-this-tab'
  | 'set-surface'
  | 'set-mic-active-tab'
  // 再起動関連
  | 'handle-restart'
  | 'handle-dismiss'
  | 'restarted'
  // UI/ポップアップ関連
  | 'toggle-popup'
  | 'toggle-extension'
  | 'hide-popup-recording'
  | 'setup-complete'
  | 'show-toast'
  // タイマー/時間関連
  | 'time'
  | 'time-warning'
  | 'time-stopped'
  | 'get-video-time'
  | 'add-alarm-listener'
  | 'clear-recording-alarm'
  // 権限関連
  | 'on-get-permissions'
  | 'check-capture-permissions'
  | 'extension-media-permissions'
  | 'screenity-get-permissions'
  | 'screenity-permissions'
  | 'screenity-permissions-loaded'
  // エディター/編集関連
  | 'load-ffmpeg'
  | 'add-audio-to-video'
  | 'crop-video'
  | 'cut-video'
  | 'mute-video'
  | 'reencode-video'
  | 'to-gif'
  | 'base64-to-blob'
  | 'blob-to-array-buffer'
  | 'fetch-file'
  | 'generate-thumbstrips'
  | 'get-audio'
  | 'get-frame'
  | 'has-audio'
  | 'crop-update'
  | 'ffmpeg-loaded'
  | 'ffmpeg-load-error'
  | 'ffmpeg-error'
  | 'updated-blob'
  | 'updated-array-buffer'
  | 'updated-has-audio'
  | 'new-frame'
  | 'download-gif'
  // ダウンロード関連
  | 'request-download'
  | 'indexed-db-download'
  | 'download-video'
  | 'download-indexed-db'
  // Google Drive関連
  | 'save-to-drive'
  | 'save-to-drive-fallback'
  | 'saved-to-drive'
  | 'sign-out-drive'
  // 認証/アカウント関連
  | 'check-auth-status'
  | 'check-auth'
  | 'refresh-auth'
  | 'handle-login'
  | 'handle-logout'
  | 'auth-expired'
  | 'AUTH_SUCCESS'
  | 'LOGIN_SUCCESS'
  | 'SIGN_OUT'
  // プロジェクト/ビデオ管理関連
  | 'create-video-project'
  | 'fetch-videos'
  | 'get-project-info'
  | 'open-popup-project'
  | 'OPEN_POPUP_PROJECT'
  | 'GET_PROJECT_INFO'
  | 'update-project-loading'
  | 'update-project-ready'
  | 'clear-project-recording'
  // エディター関連
  | 'prepare-open-editor'
  | 'prepare-editor-existing'
  | 'editor-ready'
  | 'preparing-recording'
  // マルチ録画関連
  | 'reopen-popup-multi'
  | 'finish-multi-recording'
  // システム/ブラウザ関連
  | 'get-platform-info'
  | 'is-pinned'
  | 'resize-window'
  | 'available-memory'
  | 'ping'
  | 'PING_FROM_WEBAPP'
  // ストレージ/クォータ関連
  | 'check-storage-quota'
  | 'clear-recordings'
  | 'force-processing'
  // ナビゲーション/外部リンク関連
  | 'review-screenity'
  | 'follow-twitter'
  | 'pricing'
  | 'open-processing-info'
  | 'upgrade-info'
  | 'trim-info'
  | 'join-waitlist'
  | 'chrome-update-info'
  | 'open-help'
  | 'memory-limit-help'
  | 'open-home'
  | 'report-bug'
  | 'handle-reactivate'
  | 'handle-upgrade'
  | 'open-account-settings'
  | 'open-support'
  // その他のUI関連
  | 'commands'
  | 'stream-error'
  | 'check-banner-support'
  | 'hide-banner'
  // モニター/ディスプレイ関連
  | 'get-monitor-for-window'
  // イベント関連
  | 'click-event'
  | 'crop-target'
  // Region Capture関連
  | 'screenity-region-capture-loaded';

// メッセージペイロードの基本インターフェース
export interface BaseMessage {
  type: MessageType;
  payload?: unknown;
}

// 録画関連メッセージ
export interface StartRecordingMessage extends BaseMessage {
  type: 'start-recording';
  payload?: {
    audio?: boolean;
    video?: boolean;
    screen?: boolean;
    camera?: boolean;
    microphoneId?: string;
    cameraId?: string;
    tabId?: number;
    recordingType?: string;
  };
}

export interface StopRecordingTabMessage extends BaseMessage {
  type: 'stop-recording-tab';
  save?: boolean;
}

export interface WriteFileMessage extends BaseMessage {
  type: 'write-file';
  index?: number;
}

export interface VideoReadyMessage extends BaseMessage {
  type: 'video-ready';
}

export interface RecordingErrorMessage extends BaseMessage {
  type: 'recording-error';
  error?: string;
}

// ストリーミング関連メッセージ
export interface GetStreamingDataMessage extends BaseMessage {
  type: 'get-streaming-data';
}

export interface StreamingDataMessage extends BaseMessage {
  type: 'streaming-data';
  data?: string;
}

// カメラ関連メッセージ
export interface SwitchCameraMessage extends BaseMessage {
  type: 'switch-camera';
  deviceId?: string;
}

export interface SetBackgroundEffectMessage extends BaseMessage {
  type: 'set-background-effect';
  effect?: string;
}

export interface PipMessage extends BaseMessage {
  type: 'pip-started' | 'pip-ended' | 'toggle-pip';
}

// ダウンロード関連メッセージ
export interface RequestDownloadMessage extends BaseMessage {
  type: 'request-download';
  base64: string;
  title: string;
}

export interface DownloadVideoMessage extends BaseMessage {
  type: 'download-video';
  base64: string;
  title: string;
}

// バックアップ関連メッセージ
export interface BackupCreatedMessage extends BaseMessage {
  type: 'backup-created';
}

export interface DiscardBackupMessage extends BaseMessage {
  type: 'discard-backup' | 'discard-backup-restart';
}

export interface RestoreRecordingMessage extends BaseMessage {
  type: 'restore-recording';
}

// タブ/ウィンドウ管理メッセージ
export interface ResetActiveTabMessage extends BaseMessage {
  type: 'reset-active-tab' | 'reset-active-tab-restart';
}

export interface SetSurfaceMessage extends BaseMessage {
  type: 'set-surface';
  surface?: string;
}

export interface FocusTabMessage extends BaseMessage {
  type: 'focus-this-tab';
  tabId?: number;
}

// 権限関連メッセージ
export interface CheckCapturePermissionsMessage extends BaseMessage {
  type: 'check-capture-permissions';
}

export interface OnGetPermissionsMessage extends BaseMessage {
  type: 'on-get-permissions';
  data?: any;
}

// Google Drive関連メッセージ
export interface SaveToDriveMessage extends BaseMessage {
  type: 'save-to-drive' | 'save-to-drive-fallback';
  fileName?: string;
  mimeType?: string;
}

export interface SavedToDriveMessage extends BaseMessage {
  type: 'saved-to-drive';
  success: boolean;
  url?: string;
}

// 認証関連メッセージ
export interface CheckAuthStatusMessage extends BaseMessage {
  type: 'check-auth-status' | 'check-auth';
}

export interface HandleLoginMessage extends BaseMessage {
  type: 'handle-login';
  token?: string;
  user?: any;
}

export interface HandleLogoutMessage extends BaseMessage {
  type: 'handle-logout';
}

// プロジェクト関連メッセージ
export interface CreateVideoProjectMessage extends BaseMessage {
  type: 'create-video-project';
  title?: string;
  projectId?: string;
}

export interface FetchVideosMessage extends BaseMessage {
  type: 'fetch-videos';
}

export interface GetProjectInfoMessage extends BaseMessage {
  type: 'get-project-info' | 'GET_PROJECT_INFO';
  projectId?: string;
}

// エディター関連メッセージ
export interface PrepareOpenEditorMessage extends BaseMessage {
  type: 'prepare-open-editor' | 'prepare-editor-existing';
  projectId?: string;
}

export interface EditorReadyMessage extends BaseMessage {
  type: 'editor-ready';
}

// FFmpeg関連メッセージ
export interface LoadFfmpegMessage extends BaseMessage {
  type: 'load-ffmpeg';
}

export interface CropVideoMessage extends BaseMessage {
  type: 'crop-video';
  x?: number;
  y?: number;
  width?: number;
  height?: number;
}

export interface CutVideoMessage extends BaseMessage {
  type: 'cut-video';
  start?: number;
  end?: number;
}

// システム関連メッセージ
export interface GetPlatformInfoMessage extends BaseMessage {
  type: 'get-platform-info';
}

export interface IsPinnedMessage extends BaseMessage {
  type: 'is-pinned';
}

export interface ResizeWindowMessage extends BaseMessage {
  type: 'resize-window';
  width: number;
  height: number;
}

export interface AvailableMemoryMessage extends BaseMessage {
  type: 'available-memory';
}

export interface PingMessage extends BaseMessage {
  type: 'ping';
}

// タイマー関連メッセージ
export interface TimeMessage extends BaseMessage {
  type: 'time';
  duration?: number;
}

export interface TimeWarningMessage extends BaseMessage {
  type: 'time-warning';
}

export interface AddAlarmListenerMessage extends BaseMessage {
  type: 'add-alarm-listener';
  time?: number;
}

// UI関連メッセージ
export interface ShowToastMessage extends BaseMessage {
  type: 'show-toast';
  message?: string;
  duration?: number;
}

export interface TogglePopupMessage extends BaseMessage {
  type: 'toggle-popup';
}

// イベント関連メッセージ
export interface ClickEventMessage extends BaseMessage {
  type: 'click-event';
  x?: number;
  y?: number;
  timestamp?: number;
}

// メッセージの型ガード（よく使用されるもののみ）
export function isStartRecordingMessage(
  message: BaseMessage
): message is StartRecordingMessage {
  return message.type === 'start-recording';
}

export function isStopRecordingTabMessage(
  message: BaseMessage
): message is StopRecordingTabMessage {
  return message.type === 'stop-recording-tab';
}

export function isVideoReadyMessage(
  message: BaseMessage
): message is VideoReadyMessage {
  return message.type === 'video-ready';
}

export function isRecordingErrorMessage(
  message: BaseMessage
): message is RecordingErrorMessage {
  return message.type === 'recording-error';
}

export function isPingMessage(
  message: BaseMessage
): message is PingMessage {
  return message.type === 'ping';
}

// メッセージハンドラーの型
export type MessageHandler<T extends BaseMessage = BaseMessage> = (
  message: T,
  sender: chrome.runtime.MessageSender,
  sendResponse: (response?: any) => void
) => void | boolean | Promise<any>;

// メッセージレスポンスの型
export interface MessageResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
}

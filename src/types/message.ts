// メッセージング関連の型定義

import type { SupabaseUser } from "./supabase";

// メッセージタイプの定義
export type MessageType =
  // 録画制御関連
  | "start-recording"
  | "stop-recording-tab"
  | "pause-recording-tab"
  | "resume-recording-tab"
  | "start-recording-tab"
  | "cancel-recording"
  | "restart-recording-tab"
  | "dismiss-recording-tab"
  | "dismiss-recording"
  | "recording-error"
  | "recording-complete"
  | "recording-ended"
  | "recording-check"
  | "check-recording"
  | "pause-recording"
  | "restart-recording"
  // ストリーム/録画タイプ関連
  | "start-stream"
  | "ready-to-record"
  | "stop-pending"
  | "desktop-capture"
  | "get-streaming-data"
  | "streaming-data"
  // PiP関連
  | "pip-started"
  | "pip-ended"
  | "turn-off-pip"
  // ファイル処理関連
  | "video-ready"
  | "new-chunk"
  // バックアップ関連
  | "restore-recording"
  | "check-restore"
  // タブ/ウィンドウ管理関連
  | "reset-active-tab"
  | "reset-active-tab-restart"
  | "focus-this-tab"
  | "set-surface"
  | "set-mic-active-tab"
  // 再起動関連
  | "handle-restart"
  | "handle-dismiss"
  | "restarted"
  // UI/ポップアップ関連
  | "toggle-popup"
  | "hide-popup-recording"
  | "setup-complete"
  | "show-toast"
  // タイマー/時間関連
  | "time"
  | "time-warning"
  | "time-stopped"
  | "get-video-time"
  | "add-alarm-listener"
  | "clear-recording-alarm"
  // 権限関連
  | "on-get-permissions"
  | "check-capture-permissions"
  | "extension-media-permissions"
  | "screenity-get-permissions"
  | "screenity-permissions"
  | "screenity-permissions-loaded"
  // エディター/編集関連
  | "load-ffmpeg"
  | "add-audio-to-video"
  | "crop-video"
  | "cut-video"
  | "reencode-video"
  | "get-frame"
  | "crop-update"
  | "ffmpeg-loaded"
  | "ffmpeg-load-error"
  | "ffmpeg-error"
  | "updated-blob"
  | "new-frame"
  // 認証/アカウント関連
  | "handle-login"
  | "handle-logout"
  // プロジェクト/ビデオ管理関連
  | "update-project-ready"
  // エディター関連
  | "editor-ready"
  | "preparing-recording"
  // マルチ録画関連
  | "reopen-popup-multi"
  | "finish-multi-recording"
  // システム/ブラウザ関連
  | "get-platform-info"
  | "is-pinned"
  | "resize-window"
  | "available-memory"
  | "ping"
  // ストレージ/クォータ関連
  | "check-storage-quota"
  | "clear-recordings"
  | "force-processing"
  // ナビゲーション/外部リンク関連
  | "review-screenity"
  | "follow-twitter"
  | "pricing"
  | "open-processing-info"
  | "upgrade-info"
  | "trim-info"
  | "join-waitlist"
  | "chrome-update-info"
  | "open-help"
  | "memory-limit-help"
  | "open-home"
  | "report-bug"
  | "handle-reactivate"
  | "handle-upgrade"
  | "open-account-settings"
  | "open-support"
  // その他のUI関連
  | "commands"
  | "stream-error"
  | "check-banner-support"
  | "hide-banner"
  // イベント関連
  | "click-event"
  | "crop-target"
  // Region Capture関連
  | "screenity-region-capture-loaded"
  // クリップ録画関連
  | "save-clip"
  | "clip-saved"
  | "clip-error"
  // Supabase認証関連
  | "SUPABASE_SESSION_SYNCED"
  | "SUPABASE_SESSION_EXPIRED"
  | "SUPABASE_AUTH_CHECK"
  | "SUPABASE_CLEAR_AUTH"
  | "SUPABASE_SET_AUTH"
  | "SUPABASE_LOGIN_REQUEST"
  | "AUTH_STATE_CHANGED";

// メッセージペイロードの基本インターフェース
export interface BaseMessage {
  type: MessageType;
  payload?: unknown;
}

// 録画エラーメッセージ
export interface RecordingErrorMessage extends BaseMessage {
  type: "recording-error";
  error?: string;
  why?: string;
}

// クリップ保存メッセージ
export interface SaveClipMessage extends BaseMessage {
  type: "save-clip";
  payload: {
    clipData: {
      id: string;
      startTime: number;
      endTime: number;
      duration: number;
      crop?: {
        x: number;
        y: number;
        width: number;
        height: number;
      };
      createdAt: number;
      recordingId?: string;
    };
  };
}

// Supabase認証関連メッセージ
export interface SupabaseSessionSyncedMessage extends BaseMessage {
  type: "SUPABASE_SESSION_SYNCED";
  payload: {
    user: SupabaseUser;
    expiresAt: number;
  };
}

export interface SupabaseSessionExpiredMessage extends BaseMessage {
  type: "SUPABASE_SESSION_EXPIRED";
}

export interface SupabaseAuthCheckMessage extends BaseMessage {
  type: "SUPABASE_AUTH_CHECK";
}

export interface SupabaseLoginRequestMessage extends BaseMessage {
  type: "SUPABASE_LOGIN_REQUEST";
}

// メッセージハンドラーの型
export type MessageHandler<T extends BaseMessage = BaseMessage> = (
  message: T,
  sender: chrome.runtime.MessageSender,
  sendResponse: (response?: unknown) => void,
) => undefined | boolean | unknown | Promise<unknown>;

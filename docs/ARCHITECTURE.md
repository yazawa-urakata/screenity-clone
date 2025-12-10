# Screenity Clone - アーキテクチャドキュメント

**Manifest**: Chrome Extension Manifest V3
**最終更新**: 2025-12-11

---

## 概要

Screenity Clone は Chrome 拡張機能 (MV3) として実装された画面録画ツールです。

### 主要機能

- **画面録画**: タブ/ウィンドウ/デスクトップ/領域の録画
- **クリップ録画**: 長時間録画中の特定区間マーキング（最大5クリップ、各60秒まで）
- **Instant Upload**: S3 マルチパートアップロード（リアルタイム）
- **音声ミキシング**: マイク + システム音声の Web Audio API ミキシング
- **バックアップ/復旧**: IndexedDB による録画チャンク保存

### コード規模

- 129 ファイル (TS/TSX/JS/JSX)
- 11 エントリーポイント
- 136 メッセージタイプ

---

## 技術スタック

### Core

- **React 18.2** + **TypeScript 5.0**
- **Webpack 5** + Babel
- **SCSS** + ShadowDOM (スタイル分離)
- **Biome** - コード品質管理

### Recording/Video

- **MediaRecorder API** - ネイティブ録画
- **Chrome APIs**: `tabCapture`, `desktopCapture`, `getUserMedia`, `offscreen`
- **Web Audio API** - 入出力音声ミキシング
- **fix-webm-duration** / **webm-duration-fix** - WebM メタデータ修正

### UI Components

- **Radix UI** - アクセシブルなコンポーネント（alert-dialog, dropdown-menu, select, switch, toast, toolbar, tooltip）
- **react-rnd 10.4** - ドラッグ/リサイズ

### Storage & Upload

- **IndexedDB** (localforage 1.10) - 録画チャンク保存（DB: "screenity", Store: "chunks"）
- **Chrome Storage API** - 設定永続化
- **Fetch API** - S3 マルチパートアップロード

---

## エントリーポイント

### 11個のエントリーポイント

| エントリー | パス | 役割 |
|-----------|------|------|
| background | `src/pages/Background/index.ts` | Service Worker (録画ライフサイクル管理) |
| contentScript | `src/pages/Content/index.tsx` | Content Script (ShadowDOM 内 UI) |
| recorder | `src/pages/Recorder/index.tsx` | MediaRecorder による録画実行 |
| recorderoffscreen | `src/pages/RecorderOffscreen/index.jsx` | MV3 準拠のオフスクリーン録画 |
| sandbox | `src/pages/Sandbox/index.jsx` | 録画結果表示・ダウンロード UI |
| editorfallback | `src/pages/EditorFallback/index.jsx` | 簡易編集 UI |
| permissions | `src/pages/Permissions/index.tsx` | 権限要求 UI |
| setup | `src/pages/Setup/index.tsx` | 初回セットアップガイド |
| region | `src/pages/Region/index.tsx` | 領域選択 UI |
| playground | `src/pages/Playground/index.tsx` | テスト/デモページ |
| supabaseAuthSync | `src/pages/SupabaseAuthSync/index.ts` | 認証同期 (localhost:3000 のみ) |

### Manifest 登録

```json
{
  "background": {
    "service_worker": "background.bundle.js"
  },
  "content_scripts": [
    {
      "matches": ["<all_urls>"],
      "js": ["contentScript.bundle.js"]
    },
    {
      "matches": ["http://localhost:3000/*"],
      "js": ["supabaseAuthSync.bundle.js"]
    }
  ]
}
```

---

## システムアーキテクチャ

### 録画フロー

```txt
1. ユーザーアクション (Alt+Shift+G / UI)
   ↓
2. Background Service Worker (startRecording)
   - Chrome Storage 設定 (recording=true, recordingStartTime)
   - 拡張機能アイコン変更
   ↓
3. Offscreen Document 作成 (MV3 対応)
   - URL: recorderoffscreen.html
   - Reasons: USER_MEDIA, AUDIO_PLAYBACK, DISPLAY_MEDIA
   ↓
4. Recorder 初期化
   - MediaRecorder 生成
   - Web Audio Context セットアップ (マイク + システム音声)
   - InstantUploader 初期化 (オプション)
   ↓
5. 録画実行
   - チャンク保存: IndexedDB ("screenity" DB, "chunks" store)
   - リアルタイムアップロード: S3 マルチパート (5MB バッファ)
```

### Offscreen Documents (MV3 対応)

Background から Offscreen Document を生成して録画を実行：

```typescript
await chrome.offscreen.createDocument({
  url: "recorderoffscreen.html",
  reasons: ["USER_MEDIA", "AUDIO_PLAYBACK", "DISPLAY_MEDIA"],
  justification: "Recording from getDisplayMedia API"
});
```

**目的**: クロスオリジン制約の回避、重い処理の分離

---

## クリップ録画システム

### クリップデータ構造

**ファイル**: `src/types/clip.ts`

```typescript
interface ClipMetadata {
  id: string;              // クリップ ID
  startTime: number;       // 開始時刻 (ms)
  endTime: number;         // 終了時刻 (ms)
  duration: number;        // 長さ (ms)
  crop?: ClipCropRegion;   // トリミング領域
  createdAt: number;       // 作成日時
}
```

### フロー

```txt
1. startClipSelection() → clipStartTime 記録 (:507)
2. confirmClipSelection() → clipEndTime 記録 → メタデータ生成 (:577)
3. Background で検証 → Chrome Storage に保存
4. Content Script へ通知 (clip-saved)
```

### 制限

**ファイル**: `src/utils/clipUtils.ts`

| 定数 | 値 | 説明 |
|------|-----|------|
| MAX_CLIPS | 5 | 最大クリップ数 |
| MAX_CLIP_DURATION_MS | 60,000 | 最大クリップ長（60秒） |

---

## Instant Upload (S3)

### アーキテクチャ

**ファイル**: `src/pages/Recorder/InstantUploader.ts`

```txt
1. 初期化
   POST /api/s3/multipart/initiate → { uploadId, key }

2. チャンク処理
   - バッファリング (最小 5MB)
   - 自動フラッシュ

3. パートアップロード
   POST /api/s3/multipart/part-url → presigned URL
   XHR PUT → S3 (進捗トラッキング: 200ms スロットリング)

4. 完了
   POST /api/s3/multipart/complete → { parts: [{ partNumber, etag }] }
```

### 設定

**ファイル**: `src/pages/Recorder/useInstantUpload.ts`

| 設定 | 値 |
|------|-----|
| 最小パートサイズ | 5MB |
| 最大パートサイズ | 20MB |
| 進捗スロットリング | 200ms |
| XHRタイムアウト | 60秒 |

### リトライ設定

**ファイル**: `src/pages/Recorder/retryUtils.ts`

| 操作 | 最大試行 | 初期遅延 | 最大遅延 |
|------|---------|---------|---------|
| initiate | 3 | 1秒 | 8秒 |
| partUrl | 5 | 1秒 | 16秒 |
| s3Put | 3 | 2秒 | 16秒 |
| complete | 5 | 2秒 | 32秒 |
| abort | 3 | 1秒 | 8秒 |

---

## メッセージアーキテクチャ

### 統計

**総数**: 136 メッセージタイプ (`src/types/message.ts`)

**主要カテゴリ**:

| カテゴリ | 例 |
|---------|-----|
| 録画制御 | start-recording, stop-recording-tab, pause-recording-tab |
| クリップ録画 | save-clip, clip-saved, clip-error |
| Supabase Auth | SUPABASE_SESSION_SYNCED, SUPABASE_LOGIN_REQUEST |
| Editor | crop-video, cut-video, reencode-video |
| その他 | ストリーム、ファイル、バックアップ、タイマー等 |

### Message-Driven Architecture

**実装**: `src/messaging/messageRouter.ts`

```txt
Background ↔ Content ↔ Recorder

- 型安全なメッセージング (TypeScript 型定義)
- 非同期ハンドラーサポート
```

---

## 状態管理

### ContentStateContext

**ファイル**: `src/pages/Content/context/ContentState.tsx`

React Context で約 140 の状態プロパティを管理。

#### 主要プロパティ

**録画状態**:

```typescript
recording: boolean          // 録画中
paused: boolean            // 一時停止中
timer: number              // 録画時間 (秒)
time: number               // 経過時間
timeWarning: boolean       // 時間制限警告
```

**デバイス設定**:

```typescript
micActive: boolean                     // マイク有効
defaultAudioInput: string              // 選択中のマイク
audioInput: MediaDeviceInfo[]          // 利用可能なマイク
pushToTalk?: boolean                   // プッシュ・トゥ・トーク
setDevices: boolean                    // デバイス設定済み
```

**クリップ録画**:

```typescript
clipSelecting: boolean                 // クリップ選択中
clipRecording: boolean                 // クリップ録画中
clipStartTime: number | null           // クリップ開始時刻 (ms)
clipCrop: ClipCropRegion | null        // クロップ領域
clips: ClipList                        // 保存済みクリップ一覧
startClipSelection: () => void         // クリップ選択開始
confirmClipSelection: () => void       // クリップ選択確定
cancelClipSelection: () => void        // クリップ選択キャンセル
endClipRecording: () => void           // クリップ録画終了
```

**録画設定**:

```typescript
recordingType: string                  // 'screen'|'tab'|'region'
customRegion: boolean                  // カスタム領域選択
regionWidth: number                    // 領域幅
regionHeight: number                   // 領域高さ
quality: string                        // 録画品質
offscreenRecording: boolean            // オフスクリーン録画
```

**UI 状態**:

```typescript
showPopup: boolean                     // ポップアップ表示
popupPosition: { left, right, top, bottom, offsetX, offsetY, fixed }
toolbarPosition: { left, right, bottom, top, offsetX, offsetY }
hideToolbar: boolean                   // ツールバー非表示
hideUI: boolean                        // UI 非表示
```

**認証状態**:

```typescript
isLoggedIn: boolean                    // ログイン状態
screenityUser: { name?, email? } | null // ユーザー情報
hasSeenInstantModeModal: boolean       // インスタントモード説明表示済み
instantMode: boolean                   // インスタントモード有効
```

### Chrome Storage 同期

Background の各種リスナーが状態を同期：

- タブアクティベート/更新/削除
- ウィンドウフォーカス変更
- アラームイベント

**保存例**: `recording`, `recordingTab`, `recordingStartTime`, `offscreen`, `clips`, `qualityValue`, `fpsValue`

---

## パフォーマンス設計

### チャンクベースストレージ

- **バッファフラッシュ**: 5MB
- IndexedDB へのチャンク単位保存

### 進捗スロットリング

- **InstantUpload**: 200ms

### メモリ管理

- 各ページ個別バンドル (Lazy Loading)
- IndexedDB ベースのチャンク保存
- Offscreen Document 活用

---

## セキュリティ

### Manifest V3 パーミッション

```json
{
  "permissions": [
    "identity",
    "activeTab",
    "storage",
    "unlimitedStorage",
    "downloads",
    "tabs",
    "tabCapture",
    "scripting",
    "system.display",
    "alarms"
  ],
  "optional_permissions": [
    "offscreen",
    "desktopCapture",
    "clipboardWrite"
  ]
}
```

### Content Security Policy

```json
{
  "content_security_policy": {
    "extension_pages": "script-src 'self' 'wasm-unsafe-eval'; object-src 'self'; media-src 'self' data: blob: *;",
    "sandbox": "sandbox allow-scripts allow-modals allow-popups; script-src 'self' 'unsafe-inline' 'unsafe-eval' blob:;"
  }
}
```

### プライバシー設計

1. **ローカル処理**: すべての録画・編集はブラウザ内で完結
2. **オプショナルアップロード**: S3 アップロードはユーザー選択
3. **IndexedDB 保存**: 一時データはブラウザに保存
4. **データ収集なし**: 分析トラッキングなし

---

## まとめ

Screenity Clone の特徴：

- **最新技術**: React 18.2, TypeScript 5.0, Manifest V3
- **モジュール設計**: 11 エントリーポイント、明確な責務分離
- **プライバシー重視**: ローカル処理、ユーザー制御
- **高機能**: 画面/タブ/領域録画、クリップ、S3 アップロード
- **型安全メッセージング**: 136 メッセージタイプ
- **状態管理**: ContentStateContext (約140 プロパティ)
- **スケーラビリティ**: 129 ソースファイル、整理された構造

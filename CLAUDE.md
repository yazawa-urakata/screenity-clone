# Screenity Clone - Chrome Screen Recorder Extension

## 概要

Screenity Clone は画面録画機能を提供する Chrome 拡張機能（MV3）です。
画面/タブ/領域の録画、音声ミキシング、クリップ録画、S3へのリアルタイムアップロードを備えたレコーダーです。

## アーキテクチャ

### エントリーポイント

| コンポーネント | パス | 役割 |
|------------|------|------|
| Service Worker | `src/pages/Background/index.ts` | 録画ライフサイクル・メッセージング管理 |
| Content Script | `src/pages/Content/index.tsx` | ShadowDOM 内の UI（ポップアップ/ツールバー） |
| Recorder | `src/pages/Recorder/index.tsx` | MediaRecorder による録画実行 |
| Offscreen Recorder | `src/pages/RecorderOffscreen/index.jsx` | MV3 準拠のオフスクリーン録画 |
| Sandbox | `src/pages/Sandbox/index.jsx` | 録画結果表示・ダウンロードUI（Player モード） |
| EditorFallback | `src/pages/EditorFallback/index.jsx` | 簡易編集UI（Sandbox を iframe で埋め込み） |
| Setup | `src/pages/Setup/index.tsx` | 初回セットアップガイド |
| Playground | `src/pages/Playground/index.tsx` | 開発/テスト用プレイグラウンド |
| Region | `src/pages/Region/index.tsx` | 領域選択UI |
| Permissions | `src/pages/Permissions/index.tsx` | 権限要求UI |
| SupabaseAuthSync | `src/pages/SupabaseAuthSync/index.ts` | 認証同期（localhost:3000 のみ） |

### 主要なディレクトリ構造

```txt
src/
├── pages/
│   ├── Background/        # Service Worker（46ファイル）
│   ├── Content/           # Content Script + UI（63ファイル）
│   ├── Recorder/          # MediaRecorder 実装 + InstantUploader（14ファイル）
│   ├── RecorderOffscreen/ # Offscreen Document 録画
│   ├── Sandbox/           # 結果表示パネル（14ファイル）
│   ├── EditorFallback/    # Sandbox を埋め込む編集UI
│   ├── Setup/             # 初回セットアップ
│   ├── Playground/        # 開発/テスト用
│   ├── Region/            # 領域選択
│   ├── Permissions/       # 権限要求
│   └── SupabaseAuthSync/  # 認証同期
├── messaging/             # メッセージルーター
├── types/                 # TypeScript 型定義（message.ts に 136 メッセージタイプ）
└── manifest.json          # 拡張機能マニフェスト
```

## 技術スタック

### Core

- **React 18.2** + **TypeScript 5.0**
- **Webpack 5** + Babel
- **SCSS** + ShadowDOM（スタイル分離）
- **Biome** - コード品質管理

### Recording/Video

- **MediaRecorder API** - ネイティブ録画
- **Chrome APIs**: `tabCapture`, `desktopCapture`, `getUserMedia`
- **Web Audio API** - 入出力音声ミキシング
- **fix-webm-duration** / **webm-duration-fix** - WebM メタデータ修正

### UI Components

- **Radix UI** - アクセシブルなコンポーネントライブラリ（alert-dialog, dropdown-menu, select, switch, toast, toolbar, tooltip）
- **react-rnd 10.4** - ドラッグ/リサイズ

### Storage & Upload

- **IndexedDB** (localforage 1.10) - 録画チャンク保存・復旧
- **Chrome Storage API** - 設定永続化
- **Fetch API** - S3 マルチパートアップロード（InstantUploader）

## 状態管理

### ContentStateContext

Content Script の React Context で約 140 の状態プロパティを管理：

- 録画状態（paused, recording, timer, time）
- デバイス選択（audioInput, defaultAudioInput, micActive）
- UI 状態（popupPosition, toolbarPosition, hideToolbar, showPopup）
- クリップ録画（clipSelecting, clipRecording, clipStartTime, clipCrop, clips）
- 認証状態（isLoggedIn, screenityUser, hasSeenInstantModeModal）

実装場所: `src/pages/Content/context/ContentState.tsx`

### Message-Driven Architecture

`src/messaging/messageRouter.ts` で Background ↔ Content ↔ Recorder 間の通信を型安全に実装。
メッセージタイプは `src/types/message.ts` に 136 種類定義。

## 主要機能

### 録画モード

- **Screen**: 全画面/モニター選択
- **Tab**: 特定タブのみ
- **Region**: カスタム矩形領域
- **Audio**: マイク + システム音声

### 録画制御

- **開始/停止**: `startRecording`, `stopRecording`
- **一時停止/再開**: `pauseRecording`, `resumeRecording`
- **破棄**: `dismissRecording`

### クリップ録画

長時間の録画中に特定区間をマーキングする機能：

- `startClipSelection`: クリップ選択開始、リージョンUI表示（:507）
- `confirmClipSelection`: クリップ確定、録画開始（:577）
- `cancelClipSelection`: クリップ選択キャンセル（:632）
- `endClipRecording`: クリップ録画終了、60秒制限自動停止（:654）

制限事項:

- 最大クリップ時間: `MAX_CLIP_DURATION_MS`（60秒）
- 最大クリップ数: `MAX_CLIPS`（5個）

実装場所: `src/pages/Content/context/ContentState.tsx:507-700`
定数定義: `src/utils/clipUtils.ts`

### Instant Upload（S3 マルチパートアップロード）

録画中にリアルタイムで S3 にチャンクをアップロードする機能：

| ファイル | 役割 |
|---------|------|
| `InstantUploader.ts` | S3 マルチパートアップロード実装 |
| `useInstantUpload.ts` | React フック |
| `uploadStateManager.ts` | アップロード状態永続化 |
| `retryUtils.ts` | 指数バックオフリトライ |
| `uploadUtils.ts` | ユーティリティ関数 |
| `abortUtils.ts` | 中断処理 |
| `recorderConfig.ts` | 設定（ビットレート、解像度） |
| `mediaRecorderUtils.ts` | MediaRecorder セットアップ |

- バッファサイズ: 5MB 以上で自動フラッシュ
- 失敗パートの自動リトライ機能

実装場所: `src/pages/Recorder/`

### 結果表示（Sandbox）

録画後の結果表示UI（Player モードのみ）：

- **SimpleResultPanel**: タイトル表示、クリップ一覧、S3 アップロード状態表示
- **Player**: シンプルな動画再生コンポーネント
- **ClipsPanel**: クリップ一覧表示

実装場所: `src/pages/Sandbox/components/player/SimpleResultPanel.tsx`

### 認証（Supabase）

- **SupabaseAuthSync**: `localhost:3000` でのみ動作する認証同期スクリプト
- Content Script として manifest.json に定義

実装場所: `src/pages/SupabaseAuthSync/index.ts`

## 開発

### ビルドコマンド

```bash
npm start          # 開発サーバー（Hot Reload）
npm run build      # プロダクションビルド
npm run watch      # ウォッチモード
npm run dev        # Hot Reload（npm run hot-reload のエイリアス）
```

### コード品質

```bash
npm run biome:check   # Biome によるチェック
npm run biome:format  # Biome によるフォーマット
npm run biome:lint    # Biome によるリント
npm run knip          # 未使用ファイル検出
```

### TypeScript 移行

- 120 TS/TSX ファイル、9 JS/JSX ファイル（93% 完了）
- `TYPESCRIPT_MIGRATION_CHECKLIST.md` 参照

### キーボードショートカット

- `Alt+Shift+G`: 録画開始
- `Alt+Shift+X`: 録画キャンセル
- `Alt+Shift+M`: 一時停止/再開

## 重要な実装パターン

### ShadowDOM Isolation

Content Script は ShadowDOM でスタイル分離を実現（`src/pages/Content/index.tsx`）

### Offscreen Documents（MV3 対応）

Background から Offscreen Document を生成して録画を実行し、クロスオリジン制約を回避（`src/pages/Background/offscreen/`）

実装: `src/pages/Background/offscreen/offscreenDocument.ts`

```typescript
await chrome.offscreen.createDocument({
  url: "recorderoffscreen.html",
  reasons: ["USER_MEDIA", "AUDIO_PLAYBACK", "DISPLAY_MEDIA"],
  justification: "Recording from getDisplayMedia API",
});
```

### Chunk-based Storage

録画データを IndexedDB にチャンク単位で保存してメモリオーバーフロー防止

- DB名: "screenity"
- Store名: "chunks"
- ライブラリ: localforage 1.10

### Message Type Safety

`src/types/message.ts` で定義された 136 種類のメッセージタイプにより、メッセージ送受信を型安全に実装

- messageRouter.ts: registerMessage, messageDispatcher
- message.ts: MessageType 型定義、各種ペイロードインターフェース

## パフォーマンス考慮事項

- 録画品質: 360p～1440p+ 設定可能
- FPS: 15～60fps 調整可能
- チャンクベースストリーミング（メモリ効率化）
- Lazy Loading（各ページ個別バンドル）
- Instant Upload による段階的アップロード（5MB バッファ）

## プライバシー設計

- ローカル処理が基本（サーバーアップロード不要）
- 全データは IndexedDB/Chrome Storage に保存
- オプショナルな S3 アップロード（Instant Upload）
- データ収集なし

## 参考リソース

- **Manifest**: `src/manifest.json` - 権限・エントリーポイント定義
- **Message Types**: `src/types/message.ts` - 全メッセージ型定義（136種類）
- **Storage Types**: `src/types/storage.ts` - ストレージスキーマ
- **Clip Types**: `src/types/clip.ts` - クリップ録画関連型定義
- **Background Service Worker**: `src/pages/Background/` - 46 モジュール

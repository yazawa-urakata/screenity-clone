# Screenity Clone - Chrome Screen Recorder Extension

## 概要

Screenity Clone は画面録画機能を提供する Chrome 拡張機能（MV3）です。
画面/タブ/領域の録画、音声ミキシング、クリップ録画、S3へのリアルタイムアップロードを備えたレコーダーです。

**Version**: 4.0.0 | **License**: GPLv3

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
| Backup | `src/pages/Backup/index.jsx` | IndexedDB からの録画復旧 |
| Region | `src/pages/Region/index.tsx` | 領域選択UI |
| Permissions | `src/pages/Permissions/index.tsx` | 権限要求UI |
| SupabaseAuthSync | `src/pages/SupabaseAuthSync/index.ts` | 認証同期（localhost:3000 のみ） |

### 主要なディレクトリ構造

```txt
src/
├── pages/
│   ├── Background/        # Service Worker（47ファイル）
│   ├── Content/           # Content Script + UI（toolbar, popup, warning等）
│   ├── Recorder/          # MediaRecorder 実装 + InstantUploader
│   ├── RecorderOffscreen/ # Offscreen Document 録画
│   ├── Sandbox/           # 結果表示パネル（SimpleResultPanel）
│   ├── EditorFallback/    # Sandbox を埋め込む編集UI
│   ├── Setup/             # 初回セットアップ
│   ├── Backup/            # 録画復旧
│   ├── Region/            # 領域選択
│   ├── Permissions/       # 権限要求
│   └── SupabaseAuthSync/  # 認証同期
├── messaging/             # 型安全なメッセージング（150+種類）
├── types/                 # TypeScript 型定義
└── manifest.json          # 拡張機能マニフェスト
```

## 技術スタック

### Core

- **React 18.2** + **TypeScript 5.0**（移行中）
- **Webpack 5** + Babel
- **SCSS** + ShadowDOM（スタイル分離）

### Recording/Video

- **MediaRecorder API** - ネイティブ録画
- **Chrome APIs**: `tabCapture`, `desktopCapture`, `getUserMedia`
- **Web Audio API** - 入出力音声ミキシング
- **Plyr 3.7** - ビデオプレイヤー
- **fix-webm-duration** - WebM メタデータ修正

### UI Components

- **Radix UI** - アクセシブルなコンポーネントライブラリ（アラート、ドロップダウン、ポップオーバー、スライダー、トースト等）
- **react-rnd 10.4** - ドラッグ/リサイズ
- **react-advanced-cropper 0.19** - 領域選択
- **react-hotkeys-hook 4.4** - キーボードショートカット

### Storage & Upload

- **IndexedDB** (localforage 1.10) - 録画チャンク保存・復旧
- **Chrome Storage API** - 設定永続化
- **Axios 1.6** - S3 マルチパートアップロード（InstantUploader）

### その他

- **JSZip 3.10** - ファイル圧縮

## 状態管理

### ContentStateContext

Content Script の React Context で 180+ の状態プロパティを管理：

- 録画状態（paused, recording, timer）
- デバイス選択（camera, microphone）
- UI 状態（popup position, toolbar visibility）
- クリップ録画（clipRecording, clipSelectionActive, clipStartTime, clipEndTime）

### Message-Driven Architecture

`src/messaging/messageRouter.ts` で Background ↔ Content ↔ Recorder 間の通信を型安全に実装。

## 主要機能

### 録画モード

- **Screen**: 全画面/モニター選択
- **Tab**: 特定タブのみ
- **Region**: カスタム矩形領域（react-advanced-cropper）
- **Audio**: マイク + システム音声

### 録画制御

- **開始/停止**: `startRecording`, `stopRecording`
- **一時停止/再開**: `pauseRecording`, `resumeRecording`
- **破棄**: `dismissRecording`

### クリップ録画

長時間の録画中に特定区間をマーキングする機能：

- `startClipSelection`: クリップ開始時刻を記録
- `confirmClipSelection`: クリップ終了時刻を記録
- `cancelClipSelection`: クリップ選択をキャンセル
- `endClipRecording`: クリップ録画を終了

実装場所: `src/pages/Content/context/ContentState.tsx:407-487`

### Instant Upload（S3 マルチパートアップロード）

録画中にリアルタイムで S3 にチャンクをアップロードする機能：

- **InstantUploader.ts**: S3 マルチパートアップロード実装
- **useInstantUpload hook**: React フック
- バッファサイズ 5MB 以上で自動フラッシュ

実装場所: `src/pages/Recorder/InstantUploader.ts`

### 結果表示（Sandbox）

録画後の結果表示UI（簡略化版）：

- **SimpleResultPanel**: タイトル表示、クリップ一覧、S3 アップロード状態表示
- **Player モード**: 動画再生機能は削除済み
- **EditorNav/AudioNav**: 簡易編集UI

実装場所: `src/pages/Sandbox/components/player/SimpleResultPanel.tsx`

### バックアップ/復旧

- IndexedDB（localforage）による録画チャンク保存
- Backup ページで復旧可能
- チャンク単位での保存によるメモリオーバーフロー防止

実装場所: `src/pages/Backup/index.jsx`

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
```

### TypeScript 移行

- 171 TS ファイル、一部 JSX → TSX 移行中
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

実装: `src/pages/Background/offscreen/offscreenDocument.ts:129-133`

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

`src/messaging/` で定義された型により、メッセージ送受信を型安全に実装

- messageRouter.ts: registerMessage, messageDispatcher
- message.ts: 150+ メッセージタイプ定義

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

## ビルド結果

- **ビルドサイズ**: 5.6MB
- **アセット数**: 136 ファイル

## 参考リソース

- **Manifest**: `src/manifest.json` - 権限・エントリーポイント定義
- **Message Types**: `src/messaging/` - 全メッセージ型定義
- **Storage Types**: `src/types/storage.ts` - ストレージスキーマ
- **Background Service Worker**: `src/pages/Background/` - 47 モジュール

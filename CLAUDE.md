# Screenity - Chrome Screen Recorder Extension

## 概要

Screenity は画面録画・注釈ツールを提供する Chrome 拡張機能（MV3）です。
画面/タブ/領域の録画、Webcam、音声ミキシング、FFmpeg ベースのビデオ編集、AI 背景処理を備えた本格的なレコーダーです。

**Version**: 4.0.0 | **License**: GPLv3

## アーキテクチャ

### エントリーポイント

| コンポーネント | パス | 役割 |
|------------|------|------|
| Service Worker | `src/pages/Background/index.ts` | 録画ライフサイクル・メッセージング管理 |
| Content Script | `src/pages/Content/index.jsx` | ShadowDOM 内の UI（ポップアップ/ツールバー） |
| Recorder | `src/pages/Recorder/index.tsx` | MediaRecorder による録画実行 |
| Editor | `src/pages/Editor/Sandbox/index.jsx` | FFmpeg.wasm による動画編集 |
| Offscreen Recorder | `src/pages/RecorderOffscreen/index.jsx` | MV3 準拠のオフスクリーン録画 |

### 主要なディレクトリ構造

```txt
src/
├── pages/            # 各機能モジュール（Background, Content, Recorder, Editor...）
├── messaging/        # 型安全なメッセージング（190+種類のメッセージタイプ）
├── types/            # TypeScript 型定義
└── manifest.json     # 拡張機能マニフェスト
```

## 技術スタック

### Core

- **React 18.2** + **TypeScript 4.9**（移行中）
- **Webpack 5** + Babel
- **SCSS** + ShadowDOM（スタイル分離）

### Recording/Video

- **MediaRecorder API** - ネイティブ録画
- **FFmpeg.wasm** - ブラウザ内動画処理（crop/trim/encode/GIF 生成）
- **Chrome APIs**: `tabCapture`, `desktopCapture`, `getUserMedia`
- **Web Audio API** - 入出力音声ミキシング

### UI Components

- **Radix UI** - アクセシブルなコンポーネントライブラリ
- **react-rnd** - ドラッグ/リサイズ
- **react-advanced-cropper** - 領域選択
- **react-hotkeys-hook** - キーボードショートカット

### AI/ML

- **TensorFlow.js** + **MediaPipe** - 背景セグメンテーション
- **@tensorflow-models/body-segmentation** - 人物検出

### Storage

- **IndexedDB** (localforage) - 録画チャンク保存・復旧
- **Chrome Storage API** - 設定永続化

## 状態管理

### ContentStateContext

Content Script の React Context で 150+ の状態プロパティを管理：

- 録画状態（paused, recording, timer）
- 描画ツール（color, strokeWidth, toolSelection）
- デバイス選択（camera, microphone）
- UI 状態（popup position, toolbar visibility）

### Message-Driven Architecture

`src/messaging/messageRouter.ts` で Background ↔ Content ↔ Recorder 間の通信を型安全に実装。

## 主要機能

### 録画モード

- **Screen**: 全画面/モニター選択
- **Tab**: 特定タブのみ
- **Region**: カスタム矩形領域
- **Webcam**: カメラキャプチャ
- **Audio**: マイク + システム音声

### 編集機能（Editor）

- Crop/Trim/Cut
- 音声追加/削除/ミュート
- GIF エクスポート
- サムネイル抽出
- 再エンコード

### 高度な機能

- **AI 背景処理**: MediaPipe によるリアルタイム背景ブラー/置換
- **クリックトラッキング**: クリック位置・タイムスタンプ記録
- **バックアップ/復旧**: IndexedDB による録画復元
- **Cloud Recording**: Bunny CDN 連携
- **Google Drive**: OAuth2 統合

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

Content Script は ShadowDOM でスタイル分離を実現（`src/pages/Content/index.jsx:27-30`）

### Offscreen Documents（MV3 対応）

Background から Offscreen Document を生成して録画を実行し、クロスオリジン制約を回避（`src/pages/Background/offscreen/`）

### Chunk-based Storage

録画データを IndexedDB にチャンク単位で保存してメモリオーバーフロー防止

### Message Type Safety

`src/messaging/` で定義された型により、メッセージ送受信を型安全に実装

## パフォーマンス考慮事項

- 録画品質: 360p～1440p+ 設定可能
- FPS: 15～60fps 調整可能
- チャンクベースストリーミング（メモリ効率化）
- Lazy Loading（各ページ個別バンドル）

## プライバシー設計

- ローカル処理が基本（サーバーアップロード不要）
- 全データは IndexedDB/Chrome Storage に保存
- オプショナルな Google Drive/Cloud 連携
- データ収集なし

## 参考リソース

- **Manifest**: `src/manifest.json` - 権限・エントリーポイント定義
- **Message Types**: `src/messaging/` - 全メッセージ型定義
- **Storage Types**: `src/types/storage.ts` - ストレージスキーマ

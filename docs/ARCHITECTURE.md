# Screenity アーキテクチャドキュメント

## 目次

1. [プロジェクト概要](#プロジェクト概要)
2. [技術スタック](#技術スタック)
3. [アーキテクチャ概要](#アーキテクチャ概要)
4. [ディレクトリ構造](#ディレクトリ構造)
5. [主要コンポーネント](#主要コンポーネント)
6. [データフローとメッセージング](#データフローとメッセージング)
7. [状態管理戦略](#状態管理戦略)
8. [主要ライブラリの使用方法](#主要ライブラリの使用方法)
9. [ビルドシステム](#ビルドシステム)
10. [セキュリティとパーミッション](#セキュリティとパーミッション)

---

## プロジェクト概要

**プロジェクト名**: Screenity
**バージョン**: 4.0.5
**説明**: 無制限、プライバシー重視のスクリーン録画・注釈ツール
**ライセンス**: GPLv3
**マニフェストバージョン**: Manifest V3 (Chrome Extension)

Screenityは、Webページ上で動作する高機能なスクリーン録画Chrome拡張機能です。ユーザーのプライバシーを最優先に設計され、すべての処理をローカルで実行します。主な機能には以下が含まれます：

- **画面録画**: タブ、ウィンドウ、デスクトップ全体の録画
- **注釈ツール**: リアルタイムでの描画、テキスト追加、図形挿入
- **ビデオ編集**: トリミング、カット、GIF変換（FFmpeg.wasm使用）
- **背景除去**: AI（MediaPipe）を使用したカメラ背景のセグメンテーション
- **音声管理**: マイク、システムオーディオの録音と波形表示
- **クラウド統合**: Google Driveへの直接保存

**コード規模**:

- 総コード行数: 34,765行以上
- ファイル数: 231個（JS/JSX/TS/TSX）
- 対応言語: 18言語

---

## 技術スタック

### フロントエンド フレームワーク

#### React 18.2.0

**選定理由**: コンポーネントベースのUI構築、Hooks APIによる状態管理

**主要な使用パターン** (Context7最新情報より):

- **useState**: ローカル状態管理

  ```javascript
  const [isRecording, setIsRecording] = useState(false);
  ```

- **useReducer**: 複雑な状態ロジックの一元管理

  ```javascript
  const [state, dispatch] = useReducer(reducer, initialState);
  ```

- **useContext**: グローバル状態の共有

  ```javascript
  const tasks = useContext(TasksContext);
  ```

**実装箇所**:

- `src/pages/Content/context/ContentState.jsx` (34KB) - グローバル状態管理
- 全てのページコンポーネント（Recorder、Editor、Camera等）

### UIコンポーネントライブラリ

#### Radix UI

**使用コンポーネント**:

- `@radix-ui/react-alert-dialog`: モーダルダイアログ
- `@radix-ui/react-dropdown-menu`: ドロップダウンメニュー
- `@radix-ui/react-slider`: スライダーコントロール
- `@radix-ui/react-switch`: トグルスイッチ
- `@radix-ui/react-tooltip`: ツールチップ
- その他9個のコンポーネント

**主要な実装パターン** (Context7最新情報より):

```javascript
import { Theme, Flex, Button, Switch } from "@radix-ui/themes";

// テーマの適用
<Theme accentColor="indigo" radius="medium" scaling="100%">
  <Flex direction="column" gap="3">
    <Button>録画開始</Button>
    <Switch defaultChecked />
  </Flex>
</Theme>
```

**利点**:

- アクセシビリティ対応（ARIA準拠）
- カスタマイズ可能なスタイリング
- 軽量でパフォーマンス最適化済み

### キャンバス描画

#### Fabric.js 5.3.0

**用途**: 注釈ツール（描画、図形、テキスト）の実装

**主要な機能** (Context7最新情報より):

- **オブジェクト描画**: `drawObject(ctx)` - キャンバスコンテキストへの描画
- **ボーダー描画**: `drawBorders(ctx, styleOverride)` - 選択状態の表示
- **コントロール描画**: `drawControls(ctx)` - リサイズハンドルの表示

**実装箇所**:

- `src/pages/Content/canvas/` - キャンバス描画コンポーネント
- 図形、テキスト、ペンツールの実装

**コード例**:

```javascript
const canvas = new fabric.Canvas('canvas-element');
const rect = new fabric.Rect({
  left: 100,
  top: 100,
  fill: 'red',
  width: 200,
  height: 100
});
canvas.add(rect);
```

### AI/機械学習

#### MediaPipe Selfie Segmentation 0.1.1675465747

**用途**: カメラ背景の自動削除（AIセグメンテーション）

**実装パターン** (Context7最新情報より):

```javascript
import { SelfieSegmentation } from '@mediapipe/selfie_segmentation';

const selfieSegmentation = new SelfieSegmentation({
  locateFile: (file) => {
    return `https://cdn.jsdelivr.net/npm/@mediapipe/selfie_segmentation/${file}`;
  }
});

selfieSegmentation.setOptions({
  modelSelection: 1, // 0: 一般モデル, 1: 風景モデル
});

selfieSegmentation.onResults((results) => {
  // results.segmentationMask を使用して背景を分離
  const condition = np.stack((results.segmentation_mask,) * 3, axis=-1) > 0.1;
  output_image = np.where(condition, fg_image, bg_image);
});
```

**TensorFlow.js連携**:

- `@tensorflow/tfjs-core`: 4.13.0
- `@tensorflow/tfjs-backend-webgl`: 4.9.0
- `@tensorflow-models/body-segmentation`: 1.0.2

### オーディオ処理

#### WaveSurfer.js 7.4.2

**用途**: 音声波形の視覚化とオーディオプレイバック

**主要機能** (Context7最新情報より):

```javascript
import WaveSurfer from 'wavesurfer.js';

const wavesurfer = WaveSurfer.create({
  container: '#waveform',
  waveColor: '#4F4A85',
  progressColor: '#383351',
  url: '/audio.mp3',
});

// 再生コントロール
wavesurfer.play();
wavesurfer.pause();
wavesurfer.setVolume(0.5);
wavesurfer.seekTo(0.5); // 50%の位置にシーク
wavesurfer.zoom(100); // ピクセル/秒でズーム
```

**実装箇所**:

- `src/pages/Waveform/` - 波形表示ページ

### ビデオ処理

#### FFmpeg.wasm

**用途**: ブラウザ内でのビデオ編集（WebAssembly）

**サポート機能**:

- トリミング: `src/pages/Editor/utils/cropVideo.js`
- カット: `src/pages/Editor/utils/cutVideo.js`
- GIF変換: `src/pages/Editor/utils/toGIF.js`
- 音声追加: `src/pages/Editor/utils/addAudioToVideo.js`
- ミュート: `src/pages/Editor/utils/muteVideo.js`
- 再エンコード: `src/pages/Editor/utils/reencodeVideo.js`

**サンドボックス実行**:

```
src/pages/Editor/Sandbox.jsx (8.4KB)
  - FFmpegをiframe内で隔離実行
  - postMessage通信
  - フォールバック機能 (EditorFallback/)
```

#### WebM関連

- `webm-duration-fix`: WebM再生時間の修正
- `fix-webm-duration`: WebM形式のメタデータ修正

### その他の主要ライブラリ

| ライブラリ | バージョン | 用途 |
|-----------|----------|------|
| Plyr | 3.7.8 | ビデオプレイヤー |
| react-advanced-cropper | 0.19.4 | 画像トリミング |
| react-hotkeys-hook | 4.4.1 | キーボードショートカット |
| react-rnd | 10.4.1 | ドラッグ&リサイズ |
| react-shadow | 20.0.0 | Shadow DOM統合 |
| axios | 1.6.2 | HTTP通信 |
| localforage | 1.10.0 | IndexedDB抽象化 |

### 開発ツール

| ツール | バージョン | 用途 |
|--------|----------|------|
| Webpack | 5.x | バンドラー |
| Babel | 7.x | JSトランスパイル |
| TypeScript | 4.9.3 | 型チェック |
| Sass | 1.53.0 | CSSプリプロセッサ |

---

## アーキテクチャ概要

Screenityは、Chrome Extension Manifest V3アーキテクチャに基づいて構築されており、以下の主要なコンポーネントで構成されています：

```
┌─────────────────────────────────────────────────────────────┐
│                      Chrome Browser                          │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌────────────────┐      ┌──────────────────────────────┐  │
│  │  Background    │◄────►│  Content Script              │  │
│  │  Service Worker│      │  (Shadow DOM)                │  │
│  │                │      │  - UI Injection              │  │
│  │  - Event Mgmt  │      │  - Annotation Tools          │  │
│  │  - Recording   │      │  - State Management          │  │
│  │  - File Mgmt   │      │  - User Interaction          │  │
│  └────────┬───────┘      └──────────────────────────────┘  │
│           │                                                   │
│           │                                                   │
│  ┌────────▼───────┐      ┌──────────────────────────────┐  │
│  │  Recorder      │      │  Editor (FFmpeg Sandbox)     │  │
│  │  Window        │      │                               │  │
│  │                │      │  - Video Editing             │  │
│  │  - MediaRecorder│     │  - GIF Conversion            │  │
│  │  - Audio Mgmt  │      │  - Trimming/Cutting          │  │
│  │  - Chunk Proc  │      └──────────────────────────────┘  │
│  └────────────────┘                                          │
│                                                               │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  Offscreen Documents                                  │  │
│  │  - RecorderOffscreen (Worker処理)                    │  │
│  │  - Sandbox (FFmpeg実行)                              │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                               │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  Additional Pages                                     │  │
│  │  - Camera (Webcam UI)                                 │  │
│  │  - Waveform (Audio Visualization)                     │  │
│  │  - Download (Save UI)                                 │  │
│  │  - Permissions (Permission Request)                   │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                               │
└─────────────────────────────────────────────────────────────┘
         │                           │
         ▼                           ▼
  ┌─────────────┐           ┌──────────────┐
  │  IndexedDB  │           │ Google Drive │
  │  (Local)    │           │  (Cloud)     │
  └─────────────┘           └──────────────┘
```

### コンポーネント間通信

```
chrome.runtime.onMessage (メッセージパッシング)
    │
    ├─► registerMessage(type, handler) - メッセージルーター
    │
    ├─► Background ◄──► Content Script
    │                   (メッセージタイプ: "start-recording", "stop-recording", etc.)
    │
    ├─► Background ◄──► Recorder Window
    │                   (チャンク送信、状態同期)
    │
    └─► Background ◄──► Editor
                        (ビデオ編集リクエスト)
```

---

## ディレクトリ構造

```
screenity/
├── src/                              # ソースコード
│   ├── manifest.json                 # 拡張機能マニフェスト（MV3）
│   ├── schema.json                   # Storage管理スキーマ
│   │
│   ├── pages/                        # アプリケーションページ
│   │   ├── Background/               # バックグラウンドサービスワーカー (51ファイル)
│   │   │   ├── index.js              # エントリーポイント
│   │   │   ├── listeners/            # Chrome APIイベントリスナー (9種類)
│   │   │   │   ├── onCommandListener.js        # キーボードコマンド
│   │   │   │   ├── onInstalledListener.js      # インストール時
│   │   │   │   ├── onTabRemovedListener.js     # タブ削除時
│   │   │   │   ├── onTabActivatedListener.js   # タブ切り替え時
│   │   │   │   ├── onTabUpdatedListener.js     # タブ更新時
│   │   │   │   └── ...
│   │   │   ├── messaging/
│   │   │   │   └── handlers.js       # メッセージハンドラー (895行)
│   │   │   ├── recording/            # 録画処理 (14ファイル)
│   │   │   │   ├── startRecording.js
│   │   │   │   ├── stopRecording.js
│   │   │   │   ├── cancelRecording.js
│   │   │   │   ├── chunkHandler.js   # ビデオチャンク管理
│   │   │   │   └── ...
│   │   │   ├── tabManagement/        # タブ管理 (8ファイル)
│   │   │   ├── offscreen/            # Offscreen Document処理
│   │   │   ├── drive/                # Google Drive統合
│   │   │   ├── alarms/               # アラーム処理
│   │   │   └── utils/                # ユーティリティ
│   │   │
│   │   ├── Content/                  # Content Script (複雑な構造)
│   │   │   ├── Content.jsx           # ルートコンポーネント
│   │   │   ├── Wrapper.jsx           # Shadow DOM包含
│   │   │   ├── index.jsx             # エントリーポイント
│   │   │   ├── popup/                # メインポップアップUI
│   │   │   ├── toolbar/              # 録画中ツールバー
│   │   │   ├── canvas/               # キャンバス描画ツール (Fabric.js)
│   │   │   ├── camera/               # カメラ表示
│   │   │   ├── region/               # 領域選択UI
│   │   │   ├── countdown/            # カウントダウン
│   │   │   ├── modal/                # モーダルダイアログ
│   │   │   ├── context/
│   │   │   │   ├── ContentState.jsx  # グローバルステート (34KB)
│   │   │   │   └── messaging/        # メッセージング
│   │   │   ├── shortcuts/            # キーボードショートカット
│   │   │   ├── cursor/               # カーソル追跡
│   │   │   └── utils/                # ユーティリティ
│   │   │
│   │   ├── Recorder/                 # 録画ウィンドウ (9ファイル)
│   │   │   ├── Recorder.jsx          # メインコンポーネント (19KB)
│   │   │   ├── RecorderUI.jsx        # UI部分
│   │   │   ├── audioManager.js       # オーディオ管理
│   │   │   ├── mediaRecorderUtils.js # MediaRecorder API
│   │   │   └── messaging.js          # メッセージング
│   │   │
│   │   ├── Editor/                   # ビデオ編集 (15ファイル)
│   │   │   ├── Sandbox.jsx           # FFmpeg実行サンドボックス (8.4KB)
│   │   │   ├── index.jsx, index.html
│   │   │   └── utils/                # 編集処理 (13ファイル)
│   │   │       ├── addAudioToVideo.js
│   │   │       ├── cropVideo.js
│   │   │       ├── cutVideo.js
│   │   │       ├── toGIF.js
│   │   │       └── ...
│   │   │
│   │   ├── Camera/                   # カメラUI (10ファイル)
│   │   ├── CloudRecorder/            # クラウド録画 (11ファイル)
│   │   ├── RecorderOffscreen/        # Offscreen録画 (4ファイル)
│   │   ├── Sandbox/                  # サンドボックス (15ファイル)
│   │   ├── Backup/                   # バックアップ (6ファイル)
│   │   ├── Download/                 # ダウンロード (5ファイル)
│   │   ├── Region/                   # 領域選択 (4ファイル)
│   │   ├── Waveform/                 # 波形表示 (5ファイル)
│   │   ├── Permissions/              # パーミッション (2ファイル)
│   │   └── Setup/                    # セットアップ (2ファイル)
│   │
│   ├── assets/                       # リソース
│   │   ├── img/                      # 画像 (100+ files)
│   │   ├── fonts/                    # フォント (11ファイル)
│   │   ├── audio/                    # 音声 (2ファイル)
│   │   └── vendor/                   # サードパーティ
│   │
│   ├── messaging/                    # メッセージング通信システム
│   │   └── messageRouter.js          # メッセージルーター
│   │
│   └── _locales/                     # 多言語サポート (18言語)
│       ├── en/messages.json
│       ├── ja/messages.json
│       └── ...
│
├── build/                            # ビルド出力
│   ├── background.bundle.js
│   ├── contentScript.bundle.js
│   ├── recorder.html / recorder.bundle.js
│   └── ...
│
├── utils/                            # ビルド・開発ユーティリティ
│   ├── build.js
│   └── server.js
│
├── webpack.config.js                 # Webpack設定
├── tsconfig.json                     # TypeScript設定
├── .babelrc                          # Babel設定
├── package.json                      # 依存関係
└── README.md                         # ドキュメント
```

### エントリーポイント（15個）

Webpackは以下の15個のエントリーポイントをバンドルします：

1. **background**: `src/pages/Background/index.js`
2. **contentScript**: `src/pages/Content/index.jsx`
3. **recorder**: `src/pages/Recorder/index.jsx`
4. **cloudrecorder**: `src/pages/CloudRecorder/index.jsx`
5. **recorderoffscreen**: `src/pages/RecorderOffscreen/index.jsx`
6. **camera**: `src/pages/Camera/index.jsx`
7. **waveform**: `src/pages/Waveform/index.jsx`
8. **sandbox**: `src/pages/Sandbox/index.jsx`
9. **permissions**: `src/pages/Permissions/index.jsx`
10. **setup**: `src/pages/Setup/index.jsx`
11. **playground**: `src/pages/Playground/index.jsx`
12. **editor**: `src/pages/Editor/index.jsx`
13. **region**: `src/pages/Region/index.jsx`
14. **download**: `src/pages/Download/index.jsx`
15. **editorfallback**: `src/pages/EditorFallback/index.jsx`
16. **backup**: `src/pages/Backup/index.jsx`

---

## 主要コンポーネント

### 1. Background Service Worker

**ファイルパス**: `src/pages/Background/index.js`

**責務**:

- Chrome APIイベントの管理
- メッセージング通信のハブ
- 録画状態の制御
- ファイル操作（保存、ダウンロード）
- タブ管理

**主要なイベントリスナー**:

| リスナー | ファイル | 機能 |
|---------|---------|------|
| onCommand | `onCommandListener.js` | キーボードショートカット（Alt+Shift+G等） |
| onInstalled | `onInstalledListener.js` | 拡張機能インストール時の初期化 |
| onTabRemoved | `onTabRemovedListener.js` | タブ削除時のクリーンアップ |
| onTabActivated | `onTabActivatedListener.js` | タブ切り替え時の状態更新 |
| onTabUpdated | `onTabUpdatedListener.js` | タブ更新時の処理 |
| onWindowFocusChanged | `onWindowFocusChangedListener.js` | ウィンドウフォーカス変更 |
| onActionButtonClicked | `onActionButtonClickedListener.js` | 拡張機能アイコンクリック |
| onStartup | `onStartupListener.js` | ブラウザ起動時 |
| onMessageExternal | `onMessageExternalListener.js` | 外部通信 |

**メッセージハンドラー** (`src/pages/Background/messaging/handlers.js` - 895行):

```javascript
// 録画関連
registerMessage("start-recording", handleStartRecording);
registerMessage("stop-recording", handleStopRecording);
registerMessage("cancel-recording", handleCancelRecording);
registerMessage("pause-recording", handlePauseRecording);
registerMessage("restart-recording", handleRestartRecording);

// Drive関連
registerMessage("save-to-drive", handleSaveToDrive);
registerMessage("sign-out-drive", handleSignOutDrive);

// Desktop Capture
registerMessage("desktop-capture", handleDesktopCapture);

// ファイル操作
registerMessage("write-file", handleWriteFile);
registerMessage("copy-to-clipboard", handleCopyToClipboard);

// その他
registerMessage("check-recording", handleCheckRecording);
registerMessage("get-streaming-data", handleGetStreamingData);
```

### 2. Content Script

**ファイルパス**: `src/pages/Content/index.jsx`

**責備**:

- WebページへのUI注入（Shadow DOM使用）
- ユーザーインタラクションの検出
- 注釈ツールの提供
- グローバル状態管理

**Shadow DOM実装**:

```javascript
// Wrapper.jsx
<div className="screenity-shadow-dom">
  <ContentState>
    {/* UI コンポーネント */}
    <PopupContainer />
    <Toolbar />
    <Canvas />
    <Camera />
    <Region />
  </ContentState>
</div>
```

**主要サブコンポーネント**:

#### PopupContainer (`src/pages/Content/popup/`)

- 録画コントロールパネル
- 設定UI
- 録画モード選択

#### Toolbar (`src/pages/Content/toolbar/`)

- 録画中のツールバー表示
- 一時停止/再開/停止ボタン
- タイマー表示

#### Canvas (`src/pages/Content/canvas/`)

- Fabric.jsベースの描画ツール
- ペン、線、矢印、図形、テキスト
- 消しゴム、ぼかしツール

**実装例** (Fabric.js使用):

```javascript
// Canvas.jsx内
const canvas = new fabric.Canvas('annotation-canvas');

// ペンツールの実装
canvas.isDrawingMode = true;
canvas.freeDrawingBrush.color = selectedColor;
canvas.freeDrawingBrush.width = brushWidth;

// 図形の追加
const rect = new fabric.Rect({
  left: x,
  top: y,
  fill: 'transparent',
  stroke: strokeColor,
  strokeWidth: 2,
  width: width,
  height: height
});
canvas.add(rect);
```

#### Camera (`src/pages/Content/camera/`)

- Webカメラのオーバーレイ表示
- ドラッグ&リサイズ（react-rnd使用）
- MediaPipe背景除去

**背景除去実装** (MediaPipe使用):

```javascript
// Camera.jsx内
import { SelfieSegmentation } from '@mediapipe/selfie_segmentation';

const selfieSegmentation = new SelfieSegmentation({
  locateFile: (file) =>
    `https://cdn.jsdelivr.net/npm/@mediapipe/selfie_segmentation/${file}`
});

selfieSegmentation.setOptions({ modelSelection: 1 });

selfieSegmentation.onResults((results) => {
  const canvasCtx = canvasElement.getContext('2d');

  // セグメンテーションマスクを適用
  canvasCtx.globalCompositeOperation = 'destination-atop';
  canvasCtx.drawImage(results.segmentationMask, 0, 0, width, height);

  // 背景を置き換え
  canvasCtx.globalCompositeOperation = 'destination-over';
  canvasCtx.fillStyle = backgroundColor;
  canvasCtx.fillRect(0, 0, width, height);
});
```

### 3. Recorder Window

**ファイルパス**: `src/pages/Recorder/Recorder.jsx` (19KB)

**責務**:

- MediaRecorder APIによる画面キャプチャ
- オーディオ管理（マイク、システム音声）
- ビデオチャンクの送信
- 録画状態の管理

**MediaRecorder実装**:

```javascript
// mediaRecorderUtils.js
const stream = await navigator.mediaDevices.getDisplayMedia({
  video: {
    width: { ideal: 1920 },
    height: { ideal: 1080 },
    frameRate: { ideal: 30 }
  },
  audio: recordSystemAudio
});

const mediaRecorder = new MediaRecorder(stream, {
  mimeType: 'video/webm;codecs=vp9',
  videoBitsPerSecond: 2500000 // 2.5 Mbps
});

mediaRecorder.ondataavailable = (event) => {
  if (event.data.size > 0) {
    chunks.push(event.data);
    sendChunkToBackground(event.data);
  }
};

mediaRecorder.start(1000); // 1秒ごとにチャンク
```

**オーディオ管理** (`audioManager.js`):

```javascript
// マイク音声の取得
const micStream = await navigator.mediaDevices.getUserMedia({
  audio: {
    echoCancellation: true,
    noiseSuppression: true,
    autoGainControl: true
  }
});

// AudioContextで複数ストリームをミックス
const audioContext = new AudioContext();
const destination = audioContext.createMediaStreamDestination();

const micSource = audioContext.createMediaStreamSource(micStream);
const systemSource = audioContext.createMediaStreamSource(systemAudioStream);

micSource.connect(destination);
systemSource.connect(destination);

const combinedStream = destination.stream;
```

### 4. Editor (FFmpeg Sandbox)

**ファイルパス**: `src/pages/Editor/Sandbox.jsx` (8.4KB)

**責務**:

- FFmpeg.wasmを使用したビデオ編集
- サンドボックス化された実行環境
- postMessage通信

**サンドボックス実装**:

```javascript
// Sandbox.jsx
import { createFFmpeg, fetchFile } from '@ffmpeg/ffmpeg';

const ffmpeg = createFFmpeg({
  log: true,
  corePath: '/vendor/ffmpeg-core.js'
});

await ffmpeg.load();

// トリミング処理
ffmpeg.FS('writeFile', 'input.webm', await fetchFile(videoBlob));

await ffmpeg.run(
  '-i', 'input.webm',
  '-ss', startTime,
  '-t', duration,
  '-c', 'copy',
  'output.webm'
);

const data = ffmpeg.FS('readFile', 'output.webm');
const outputBlob = new Blob([data.buffer], { type: 'video/webm' });
```

**編集機能**:

| 機能 | ファイル | FFmpegコマンド |
|------|---------|---------------|
| トリミング | `cropVideo.js` | `-filter:v "crop=w:h:x:y"` |
| カット | `cutVideo.js` | `-ss start -t duration -c copy` |
| GIF変換 | `toGIF.js` | `-vf "fps=10,scale=320:-1" -c:v gif` |
| 音声追加 | `addAudioToVideo.js` | `-i video -i audio -c:v copy -c:a aac` |
| ミュート | `muteVideo.js` | `-an` |
| 再エンコード | `reencodeVideo.js` | `-c:v libvpx-vp9 -crf 30` |

### 5. Additional Pages

#### Camera (`src/pages/Camera/`)

- スタンドアロンカメラウィンドウ
- カメラのみの録画モード

#### Waveform (`src/pages/Waveform/`)

**WaveSurfer.js実装**:

```javascript
import WaveSurfer from 'wavesurfer.js';

const wavesurfer = WaveSurfer.create({
  container: '#waveform',
  waveColor: '#4F4A85',
  progressColor: '#383351',
  height: 80,
  barWidth: 2,
  responsive: true
});

wavesurfer.load(audioUrl);
wavesurfer.on('ready', () => {
  wavesurfer.play();
});
```

#### Download (`src/pages/Download/`)

- ビデオダウンロードUI
- ファイル名編集
- フォーマット選択

#### Permissions (`src/pages/Permissions/`)

- パーミッション要求UI
- 画面共有、マイク、カメラの許可

---

## データフローとメッセージング

### メッセージング通信システム

Screenityは、`chrome.runtime.onMessage` APIを使用したカスタムメッセージルーターを実装しています。

**メッセージルーター** (`src/messaging/messageRouter.js`):

```javascript
const messageHandlers = {};

export function registerMessage(type, handler) {
  messageHandlers[type] = handler;
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  const handler = messageHandlers[message.type];

  if (handler) {
    // 非同期ハンドラーのサポート
    Promise.resolve(handler(message.data, sender))
      .then(sendResponse)
      .catch(error => sendResponse({ error: error.message }));

    return true; // 非同期レスポンスを示す
  }

  console.warn(`Unknown message type: ${message.type}`);
});
```

### 録画フロー

```
1. ユーザー操作
   │
   ├─► Content Script: 録画開始ボタンクリック
   │
   ▼
2. メッセージ送信
   chrome.runtime.sendMessage({ type: "start-recording", data: {...} })
   │
   ▼
3. Background: メッセージ受信
   handlers.js → startRecording.js
   │
   ├─► desktopCapture.js: 画面選択APIを呼び出し
   │   chrome.desktopCapture.chooseDesktopMedia(...)
   │
   ├─► createTab.js: Recorderウィンドウを開く
   │   chrome.windows.create({ url: 'recorder.html', type: 'popup' })
   │
   ▼
4. Recorder Window: MediaRecorder開始
   │
   ├─► navigator.mediaDevices.getDisplayMedia()
   ├─► MediaRecorder.start(1000) // 1秒ごとにチャンク
   │
   ▼
5. チャンク送信
   mediaRecorder.ondataavailable
   │
   ├─► sendChunkToBackground(chunk)
   │   chrome.runtime.sendMessage({ type: "send-chunks", data: chunk })
   │
   ▼
6. Background: チャンク保存
   chunkHandler.js
   │
   ├─► IndexedDBにチャンクを保存
   │   localforage.setItem(`chunk-${index}`, chunk)
   │
   ▼
7. 録画停止
   ユーザーが停止ボタンをクリック
   │
   ├─► stopRecording.js
   │
   ├─► 全チャンクをマージ
   │   const blob = new Blob(chunks, { type: 'video/webm' });
   │
   ├─► webm-duration-fixで時間修正
   │   fixWebmDuration(blob)
   │
   ▼
8. 保存
   │
   ├─► ローカルダウンロード
   │   chrome.downloads.download({ url: blobUrl, filename: 'recording.webm' })
   │
   └─► Google Drive保存
       handleSaveToDrive.js → Google Drive API
```

### 編集フロー

```
1. ユーザーが編集を開始
   Download Page: 編集ボタンクリック
   │
   ▼
2. Editor Sandboxを開く
   chrome.tabs.create({ url: 'editor.html' })
   │
   ▼
3. ビデオをSandboxに送信
   postMessage({ type: 'load-video', data: videoBlob })
   │
   ▼
4. FFmpeg処理
   editor/Sandbox.jsx
   │
   ├─► ffmpeg.load()
   ├─► ffmpeg.FS('writeFile', 'input.webm', videoData)
   ├─► ffmpeg.run(...編集コマンド...)
   ├─► ffmpeg.FS('readFile', 'output.webm')
   │
   ▼
5. 結果を返す
   postMessage({ type: 'edit-complete', data: outputBlob })
   │
   ▼
6. ダウンロード
   chrome.downloads.download({ url: outputBlobUrl })
```

---

## 状態管理戦略

### グローバル状態 (Content Script)

**ファイル**: `src/pages/Content/context/ContentState.jsx` (34KB)

Reactの`Context API`と`useReducer`を使用した状態管理を実装しています。

**状態の構造**:

```javascript
const initialState = {
  // 録画状態
  isRecording: false,
  isPaused: false,
  recordingMode: null, // 'tab', 'window', 'desktop', 'region'
  recordingStartTime: null,
  recordingDuration: 0,

  // UI状態
  showPopup: false,
  showToolbar: false,
  showCanvas: false,
  showCamera: false,

  // 設定
  settings: {
    micEnabled: true,
    systemAudioEnabled: false,
    cameraEnabled: false,
    cameraPosition: { x: 20, y: 20 },
    cameraSize: { width: 200, height: 150 },
    countdown: 3,
    showCursor: true,
    highlightClicks: true,
  },

  // 注釈
  annotations: [],
  selectedTool: 'pen',
  selectedColor: '#FF0000',
  brushSize: 3,

  // 認証
  isAuthenticated: false,
  userEmail: null,

  // クラウド機能
  cloudFeaturesEnabled: false,
  driveConnected: false,
};
```

**Reducer実装** (React useReducerパターン):

```javascript
function contentReducer(state, action) {
  switch (action.type) {
    case 'START_RECORDING':
      return {
        ...state,
        isRecording: true,
        isPaused: false,
        recordingStartTime: Date.now(),
        recordingMode: action.payload.mode
      };

    case 'STOP_RECORDING':
      return {
        ...state,
        isRecording: false,
        recordingStartTime: null,
        recordingDuration: 0
      };

    case 'PAUSE_RECORDING':
      return {
        ...state,
        isPaused: true
      };

    case 'RESUME_RECORDING':
      return {
        ...state,
        isPaused: false
      };

    case 'UPDATE_SETTINGS':
      return {
        ...state,
        settings: {
          ...state.settings,
          ...action.payload
        }
      };

    case 'ADD_ANNOTATION':
      return {
        ...state,
        annotations: [...state.annotations, action.payload]
      };

    case 'CLEAR_ANNOTATIONS':
      return {
        ...state,
        annotations: []
      };

    default:
      return state;
  }
}
```

**Context Provider**:

```javascript
export const ContentStateContext = createContext();
export const ContentDispatchContext = createContext();

export function ContentState({ children }) {
  const [state, dispatch] = useReducer(contentReducer, initialState);

  return (
    <ContentStateContext.Provider value={state}>
      <ContentDispatchContext.Provider value={dispatch}>
        {children}
      </ContentDispatchContext.Provider>
    </ContentStateContext.Provider>
  );
}

// カスタムフック
export function useContentState() {
  return useContext(ContentStateContext);
}

export function useContentDispatch() {
  return useContext(ContentDispatchContext);
}
```

**使用例**:

```javascript
// PopupContainer.jsx
import { useContentState, useContentDispatch } from '../context/ContentState';

function PopupContainer() {
  const state = useContentState();
  const dispatch = useContentDispatch();

  const handleStartRecording = (mode) => {
    dispatch({
      type: 'START_RECORDING',
      payload: { mode }
    });

    // Backgroundにメッセージ送信
    chrome.runtime.sendMessage({
      type: 'start-recording',
      data: { mode, settings: state.settings }
    });
  };

  return (
    <div>
      {!state.isRecording && (
        <Button onClick={() => handleStartRecording('tab')}>
          録画開始
        </Button>
      )}
    </div>
  );
}
```

### ローカルストレージ (Background)

**使用ライブラリ**: `localforage` (IndexedDB抽象化)

**保存データ**:

```javascript
// 設定の保存
await localforage.setItem('settings', {
  micEnabled: true,
  systemAudioEnabled: false,
  quality: 'high',
  // ...
});

// ビデオチャンクの保存
await localforage.setItem(`recording-chunk-${index}`, chunk);

// 録画メタデータ
await localforage.setItem('recording-metadata', {
  startTime: Date.now(),
  duration: 0,
  mode: 'tab',
  // ...
});
```

### Chrome Storage API

**使用パターン**:

```javascript
// chrome.storage.local - ローカルストレージ
chrome.storage.local.set({
  userPreferences: { theme: 'dark' }
});

chrome.storage.local.get(['userPreferences'], (result) => {
  console.log(result.userPreferences);
});

// chrome.storage.sync - 同期ストレージ（複数デバイス間で同期）
chrome.storage.sync.set({
  cloudSettings: { autoUpload: true }
});
```

---

## 主要ライブラリの使用方法

### React Hooks パターン

**useState - ローカル状態管理**:

```javascript
// 録画タイマーの実装
function RecordingTimer() {
  const [elapsedTime, setElapsedTime] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setElapsedTime(prev => prev + 1);
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return <div>{formatTime(elapsedTime)}</div>;
}
```

**useReducer - 複雑な状態ロジック**:

```javascript
// 注釈ツールの状態管理
function annotationReducer(state, action) {
  switch (action.type) {
    case 'SELECT_TOOL':
      return { ...state, selectedTool: action.payload };
    case 'SET_COLOR':
      return { ...state, color: action.payload };
    case 'SET_BRUSH_SIZE':
      return { ...state, brushSize: action.payload };
    case 'ADD_SHAPE':
      return {
        ...state,
        shapes: [...state.shapes, action.payload]
      };
    default:
      return state;
  }
}

function AnnotationToolbar() {
  const [state, dispatch] = useReducer(annotationReducer, {
    selectedTool: 'pen',
    color: '#FF0000',
    brushSize: 3,
    shapes: []
  });

  return (
    <div>
      <button onClick={() => dispatch({ type: 'SELECT_TOOL', payload: 'pen' })}>
        ペン
      </button>
      <input
        type="color"
        value={state.color}
        onChange={(e) => dispatch({ type: 'SET_COLOR', payload: e.target.value })}
      />
    </div>
  );
}
```

### Radix UI実装パターン

**テーマ設定**:

```javascript
import { Theme } from '@radix-ui/themes';

function App() {
  return (
    <Theme
      accentColor="indigo"
      grayColor="slate"
      radius="medium"
      scaling="100%"
      appearance="dark"
    >
      <MainContent />
    </Theme>
  );
}
```

**ドロップダウンメニュー**:

```javascript
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';

function SettingsMenu() {
  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <button>設定</button>
      </DropdownMenu.Trigger>

      <DropdownMenu.Portal>
        <DropdownMenu.Content>
          <DropdownMenu.Item onSelect={() => handleQuality('high')}>
            高画質
          </DropdownMenu.Item>
          <DropdownMenu.Item onSelect={() => handleQuality('medium')}>
            中画質
          </DropdownMenu.Item>
          <DropdownMenu.Separator />
          <DropdownMenu.Item onSelect={handleSettings}>
            詳細設定
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
```

**スライダー**:

```javascript
import * as Slider from '@radix-ui/react-slider';

function BrushSizeControl() {
  const [size, setSize] = useState(3);

  return (
    <Slider.Root
      value={[size]}
      onValueChange={(value) => setSize(value[0])}
      min={1}
      max={20}
      step={1}
    >
      <Slider.Track>
        <Slider.Range />
      </Slider.Track>
      <Slider.Thumb />
    </Slider.Root>
  );
}
```

### Fabric.js キャンバス実装

**初期化**:

```javascript
import { fabric } from 'fabric';

const canvas = new fabric.Canvas('canvas-element', {
  width: 1920,
  height: 1080,
  backgroundColor: 'transparent',
  selection: true,
  renderOnAddRemove: true
});
```

**描画ツール**:

```javascript
// ペンツール
canvas.isDrawingMode = true;
canvas.freeDrawingBrush = new fabric.PencilBrush(canvas);
canvas.freeDrawingBrush.color = '#FF0000';
canvas.freeDrawingBrush.width = 3;

// 矢印の追加
const arrow = new fabric.Path('M 0 0 L 100 0 L 85 -10 M 100 0 L 85 10', {
  stroke: '#0000FF',
  strokeWidth: 2,
  fill: '',
  left: 100,
  top: 100
});
canvas.add(arrow);

// テキストの追加
const text = new fabric.IText('テキスト', {
  left: 200,
  top: 200,
  fontFamily: 'Arial',
  fontSize: 20,
  fill: '#000000'
});
canvas.add(text);

// オブジェクトのイベント
canvas.on('object:modified', (e) => {
  const obj = e.target;
  console.log('Modified:', obj);
});
```

**エクスポート**:

```javascript
// PNGとしてエクスポート
const dataURL = canvas.toDataURL({
  format: 'png',
  quality: 1,
  multiplier: 1
});

// JSONとしてシリアライズ
const json = canvas.toJSON();

// JSONから復元
canvas.loadFromJSON(json, () => {
  canvas.renderAll();
});
```

### MediaPipe背景除去

**実装**:

```javascript
import { SelfieSegmentation } from '@mediapipe/selfie_segmentation';

// 初期化
const selfieSegmentation = new SelfieSegmentation({
  locateFile: (file) => {
    return `https://cdn.jsdelivr.net/npm/@mediapipe/selfie_segmentation/${file}`;
  }
});

// 設定
selfieSegmentation.setOptions({
  modelSelection: 1, // 0: 一般, 1: 風景
  selfieMode: false
});

// 処理
selfieSegmentation.onResults((results) => {
  const canvasCtx = canvasElement.getContext('2d');
  const { width, height } = canvasElement;

  // 元の画像を描画
  canvasCtx.save();
  canvasCtx.clearRect(0, 0, width, height);

  // セグメンテーションマスクを適用
  canvasCtx.drawImage(
    results.segmentationMask, 0, 0, width, height
  );

  // 前景のみ表示
  canvasCtx.globalCompositeOperation = 'source-in';
  canvasCtx.drawImage(results.image, 0, 0, width, height);

  // 背景を追加
  canvasCtx.globalCompositeOperation = 'destination-over';
  canvasCtx.fillStyle = '#00FF00'; // グリーンバック
  canvasCtx.fillRect(0, 0, width, height);

  canvasCtx.restore();
});

// カメラストリームから処理
const camera = new Camera(videoElement, {
  onFrame: async () => {
    await selfieSegmentation.send({ image: videoElement });
  },
  width: 1280,
  height: 720
});
camera.start();
```

### WaveSurfer.js 音声波形

**実装**:

```javascript
import WaveSurfer from 'wavesurfer.js';

// 初期化
const wavesurfer = WaveSurfer.create({
  container: '#waveform',
  waveColor: '#4F4A85',
  progressColor: '#383351',
  cursorColor: '#FFFFFF',
  barWidth: 2,
  barRadius: 3,
  cursorWidth: 1,
  height: 80,
  barGap: 2,
  responsive: true,
  normalize: true
});

// オーディオをロード
wavesurfer.load('/path/to/audio.mp3');

// イベントリスナー
wavesurfer.on('ready', () => {
  console.log('Ready to play');
  wavesurfer.play();
});

wavesurfer.on('audioprocess', () => {
  const currentTime = wavesurfer.getCurrentTime();
  updateTimeDisplay(currentTime);
});

// コントロール
const playPause = () => {
  wavesurfer.playPause();
};

const seek = (percentage) => {
  wavesurfer.seekTo(percentage);
};

const setVolume = (volume) => {
  wavesurfer.setVolume(volume); // 0.0 - 1.0
};

// ズーム
const zoom = (pixelsPerSecond) => {
  wavesurfer.zoom(pixelsPerSecond);
};

// ピークデータのエクスポート
const peaks = wavesurfer.exportPeaks();
console.log(peaks);
```

---

## ビルドシステム

### Webpack設定

**ファイル**: `webpack.config.js`

**主要な設定**:

```javascript
const path = require('path');
const webpack = require('webpack');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const CopyWebpackPlugin = require('copy-webpack-plugin');
const { CleanWebpackPlugin } = require('clean-webpack-plugin');

module.exports = (env, options) => {
  const isProduction = options.mode === 'production';

  return {
    mode: isProduction ? 'production' : 'development',
    devtool: isProduction ? false : 'cheap-module-source-map',

    entry: {
      background: './src/pages/Background/index.js',
      contentScript: './src/pages/Content/index.jsx',
      recorder: './src/pages/Recorder/index.jsx',
      editor: './src/pages/Editor/index.jsx',
      camera: './src/pages/Camera/index.jsx',
      // ... 他の11個のエントリーポイント
    },

    output: {
      path: path.resolve(__dirname, 'build'),
      filename: '[name].bundle.js',
      clean: true
    },

    module: {
      rules: [
        // TypeScript/JSX
        {
          test: /\.(ts|tsx|js|jsx)$/,
          exclude: /node_modules/,
          use: [
            {
              loader: 'babel-loader',
              options: {
                presets: [
                  '@babel/preset-env',
                  '@babel/preset-react',
                  '@babel/preset-typescript'
                ],
                plugins: [
                  '@babel/plugin-transform-runtime'
                ]
              }
            },
            {
              loader: 'ts-loader',
              options: {
                transpileOnly: true
              }
            }
          ]
        },

        // CSS/SCSS
        {
          test: /\.(css|scss)$/,
          use: [
            'style-loader',
            'css-loader',
            'sass-loader'
          ]
        },

        // 画像
        {
          test: /\.(png|jpg|jpeg|gif|svg|webp)$/,
          type: 'asset/resource',
          generator: {
            filename: 'assets/img/[name][ext]'
          }
        },

        // フォント
        {
          test: /\.(woff|woff2|eot|ttf|otf)$/,
          type: 'asset/resource',
          generator: {
            filename: 'assets/fonts/[name][ext]'
          }
        },

        // HTML
        {
          test: /\.html$/,
          use: ['html-loader']
        }
      ]
    },

    resolve: {
      extensions: ['.ts', '.tsx', '.js', '.jsx', '.json'],
      alias: {
        '@': path.resolve(__dirname, 'src'),
        '@pages': path.resolve(__dirname, 'src/pages'),
        '@assets': path.resolve(__dirname, 'src/assets')
      }
    },

    plugins: [
      new CleanWebpackPlugin(),

      // HTMLページの生成
      new HtmlWebpackPlugin({
        template: './src/pages/Recorder/index.html',
        filename: 'recorder.html',
        chunks: ['recorder']
      }),
      new HtmlWebpackPlugin({
        template: './src/pages/Editor/index.html',
        filename: 'editor.html',
        chunks: ['editor']
      }),
      // ... 他のページ

      // アセットのコピー
      new CopyWebpackPlugin({
        patterns: [
          { from: 'src/manifest.json', to: 'manifest.json' },
          { from: 'src/schema.json', to: 'schema.json' },
          { from: 'src/_locales', to: '_locales' },
          { from: 'src/assets', to: 'assets' }
        ]
      }),

      // 環境変数
      new webpack.DefinePlugin({
        'process.env.NODE_ENV': JSON.stringify(options.mode),
        'process.env.SCREENITY_APP_BASE': JSON.stringify(process.env.SCREENITY_APP_BASE),
        'process.env.SCREENITY_API_BASE_URL': JSON.stringify(process.env.SCREENITY_API_BASE_URL)
      })
    ],

    optimization: {
      minimize: isProduction,
      minimizer: [
        new TerserPlugin({
          terserOptions: {
            compress: {
              drop_console: true
              }
          }
        })
      ]
    }
  };
};
```

### ビルドスクリプト

**package.json**:

```json
{
  "scripts": {
    "build": "cross-env NODE_ENV=production node utils/build.js",
    "start": "cross-env NODE_ENV=development node utils/server.js",
    "dev": "npm run hot-reload",
    "watch": "cross-env NODE_ENV=development webpack --watch",
    "hot-reload": "cross-env NODE_ENV=development webpack serve --hot",
    "package": "npm run build && cd build && zip -r ../extension.zip . && cd ..",
    "clean": "rm -rf build && mkdir build"
  }
}
```

**開発サーバー** (`utils/server.js`):

```javascript
const webpack = require('webpack');
const WebpackDevServer = require('webpack-dev-server');
const config = require('../webpack.config');

const compiler = webpack(config({ mode: 'development' }));

const server = new WebpackDevServer({
  hot: true,
  liveReload: true,
  port: 3000,
  open: false
}, compiler);

server.start();
```

### TypeScript設定

**tsconfig.json**:

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "jsx": "react-jsx",
    "module": "ESNext",
    "moduleResolution": "node",
    "resolveJsonModule": true,
    "allowJs": true,
    "checkJs": false,
    "outDir": "./build",
    "rootDir": "./src",
    "removeComments": true,
    "noEmit": true,
    "isolatedModules": true,
    "esModuleInterop": true,
    "forceConsistentCasingInFileNames": true,
    "strict": true,
    "skipLibCheck": true,
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"],
      "@pages/*": ["src/pages/*"],
      "@assets/*": ["src/assets/*"]
    }
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "build"]
}
```

### Babel設定

**.babelrc**:

```json
{
  "presets": [
    ["@babel/preset-env", {
      "targets": {
        "chrome": "88"
      }
    }],
    "@babel/preset-react"
  ],
  "plugins": [
    "@babel/plugin-transform-runtime"
  ]
}
```

---

## セキュリティとパーミッション

### Manifest V3パーミッション

**manifest.json** (`src/manifest.json`):

```json
{
  "permissions": [
    "identity",          // Google OAuth認証
    "activeTab",         // アクティブタブへのアクセス
    "storage",           // chrome.storage API
    "unlimitedStorage",  // 無制限ストレージ
    "downloads",         // ファイルダウンロード
    "tabs",              // タブAPI
    "tabCapture",        // タブキャプチャ
    "scripting",         // スクリプト実行
    "system.display"     // ディスプレイ情報
  ],

  "optional_permissions": [
    "offscreen",         // Offscreen Document
    "desktopCapture",    // デスクトップキャプチャ
    "alarms",            // アラーム
    "clipboardWrite"     // クリップボード書き込み
  ],

  "host_permissions": [
    "<all_urls>"         // 全URLへのアクセス
  ]
}
```

### Content Security Policy (CSP)

```json
{
  "content_security_policy": {
    "extension_pages": "script-src 'self' 'wasm-unsafe-eval'; object-src 'self'; media-src 'self' data: blob: *; img-src 'self' https: data: blob:",
    "sandbox": "sandbox allow-scripts allow-modals allow-popups; script-src 'self' 'unsafe-inline' 'unsafe-eval' blob:; object-src 'self'; worker-src 'self' blob: ;"
  }
}
```

**説明**:

- `wasm-unsafe-eval`: FFmpeg.wasmの実行を許可
- `blob:`: Blobストリームの使用を許可
- `sandbox allow-scripts`: サンドボックス内でのスクリプト実行を許可

### Cross-Origin設定

```json
{
  "cross_origin_embedder_policy": {
    "value": "require-corp"
  },
  "cross_origin_opener_policy": {
    "value": "same-origin"
  }
}
```

**理由**: SharedArrayBufferの使用（FFmpeg.wasmで必要）のため

### OAuth2認証

```json
{
  "oauth2": {
    "client_id": "560517327251-m7n1k3kddknu7s9s4ejvrs1bj91gutd7.apps.googleusercontent.com",
    "scopes": [
      "https://www.googleapis.com/auth/drive.file"
    ]
  }
}
```

**Google Drive認証フロー**:

```javascript
// handleSaveToDrive.js
chrome.identity.getAuthToken({ interactive: true }, (token) => {
  if (chrome.runtime.lastError) {
    console.error(chrome.runtime.lastError);
    return;
  }

  // Google Drive APIを呼び出し
  const metadata = {
    name: 'recording.webm',
    mimeType: 'video/webm'
  };

  const formData = new FormData();
  formData.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
  formData.append('file', videoBlob);

  fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`
    },
    body: formData
  })
  .then(response => response.json())
  .then(data => {
    console.log('Uploaded to Drive:', data);
  });
});
```

### 外部接続の制限

```json
{
  "externally_connectable": {
    "matches": [
      "https://app.screenity.io/*"
    ]
  }
}
```

**理由**: Screenity Proクラウド機能との連携のため、特定のドメインのみ許可

### データプライバシー

Screenityは**プライバシーファースト**の設計思想を採用しています：

1. **ローカル処理**: すべての録画・編集処理はブラウザ内で完結
2. **サーバー送信なし**: ビデオデータは外部サーバーに送信されない（Google Driveは除く）
3. **ユーザー制御**: すべてのデータ保存はユーザーの明示的な同意が必要
4. **IndexedDB使用**: 一時データはブラウザのIndexedDBに保存

### セキュリティベストプラクティス

1. **入力検証**:

   ```javascript
   // ユーザー入力のサニタイズ
   const sanitizeFilename = (filename) => {
     return filename.replace(/[^a-z0-9_\-\.]/gi, '_');
   };
   ```

2. **XSS対策**:

   ```javascript
   // ReactのJSX自動エスケープを使用
   <div>{userInput}</div> // 自動的にエスケープされる
   ```

3. **CSRF対策**:

   ```javascript
   // OAuth2トークンの使用
   // chrome.identity APIが自動的に処理
   ```

4. **コンテンツ分離**:

   ```javascript
   // Shadow DOMでスタイル・スクリプトを分離
   const shadowRoot = element.attachShadow({ mode: 'open' });
   ```

---

## パフォーマンス最適化

### コード分割

Webpackのエントリーポイント分割により、必要なコードのみロード：

- Background: 51ファイル → 1つのバンドル
- Content Script: 複雑な構造 → 1つのバンドル
- Editor: FFmpeg処理 → 独立したバンドル

### 遅延ロード

```javascript
// 動的インポート
const loadEditor = async () => {
  const { Editor } = await import('./Editor/Sandbox.jsx');
  return Editor;
};
```

### メモリ管理

```javascript
// ビデオチャンクの適切な解放
const releaseChunks = () => {
  chunks.forEach(chunk => {
    URL.revokeObjectURL(chunk);
  });
  chunks = [];
};
```

### Offscreen Document活用

```javascript
// 重い処理をOffscreen Documentに移譲
chrome.offscreen.createDocument({
  url: 'recorderoffscreen.html',
  reasons: ['WORKERS'],
  justification: 'Recording processing'
});
```

---

## 開発ワークフロー

### ローカル開発

```bash
# 依存関係のインストール
npm install

# 開発サーバーの起動（ホットリロード）
npm run dev

# または監視モード
npm run watch
```

### ビルド

```bash
# 本番ビルド
npm run build

# 拡張機能のパッケージング
npm run package
# → extension.zip が生成される
```

### Chrome拡張機能のロード

1. Chromeで `chrome://extensions/` を開く
2. 「デベロッパーモード」を有効化
3. 「パッケージ化されていない拡張機能を読み込む」をクリック
4. `build/` フォルダを選択

### デバッグ

```javascript
// Background Service Workerのデバッグ
// chrome://extensions/ → 拡張機能の「Service Worker」リンクをクリック

// Content Scriptのデバッグ
// ページ上で右クリック → 検証 → Consoleタブ

// Offscreen Documentのデバッグ
// chrome://inspect/#pages → ターゲットを選択
```

---

## 今後の拡張可能性

### 1. 追加機能の実装

- **ライブストリーミング**: WebRTC経由でのライブ配信
- **クラウドストレージ統合**: Dropbox、OneDrive対応
- **AI字幕生成**: Web Speech API統合
- **高度な編集機能**: タイムライン編集、トランジション

### 2. パフォーマンス改善

- **WebCodecs API**: ハードウェアアクセラレーション
- **WebGPU**: GPU活用による高速処理
- **Service Worker最適化**: キャッシュ戦略の改善

### 3. プラットフォーム拡張

- **Firefox対応**: WebExtensions API移行
- **Safari対応**: Safari Web Extensions
- **デスクトップアプリ**: Electron化

---

## まとめ

Screenityは、以下の特徴を持つ高度なChrome拡張機能です：

1. **最新技術スタック**: React 18、Manifest V3、FFmpeg.wasm、MediaPipe
2. **モジュール設計**: 15のエントリーポイント、明確な責務分離
3. **プライバシー重視**: ローカル処理、ユーザー制御
4. **高機能**: 録画、編集、AI背景除去、注釈ツール
5. **スケーラビリティ**: 34,765行のコードを整理された構造で管理
6. **アクセシビリティ**: Radix UIによるARIA準拠
7. **多言語対応**: 18言語サポート

このアーキテクチャドキュメントは、開発者がプロジェクトの全体像を理解し、効率的に開発を進めるための包括的なリファレンスとして機能します。

---

**最終更新**: 2025-11-15
**ドキュメントバージョン**: 1.0.0
**対象バージョン**: Screenity 4.0.5

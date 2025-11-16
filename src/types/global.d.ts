// グローバル型定義

// 環境変数の型定義
declare namespace NodeJS {
  interface ProcessEnv {
    SCREENITY_APP_BASE: string;
    SCREENITY_WEBSITE_BASE: string;
    SCREENITY_API_BASE_URL: string;
    SCREENITY_ENABLE_CLOUD_FEATURES: string;
    MAX_RECORDING_DURATION: string;
    RECORDING_WARNING_THRESHOLD: string;
    NODE_ENV: 'development' | 'production';
    ASSET_PATH?: string;
  }
}

// Window拡張（必要に応じて）
interface Window {
  // カスタムプロパティがあればここに追加
}

// ImportMeta拡張（Webpack HMR対応）
interface ImportMeta {
  webpackHot?: {
    accept: () => void;
  };
}

// Webpack HMR (Hot Module Replacement)
declare namespace NodeJS {
  interface Module {
    hot?: {
      accept: (dependencies?: string | string[], callback?: () => void) => void;
    };
  }
}

// CropTarget（Region Capture API）
declare class CropTarget {
  readonly id?: string;
}

// MediaStreamTrack拡張（Region Capture API）
interface MediaStreamTrack {
  cropTo?(cropTarget: CropTarget): Promise<void>;
}

// MediaTrackSettings拡張
interface MediaTrackSettings {
  displaySurface?: 'browser' | 'window' | 'monitor';
}

// Raw loader module declaration
declare module '!raw-loader!*' {
  const content: string;
  export default content;
}

// SCSS module declarations
declare module '*.module.scss' {
  const classes: { [key: string]: string };
  export default classes;
}

declare module '*.scss' {
  const content: { [className: string]: string };
  export default content;
}

// Image module declarations
declare module '*.png' {
  const value: string;
  export default value;
}

declare module '*.jpg' {
  const value: string;
  export default value;
}

declare module '*.jpeg' {
  const value: string;
  export default value;
}

declare module '*.gif' {
  const value: string;
  export default value;
}

declare module '*.svg' {
  const value: string;
  export default value;
}

declare module '*.webp' {
  const value: string;
  export default value;
}

// FFmpeg.js type definitions
interface FFmpeg {
  // FS method overloads for type safety
  FS(method: 'writeFile', path: string, data: Uint8Array): void;
  FS(method: 'readFile', path: string): Uint8Array;
  FS(method: 'unlink', path: string): void;
  FS(method: 'readdir', path: string): string[];
  FS(method: 'mkdir', path: string): void;
  FS(method: 'rmdir', path: string): void;

  run: (...args: string[]) => Promise<void>;
  getInfo: (key: string) => string | number;
  setProgress: (callback: (progress: { ratio: number }) => void) => void;
  setLogger: (callback: (log: { type: string; message: string }) => void) => void;
}

/**
 * クリップ録画機能の型定義
 */

/**
 * クリップのクロップ領域を表す型
 */
export interface ClipCropRegion {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * クリップメタデータを表すインターフェース
 */
export interface ClipMetadata {
  /** クリップの一意なID */
  id: string;
  /** クリップの開始時刻（ミリ秒） */
  startTime: number;
  /** クリップの終了時刻（ミリ秒） */
  endTime: number;
  /** クリップの長さ（ミリ秒） */
  duration: number;
  /** クロップ領域（オプション） */
  crop?: ClipCropRegion;
  /** クリップ作成日時（ミリ秒） */
  createdAt: number;
  /** 録画セッションID（オプション） */
  recordingId?: string;
}

/**
 * クリップのリストを表す型
 */
export type ClipList = ClipMetadata[];

/**
 * クリップエラーコード
 */
export enum ClipErrorCode {
  /** 最大クリップ数に達した */
  MAX_CLIPS_REACHED = 'MAX_CLIPS_REACHED',
  /** クリップの長さが最大値を超えた */
  DURATION_TOO_LONG = 'DURATION_TOO_LONG',
  /** 無効なクロップ領域 */
  INVALID_CROP = 'INVALID_CROP',
  /** 録画中ではない */
  NOT_RECORDING = 'NOT_RECORDING',
  /** 無効な時刻範囲 */
  INVALID_TIME_RANGE = 'INVALID_TIME_RANGE',
}

/**
 * クリップバリデーションエラー
 */
export class ClipValidationError extends Error {
  /** エラーコード */
  code: ClipErrorCode;

  constructor(code: ClipErrorCode, message: string) {
    super(message);
    this.name = 'ClipValidationError';
    this.code = code;

    // プロトタイプチェーンを正しく設定（TypeScript の制約）
    Object.setPrototypeOf(this, ClipValidationError.prototype);
  }
}

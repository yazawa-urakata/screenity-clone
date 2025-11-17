/**
 * クリップ録画機能のユーティリティ関数
 */

import type { ClipMetadata, ClipList, ClipCropRegion } from '../types/clip';
import { ClipErrorCode, ClipValidationError } from '../types/clip';

/**
 * 最大クリップ数
 */
export const MAX_CLIPS = 5;

/**
 * 最大クリップ長（ミリ秒）= 60秒
 */
export const MAX_CLIP_DURATION_MS = 60 * 1000;

/**
 * クリップメタデータを作成する
 *
 * @param recordingStartTime 録画開始時刻（ミリ秒）
 * @param clipStartTime クリップ開始時刻（ミリ秒）
 * @param clipEndTime クリップ終了時刻（ミリ秒）
 * @param crop クロップ領域（オプション）
 * @param recordingId 録画セッションID（オプション）
 * @returns クリップメタデータ
 */
export function createClipMetadata(
  recordingStartTime: number,
  clipStartTime: number,
  clipEndTime: number,
  crop?: ClipCropRegion,
  recordingId?: string
): ClipMetadata {
  const duration = clipEndTime - clipStartTime;
  const id = crypto.randomUUID();

  return {
    id,
    startTime: clipStartTime,
    endTime: clipEndTime,
    duration,
    crop,
    createdAt: Date.now(),
    recordingId,
  };
}

/**
 * クリップのバリデーションを行う
 *
 * @param clips 既存のクリップリスト
 * @param clipStartTime クリップ開始時刻（ミリ秒）
 * @param clipEndTime クリップ終了時刻（ミリ秒）
 * @param isRecording 録画中かどうか
 * @throws {ClipValidationError} バリデーションエラー
 */
export function validateClip(
  clips: ClipList,
  clipStartTime: number,
  clipEndTime: number,
  isRecording: boolean
): void {
  // 録画中チェック
  if (!isRecording) {
    throw new ClipValidationError(
      ClipErrorCode.NOT_RECORDING,
      '録画を開始してください'
    );
  }

  // 最大数チェック
  if (clips.length >= MAX_CLIPS) {
    throw new ClipValidationError(
      ClipErrorCode.MAX_CLIPS_REACHED,
      `クリップは最大${MAX_CLIPS}つまでです`
    );
  }

  // 時刻妥当性チェック
  if (clipStartTime >= clipEndTime) {
    throw new ClipValidationError(
      ClipErrorCode.INVALID_TIME_RANGE,
      '無効な時刻範囲です'
    );
  }

  // 長さチェック
  const duration = clipEndTime - clipStartTime;
  if (duration > MAX_CLIP_DURATION_MS) {
    throw new ClipValidationError(
      ClipErrorCode.DURATION_TOO_LONG,
      `クリップは最大${MAX_CLIP_DURATION_MS / 1000}秒までです`
    );
  }
}

/**
 * クリップの長さを秒単位で取得する
 *
 * @param clip クリップメタデータ
 * @returns 長さ（秒）
 */
export function getClipDurationSeconds(clip: ClipMetadata): number {
  return Math.floor(clip.duration / 1000);
}

/**
 * ミリ秒を "MM:SS" 形式にフォーマットする
 *
 * @param milliseconds ミリ秒
 * @returns フォーマットされた時刻文字列
 */
export function formatClipTime(milliseconds: number): string {
  const totalSeconds = Math.floor(milliseconds / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  const paddedMinutes = String(minutes).padStart(2, '0');
  const paddedSeconds = String(seconds).padStart(2, '0');

  return `${paddedMinutes}:${paddedSeconds}`;
}

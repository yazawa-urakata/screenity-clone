/**
 * クリップ録画機能のバックグラウンドハンドラー
 */

import type { SaveClipMessage } from '../../../types/message';
import type { ClipList, ClipMetadata } from '../../../types/clip';
import { validateClip } from '../../../utils/clipUtils';
import { ClipValidationError, ClipErrorCode } from '../../../types/clip';
import { sendMessageTab } from '../tabManagement/sendMessageTab';

/**
 * クリップを保存するハンドラー
 */
export async function handleSaveClip(
  message: SaveClipMessage,
  sender: chrome.runtime.MessageSender
): Promise<void> {
  try {
    const { clipData } = message.payload;

    // Chrome Storage から必要なデータを取得
    const result = await chrome.storage.local.get([
      'clips',
      'recording',
      'recordingTab',
    ]);

    const clips = (result.clips as ClipList) || [];
    const recording = result.recording as boolean;
    const recordingTab = result.recordingTab as number;

    // クリップのバリデーション
    validateClip(clips, clipData.startTime, clipData.endTime, recording);

    // クリップリストを更新
    const updatedClips: ClipList = [...clips, clipData];

    // Chrome Storage に保存
    await chrome.storage.local.set({ clips: updatedClips });

    // クリップ番号と秒数を計算
    const clipNumber = updatedClips.length;
    const durationSeconds = Math.floor(clipData.duration / 1000);

    console.log(`[ClipHandlers] クリップ ${clipNumber} を保存しました (${durationSeconds}秒)`, clipData);

    // Content Script に成功メッセージを送信（エラーは無視）
    // sender.tab.id を優先的に使用（メッセージ送信元のタブに確実に返す）
    const targetTabId = sender.tab?.id || recordingTab;

    if (targetTabId) {
      try {
        await sendMessageTab(targetTabId, {
          type: 'clip-saved',
          payload: {
            clipId: clipData.id,
            clipNumber,
            duration: durationSeconds,
          },
        });
        console.log(`[ClipHandlers] clip-saved メッセージを送信しました (tab: ${targetTabId})`);
      } catch (messageError) {
        // メッセージ送信エラーは無視（Chrome Storage には保存済み）
        console.warn('[ClipHandlers] clip-saved メッセージの送信に失敗しましたが、クリップは保存されています:', messageError);
      }
    } else {
      console.warn('[ClipHandlers] 送信先タブIDが見つかりません。クリップは保存されていますが、通知は送信されませんでした。');
    }
  } catch (error) {
    console.error('[ClipHandlers] クリップ保存エラー:', error);

    // エラーメッセージを送信（エラーは無視）
    // sender.tab.id を優先的に使用
    const result = await chrome.storage.local.get(['recordingTab']);
    const recordingTab = result.recordingTab as number;
    const targetTabId = sender.tab?.id || recordingTab;

    if (targetTabId) {
      let errorCode = ClipErrorCode.NOT_RECORDING;
      let errorMessage = 'クリップの保存に失敗しました';

      if (error instanceof ClipValidationError) {
        errorCode = error.code;
        errorMessage = error.message;
      }

      try {
        await sendMessageTab(targetTabId, {
          type: 'clip-error',
          payload: {
            code: errorCode,
            message: errorMessage,
          },
        });
      } catch (messageError) {
        console.warn('[ClipHandlers] clip-error メッセージの送信に失敗しました:', messageError);
      }
    }

    // Chrome Storage の操作が失敗した場合のみエラーを throw
    // メッセージ送信の失敗は許容する
    if (error instanceof ClipValidationError || error instanceof Error) {
      // バリデーションエラーの場合は throw しない（既にログ出力済み）
      return;
    }
  }
}

/**
 * クリップをクリアする
 */
export async function clearClips(): Promise<void> {
  try {
    await chrome.storage.local.set({ clips: [] });
    console.log('[ClipHandlers] クリップをクリアしました');
  } catch (error) {
    console.error('[ClipHandlers] クリップクリアエラー:', error);
    throw error;
  }
}

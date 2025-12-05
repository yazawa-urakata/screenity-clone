import {
  getSupabaseAuthState,
  getWebAppUrl,
} from "../../../utils/supabaseClient";
import { abortMultipartUpload } from "../../Recorder/abortUtils";
import { addOrphanedUpload } from "../../Recorder/uploadStateManager";
import { sendMessageTab } from "../tabManagement";

interface RecorderTabClosingMessage {
  type: "recorder-tab-closing";
  uploadId: string;
  key: string;
}

/**
 * Listener for "recorder-tab-closing" message from recorder.html
 * beforeunload ハンドラーから送信されたabort要求を実行
 */
export const onRecorderTabClosingListener = (): void => {
  chrome.runtime.onMessage.addListener(
    (
      message: RecorderTabClosingMessage,
      sender: chrome.runtime.MessageSender,
      _sendResponse: (response?: unknown) => void,
    ) => {
      if (message.type !== "recorder-tab-closing") return;

      console.log("[RecorderTabClosing] Received tab closing notification");

      const { uploadId, key } = message;

      if (!uploadId || !key) {
        console.error("[RecorderTabClosing] Missing uploadId or key");
        return;
      }

      // 非同期処理を実行（_sendResponseは使用しない）
      (async () => {
        try {
          // 1. 認証状態を取得
          const { isAuthenticated, accessToken } = await getSupabaseAuthState();

          if (!isAuthenticated || !accessToken) {
            console.error(
              "[RecorderTabClosing] Not authenticated, adding to orphaned list",
            );
            await addOrphanedUpload({
              uploadId,
              key,
              createdAt: Date.now(),
              abortAttempts: 0,
            });
            return;
          }

          const apiBaseUrl = getWebAppUrl();

          // 2. abort API を実行（retry あり）
          const aborted = await abortMultipartUpload(
            uploadId,
            key,
            apiBaseUrl,
            accessToken,
            "tab_closed",
          );

          if (aborted) {
            console.log("[RecorderTabClosing] ✅ Successfully aborted upload");
          } else {
            console.warn(
              "[RecorderTabClosing] ⚠️ Failed to abort, added to orphaned list",
            );
          }

          // 3. Content Script に通知
          const tabId = sender.tab?.id;
          if (tabId) {
            await sendMessageTab(tabId, {
              type: "recording-aborted",
              reason: "recorder_tab_closed",
            });
          } else {
            // フォールバック: sender.tab が undefined の場合
            const { activeTab } = await chrome.storage.local.get(["activeTab"]);
            if (activeTab) {
              await sendMessageTab(activeTab as number, {
                type: "recording-aborted",
                reason: "recorder_tab_closed",
              });
            }
          }

          // 4. 録画状態をクリア
          await chrome.storage.local.set({
            recording: false,
            recordingTab: null,
          });
        } catch (error) {
          console.error(
            "[RecorderTabClosing] Error handling tab closing:",
            error,
          );
        }
      })();

      // リスナーを非同期にするために true を返さない（false または undefined）
      return false;
    },
  );
};

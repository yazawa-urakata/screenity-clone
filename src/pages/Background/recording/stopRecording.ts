import { discardOffscreenDocuments } from "../offscreen/discardOffscreenDocuments";
import { waitForContentScript } from "../utils/waitForContentScript";
import { sendChunks } from "./sendChunks";
import { sendMessageRecord } from "./sendMessageRecord";

export const stopRecording = async () => {
  chrome.action.setIcon({ path: "assets/icon-34.png" });
  chrome.storage.local.set({ restarting: false });
  const { recordingStartTime, isSubscribed } = await chrome.storage.local.get([
    "recordingStartTime",
    "isSubscribed",
  ]);

  let duration = Date.now() - (recordingStartTime as number);

  if (recordingStartTime === 0) {
    duration = 0;
  }

  chrome.storage.local.set({
    recording: false,
    recordingDuration: duration,
    tabRecordedID: null,
    clipRecording: false,
    clipStartTime: null,
    clipCrop: null,
  });

  chrome.storage.local.set({ recordingStartTime: 0 });

  // クリップはクリアしない（Editor で使用するため）
  // 次の録画開始時にクリアする
  // await clearClips();

  if (isSubscribed) {
    chrome.alarms.clear("recording-alarm");
    discardOffscreenDocuments();
  } else {
    // 常に fallback editor を開く（mp4変換を無効化）
    chrome.tabs.create({ url: "editorfallback.html", active: true }, (tab) => {
      chrome.tabs.onUpdated.addListener(function _(tabId, changeInfo) {
        if (tabId === tab.id && changeInfo.status === "complete") {
          chrome.tabs.onUpdated.removeListener(_);
          chrome.storage.local.set({ sandboxTab: tab.id });
          waitForContentScript(tab.id)
            .then(() => {
              sendChunks();
            })
            .catch((err) => {
              console.error(
                "❌ Failed to wait for content script:",
                err.message,
              );
            });
        }
      });
    });

    chrome.runtime.sendMessage({ type: "turn-off-pip" });
  }

  const { wasRegion } = await chrome.storage.local.get(["wasRegion"]);
  if (wasRegion) {
    chrome.storage.local.set({ wasRegion: false, region: true });
  }

  chrome.alarms.clear("recording-alarm");
  discardOffscreenDocuments();
};

export const handleStopRecordingTab = async (request) => {
  chrome.action.setIcon({ path: "assets/icon-34.png" });
  if (request.memoryError) {
    chrome.storage.local.set({
      recording: false,
      restarting: false,
      tabRecordedID: null,
      memoryError: true,
    });
  }

  // 録画停止時に即座に stopRecording() を呼び出して editorfallback.html を開く
  stopRecording();

  sendMessageRecord({ type: "stop-recording-tab" });
};

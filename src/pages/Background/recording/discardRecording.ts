import { discardOffscreenDocuments } from "../offscreen/discardOffscreenDocuments";
import { sendMessageRecord } from "./sendMessageRecord";

export const discardRecording = async () => {
  sendMessageRecord({ type: "dismiss-recording" });
  chrome.action.setIcon({ path: "assets/icon-34.png" });

  // Clear offscreen documents if they exist
  discardOffscreenDocuments();

  chrome.storage.local.set({
    recordingTab: null,
    sandboxTab: null,
    recording: false,
  });

  chrome.runtime.sendMessage({ type: "turn-off-pip" });
};

export const handleDismissRecordingTab = async () => {
  discardRecording();
};

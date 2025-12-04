import { resetActiveTabRestart } from "../tabManagement/resetActiveTab";
import { sendMessageRecord } from "./sendMessageRecord";

export const handleRestart = async () => {
  chrome.storage.local.set({ restarting: true });

  resetActiveTabRestart();
};

export const handleRestartRecordingTab = async () => {
  sendMessageRecord({ type: "restart-recording-tab" });
};

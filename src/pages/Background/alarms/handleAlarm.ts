import { stopRecording } from "../recording/stopRecording";
import { sendMessageTab } from "../tabManagement";
import { sendMessageRecord } from "../recording/sendMessageRecord";

// Utility to handle tab messaging logic
const handleTabMessaging = async (): Promise<void> => {
  const { activeTab } = await chrome.storage.local.get(["activeTab"]);

  try {
    if (activeTab) {
      const targetTab = await chrome.tabs.get(activeTab as number);
      if (targetTab) {
        sendMessageTab(activeTab as number, { type: "stop-recording-tab" });
      }
    }
  } catch (error) {
    console.error("Error in handleTabMessaging:", error);
  }
};

export const handleAlarm = async (alarm: chrome.alarms.Alarm): Promise<void> => {
  if (alarm.name === "recording-alarm") {
    const { recording } = await chrome.storage.local.get(["recording"]);

    if (recording) {
      stopRecording();
      sendMessageRecord({ type: "stop-recording-tab" });
      await handleTabMessaging();
    }

    await chrome.alarms.clear("recording-alarm");
  }
};

import { sendMessageTab } from "../tabManagement";

export const handleTabUpdate = async (
  tabId: number,
  changeInfo,
  tab: chrome.tabs.Tab
): Promise<void> => {
  try {
    if (changeInfo.status === "complete") {
      const { recording } = await chrome.storage.local.get(["recording"]);
      const { restarting } = await chrome.storage.local.get(["restarting"]);
      const { tabRecordedID } = await chrome.storage.local.get([
        "tabRecordedID",
      ]);
      const { pendingRecording } = await chrome.storage.local.get([
        "pendingRecording",
      ]);
      const { recordingStartTime } = await chrome.storage.local.get([
        "recordingStartTime",
      ]);

      if (!recording && !restarting && !pendingRecording) {
        sendMessageTab(tabId, { type: "recording-ended" });
      } else if (recording) {
        if (tabRecordedID && (tabRecordedID as number) === tabId) {
          sendMessageTab(tabId, {
            type: "recording-check",
            force: true,
            recordingStartTime,
          });
        } else if (tabRecordedID && (tabRecordedID as number) !== tabId) {
          sendMessageTab(tabId, { type: "hide-popup-recording" });
        }
      }

      if (recordingStartTime) {
        // Check if alarm
        const { alarm } = await chrome.storage.local.get(["alarm"]);
        if (alarm) {
          const { alarmTime } = await chrome.storage.local.get(["alarmTime"]);
          const seconds = parseFloat(alarmTime as string);
          const time = Math.floor((Date.now() - (recordingStartTime as number)) / 1000);
          const remaining = seconds - time;
          sendMessageTab(tabId, {
            type: "time",
            time: remaining,
          });
        } else {
          const time = Math.floor((Date.now() - (recordingStartTime as number)) / 1000);
          sendMessageTab(tabId, { type: "time", time: time });
        }
      }

      const commands = await chrome.commands.getAll();

      sendMessageTab(tabId, {
        type: "commands",
        commands: commands,
      });

      // Check if tab is playground.html
      if (
        tab.url?.includes(chrome.runtime.getURL("playground.html")) &&
        changeInfo.status === "complete"
      ) {
        sendMessageTab(tab.id as number, { type: "toggle-popup" });
      }
    }
  } catch (error) {
    console.error("Error in handleTabUpdate:", (error as Error).message);
  }
};

export const onTabUpdatedListener = (): void => {
  chrome.tabs.onUpdated.addListener(handleTabUpdate);
};

import {
  sendMessageTab,
  focusTab,
  removeTab,
  getCurrentTab,
} from "../tabManagement";
import { sendMessageRecord } from "./sendMessageRecord";
import { stopRecording } from "./stopRecording";
import { addAlarmListener } from "../alarms/addAlarmListener";
import { getStreamingData } from "./getStreamingData";
import { discardOffscreenDocuments } from "../offscreen/discardOffscreenDocuments";
interface CheckCapturePermissionsParams {
  isLoggedIn: boolean;
  isSubscribed: boolean;
}

interface PermissionResult {
  status: "ok" | "error";
}

export const checkCapturePermissions = async ({
  isLoggedIn,
  isSubscribed,
}: CheckCapturePermissionsParams): Promise<PermissionResult> => {
  const permissions: chrome.permissions.Permissions["permissions"] = [
    "desktopCapture",
    "alarms",
    "offscreen",
  ];

  // Add clipboardWrite and notifications only for subscribed users
  if (isLoggedIn && isSubscribed) {
    permissions.push("clipboardWrite");
  }

  // Check if required APIs are available in this browser context
  if (
    chrome.desktopCapture &&
    chrome.alarms &&
    chrome.offscreen
    // Note: chrome.clipboard is not available in @types/chrome yet
  ) {
    return { status: "ok" };
  }

  const granted = await new Promise<boolean>((resolve) => {
    chrome.permissions.request({ permissions }, resolve);
  });

  if (granted) {
    addAlarmListener();
    return { status: "ok" };
  } else {
    return { status: "error" };
  }
};

export const handlePip = async (started = false): Promise<void> => {
  const { activeTab } = await chrome.storage.local.get(["activeTab"]);
  if (started) {
    sendMessageTab(activeTab as number, { type: "pip-started" });
  } else {
    sendMessageTab(activeTab as number, { type: "pip-ended" });
  }
};

export const handleOnGetPermissions = async (request) => {
  // Send a message to (actual) active tab
  const activeTab = await getCurrentTab();
  if (activeTab) {
    sendMessageTab(activeTab.id, {
      type: "on-get-permissions",
      data: request,
    });
  }
};

export const handleRecordingComplete = async () => {
  const { recordingTab } = await chrome.storage.local.get(["recordingTab"]);

  if (recordingTab) {
    chrome.tabs.get(recordingTab as number, (tab) => {
      if (tab) {
        // Check if tab url contains chrome-extension and recorder.html
        if (
          tab.url?.includes("chrome-extension") &&
          tab.url?.includes("recorder.html")
        ) {
          // FLAG: For testing purposes -> comment to debug
          removeTab(recordingTab as number);
        }
      }
    });
  }
};

export const handleRecordingError = async (request: any) => {
  const { activeTab } = await chrome.storage.local.get(["activeTab"]);

  sendMessageRecord({ type: "recording-error" }).then(() => {
    sendMessageTab(activeTab as number, { type: "stop-pending" });
    focusTab(activeTab as number);
    if (request.error === "stream-error") {
      sendMessageTab(activeTab as number, { type: "stream-error" });
    } else if (request.error === "backup-error") {
      sendMessageTab(activeTab as number, { type: "backup-error" });
    }
  });

  const { recordingTab } = await chrome.storage.local.get(["recordingTab"]);
  const { region } = await chrome.storage.local.get(["region"]);
  if (recordingTab && !region) {
    // FLAG: For testing purposes -> comment to debug
    removeTab(recordingTab as number);
  }
  chrome.storage.local.set({ recordingTab: null });
  discardOffscreenDocuments();
};

export const handleGetStreamingData = async () => {
  const data = await getStreamingData();
  sendMessageRecord({ type: "streaming-data", data: JSON.stringify(data) });
};

export const videoReady = async () => {
  const { backupTab } = await chrome.storage.local.get(["backupTab"]);
  if (backupTab) {
    sendMessageTab(backupTab as number, { type: "close-writable" });
  }
  // stopRecording() は handleStopRecordingTab() で既に呼ばれているため、
  // ここでは何もしない（重複したタブ作成を防ぐ）
};

export const writeFile = async (request: any) => {
  const { backupTab } = await chrome.storage.local.get(["backupTab"]);

  if (backupTab) {
    sendMessageTab(
      backupTab as number,
      {
        type: "write-file",
        index: request.index,
      },
      null,
      () => {
        sendMessageRecord({ type: "stop-recording-tab" });
      }
    );
  } else {
    sendMessageRecord({ type: "stop-recording-tab" });
  }
};

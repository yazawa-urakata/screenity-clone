import { sendMessageRecord } from "../recording/sendMessageRecord";
import { getCurrentTab } from "../tabManagement";
import { closeOffscreenDocument } from "./closeOffscreenDocument";

export interface RecordingRequest {
  region?: boolean;
  customRegion?: boolean;
  offscreenRecording?: boolean;
  [key: string]: unknown;
}

const openRecorderTab = async (
  activeTab: chrome.tabs.Tab,
  isRegion: boolean,
  request: RecordingRequest,
): Promise<void> => {
  let switchTab = true;

  const recorderUrl = chrome.runtime.getURL("recorder.html");

  if (isRegion) {
    switchTab =
      activeTab.url?.includes(chrome.runtime.getURL("playground.html")) ??
      false;
  }

  chrome.tabs
    .create({
      url: recorderUrl,
      pinned: true,
      index: 0,
      // FLAG: Check this is ok?
      active: switchTab,
    })
    .then((tab: chrome.tabs.Tab) => {
      chrome.storage.local.set({
        recordingTab: tab.id,
        offscreen: false,
        region: false,
        wasRegion: true,
        clickEvents: [],
        ...(isRegion ? { tabRecordedID: activeTab.id } : {}),
      });

      chrome.tabs.onUpdated.addListener(function listener(
        tabId: number,
        changeInfo,
      ) {
        if (tabId === tab.id && changeInfo.status === "complete") {
          chrome.tabs.onUpdated.removeListener(listener);
          sendMessageRecord({
            type: "loaded",
            request: request,
            // Always set isTab and tabID for tab recording (no dialog)
            isTab: true,
            tabID: activeTab.id,
          });
        }
      });
    });
};

export const offscreenDocument = async (
  request: RecordingRequest,
  tabId: number | null = null,
): Promise<void> => {
  let activeTab = await getCurrentTab();

  if (tabId !== null) {
    activeTab = await chrome.tabs.get(tabId);
  }

  chrome.storage.local.set({
    activeTab: activeTab.id,
    tabRecordedID: null,
    memoryError: false,
  });

  if (activeTab.url?.includes(chrome.runtime.getURL("playground.html"))) {
    chrome.storage.local.set({ tabPreferred: true });
  } else {
    chrome.storage.local.set({ tabPreferred: false });
  }

  await closeOffscreenDocument();

  if (request.region) {
    if (tabId !== null) chrome.tabs.update(tabId, { active: true });

    chrome.storage.local.set({
      recordingTab: activeTab.id,
      offscreen: false,
      region: true,
    });

    if (request.customRegion) {
      sendMessageRecord({
        type: "loaded",
        request: request,
        region: true,
      });
    } else {
      await openRecorderTab(activeTab, true, request);
    }
  } else {
    if (!request.offscreenRecording) {
      // Skip offscreen recording if conditions aren't met
      await openRecorderTab(activeTab, false, request);
      return;
    }

    try {
      if (tabId !== null) chrome.tabs.update(tabId, { active: true });

      const { qualityValue, fpsValue } = await chrome.storage.local.get([
        "qualityValue",
        "fpsValue",
      ]);

      await closeOffscreenDocument();

      await chrome.offscreen.createDocument({
        url: "recorderoffscreen.html",
        reasons: [
          "USER_MEDIA" as chrome.offscreen.Reason,
          "AUDIO_PLAYBACK" as chrome.offscreen.Reason,
          "DISPLAY_MEDIA" as chrome.offscreen.Reason,
        ],
        justification: "Recording from getDisplayMedia API",
      });

      chrome.storage.local.set({
        recordingTab: null,
        offscreen: true,
        region: false,
        wasRegion: false,
      });

      sendMessageRecord({
        type: "loaded",
        request: request,
        isTab: false,
        quality: qualityValue,
        fps: fpsValue,
      });
    } catch (error) {
      console.error("Error creating offscreen document:", error);
      await openRecorderTab(activeTab, false, request);
    }
  }
};

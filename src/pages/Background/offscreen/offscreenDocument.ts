import { getCurrentTab } from "../tabManagement";
import { sendMessageRecord } from "../recording/sendMessageRecord";
import { closeOffscreenDocument } from "./closeOffscreenDocument";
import { loginWithWebsite } from "../auth/loginWithWebsite";

export interface RecordingRequest {
  region?: boolean;
  customRegion?: boolean;
  offscreenRecording?: boolean;
  camera?: boolean;
  [key: string]: unknown;
}

const openRecorderTab = async (
  activeTab: chrome.tabs.Tab,
  backup: boolean,
  isRegion: boolean,
  camera: boolean = false,
  request: RecordingRequest
): Promise<void> => {
  let switchTab = true;

  // Check subscription status
  const { authenticated, subscribed } = await loginWithWebsite();
  const recorderUrl =
    authenticated && subscribed
      ? chrome.runtime.getURL("cloudrecorder.html")
      : chrome.runtime.getURL("recorder.html");

  if (!isRegion) {
    if (camera) {
      switchTab = false;
    }
  } else {
    switchTab = activeTab.url?.includes(
      chrome.runtime.getURL("playground.html")
    ) ?? false;
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
        changeInfo
      ) {
        if (tabId === tab.id && changeInfo.status === "complete") {
          chrome.tabs.onUpdated.removeListener(listener);
          sendMessageRecord({
            type: "loaded",
            request: request,
            backup: backup,
            // Always set isTab and tabID for tab recording (no dialog)
            isTab: !camera,
            tabID: !camera ? activeTab.id : undefined,
          });
        }
      });
    });
};

export const offscreenDocument = async (request: RecordingRequest, tabId: number | null = null): Promise<void> => {
  const { backup } = await chrome.storage.local.get(["backup"]);
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
        backup: backup as boolean,
        region: true,
      });
    } else {
      await openRecorderTab(activeTab, backup as boolean, true, false, request);
    }
  } else {
    if (!request.offscreenRecording || request.camera) {
      // Skip offscreen recording if conditions aren't met
      await openRecorderTab(activeTab, backup as boolean, false, request.camera ?? false, request);
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
        reasons: ["USER_MEDIA" as chrome.offscreen.Reason, "AUDIO_PLAYBACK" as chrome.offscreen.Reason, "DISPLAY_MEDIA" as chrome.offscreen.Reason],
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
        backup: backup as boolean,
      });
    } catch (error) {
      console.error("Error creating offscreen document:", error);
      await openRecorderTab(activeTab, backup as boolean, false, request.camera ?? false, request);
    }
  }
};

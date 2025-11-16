import { sendMessageTab, getCurrentTab } from "../tabManagement";
import { sendMessageRecord } from "../recording/sendMessageRecord";
import { stopRecording } from "../recording/stopRecording";
import { loginWithWebsite } from "../auth/loginWithWebsite";

const CLOUD_FEATURES_ENABLED =
  process.env.SCREENITY_ENABLE_CLOUD_FEATURES === "true";

// Utility to handle tab messaging logic
const handleTabMessaging = async (tab: chrome.tabs.Tab): Promise<void> => {
  const { activeTab } = await chrome.storage.local.get(["activeTab"]);

  try {
    const targetTab = await chrome.tabs.get(activeTab as number);

    if (targetTab) {
      sendMessageTab(activeTab as number, { type: "stop-recording-tab" }).catch((error) => {
        console.log("Could not send stop-recording message to active tab:", error);
      });
    } else {
      sendMessageTab(tab.id as number, { type: "stop-recording-tab" }).catch((error) => {
        console.log("Could not send stop-recording message to tab:", error);
      });
      chrome.storage.local.set({ activeTab: tab.id });
    }
  } catch (error) {
    console.error("Error in handleTabMessaging:", error);
  }
};

// Utility to open Playground or inject popup
const openPlaygroundOrPopup = async (tab: chrome.tabs.Tab): Promise<void> => {
  const editorUrlPattern =
    /https?:\/\/(app\.screenity\.io|localhost:3000)\/editor\/([^\/]+)(\/edit)?\/?/;

  if (tab.url && editorUrlPattern.test(tab.url)) {
    await chrome.storage.local.set({ editorTab: tab.id });

    if (CLOUD_FEATURES_ENABLED) {
      const result = await loginWithWebsite();

      if (result?.authenticated) {
        const match = tab.url.match(editorUrlPattern);
        const projectIdFromUrl = match?.[2];

        await chrome.storage.local.set({
          projectId: projectIdFromUrl,
          recordingToScene: true,
          instantMode: false,
        });

        sendMessageTab(tab.id as number, {
          type: "get-project-info",
        }).catch((error) => {
          console.log("Could not get project info:", error);
        });
      } else {
        await chrome.storage.local.set({
          projectId: null,
          recordingToScene: false,
          activeSceneId: null,
        });
      }
    } else {
      await chrome.storage.local.set({
        projectId: null,
        recordingToScene: false,
        activeSceneId: null,
      });
    }
  } else {
    await chrome.storage.local.set({
      projectId: null,
      recordingToScene: false,
      activeSceneId: null, // reset scene too if needed
    });
  }

  const forbiddenURLs = [
    "chrome://",
    "chrome-extension://",
    "chrome.google.com/webstore",
    "chromewebstore.google.com",
    "stackoverflow.com/",
  ];

  const isForbidden = forbiddenURLs.some((url) => tab.url?.startsWith(url));
  const isPlaygroundOrSetup =
    tab.url?.includes("/playground.html") || tab.url?.includes("/setup.html");

  if ((!isForbidden || isPlaygroundOrSetup) && navigator.onLine) {
    sendMessageTab(tab.id as number, { type: "toggle-popup" }).catch((error) => {
      console.log("Could not send message to tab:", error);
    });
    chrome.storage.local.set({ activeTab: tab.id });
  } else {
    const newTab = await chrome.tabs.create({
      url: "playground.html",
      active: true,
    });
    chrome.storage.local.set({ activeTab: newTab.id });

    const onUpdated = (
      tabId: number,
      changeInfo,
      updatedTab: chrome.tabs.Tab
    ): void => {
      if (updatedTab.id === newTab.id && changeInfo.status === "complete") {
        chrome.tabs.onUpdated.removeListener(onUpdated);
        setTimeout(() => {
          sendMessageTab(newTab.id as number, { type: "toggle-popup" }).catch((error) => {
            console.log("Could not send message to new tab:", error);
          });
        }, 500);
      }
    };
    chrome.tabs.onUpdated.addListener(onUpdated);
  }
};

// Main action button listener
export const onActionButtonClickedListener = (): void => {
  chrome.action.onClicked.addListener(async (tab: chrome.tabs.Tab) => {
    try {
      const { recording } = await chrome.storage.local.get(["recording"]);

      if (recording) {
        stopRecording();
        sendMessageRecord({ type: "stop-recording-tab" });
        await handleTabMessaging(tab);
      } else {
        // Reset storage keys before opening the popup
        await chrome.storage.local.set({
          recordingToScene: false,
          projectId: null,
          activeSceneId: null,
        });
        await openPlaygroundOrPopup(tab);
      }

      const { firstTime } = await chrome.storage.local.get(["firstTime"]);
      if (firstTime && tab.url?.includes(chrome.runtime.getURL("setup.html"))) {
        chrome.storage.local.set({ firstTime: false });
        const activeTab = await getCurrentTab();
        sendMessageTab(activeTab.id as number, { type: "setup-complete" }).catch((error) => {
          console.log("Could not send setup-complete message:", error);
        });
      }
    } catch (error) {
      console.error("Error handling action click:", error);
    }
  });
};

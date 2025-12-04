import { executeScripts } from "../utils/executeScripts";

const cloudFeaturesEnabled =
  process.env.SCREENITY_ENABLE_CLOUD_FEATURES === "true";

export const onInstalledListener = (): void => {
  chrome.runtime.onInstalled.addListener(
    async (details: chrome.runtime.InstalledDetails) => {
      if (details.reason === "install") {
        // Clear storage on fresh install
        chrome.storage.local.clear();

        chrome.storage.local.set({
          firstTime: true,
          onboarding: cloudFeaturesEnabled,
          bannerSupport: true,
          firstTimePro: cloudFeaturesEnabled,
        });

        chrome.storage.managed.get(
          "skipSetup",
          (managedConfig: { skipSetup?: boolean }) => {
            const skipSetup = managedConfig.skipSetup ?? false;
            if (!skipSetup) {
              chrome.tabs.create({ url: "setup.html" });
            }
          },
        );
      } else if (details.reason === "update") {
        if (details.previousVersion === "2.8.6") {
          chrome.storage.local.clear();
          chrome.storage.local.set({ updatingFromOld: true });
        } else {
          chrome.storage.local.set({ updatingFromOld: false });

          // Onboarding for new cloud version
          if (details.previousVersion === "3.1.16" && cloudFeaturesEnabled) {
            chrome.storage.local.set({
              showProSplash: cloudFeaturesEnabled,
              bannerSupport: true,
              onboarding: cloudFeaturesEnabled,
            });
          }
        }
      }

      chrome.storage.local.set({ systemAudio: true });

      executeScripts();
    },
  );
};

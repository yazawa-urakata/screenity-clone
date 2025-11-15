import { sendMessageTab, getCurrentTab } from "../tabManagement";

// Main command listener
export const onCommandListener = () => {
  chrome.commands.onCommand.addListener(async (command) => {
    const activeTab = await getCurrentTab();

    if (command === "start-recording") {
      // Validate if it's possible to inject into content
      if (
        !(
          (navigator.onLine === false &&
            !activeTab.url.includes("/playground.html") &&
            !activeTab.url.includes("/setup.html")) ||
          activeTab.url.startsWith("chrome://") ||
          (activeTab.url.startsWith("chrome-extension://") &&
            !activeTab.url.includes("/playground.html") &&
            !activeTab.url.includes("/setup.html"))
        ) &&
        !activeTab.url.includes("stackoverflow.com/") &&
        !activeTab.url.includes("chrome.google.com/webstore") &&
        !activeTab.url.includes("chromewebstore.google.com")
      ) {
        sendMessageTab(activeTab.id, { type: "start-stream" }).catch((error) => {
          console.log("Could not send start-stream command:", error);
        });
      } else {
        chrome.tabs
          .create({
            url: "playground.html",
            active: true,
          })
          .then((tab) => {
            chrome.storage.local.set({ activeTab: tab.id });

            // Wait for the tab to load
            chrome.tabs.onUpdated.addListener(function _(tabId, changeInfo) {
              if (tabId === tab.id && changeInfo.status === "complete") {
                setTimeout(() => {
                  sendMessageTab(tab.id, { type: "start-stream" }).catch((error) => {
                    console.log("Could not send start-stream to new tab:", error);
                  });
                }, 500);
                chrome.tabs.onUpdated.removeListener(_);
              }
            });
          });
      }
    } else if (command === "cancel-recording") {
      sendMessageTab(activeTab.id, { type: "cancel-recording" }).catch((error) => {
        console.log("Could not send cancel-recording command:", error);
      });
    } else if (command === "pause-recording") {
      sendMessageTab(activeTab.id, { type: "pause-recording" }).catch((error) => {
        console.log("Could not send pause-recording command:", error);
      });
    }
  });
};

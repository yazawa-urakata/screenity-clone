import { discardOffscreenDocuments } from "../offscreen/discardOffscreenDocuments";
import { discardRecording } from "./discardRecording";

export const checkRecording = async (): Promise<void> => {
  const { recordingTab, offscreen } = await chrome.storage.local.get([
    "recordingTab",
    "offscreen",
  ]);

  if (recordingTab && !offscreen) {
    try {
      chrome.tabs.get(recordingTab as number, (tab) => {
        if (!tab) {
          discardRecording();
        }
      });
    } catch {
      discardRecording();
    }
  } else if (offscreen) {
    try {
      const existingContexts = await chrome.runtime.getContexts({});
      const offDocument = existingContexts.find(
        (c) => c.contextType === "OFFSCREEN_DOCUMENT",
      );

      if (!offDocument) {
        discardOffscreenDocuments();
        discardRecording();
      }
    } catch (error) {
      console.error("Error checking offscreen document: ", error);
      discardRecording();
    }
  }
};

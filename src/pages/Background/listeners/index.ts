import { onCommandListener } from "./onCommandListener";
import { onInstalledListener } from "./onInstalledListener";
import { onTabRemovedListener } from "./onTabRemovedListener";
import { onTabActivatedListener } from "./onTabActivatedListener";
import { onTabUpdatedListener } from "./onTabUpdatedListener";
import { onWindowFocusChangedListener } from "./onWindowFocusChangedListener";
import { onActionButtonClickedListener } from "./onActionButtonClickedListener";
import { onStartupListener } from "./onStartupListener";

// Initialize all listeners
export const initializeListeners = (): void => {
  onCommandListener();
  onInstalledListener();
  onTabRemovedListener();
  onTabActivatedListener();
  onTabUpdatedListener();
  chrome.windows.onFocusChanged.addListener(onWindowFocusChangedListener);
  onActionButtonClickedListener();
  onStartupListener();
};

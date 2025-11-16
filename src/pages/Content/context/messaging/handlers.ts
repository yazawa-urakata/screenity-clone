// src/content/handlers/recordingHandlers.ts
import {
  registerMessage,
  messageRouter,
} from "../../../../messaging/messageRouter";
import { setContentState, contentStateRef } from "../ContentState";
import { updateFromStorage } from "../utils/updateFromStorage";
import { setTimer } from "../ContentState";

import { checkAuthStatus } from "../utils/checkAuthStatus";
import { BaseMessage } from "../../../../types/message";

const CLOUD_FEATURES_ENABLED =
  process.env.SCREENITY_ENABLE_CLOUD_FEATURES === "true";

export const setupHandlers = (): void => {
  // Initialize message router
  messageRouter();

  // Register content message handlers
  registerMessage("time", (message: BaseMessage) => {
    chrome.storage.local.get(["recording"], (result) => {
      if (result.recording) {
        setTimer((message as unknown as { time: number }).time);
      }
    });
  });

  registerMessage("toggle-popup", () => {
    setContentState((prev) => ({
      ...prev,
      showExtension: !prev.showExtension,
      hasOpenedBefore: true,
      showPopup: true,
    }));
    setTimer(0);
    updateFromStorage();
  });

  registerMessage("ready-to-record", () => {
    setContentState((prev) => ({
      ...prev,
      showPopup: false,
      showExtension: true,
      preparingRecording: false,
      pendingRecording: true,
    }));

    if (contentStateRef.current.countdown) {
      // Start countdown
      setContentState((prev) => ({
        ...prev,
        countdownActive: true,
        isCountdownVisible: true,
        countdownCancelled: false,
      }));
    } else {
      // Start recording immediately if countdown is disabled
      if (!contentStateRef.current.countdownCancelled) {
        contentStateRef.current.startRecordingAfterCountdown();
      }
    }
  });

  registerMessage("stop-recording-tab", () => {
    if (!contentStateRef.current.recording) return;

    chrome.storage.local.set({ recording: false });
    setContentState((prev) => ({
      ...prev,
      recording: false,
      paused: false,
      showExtension: false,
      showPopup: true,
    }));
  });

  registerMessage("recording-ended", () => {
    if (
      !contentStateRef.current.showPopup
      // &&
      // !contentStateRef.current.pendingRecording
    ) {
      setContentState((prev) => ({
        ...prev,
        showExtension: false,
        recording: false,
        paused: false,
        time: 0,
        timer: 0,
      }));
    }
  });

  registerMessage("recording-error", () => {
    setContentState((prev) => ({
      ...prev,
      pendingRecording: false,
      preparingRecording: false,
    }));
  });

  registerMessage("start-stream", () => {
    if (contentStateRef.current.recording) return;

    setContentState((prev) => ({
      ...prev,
      showExtension: true,
      showPopup: true,
    }));

    if (contentStateRef.current.recordingType !== "camera") {
      contentStateRef.current.startStreaming();
    } else if (
      contentStateRef.current.defaultVideoInput !== "none" &&
      contentStateRef.current.cameraActive
    ) {
      contentStateRef.current.startStreaming();
    }
  });

  registerMessage("commands", (message: BaseMessage) => {
    if (!message) return;

    const commands = (message as unknown as { commands: Array<{ name: string; shortcut?: string }> }).commands;
    const startRecordingCommand = commands.find(
      (command) => command.name === "start-recording"
    );
    const cancelRecordingCommand = commands.find(
      (command) => command.name === "cancel-recording"
    );

    setContentState((prev) => ({
      ...prev,
      recordingShortcut: startRecordingCommand?.shortcut,
      dismissRecordingShortcut: cancelRecordingCommand?.shortcut,
    }));
  });

  registerMessage("cancel-recording", () => {
    contentStateRef.current.dismissRecording();
  });

  registerMessage("pause-recording", () => {
    if (contentStateRef.current.paused) {
      contentStateRef.current.resumeRecording();
    } else {
      contentStateRef.current.pauseRecording();
    }
  });

  registerMessage("set-surface", (message: BaseMessage) => {
    setContentState((prev) => ({
      ...prev,
      surface: (message as unknown as { surface: string }).surface,
    }));
  });

  registerMessage("pip-ended", () => {
    if (
      contentStateRef.current.recording ||
      contentStateRef.current.pendingRecording
    ) {
      setContentState((prev) => ({
        ...prev,
        pipEnded: true,
      }));
    }
  });

  registerMessage("pip-started", () => {
    if (
      contentStateRef.current.recording ||
      contentStateRef.current.pendingRecording
    ) {
      setContentState((prev) => ({
        ...prev,
        pipEnded: false,
      }));
    }
  });

  registerMessage("setup-complete", () => {
    setContentState((prev) => ({
      ...prev,
      showOnboardingArrow: true,
    }));
  });

  registerMessage("hide-popup-recording", () => {
    setContentState((prev) => ({
      ...prev,
      showPopup: false,
      showExtension: false,
    }));
  });

  registerMessage("stream-error", () => {
    contentStateRef.current.openModal(
      chrome.i18n.getMessage("streamErrorModalTitle"),
      chrome.i18n.getMessage("streamErrorModalDescription"),
      chrome.i18n.getMessage("permissionsModalDismiss"),
      null,
      () => {
        contentStateRef.current.dismissRecording();
      },
      () => {
        contentStateRef.current.dismissRecording();
      }
    );
  });

  registerMessage("backup-error", () => {
    contentStateRef.current.openModal(
      chrome.i18n.getMessage("backupPermissionFailTitle"),
      chrome.i18n.getMessage("backupPermissionFailDescription"),
      chrome.i18n.getMessage("permissionsModalDismiss"),
      null,
      () => {
        contentStateRef.current.dismissRecording();
      },
      () => {
        contentStateRef.current.dismissRecording();
      }
    );
  });

  registerMessage(
    "recording-check",
    (message: BaseMessage, sender: chrome.runtime.MessageSender) => {
      const msg = message as unknown as { recordingStartTime?: number; force?: boolean };
      const { recordingStartTime } = msg;

      if (recordingStartTime) {
        const time = Math.floor((Date.now() - recordingStartTime) / 1000);
        setTimer(time);
      }

      if (!msg.force) {
        if (
          !contentStateRef.current.showExtension &&
          !contentStateRef.current.recording
        ) {
          updateFromStorage(true, sender.id ? parseInt(sender.id) : null);
        }
      } else {
        setContentState((prev) => ({
          ...prev,
          showExtension: true,
          recording: true,
        }));
        updateFromStorage(false, sender.id ? parseInt(sender.id) : null);
      }
    }
  );

  registerMessage("stop-pending", () => {
    setContentState((prev) => ({
      ...prev,
      pendingRecording: false,
      preparingRecording: false,
    }));
  });

  registerMessage("reopen-popup-multi", (message: BaseMessage) => {
    const msg = message as unknown as { senderId: string };
    setContentState((prev) => ({
      ...prev,
      showExtension: true,
      showPopup: true,
    }));
    updateFromStorage(false, parseInt(msg.senderId));

    setTimeout(() => {
      if (contentStateRef.current.openToast) {
        contentStateRef.current.openToast(
          chrome.i18n.getMessage("addedToMultiToast"),
          () => {}
        );
      }
    }, 1000);
  });

  registerMessage("open-popup-project", (message: BaseMessage) => {
    const msg = message as unknown as {
      projectTitle: string;
      projectId: string;
      recordingToScene: boolean;
      activeSceneId: string;
      senderId: string;
    };
    setContentState((prev) => ({
      ...prev,
      showExtension: true,
      showPopup: true,
      recordingProjectTitle: msg.projectTitle,
      projectId: msg.projectId,
      recordingToScene: msg.recordingToScene,
      activeSceneId: msg.activeSceneId,
    }));

    updateFromStorage(false, parseInt(msg.senderId));

    setTimeout(() => {
      contentStateRef.current.openToast(
        chrome.i18n.getMessage("readyRecordSceneToast"),
        () => {}
      );
    }, 1000);
  });

  registerMessage("time-warning", () => {
    // Only trigger when actively recording
    if (contentStateRef.current.recording && !contentStateRef.current.paused) {
      setContentState((prev) => ({
        ...prev,
        timeWarning: true,
      }));

      contentStateRef.current.openToast(
        chrome.i18n.getMessage("reachingRecordingLimitToast"),
        () => {},
        5000
      );
    }
  });
  registerMessage("time-stopped", () => {
    // Only trigger when actively recording
    if (contentStateRef.current.recording && !contentStateRef.current.paused) {
      setContentState((prev) => ({
        ...prev,
        timeWarning: false,
      }));

      contentStateRef.current.openToast(
        chrome.i18n.getMessage("recordingLimitReachedToast"),
        () => {},
        5000
      );
    }
  });

  registerMessage("get-project-info", () => {
    window.postMessage({ source: "get-project-info" }, "*");
  });
  registerMessage("check-auth", async () => {
    if (!CLOUD_FEATURES_ENABLED) {
      // Default to local user
      const { recording } = await chrome.storage.local.get("recording");

      setContentState((prev) => ({
        ...prev,
        isLoggedIn: false,
        screenityUser: null,
        isSubscribed: false,
        proSubscription: null,
        showExtension: true,
        showPopup: !recording,
      }));

      return;
    }

    const result = await checkAuthStatus();

    const { recording } = await chrome.storage.local.get("recording");

    setContentState((prev) => ({
      ...prev,
      isLoggedIn: result.authenticated,
      screenityUser: result.user,
      isSubscribed: result.subscribed,
      proSubscription: result.proSubscription,
      showExtension: true,
      showPopup: !recording,
    }));

    if (result.authenticated) {
      // Offscreen recording and client-side zoom are not available
      setContentState((prev) => ({
        ...prev,
        offscreenRecording: false,
        onboarding: false,
        showProSplash: false,
        zoomEnabled: false,
      }));

      chrome.storage.local.set({
        offscreenRecording: false,
        zoomEnabled: false,
      });
    }
  });
  registerMessage(
    "update-project-loading",
    (message: BaseMessage, sender: chrome.runtime.MessageSender) => {
      const msg = message as unknown as { multiMode: boolean };
      window.postMessage(
        { source: "update-project-loading", multiMode: msg.multiMode },
        "*"
      );

      if (!msg.multiMode) {
        setContentState((prev) => ({
          ...prev,
          showExtension: false,
          showPopup: false,
        }));
      }

      updateFromStorage(true, sender.id ? parseInt(sender.id) : null);
    }
  );
  registerMessage(
    "update-project-ready",
    (message: BaseMessage) => {
      const msg = message as unknown as {
        share: boolean;
        newProject: boolean;
        sceneId: string;
      };
      window.postMessage(
        {
          source: "update-project-ready",
          share: msg.share,
          newProject: msg.newProject,
          sceneId: msg.sceneId,
        },
        "*"
      );
    }
  );
  registerMessage(
    "clear-project-recording",
    (message: BaseMessage) => {
      const msg = message as unknown as { senderId: string };
      updateFromStorage(false, parseInt(msg.senderId));
    }
  );
  registerMessage("preparing-recording", () => {
    setContentState((prev) => ({
      ...prev,
      preparingRecording: true,
      showExtension: true,
      showPopup: false,
    }));
  });
};

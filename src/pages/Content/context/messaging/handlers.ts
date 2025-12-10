// src/content/handlers/recordingHandlers.ts
import {
  messageRouter,
  registerMessage,
} from "../../../../messaging/messageRouter";
import type { BaseMessage } from "../../../../types/message";
import { contentStateRef, setContentState, setTimer } from "../ContentState";

import { checkAuthStatus } from "../utils/checkAuthStatus";
import { updateFromStorage } from "../utils/updateFromStorage";

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

    contentStateRef.current.startStreaming();
  });

  registerMessage("commands", (message: BaseMessage) => {
    if (!message) return;

    const commands = (
      message as unknown as {
        commands: Array<{ name: string; shortcut?: string }>;
      }
    ).commands;
    const startRecordingCommand = commands.find(
      (command) => command.name === "start-recording",
    );
    const cancelRecordingCommand = commands.find(
      (command) => command.name === "cancel-recording",
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
      },
    );
  });

  registerMessage(
    "recording-check",
    (message: BaseMessage, sender: chrome.runtime.MessageSender) => {
      const msg = message as unknown as {
        recordingStartTime?: number;
        force?: boolean;
      };
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
          updateFromStorage(true, sender.id ? parseInt(sender.id, 10) : null);
        }
      } else {
        setContentState((prev) => ({
          ...prev,
          showExtension: true,
          recording: true,
        }));
        updateFromStorage(false, sender.id ? parseInt(sender.id, 10) : null);
      }
    },
  );

  registerMessage("stop-pending", () => {
    setContentState((prev) => ({
      ...prev,
      recording: false,
      pendingRecording: false,
      preparingRecording: false,
      showExtension: false,
      showPopup: true,
    }));
    setTimer(0);
  });

  registerMessage("reopen-popup-multi", (message: BaseMessage) => {
    const msg = message as unknown as { senderId: string };
    setContentState((prev) => ({
      ...prev,
      showExtension: true,
      showPopup: true,
    }));
    updateFromStorage(false, parseInt(msg.senderId, 10));

    setTimeout(() => {
      if (contentStateRef.current.openToast) {
        contentStateRef.current.openToast(
          chrome.i18n.getMessage("addedToMultiToast"),
          () => {},
        );
      }
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
        5000,
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
        5000,
      );
    }
  });

  // 認証状態変更通知ハンドラー
  // Background ScriptからSUPABASE_SESSION_SYNCED後に送信される
  registerMessage("AUTH_STATE_CHANGED", async () => {
    console.log("📢 Content Script: Received AUTH_STATE_CHANGED");

    try {
      // 最新の認証状態を取得
      const result = await checkAuthStatus();

      setContentState((prev) => ({
        ...prev,
        isLoggedIn: result.authenticated,
        screenityUser: result.user,
      }));

      if (result.authenticated) {
        console.log(
          "✅ Content Script: Auth state updated - User logged in:",
          (result.user as any)?.email,
        );

        // Offscreen recording is not available for authenticated users
        setContentState((prev) => ({
          ...prev,
          offscreenRecording: false,
          onboarding: false,
          showProSplash: false,
        }));

        chrome.storage.local.set({
          offscreenRecording: false,
        });
      } else {
        console.log("ℹ️ Content Script: Auth state updated - User logged out");
      }
    } catch (error) {
      console.error("❌ Content Script: Failed to update auth state:", error);
    }
  });
  registerMessage("update-project-ready", (message: BaseMessage) => {
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
      "*",
    );
  });
  registerMessage("preparing-recording", () => {
    setContentState((prev) => ({
      ...prev,
      preparingRecording: true,
      showExtension: true,
      showPopup: false,
    }));
  });

  // クリップ録画関連のメッセージハンドラー
  registerMessage("clip-saved", (message: BaseMessage) => {
    const msg = message as unknown as {
      payload: {
        clipId: string;
        clipNumber: number;
        duration: number;
      };
    };

    // Chrome Storage から最新の clips を取得して ContentState に反映
    chrome.storage.local.get(["clips"], (result) => {
      const clips = (result.clips ||
        []) as import("../../../../types/clip").ClipList;

      setContentState((prev) => ({
        ...prev,
        clips: clips,
        clipRecording: false,
        clipStartTime: null,
        clipCrop: null,
        customRegion: false,
      }));

      console.log(
        "[ClipRecording] クリップが保存されました:",
        msg.payload,
        "Total clips:",
        clips.length,
      );
    });

    // Toast 通知
    if (contentStateRef.current?.openToast) {
      contentStateRef.current.openToast(
        `クリップ ${msg.payload.clipNumber} を保存しました (${msg.payload.duration}秒)`,
      );
    }

    return { success: true };
  });

  registerMessage("clip-error", (message: BaseMessage) => {
    const msg = message as unknown as {
      payload: {
        code: string;
        message: string;
      };
    };

    // 状態をリセット
    setContentState((prev) => ({
      ...prev,
      clipRecording: false,
      clipStartTime: null,
      customRegion: false,
    }));

    // Toast 通知
    if (contentStateRef.current?.openToast) {
      contentStateRef.current.openToast(
        `クリップエラー: ${msg.payload.message}`,
      );
    }

    console.error("[ClipRecording] クリップエラー:", msg.payload);
    return { success: true };
  });
};

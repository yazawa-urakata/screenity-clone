import { setContentState } from "../ContentState";
import { checkRecording } from "./checkRecording";

export const updateFromStorage = (
  check: boolean = true,
  id: number | null = null
): void => {
  chrome.storage.local.get(
    [
      "audioInput",
      "videoInput",
      "defaultAudioInput",
      "defaultVideoInput",
      "cameraDimensions",
      "cameraFlipped",
      "cameraActive",
      "micActive",
      "recording",
      "backgroundEffect",
      "backgroundEffectsActive",
      "toolbarPosition",
      "countdown",
      "recordingType",
      "customRegion",
      "regionWidth",
      "regionHeight",
      "regionX",
      "regionY",
      "hideToolbar",
      "alarm",
      "alarmTime",
      "pendingRecording",
      "askForPermissions",
      "cursorMode",
      "askMicrophone",
      "offscreenRecording",
      "zoomEnabled",
      "setDevices",
      "popupPosition",
      "surface",
      "hideUIAlerts",
      "hideUI",
      "bigTab",
      "toolbarHover",
      "askDismiss",
      "swatch",
      "color",
      "strokeWidth",
      "quality",
      "systemAudio",
      "backup",
      "backupSetup",
      "qualityValue",
      "fpsValue",
      "countdownActive",
      "countdownCancelled",
      "isCountdownVisible",
      "multiMode",
      "multiSceneCount",
      "sortBy",
      "wasLoggedIn",
      "instantMode",
      "hasSeenInstantModeModal",
      "hasSubscribedBefore",
      "clips",
      "clipRecording",
      "clipStartTime",
      "clipCrop",
    ],
    (result: { [key: string]: unknown }) => {
      setContentState((prevContentState) => {
        return {
        ...prevContentState,
        audioInput:
          result.audioInput !== undefined && result.audioInput !== null
            ? (result.audioInput as any)
            : prevContentState.audioInput,
        videoInput:
          result.videoInput !== undefined && result.videoInput !== null
            ? (result.videoInput as any)
            : prevContentState.videoInput,
        defaultAudioInput:
          result.defaultAudioInput !== undefined &&
          result.defaultAudioInput !== null
            ? (result.defaultAudioInput as any)
            : prevContentState.defaultAudioInput,
        defaultVideoInput:
          result.defaultVideoInput !== undefined &&
          result.defaultVideoInput !== null
            ? (result.defaultVideoInput as any)
            : prevContentState.defaultVideoInput,
        cameraDimensions:
          result.cameraDimensions !== undefined &&
          result.cameraDimensions !== null
            ? (result.cameraDimensions as any)
            : prevContentState.cameraDimensions,
        cameraFlipped:
          result.cameraFlipped !== undefined && result.cameraFlipped !== null
            ? (result.cameraFlipped as any)
            : prevContentState.cameraFlipped,
        cameraActive:
          result.cameraActive !== undefined && result.cameraActive !== null
            ? (result.cameraActive as any)
            : prevContentState.cameraActive,
        micActive:
          result.micActive !== undefined && result.micActive !== null
            ? (result.micActive as any)
            : prevContentState.micActive,
        backgroundEffect:
          result.backgroundEffect !== undefined &&
          result.backgroundEffect !== null
            ? (result.backgroundEffect as any)
            : prevContentState.backgroundEffect,
        backgroundEffectsActive:
          result.backgroundEffectsActive !== undefined &&
          result.backgroundEffectsActive !== null
            ? (result.backgroundEffectsActive as any)
            : prevContentState.backgroundEffectsActive,
        toolbarPosition:
          result.toolbarPosition !== undefined &&
          result.toolbarPosition !== null
            ? (result.toolbarPosition as any)
            : prevContentState.toolbarPosition,
        countdown:
          result.countdown !== undefined && result.countdown !== null
            ? (result.countdown as any)
            : prevContentState.countdown,
        recording:
          result.recording !== undefined && result.recording !== null
            ? (result.recording as any)
            : prevContentState.recording,
        recordingType:
          result.recordingType !== undefined && result.recordingType !== null
            ? (result.recordingType as any)
            : prevContentState.recordingType,
        customRegion:
          result.customRegion !== undefined && result.customRegion !== null
            ? (result.customRegion as any)
            : prevContentState.customRegion,
        regionWidth:
          result.regionWidth !== undefined && result.regionWidth !== null
            ? (result.regionWidth as any)
            : prevContentState.regionWidth,
        regionHeight:
          result.regionHeight !== undefined && result.regionHeight !== null
            ? (result.regionHeight as any)
            : prevContentState.regionHeight,
        regionX:
          result.regionX !== undefined && result.regionX !== null
            ? (result.regionX as any)
            : prevContentState.regionX,
        regionY:
          result.regionY !== undefined && result.regionY !== null
            ? (result.regionY as any)
            : prevContentState.regionY,
        hideToolbar:
          result.hideToolbar !== undefined && result.hideToolbar !== null
            ? (result.hideToolbar as any)
            : prevContentState.hideToolbar,
        alarm:
          result.alarm !== undefined && result.alarm !== null
            ? (result.alarm as any)
            : prevContentState.alarm,
        alarmTime:
          result.alarmTime !== undefined && result.alarmTime !== null
            ? (result.alarmTime as any)
            : prevContentState.alarmTime,
        pendingRecording:
          result.pendingRecording !== undefined &&
          result.pendingRecording !== null
            ? (result.pendingRecording as any)
            : prevContentState.pendingRecording,
        askForPermissions:
          result.askForPermissions !== undefined &&
          result.askForPermissions !== null
            ? (result.askForPermissions as any)
            : prevContentState.askForPermissions,
        cursorMode:
          result.cursorMode !== undefined && result.cursorMode !== null
            ? (result.cursorMode as any)
            : prevContentState.cursorMode,
        zoomEnabled:
          result.zoomEnabled !== undefined && result.zoomEnabled !== null
            ? (result.zoomEnabled as any)
            : prevContentState.zoomEnabled,
        askMicrophone:
          result.askMicrophone !== undefined && result.askMicrophone !== null
            ? (result.askMicrophone as any)
            : prevContentState.askMicrophone,
        offscreenRecording:
          result.offscreenRecording !== undefined &&
          result.offscreenRecording !== null
            ? (result.offscreenRecording as any)
            : prevContentState.offscreenRecording,
        setDevices:
          result.setDevices !== undefined && result.setDevices !== null
            ? (result.setDevices as any)
            : prevContentState.setDevices,
        popupPosition:
          result.popupPosition !== undefined && result.popupPosition !== null
            ? (result.popupPosition as any)
            : prevContentState.popupPosition,
        surface:
          result.surface !== undefined && result.surface !== null
            ? (result.surface as any)
            : prevContentState.surface,
        hideUIAlerts:
          result.hideUIAlerts !== undefined && result.hideUIAlerts !== null
            ? (result.hideUIAlerts as any)
            : prevContentState.hideUIAlerts,
        hideUI:
          result.hideUI !== undefined && result.hideUI !== null
            ? (result.hideUI as any)
            : prevContentState.hideUI,
        bigTab:
          result.bigTab !== undefined && result.bigTab !== null
            ? (result.bigTab as any)
            : prevContentState.bigTab,
        toolbarHover:
          result.toolbarHover !== undefined && result.toolbarHover !== null
            ? (result.toolbarHover as any)
            : prevContentState.toolbarHover,
        askDismiss:
          result.askDismiss !== undefined && result.askDismiss !== null
            ? (result.askDismiss as any)
            : prevContentState.askDismiss,
        swatch:
          result.swatch !== undefined && result.swatch !== null
            ? (result.swatch as any)
            : prevContentState.swatch,
        color:
          result.color !== undefined && result.color !== null
            ? (result.color as any)
            : prevContentState.color,
        strokeWidth:
          result.strokeWidth !== undefined && result.strokeWidth !== null
            ? (result.strokeWidth as any)
            : prevContentState.strokeWidth,
        quality:
          result.quality !== undefined && result.quality !== null
            ? (result.quality as any)
            : prevContentState.quality,
        systemAudio:
          result.systemAudio !== undefined && result.systemAudio !== null
            ? (result.systemAudio as any)
            : prevContentState.systemAudio,
        backup:
          result.backup !== undefined && result.backup !== null
            ? (result.backup as any)
            : prevContentState.backup,
        backupSetup:
          result.backupSetup !== undefined && result.backupSetup !== null
            ? (result.backupSetup as any)
            : prevContentState.backupSetup,
        qualityValue:
          result.qualityValue !== undefined && result.qualityValue !== null
            ? (result.qualityValue as any)
            : prevContentState.qualityValue,
        fpsValue:
          result.fpsValue !== undefined && result.fpsValue !== null
            ? (result.fpsValue as any)
            : prevContentState.fpsValue,
        countdownActive: result.countdownActive || false,
        countdownCancelled: result.countdownCancelled || false,
        isCountdownVisible: result.isCountdownVisible || false,
        multiMode: result.multiMode || false,
        multiSceneCount: result.multiSceneCount || 0,
        wasLoggedIn: result.wasLoggedIn || false,
        sortBy: result.sortBy || "newest",
        instantMode: result.instantMode || false,
        hasSeenInstantModeModal: result.hasSeenInstantModeModal || false,
        onboarding: result.onboarding || false,
        hasSubscribedBefore: result.hasSubscribedBefore || false,
        showProSplash: result.showProSplash || false,
        clips: result.clips || [],
        clipRecording: result.clipRecording || false,
        clipStartTime: result.clipStartTime !== undefined ? result.clipStartTime : null,
        clipCrop: result.clipCrop !== undefined ? result.clipCrop : null,
      } as any;
      });

      if (result.systemAudio === undefined || result.systemAudio === null) {
        chrome.storage.local.set({ systemAudio: true });
      }

      if (
        result.backgroundEffect === undefined ||
        result.backgroundEffect === null
      ) {
        chrome.storage.local.set({ backgroundEffect: "blur" });
      }

      if (result.backup === undefined || result.backup === null) {
        chrome.storage.local.set({ backup: false });
      }

      if (result.countdown === undefined || result.countdown === null) {
        chrome.storage.local.set({ countdown: true });
      }

      if (result.backupSetup === undefined || result.backupSetup === null) {
        chrome.storage.local.set({ backupSetup: false });
      }

      if (result.backgroundEffectsActive) {
        chrome.runtime.sendMessage({ type: "backgroundEffectsActive" });
      }

      if (check) {
        checkRecording(id);
      }

      if (result.alarm) {
        setContentState((prevContentState) => ({
          ...prevContentState,
          time: parseFloat(result.alarmTime as string),
          timer: parseFloat(result.alarmTime as string),
        }));
      } else if (!result.recording) {
        setContentState((prevContentState) => ({
          ...prevContentState,
          time: 0,
          timer: 0,
        }));
      }

      chrome.storage.local.set({ restarting: false });
    }
  );
};

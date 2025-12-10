import { setContentState } from "../ContentState";
import { checkRecording } from "./checkRecording";

export const updateFromStorage = (
  check: boolean = true,
  id: number | null = null,
): void => {
  chrome.storage.local.get(
    [
      "audioInput",
      "defaultAudioInput",
      "micActive",
      "recording",
      "toolbarPosition",
      "countdown",
      "recordingType",
      "customRegion",
      "regionWidth",
      "regionHeight",
      "regionX",
      "regionY",
      "alarm",
      "alarmTime",
      "pendingRecording",
      "askForPermissions",
      "askMicrophone",
      "offscreenRecording",
      "setDevices",
      "popupPosition",
      "surface",
      "hideUI",
      "bigTab",
      "askDismiss",
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
      "clips",
      "clipSelecting",
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
          defaultAudioInput:
            result.defaultAudioInput !== undefined &&
            result.defaultAudioInput !== null
              ? (result.defaultAudioInput as any)
              : prevContentState.defaultAudioInput,
          micActive:
            result.micActive !== undefined && result.micActive !== null
              ? (result.micActive as any)
              : prevContentState.micActive,
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
          hideUI:
            result.hideUI !== undefined && result.hideUI !== null
              ? (result.hideUI as any)
              : prevContentState.hideUI,
          bigTab:
            result.bigTab !== undefined && result.bigTab !== null
              ? (result.bigTab as any)
              : prevContentState.bigTab,
          askDismiss:
            result.askDismiss !== undefined && result.askDismiss !== null
              ? (result.askDismiss as any)
              : prevContentState.askDismiss,
          quality:
            result.quality !== undefined && result.quality !== null
              ? (result.quality as any)
              : prevContentState.quality,
          systemAudio:
            result.systemAudio !== undefined && result.systemAudio !== null
              ? (result.systemAudio as any)
              : prevContentState.systemAudio,
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
          showProSplash: result.showProSplash || false,
          clips: result.clips || [],
          clipSelecting:
            result.clipSelecting !== undefined
              ? (result.clipSelecting as boolean)
              : false,
          clipRecording: result.clipRecording || false,
          clipStartTime:
            result.clipStartTime !== undefined ? result.clipStartTime : null,
          clipCrop: result.clipCrop !== undefined ? result.clipCrop : null,
        } as any;
      });

      if (result.systemAudio === undefined || result.systemAudio === null) {
        chrome.storage.local.set({ systemAudio: true });
      }

      if (result.countdown === undefined || result.countdown === null) {
        chrome.storage.local.set({ countdown: true });
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
    },
  );
};

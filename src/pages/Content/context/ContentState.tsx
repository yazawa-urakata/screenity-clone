import React, {
  FC,
  ReactNode,
  createContext,
  useState,
  useEffect,
  useCallback,
} from "react";

import { updateFromStorage } from "./utils/updateFromStorage";
import type { ClipMetadata, ClipList } from "../../../types/clip";
import { createClipMetadata, validateClip, MAX_CLIPS } from "../../../utils/clipUtils";
import { ClipValidationError } from "../../../types/clip";

import { setupHandlers } from "./messaging/handlers";

import { checkAuthStatus } from "./utils/checkAuthStatus";

// Context type definition
export interface ContentStateType {
  color: string;
  strokeWidth: number | string;
  drawingMode: boolean;
  tool: string;
  undoStack: unknown[];
  redoStack: unknown[];
  canvas: HTMLCanvasElement | null;
  swatch: number;
  time: number;
  timer: number;
  recording: boolean;
  startRecording: () => void;
  restartRecording: () => void;
  stopRecording: () => void;
  pauseRecording: (dismiss?: boolean) => void;
  resumeRecording: () => void;
  dismissRecording: () => void;
  startStreaming: () => Promise<void>;
  openModal: ((
    title: string,
    description: string,
    action: string | null,
    cancel: string | null,
    actionCallback: () => void,
    cancelCallback: () => void,
    image?: string | null | false,
    learn?: string | false,
    learnURL?: string | (() => void) | false,
    showX?: boolean,
    middle?: boolean,
    noShowAgainLabel?: string,
    noShowAgainCallback?: () => void
  ) => void) | null;
  openToast: ((title: string, action?: (() => void) | number, durationMs?: number) => void) | null;
  recordingToScene?: boolean;
  recordingProjectTitle?: string;
  timeWarning: boolean;
  audioInput: MediaDeviceInfo[];
  videoInput: MediaDeviceInfo[];
  setDevices: boolean;
  defaultAudioInput: string;
  defaultVideoInput: string;
  cameraActive: boolean;
  micActive: boolean;
  pushToTalk?: boolean;
  sortBy: string;
  paused: boolean;
  toolbarPosition: {
    left: boolean;
    right: boolean;
    bottom: boolean;
    top: boolean;
    offsetX: number;
    offsetY: number;
  };
  popupPosition: {
    left: boolean;
    right: boolean;
    top: boolean;
    bottom: boolean;
    offsetX: number;
    offsetY: number;
    fixed: boolean;
  };
  cameraDimensions: {
    size: number;
    x: number;
    y: number;
  };
  cameraFlipped: boolean;
  backgroundEffect: string;
  backgroundEffectsActive: boolean;
  countdown: boolean;
  showExtension: boolean;
  showPopup: boolean;
  blurMode: boolean;
  recordingType: string;
  customRegion: boolean;
  regionWidth: number;
  surface: string;
  regionHeight: number;
  regionX: number;
  regionY: number;
  fromRegion: boolean;
  cropTarget: string | null;
  hideToolbar: boolean;
  alarm: boolean;
  alarmTime: number;
  fromAlarm: boolean;
  pendingRecording: boolean;
  askForPermissions: boolean;
  cameraPermission: boolean;
  microphonePermission: boolean;
  askMicrophone: boolean;
  recordingShortcut: string;
  cursorMode: string;
  shape: string;
  shapeFill: boolean;
  zoomEnabled: boolean;
  offscreenRecording: boolean;
  isAddingImage: boolean;
  pipEnded: boolean;
  tabCaptureFrame: boolean;
  showOnboardingArrow: boolean;
  offline: boolean;
  updateChrome: boolean;
  permissionsChecked: boolean;
  permissionsLoaded: boolean;
  parentRef: HTMLElement | null;
  shadowRef: HTMLElement | null;
  hideUIAlerts: boolean;
  toolbarHover: boolean;
  hideUI: boolean;
  bigTab: string;
  askDismiss: boolean;
  quality: string;
  systemAudio: boolean;
  backup: boolean;
  backupSetup: boolean;
  openWarning: ((
    title: string,
    description: string,
    icon: string,
    duration: number
  ) => void) | false;
  hasOpenedBefore: boolean;
  qualityValue: string;
  fpsValue: string;
  countdownActive: boolean;
  countdownCancelled: boolean;
  multiMode: boolean;
  isCountdownVisible: boolean;
  multiSceneCount: number;
  preparingRecording: boolean;
  wasLoggedIn: boolean;
  skipLogin: boolean;
  hasSeenInstantModeModal: boolean;
  instantMode: boolean;
  onboarding: boolean;
  showProSplash: boolean;
  hasSubscribedBefore: boolean;
  isLoggedIn: boolean;
  screenityUser: { name?: string; email?: string } | null;
  isSubscribed: boolean;
  proSubscription: { deletionAt?: string; endsAt?: string } | null;
  regionCaptureRef?: {
    contentWindow: {
      postMessage: (message: unknown, targetOrigin: string) => void;
    };
  };
  startRecordingAfterCountdown: () => void;
  cancelCountdown: () => void;
  resetCountdown: () => void;
  tryRestartRecording?: () => void;
  tryDismissRecording?: () => void;
  setContentState?: (
    updater: (prev: ContentStateType) => Partial<ContentStateType>
  ) => void;
  shortcuts?: unknown[];
  // クリップ録画関連
  clipSelecting: boolean;
  clipRecording: boolean;
  clipStartTime: number | null;
  clipCrop: {
    x: number;
    y: number;
    width: number;
    height: number;
  } | null;
  clips: ClipList;
  startClipSelection: () => void;
  confirmClipSelection: () => void;
  cancelClipSelection: () => void;
  endClipRecording: () => void;
  setClipCrop: (crop: { x: number; y: number; width: number; height: number } | null) => void;
}

type ContextValue = [
  ContentStateType,
  (updater: ((prev: ContentStateType) => Partial<ContentStateType>) | ContentStateType) => void,
  number,
  React.Dispatch<React.SetStateAction<number>>
];

//create a context, with createContext api
export const contentStateContext = createContext<ContextValue | undefined>(undefined);

interface ContentStateRef {
  current: ContentStateType | null;
}

export const contentStateRef: ContentStateRef = { current: null };
export let setContentState: (
  updater: ((prev: ContentStateType) => Partial<ContentStateType>) | ContentStateType
) => void = () => { };
export let setTimer: React.Dispatch<React.SetStateAction<number>> = () => { };

interface ContentStateProps {
  children: ReactNode;
}

interface AuthStatusResult {
  authenticated: boolean;
  user: { name?: string; email?: string } | null;
  subscribed: boolean;
  hasSubscribedBefore: boolean;
  proSubscription: { deletionAt?: string; endsAt?: string } | null;
}

interface StorageQuotaResponse {
  success: boolean;
  canUpload?: boolean;
  error?: string;
}

interface MemoryDataResponse {
  quota: number;
}

interface RestoreResponse {
  restore: boolean;
}

const ContentState: FC<ContentStateProps> = (props) => {
  const [timer, setTimerInternal] = useState<number>(0);
  const CLOUD_FEATURES_ENABLED =
    process.env.SCREENITY_ENABLE_CLOUD_FEATURES === "true";
  setTimer = setTimerInternal;
  const [URL, setURL] = useState<string>(
    "https://help.screenity.io/getting-started/77KizPC8MHVGfpKpqdux9D/why-does-screenity-ask-for-permissions/9AAE8zJ6iiUtCAtjn4SUT1"
  );
  const [URL2, setURL2] = useState<string>(
    "https://help.screenity.io/troubleshooting/9Jy5RGjNrBB42hqUdREQ7W/how-to-grant-screenity-permission-to-record-your-camera-and-microphone/x6U69TnrbMjy5CQ96Er2E9"
  );

  /**
   * Supabase認証状態をチェック
   *
   * 初期化時とログイン/ログアウト時に呼び出される
   * 認証チェックは常に実行される（CLOUD_FEATURES_ENABLEDに依存しない）
   */
  const verifyUser = async (): Promise<void> => {
    try {
      const result = await checkAuthStatus();

      setContentState((prev) => ({
        ...prev,
        isLoggedIn: result.authenticated,
        screenityUser: result.user,
        isSubscribed: result.subscribed,
        proSubscription: result.proSubscription,
      } as any));

      if (result.authenticated) {
        console.log('✅ Supabase authentication verified:', result.user);

        // Offscreen recording and client-side zoom are not available for authenticated users
        setContentState((prev) => ({
          ...prev,
          offscreenRecording: false,
          zoomEnabled: false,
        }));

        chrome.storage.local.set({
          offscreenRecording: false,
          zoomEnabled: false,
        });
      }
    } catch (error) {
      console.error('❌ Failed to verify Supabase auth:', error);
      // 認証失敗時はログアウト状態として扱う
      setContentState((prev) => ({
        ...prev,
        isLoggedIn: false,
        screenityUser: null,
        isSubscribed: false,
        proSubscription: null,
      } as any));
    }
  };

  useEffect(() => {
    verifyUser();

    // skipLogin と wasLoggedIn の初期化
    chrome.storage.local.get(["skipLogin", "wasLoggedIn"], (result: { skipLogin?: boolean; wasLoggedIn?: boolean }) => {
      setContentState((prev) => ({
        ...prev,
        skipLogin: result.skipLogin || false,
        wasLoggedIn: result.wasLoggedIn || false,
      }));
    });
  }, []);

  useEffect(() => {
    const locale = chrome.i18n.getMessage("@@ui_locale");
    if (!locale.includes("en")) {
      setURL(
        "https://translate.google.com/translate?sl=en&tl=" +
        locale +
        "&u=https://help.screenity.io/getting-started/77KizPC8MHVGfpKpqdux9D/why-does-screenity-ask-for-permissions/9AAE8zJ6iiUtCAtjn4SUT1"
      );
      setURL2(
        "https://translate.google.com/translate?sl=en&tl=" +
        locale +
        "&u=https://help.screenity.io/troubleshooting/9Jy5RGjNrBB42hqUdREQ7W/how-to-grant-screenity-permission-to-record-your-camera-and-microphone/x6U69TnrbMjy5CQ96Er2E9"
      );
    }
  }, []);

  const startRecording = useCallback((): void => {
    const currentState = contentStateRef.current;
    if (!currentState) return;

    if (currentState.alarm) {
      if (currentState.alarmTime === 0) {
        setContentState((prevContentState) => ({
          ...prevContentState,
          alarm: false,
        }));
        chrome.storage.local.set({ alarm: false });
        setTimer(0);
      } else {
        setTimer(currentState.alarmTime);
      }
    } else {
      setTimer(0);
    }
    setContentState((prevContentState) => ({
      ...prevContentState,
      recording: true,
      paused: false,
      timeWarning: false,
      pendingRecording: false,
      preparingRecording: false,
    }));
    chrome.storage.local.set({
      recording: true,
      restarting: false,
    });

    // This cannot be triggered from here because the user might not have the page focused
    //chrome.runtime.sendMessage({ type: "start-recording" });
  }, []);

  const restartRecording = useCallback((): void => {
    const currentState = contentStateRef.current;
    if (!currentState) return;

    chrome.storage.local.set({ recording: false, restarting: true });
    setTimeout(() => {
      chrome.runtime.sendMessage({ type: "discard-backup-restart" });
      chrome.runtime.sendMessage({ type: "restart-recording-tab" });
      // Check if custom region is set
      if (
        currentState.customRegion &&
        currentState.cropTarget &&
        currentState.regionCaptureRef
      ) {
        currentState.regionCaptureRef.contentWindow.postMessage(
          {
            type: "restart-recording",
          },
          "*"
        );
      }
      if (currentState.alarm) {
        setTimer(currentState.alarmTime);
      } else {
        setTimer(0);
      }
      setContentState((prevContentState) => ({
        ...prevContentState,
        recording: false,
        time: 0,
        paused: false,
      }));
    }, 100);
  }, []);

  const stopRecording = useCallback((): void => {
    chrome.runtime.sendMessage({ type: "clear-recording-alarm" });
    chrome.storage.local.set({
      recording: false,
      restarting: false,
      tabRecordedID: null,
    });
    setContentState((prevContentState) => ({
      ...prevContentState,
      recording: false,
      paused: false,
      timeWarning: false,
      showExtension: false,
      blurMode: false,
      showPopup: true,
      pendingRecording: false,
      tabCaptureFrame: false,
      time: 0,
      timer: 0,
      preparingRecording: false,
    }));
    // Remove blur from all elements
    const elements = document.querySelectorAll(".screenity-blur");
    elements.forEach((element) => {
      element.classList.remove("screenity-blur");
    });
    setTimer(0);
    chrome.runtime.sendMessage({ type: "stop-recording-tab" });
    // Play beep sound at 50% volume
    const audio = new Audio(chrome.runtime.getURL("/assets/sounds/beep.mp3"));
    audio.volume = 0.5;
    audio.play();
  }, []);

  const pauseRecording = useCallback((dismiss?: boolean): void => {
    const currentState = contentStateRef.current;
    if (!currentState) return;

    chrome.runtime.sendMessage({ type: "pause-recording-tab" });

    setTimeout(() => {
      setContentState((prevContentState) => ({
        ...prevContentState,
        paused: true,
      }));
      if (!dismiss && currentState.openToast) {
        currentState.openToast(
          chrome.i18n.getMessage("pausedRecordingToast"),
          function () { }
        );
      }
    }, 100);
  }, []);

  const resumeRecording = useCallback((): void => {
    chrome.runtime.sendMessage({ type: "resume-recording-tab" });
    setContentState((prevContentState) => ({
      ...prevContentState,
      paused: false,
    }));
  }, []);

  const dismissRecording = useCallback((): void => {
    chrome.storage.local.set({ restarting: false });
    chrome.runtime.sendMessage({ type: "dismiss-recording-tab" });
    setContentState((prevContentState) => ({
      ...prevContentState,
      recording: false,
      paused: false,
      showExtension: false,
      timeWarning: false,
      showPopup: true,
      time: 0,
      timer: 0,
      tabCaptureFrame: false,
      pendingRecording: false,
      preparingRecording: false,
      blurMode: false,
      drawingMode: false,
    }));
    // Remove blur from all elements
    const elements = document.querySelectorAll(".screenity-blur");
    elements.forEach((element) => {
      element.classList.remove("screenity-blur");
    });
    setTimer(0);
  }, []);

  // クリップ録画関数
  /**
   * クリップ選択開始（ステップ①）
   */
  const startClipSelection = useCallback((): void => {
    // 録画中かチェック
    if (!contentStateRef.current?.recording) {
      console.warn('⚠️ クリップ選択を開始できません: 録画中ではありません');
      if (contentStateRef.current?.openToast) {
        contentStateRef.current.openToast('先に録画を開始してください', () => { });
      }
      return;
    }

    // 最大クリップ数チェック
    if (contentStateRef.current.clips.length >= MAX_CLIPS) {
      console.warn(`⚠️ 最大${MAX_CLIPS}個のクリップに達しました`);
      if (contentStateRef.current.openToast) {
        contentStateRef.current.openToast(
          `最大${MAX_CLIPS}個までクリップを記録できます`,
          () => { }
        );
      }
      return;
    }

    // デフォルトの Region サイズと位置を計算
    const defaultRegionWidth = 640;   // 640px
    const defaultRegionHeight = 360;  // 360px (16:9)
    const defaultRegionX = Math.max(0, (window.innerWidth - defaultRegionWidth) / 2);
    const defaultRegionY = Math.max(0, (window.innerHeight - defaultRegionHeight) / 2);

    // クリップ選択モードに移行
    setContentState((prev) => ({
      ...prev,
      clipSelecting: true,        // クロップ選択中フラグON
      customRegion: true,          // Region UI を表示
      recordingType: 'region',     // Region コンポーネント表示のため一時的に region に切り替え
      regionWidth: defaultRegionWidth,   // Region の幅を設定
      regionHeight: defaultRegionHeight, // Region の高さを設定
      regionX: defaultRegionX,           // Region のX座標を設定
      regionY: defaultRegionY,           // Region のY座標を設定
      fromRegion: false,                 // Region からの更新ではない
    }));

    // Chrome Storage に保存
    chrome.storage.local.set({
      clipSelecting: true,
      regionWidth: defaultRegionWidth,
      regionHeight: defaultRegionHeight,
      regionX: defaultRegionX,
      regionY: defaultRegionY,
    });

    console.log('📐 クリップ選択を開始しました', {
      width: defaultRegionWidth,
      height: defaultRegionHeight,
      x: defaultRegionX,
      y: defaultRegionY,
    });
  }, []);

  /**
   * クリップ選択確定（ステップ③）
   */
  const confirmClipSelection = useCallback((): void => {
    if (!contentStateRef.current?.clipSelecting) {
      console.warn('⚠️ クリップ選択中ではありません');
      return;
    }

    // 録画開始時刻を取得して、現在の経過時間を計算
    chrome.storage.local.get(['recordingStartTime'], (result) => {
      const recordingStartTime = result.recordingStartTime as number;
      if (!recordingStartTime) {
        console.error('⚠️ recordingStartTime が見つかりません');
        return;
      }

      // 現在の経過時間（ミリ秒）= Date.now() - 録画開始時刻
      const currentTime = Date.now() - recordingStartTime;

      // 現在のRegion座標をclipCropとして保存
      const clipCrop = {
        x: contentStateRef.current!.regionX,
        y: contentStateRef.current!.regionY,
        width: contentStateRef.current!.regionWidth,
        height: contentStateRef.current!.regionHeight,
      };

      // クリップ録画モードに移行
      setContentState((prev) => ({
        ...prev,
        clipSelecting: false,        // 選択終了
        clipRecording: true,         // 録画開始
        clipStartTime: currentTime,  // この時点で時刻記録
        clipCrop: clipCrop,          // クロップ範囲を確定
        // recordingType は 'region' のまま維持して Region コンポーネントを表示し続ける
      }));

      // Chrome Storage に保存
      chrome.storage.local.set({
        clipSelecting: false,
        clipRecording: true,
        clipStartTime: currentTime,
        clipCrop: clipCrop,
      });

      console.log('▶️ クリップ録画を開始しました', currentTime, 'ms, クロップ:', clipCrop);
    });
  }, []);

  /**
   * クリップ選択キャンセル
   */
  const cancelClipSelection = useCallback((): void => {
    if (!contentStateRef.current?.clipSelecting) {
      console.warn('⚠️ クリップ選択中ではありません');
      return;
    }

    // 選択モードを終了し、通常状態に戻る
    setContentState((prev) => ({
      ...prev,
      clipSelecting: false,
      customRegion: false,  // Region UI を非表示
      recordingType: 'screen',  // 通常の screen モードに戻す
    }));

    // Chrome Storage に保存
    chrome.storage.local.set({
      clipSelecting: false,
    });

    console.log('❌ クリップ選択をキャンセルしました');
  }, []);

  const endClipRecording = useCallback((): void => {
    const currentState = contentStateRef.current;
    if (!currentState) return;

    // クリップ録画中チェック
    if (!currentState.clipRecording) {
      console.warn('[ClipRecording] クリップ録画が開始されていません');
      return;
    }

    // 録画開始時刻を取得して、そこからの経過時間を計算
    chrome.storage.local.get(['recordingStartTime', 'projectId'], (result) => {
      try {
        const recordingStartTime = result.recordingStartTime as number;
        const projectId = result.projectId as string;
        const clipStartTime = currentState.clipStartTime!;
        const clipEndTime = Date.now() - recordingStartTime;

        console.log('[ClipRecording] クリップ録画を終了', {
          clipStartTime,
          clipEndTime,
          duration: clipEndTime - clipStartTime,
        });

        // バリデーション
        validateClip(
          currentState.clips,
          clipStartTime,
          clipEndTime,
          currentState.recording
        );

        const clipData = createClipMetadata(
          recordingStartTime,
          clipStartTime,
          clipEndTime,
          currentState.clipCrop || undefined,
          projectId
        );

        // Background に保存リクエストを送信
        chrome.runtime.sendMessage(
          {
            type: 'save-clip',
            payload: {
              clipData,
            },
          },
          () => {
            // 応答を受け取るためのコールバック（エラー抑制）
            if (chrome.runtime.lastError) {
              console.warn('[ClipRecording] メッセージ送信エラー:', chrome.runtime.lastError.message);
            }
          }
        );

        // ローカル状態を更新（楽観的UI更新）
        setContentState((prev) => ({
          ...prev,
          clips: [...prev.clips, clipData],
          clipRecording: false,
          clipStartTime: null,
          clipCrop: null,
          customRegion: false,
          recordingType: 'screen',  // 通常の screen モードに戻す
        }));

        console.log('[ClipRecording] クリップ録画を終了しました:', clipData);
      } catch (error) {
        console.error('[ClipRecording] クリップ録画終了エラー:', error);

        let errorMessage = 'クリップの保存に失敗しました';
        if (error instanceof ClipValidationError) {
          errorMessage = error.message;
        }

        if (contentStateRef.current?.openToast) {
          contentStateRef.current.openToast(errorMessage);
        }

        // 状態をリセット
        setContentState((prev) => ({
          ...prev,
          clipRecording: false,
          clipStartTime: null,
          clipCrop: null,
          customRegion: false,
          recordingType: 'screen',  // 通常の screen モードに戻す
        }));
      }
    });
  }, []);

  const setClipCrop = useCallback((crop: { x: number; y: number; width: number; height: number } | null): void => {
    setContentState((prev) => ({
      ...prev,
      clipCrop: crop,
    }));

    chrome.storage.local.set({ clipCrop: crop });
  }, []);

  const checkChromeCapturePermissions = useCallback(async (): Promise<boolean> => {
    const currentState = contentStateRef.current;
    const permissions: chrome.permissions.Permissions["permissions"] = ["desktopCapture", "alarms", "offscreen"];

    // Only request clipboardWrite if the user is logged in and subscribed
    if (currentState?.isLoggedIn && currentState?.isSubscribed) {
      permissions.push("clipboardWrite");
    }

    const containsPromise = new Promise<boolean>((resolve) => {
      chrome.permissions.contains({ permissions }, (result) => {
        resolve(result);
      });
    });

    const result = await containsPromise;

    if (!result) {
      const requestPromise = new Promise<boolean>((resolve) => {
        chrome.permissions.request({ permissions }, (granted) => {
          resolve(granted);
        });
      });

      const granted = await requestPromise;

      if (!granted) {
        return false;
      } else {
        chrome.runtime.sendMessage({ type: "add-alarm-listener" });
        return true;
      }
    } else {
      return true;
    }
  }, []);

  const checkChromeCapturePermissionsSW = useCallback(async (): Promise<boolean> => {
    const currentState = contentStateRef.current;
    if (!currentState) return false;

    const { isLoggedIn, isSubscribed } = currentState;

    return new Promise((resolve) => {
      chrome.runtime.sendMessage(
        {
          type: "check-capture-permissions",
          isLoggedIn,
          isSubscribed,
        },
        (response: { status: string }) => {
          resolve(response.status === "ok");
        }
      );
    });
  }, []);

  const startStreaming = useCallback(async (): Promise<void> => {
    const currentState = contentStateRef.current;
    if (!currentState) return;

    // Set this early
    setContentState((prev) => ({
      ...prev,
      pendingRecording: true,
    }));

    let permission = false;

    if (
      currentState?.isLoggedIn &&
      currentState?.isSubscribed &&
      CLOUD_FEATURES_ENABLED
    ) {
      const storageResponse = (await chrome.runtime.sendMessage({
        type: "check-storage-quota",
      })) as StorageQuotaResponse;

      const { success, canUpload, error } = storageResponse;

      if (success && canUpload === false && currentState.openModal) {
        currentState.openModal(
          chrome.i18n.getMessage("storageLimitReachedTitle"),
          chrome.i18n.getMessage("storageLimitReachedDescription"),
          chrome.i18n.getMessage("manageStorageButtonLabel"),
          chrome.i18n.getMessage("closeModalLabel"),
          () => {
            window.open(process.env.SCREENITY_APP_BASE, "_blank");
          },
          () => { }
        );
      } else if (!success && currentState.openModal && currentState.setContentState) {
        const isSubError = error === "Subscription inactive";
        const isAuthError = error === "Not authenticated";

        // Update content state if subscription is inactive
        if (isSubError) {
          currentState.setContentState((prev) => ({
            ...prev,
            isSubscribed: false,
          }));
        } else if (isAuthError) {
          currentState.setContentState((prev) => ({
            ...prev,
            isSubscribed: false,
            isLoggedIn: false,
            screenityUser: null,
            proSubscription: null,
          }));
        }

        const message = isAuthError
          ? chrome.i18n.getMessage("storageCheckFailAuthDescription")
          : chrome.i18n.getMessage("storageCheckFailDescription");

        currentState.openModal(
          chrome.i18n.getMessage("storageCheckFailTitle"),
          message,
          chrome.i18n.getMessage("retryButtonLabel"),
          chrome.i18n.getMessage("closeModalLabel"),
          async () => {
            window.location.reload(); // or retry logic
          },
          () => { }
        );
      }

      if (!success || (success && canUpload === false)) {
        setContentState((prev) => ({
          ...prev,
          pendingRecording: false,
          preparingRecording: false,
        }));
        return; // Stop recording setup
      }
    }

    // Check if in content script or extension page (Chrome)
    if (window.location.href.includes("chrome-extension://")) {
      permission = await checkChromeCapturePermissions();
    } else {
      permission = await checkChromeCapturePermissionsSW();
    }

    if (!permission && currentState.openModal) {
      currentState.openModal(
        chrome.i18n.getMessage("chromePermissionsModalTitle"),
        chrome.i18n.getMessage("chromePermissionsModalDescription"),
        chrome.i18n.getMessage("chromePermissionsModalAction"),
        chrome.i18n.getMessage("chromePermissionsModalCancel"),
        async () => {
          await checkChromeCapturePermissionsSW();
          startStreaming(); // Retry streaming
        },
        () => { },
        null,
        chrome.i18n.getMessage("learnMoreDot"),
        URL,
        true
      );
      setContentState((prevContentState) => ({
        ...prevContentState,
        pendingRecording: false,
        preparingRecording: false,
      }));
      return;
    }

    const data = (await chrome.runtime.sendMessage({
      type: "available-memory",
    })) as MemoryDataResponse;

    if (
      data.quota < 524288000 &&
      !currentState.isLoggedIn &&
      !currentState.isSubscribed
    ) {
      if (typeof currentState.openModal === "function") {
        let clear: string | null = null;
        let clearAction = (): void => { };
        const locale = chrome.i18n.getMessage("@@ui_locale");
        let helpURL =
          "https://help.screenity.io/troubleshooting/9Jy5RGjNrBB42hqUdREQ7W/what-does-%E2%80%9Cmemory-limit-reached%E2%80%9D-mean-when-recording/8WkwHbt3puuXunYqQnyPcb";

        if (!locale.includes("en")) {
          helpURL =
            "https://translate.google.com/translate?sl=en&tl=" +
            locale +
            "&u=https://help.screenity.io/troubleshooting/9Jy5RGjNrBB42hqUdREQ7W/what-does-%E2%80%9Cmemory-limit-reached%E2%80%9D-mean-when-recording/8WkwHbt3puuXunYqQnyPcb";
        }

        const response = (await chrome.runtime.sendMessage({
          type: "check-restore",
        })) as RestoreResponse;
        if (response.restore) {
          clear = chrome.i18n.getMessage("clearSpaceButton");
          clearAction = (): void => {
            chrome.runtime.sendMessage({ type: "clear-recordings" });
          };
        }

        currentState.openModal(
          chrome.i18n.getMessage("notEnoughSpaceTitle"),
          chrome.i18n.getMessage("notEnoughSpaceDescription"),
          clear,
          chrome.i18n.getMessage("permissionsModalDismiss"),
          clearAction,
          () => { },
          null,
          chrome.i18n.getMessage("learnMoreDot"),
          helpURL
        );
      }
      setContentState((prevContentState) => ({
        ...prevContentState,
        pendingRecording: false,
        preparingRecording: false,
      }));
      return;
    }
    chrome.storage.local.set({
      tabRecordedID: null,
    });

    if (
      currentState.customRegion &&
      currentState.cropTarget &&
      currentState.regionCaptureRef
    ) {
      currentState.regionCaptureRef.contentWindow.postMessage(
        {
          type: "crop-target",
          target: currentState.cropTarget,
          width: currentState.regionWidth,
          height: currentState.regionHeight,
        },
        "*"
      );
    }

    setContentState((prevContentState) => ({
      ...prevContentState,
      showOnboardingArrow: false,
    }));

    if (!currentState.micActive && currentState.askMicrophone && currentState.openModal) {
      currentState.openModal(
        chrome.i18n.getMessage("micMutedModalTitle"),
        chrome.i18n.getMessage("micMutedModalDescription"),
        chrome.i18n.getMessage("micMutedModalAction"),
        chrome.i18n.getMessage("micMutedModalCancel"),
        () => {
          chrome.runtime.sendMessage({
            type: "desktop-capture",
            region: currentState.customRegion ? true : false,
            customRegion: currentState.customRegion,
            offscreenRecording: currentState.offscreenRecording,
            camera: false,
          });
          setContentState((prevContentState) => ({
            ...prevContentState,

            surface: "default",
            pipEnded: false,
          }));
        },
        () => {
          // Reset pendingRecording when user cancels
          setContentState((prevContentState) => ({
            ...prevContentState,
            pendingRecording: false,
            preparingRecording: false,
          }));
        },
        false,
        false,
        false,
        false,
        false,
        chrome.i18n.getMessage("noShowAgain"),
        () => {
          setContentState((prevContentState) => ({
            ...prevContentState,
            askMicrophone: false,
          }));
          chrome.storage.local.set({ askMicrophone: false });
        }
      );
    } else {
      chrome.runtime.sendMessage({
        type: "desktop-capture",
        region: currentState.customRegion ? true : false,
        customRegion: currentState.customRegion,
        offscreenRecording: currentState.offscreenRecording,
        camera: false,
      });
      setContentState((prevContentState) => ({
        ...prevContentState,

        surface: "default",
        pipEnded: false,
      }));
    }
  }, [URL, checkChromeCapturePermissions, checkChromeCapturePermissionsSW, CLOUD_FEATURES_ENABLED]);

  const tryRestartRecording = useCallback((): void => {
    const currentState = contentStateRef.current;
    if (!currentState || !currentState.openModal) return;

    currentState.pauseRecording();
    currentState.openModal(
      chrome.i18n.getMessage("restartModalTitle"),
      chrome.i18n.getMessage("restartModalDescription"),
      chrome.i18n.getMessage("restartModalRestart"),
      chrome.i18n.getMessage("restartModalResume"),
      () => {
        currentState.restartRecording();
      },
      () => {
        currentState.resumeRecording();
      }
    );
  }, []);

  const tryDismissRecording = useCallback((): void => {
    const currentState = contentStateRef.current;
    if (!currentState) return;

    if (currentState.askDismiss && currentState.openModal) {
      currentState.pauseRecording(true);
      currentState.openModal(
        chrome.i18n.getMessage("discardModalTitle"),
        chrome.i18n.getMessage("discardModalDescription"),
        chrome.i18n.getMessage("discardModalDiscard"),
        chrome.i18n.getMessage("discardModalResume"),
        () => {
          currentState.dismissRecording();
        },
        () => {
          currentState.resumeRecording();
        }
      );
    } else {
      currentState.dismissRecording();
    }
  }, []);

  interface DevicePermissionsData {
    success: boolean;
    audioinput?: MediaDeviceInfo[];
    videoinput?: MediaDeviceInfo[];
    cameraPermission?: boolean;
    microphonePermission?: boolean;
  }

  const handleDevicePermissions = (data: DevicePermissionsData): void => {
    const currentState = contentStateRef.current;
    if (!currentState) return;

    if (data && data !== undefined && data.success) {
      // I need to convert to a regular array of objects
      const audioInput = data.audioinput || [];
      const videoInput = data.videoinput || [];
      const cameraPermission = data.cameraPermission || false;
      const microphonePermission = data.microphonePermission || false;

      setContentState((prevContentState) => ({
        ...prevContentState,
        audioInput: audioInput,
        videoInput: videoInput,
        cameraPermission: cameraPermission,
        microphonePermission: microphonePermission,
      }));

      chrome.runtime.sendMessage({
        type: "switch-camera",
        id: currentState.defaultVideoInput,
      });

      // Check if first time setting devices
      if (!currentState.setDevices) {
        // Set default devices
        // Check if audio devices exist
        if (audioInput.length > 0) {
          setContentState((prevContentState) => ({
            ...prevContentState,
            defaultAudioInput: audioInput[0].deviceId,
            micActive: true,
          }));
          chrome.storage.local.set({
            defaultAudioInput: audioInput[0].deviceId,
            micActive: true,
          });
        }
        if (videoInput.length > 0) {
          setContentState((prevContentState) => ({
            ...prevContentState,
            defaultVideoInput: videoInput[0].deviceId,
            cameraActive: true,
          }));
          chrome.storage.local.set({
            defaultVideoInput: videoInput[0].deviceId,
            cameraActive: true,
          });
        }
        if (audioInput.length > 0 || videoInput.length > 0) {
          setContentState((prevContentState) => ({
            ...prevContentState,
            setDevices: true,
          }));
          chrome.storage.local.set({
            setDevices: true,
          });
        }
      }
    } else {
      setContentState((prevContentState) => ({
        ...prevContentState,
        cameraPermission: false,
        microphonePermission: false,
      }));
      if (currentState.askForPermissions && currentState.openModal) {
        currentState.openModal(
          chrome.i18n.getMessage("permissionsModalTitle"),
          chrome.i18n.getMessage("permissionsModalDescription"),
          chrome.i18n.getMessage("permissionsModalDismiss"),
          chrome.i18n.getMessage("permissionsModalNoShowAgain"),
          () => { },
          () => {
            noMorePermissions();
          },
          chrome.runtime.getURL("assets/helper/permissions.webp"),
          chrome.i18n.getMessage("learnMoreDot"),
          URL2,
          true,
          false
        );
      }
    }
  };

  const noMorePermissions = useCallback((): void => {
    setContentState((prevContentState) => ({
      ...prevContentState,
      askForPermissions: false,
    }));
    chrome.storage.local.set({ askForPermissions: false });
  }, []);

  useEffect(() => {
    const handleMessage = (event: MessageEvent): void => {
      if (event.data.type === "screenity-permissions") {
        handleDevicePermissions(event.data as DevicePermissionsData);
      } else if (event.data.type === "screenity-permissions-loaded") {
        setContentState((prevContentState) => ({
          ...prevContentState,
          permissionsLoaded: true,
        }));
      }
    };

    window.addEventListener("message", handleMessage);

    return () => {
      window.removeEventListener("message", handleMessage);
    };
  }, [URL2]);

  const playBeepSound = (): void => {
    const audio = new Audio(chrome.runtime.getURL("/assets/sounds/beep2.mp3"));
    audio.volume = 0.5;
    audio.play();
  };

  // These settings are available throughout the Content
  const [contentState, setContentStateInternal] = useState<ContentStateType>({
    color: "#4597F7",
    strokeWidth: 2,
    drawingMode: false,
    tool: "pen",
    undoStack: [],
    redoStack: [],
    canvas: null,
    swatch: 1,
    time: 0,
    timer: 0,
    recording: false,
    startRecording: startRecording,
    restartRecording: restartRecording,
    stopRecording: stopRecording,
    pauseRecording: pauseRecording,
    resumeRecording: resumeRecording,
    dismissRecording: dismissRecording,
    startStreaming: startStreaming,
    openModal: null,
    openToast: null,
    timeWarning: false,
    audioInput: [],
    videoInput: [],
    setDevices: false,
    defaultAudioInput: "none",
    defaultVideoInput: "none",
    cameraActive: false,
    micActive: false,
    sortBy: "newest",
    paused: false,
    toolbarPosition: {
      left: true,
      right: false,
      bottom: true,
      top: false,
      offsetX: 0,
      offsetY: 100,
    },
    popupPosition: {
      left: false,
      right: true,
      top: true,
      bottom: false,
      offsetX: 0,
      offsetY: 0,
      fixed: true,
    },
    cameraDimensions: {
      size: 200,
      x: 100,
      y: 100,
    },
    cameraFlipped: false,
    backgroundEffect: "blur",
    backgroundEffectsActive: false,
    countdown: true,
    showExtension: false,
    showPopup: false,
    blurMode: false,
    recordingType: "screen",
    customRegion: false,
    regionWidth: 800,
    surface: "default",
    regionHeight: 500,
    regionX: 100,
    regionY: 100,
    fromRegion: false,
    cropTarget: null,
    hideToolbar: false,
    alarm: false,
    alarmTime: 5 * 60,
    fromAlarm: false,
    pendingRecording: false,
    askForPermissions: true,
    cameraPermission: true,
    microphonePermission: true,
    askMicrophone: true,
    recordingShortcut: "⌥⇧D",
    cursorMode: "none",
    shape: "rectangle",
    shapeFill: false,
    zoomEnabled: false,
    offscreenRecording: false,
    isAddingImage: false,
    pipEnded: false,
    tabCaptureFrame: false,
    showOnboardingArrow: false,
    offline: false,
    updateChrome: false,
    permissionsChecked: false,
    permissionsLoaded: false,
    parentRef: null,
    shadowRef: null,
    hideUIAlerts: false,
    toolbarHover: false,
    hideUI: false,
    bigTab: "record",
    askDismiss: true,
    quality: "max",
    systemAudio: true,
    backup: false,
    backupSetup: false,
    openWarning: false,
    hasOpenedBefore: false,
    qualityValue: "1080p",
    fpsValue: "30",
    countdownActive: false,
    countdownCancelled: false,
    multiMode: false,
    isCountdownVisible: false,
    multiSceneCount: 0,
    preparingRecording: false,
    wasLoggedIn: false,
    skipLogin: false,
    hasSeenInstantModeModal: false,
    instantMode: false,
    onboarding: false,
    showProSplash: false,
    hasSubscribedBefore: false,
    isLoggedIn: false,
    screenityUser: null,
    isSubscribed: false,
    proSubscription: null,
    startRecordingAfterCountdown: () => {
      playBeepSound();
      setTimeout(() => {
        if (contentStateRef.current && !contentStateRef.current.countdownCancelled) {
          contentStateRef.current.startRecording();
        }
      }, 500);
    },
    cancelCountdown: () => {
      setContentState((prev) => ({
        ...prev,
        countdownActive: false,
        countdownCancelled: true,
        isCountdownVisible: false,
        recording: false,
        showPopup: true,
        showExtension: true,
      }));
      // Call dismissRecording to ensure everything is properly cleaned up
      if (contentStateRef.current) {
        contentStateRef.current.dismissRecording();
      }
    },
    resetCountdown: () => {
      setContentState((prev) => ({
        ...prev,
        countdownCancelled: false,
      }));
    },
    // クリップ録画関連の初期値
    clipSelecting: false,
    clipRecording: false,
    clipStartTime: null,
    clipCrop: null,
    clips: [],
    startClipSelection: startClipSelection,
    confirmClipSelection: confirmClipSelection,
    cancelClipSelection: cancelClipSelection,
    endClipRecording: endClipRecording,
    setClipCrop: setClipCrop,
  });
  contentStateRef.current = contentState;

  setContentState = (updater): void => {
    if (typeof updater === "function") {
      setContentStateInternal((prevState) => {
        const newState = { ...prevState, ...updater(prevState) };
        contentStateRef.current = newState;
        return newState;
      });
    } else {
      setContentStateInternal(updater);
      contentStateRef.current = updater;
    }
  };

  useEffect(() => {
    if (!CLOUD_FEATURES_ENABLED) return;
    if (!contentState.isLoggedIn || !contentState.isSubscribed) return;

    chrome.storage.local.get(["firstTimePro"], (res: { firstTimePro?: boolean }) => {
      if (
        res.firstTimePro &&
        typeof contentStateRef.current?.openModal === "function"
      ) {
        setTimeout(() => {
          if (contentStateRef.current?.openModal) {
            contentStateRef.current.openModal(
              chrome.i18n.getMessage("welcomeToProTitleModal"),
              chrome.i18n.getMessage("welcomeToProDescriptionModal"),
              chrome.i18n.getMessage("welcomeToProActionModal"),
              null,
              () => {
                chrome.storage.local.set({ firstTimePro: false });
              },
              () => { }
            );
          }
        }, 300);
      }
    });
  }, [contentState?.isLoggedIn, contentState?.isSubscribed]);

  // Check Chrome version
  useEffect(() => {
    const version = navigator.userAgent.match(/Chrom(e|ium)\/([0-9]+)\./);

    const MIN_CHROME_VERSION = 109;

    if (version && parseInt(version[2], 10) < MIN_CHROME_VERSION) {
      setContentState((prevContentState) => ({
        ...prevContentState,
        updateChrome: true,
      }));
    }
  }, []);

  useEffect(() => {
    if (typeof contentState.openWarning === "function") {
      // Check if url contains "playground.html" and "chrome-extension://"
      if (
        window.location.href.includes("playground.html") &&
        window.location.href.includes("chrome-extension://") &&
        !contentState.recording
      ) {
        contentState.openWarning(
          chrome.i18n.getMessage("extensionNotSupportedTitle"),
          chrome.i18n.getMessage("extensionNotSupportedDescription"),
          "NotSupportedIcon",
          10000
        );
      }
    }
  }, [
    contentState.openWarning,
    contentState.recording,
  ]);

  useEffect(() => {
    if (!contentState) return;
    if (typeof contentState.openModal === "function") {
      setContentState((prevContentState) => ({
        ...prevContentState,
        tryRestartRecording: tryRestartRecording,
        tryDismissRecording: tryDismissRecording,
      }));
    }
  }, [contentState.openModal, tryRestartRecording, tryDismissRecording]);

  // Count up every second
  useEffect(() => {
    if (contentState.recording && !contentState.paused && !contentState.alarm) {
      setTimer((timer) => timer + 1);
      const interval = setInterval(() => {
        setTimer((timer) => timer + 1);
      }, 1000);
      return () => clearInterval(interval);
    } else if (
      contentState.alarm &&
      !contentState.paused &&
      contentState.recording &&
      contentState.timer > 0
    ) {
      const interval = setInterval(() => {
        setTimer((timer) => timer - 1);
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [contentState.recording, contentState.paused, contentState.alarm, contentState.timer]);

  useEffect(() => {
    if (!contentState.customRegion) {
      setContentState((prevContentState) => ({
        ...prevContentState,
        cropTarget: null,
      }));
    }
  }, [contentState.customRegion]);

  // Check when hiding the toolbar
  useEffect(() => {
    if (contentState.hideToolbar && contentState.hideUI) {
      setContentState((prevContentState) => ({
        ...prevContentState,
        drawingMode: false,
        blurMode: false,
      }));
    }
  }, [contentState.hideToolbar, contentState.hideUI]);

  useEffect(() => {
    setupHandlers();
  }, []);

  useEffect(() => {
    chrome.storage.local.set({
      pendingRecording: contentState.pendingRecording,
    });
  }, [contentState.pendingRecording]);

  // Check if user has enough RAM to record for each quality option
  useEffect(() => {
    if (!contentState.qualityValue) {
      const suggested = "1080p"; // safe and high enough quality
      setContentState((prev) => ({ ...prev, qualityValue: suggested }));
      chrome.storage.local.set({ qualityValue: suggested });
    }
  }, [contentState.qualityValue]);

  // Check recording start time
  useEffect(() => {
    chrome.storage.local.get(
      ["recordingStartTime"],
      (result: { recordingStartTime?: number }) => {
        if (result.recordingStartTime && contentStateRef.current?.recording) {
          const recordingStartTime = result.recordingStartTime;
          const currentTime = new Date().getTime();
          const timeElapsed = currentTime - recordingStartTime;
          const timeElapsedSeconds = Math.floor(timeElapsed / 1000);
          if (contentState.alarm) {
            setTimer(contentState.alarmTime - timeElapsedSeconds);
          } else {
            setTimer(timeElapsedSeconds);
          }
        }
      }
    );
  }, [contentState.alarm, contentState.alarmTime]);

  useEffect(() => {
    if (contentState.backgroundEffectsActive) {
      chrome.runtime.sendMessage({ type: "background-effects-active" });
    } else {
      chrome.runtime.sendMessage({ type: "background-effects-inactive" });
    }
  }, [contentState.backgroundEffectsActive]);

  useEffect(() => {
    if (contentState.backgroundEffectsActive) {
      chrome.runtime.sendMessage({
        type: "set-background-effect",
        effect: contentState.backgroundEffect,
      });
    }
  }, [contentState.backgroundEffect, contentState.backgroundEffectsActive]);

  // Programmatically add custom scrollbars
  useEffect(() => {
    if (!contentState.parentRef) return;

    // Check if on mac
    const isMac = navigator.platform.toUpperCase().indexOf("MAC") >= 0;
    if (isMac) return;

    const parentDiv = contentState.parentRef;

    const elements = parentDiv.querySelectorAll("*");
    elements.forEach((element) => {
      element.classList.add("screenity-scrollbar");
    });

    const observer = new MutationObserver((mutationsList) => {
      for (const mutation of mutationsList) {
        if (mutation.type === "childList") {
          const addedNodes = Array.from(mutation.addedNodes);
          const removedNodes = Array.from(mutation.removedNodes);

          addedNodes.forEach((node) => {
            if (node.nodeType === Node.ELEMENT_NODE) {
              (node as Element).classList.add("screenity-scrollbar");
            }
          });

          removedNodes.forEach((node) => {
            if (node.nodeType === Node.ELEMENT_NODE) {
              (node as Element).classList.remove("screenity-scrollbar");
            }
          });
        }
      }
    });

    observer.observe(parentDiv, { childList: true, subtree: true });

    return () => {
      observer.disconnect();
    };
  }, [contentState.parentRef]);

  // Programmatically add custom scrollbars
  useEffect(() => {
    if (!contentState.shadowRef) return;

    // Check if on mac
    const isMac = navigator.platform.toUpperCase().indexOf("MAC") >= 0;
    if (isMac) return;

    const shadowRoot = (contentState.shadowRef as unknown as { shadowRoot: ShadowRoot }).shadowRoot;

    const elements = shadowRoot.querySelectorAll("*");
    elements.forEach((element) => {
      element.classList.add("screenity-scrollbar");
    });

    const observer = new MutationObserver((mutationsList) => {
      for (const mutation of mutationsList) {
        if (mutation.type === "childList") {
          const addedNodes = Array.from(mutation.addedNodes);
          const removedNodes = Array.from(mutation.removedNodes);

          addedNodes.forEach((node) => {
            if (node.nodeType === Node.ELEMENT_NODE) {
              (node as Element).classList.add("screenity-scrollbar");
            }
          });

          removedNodes.forEach((node) => {
            if (node.nodeType === Node.ELEMENT_NODE) {
              (node as Element).classList.remove("screenity-scrollbar");
            }
          });
        }
      }
    });

    observer.observe(shadowRoot, { childList: true, subtree: true });

    return () => {
      observer.disconnect();
    };
  }, [
    contentState.parentRef,
    contentState.shadowRef,
    contentState.bigTab,
    contentState.recordingType,
  ]);

  useEffect(() => {
    if (!contentState.hideUI) {
      setContentState((prevContentState) => ({
        ...prevContentState,
        hideUIAlerts: false,
        hideToolbar: false,
        toolbarHover: false,
      }));
    }
  }, [contentState.hideUI]);

  useEffect(() => {
    updateFromStorage();
  }, []);

  return (
    // this is the provider providing state
    <contentStateContext.Provider
      value={[contentState, setContentState, timer, setTimer]}
    >
      {props.children}
    </contentStateContext.Provider>
  );
};

export default ContentState;

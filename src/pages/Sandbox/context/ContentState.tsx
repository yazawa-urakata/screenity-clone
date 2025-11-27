import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useRef,
  ReactNode,
} from "react";
import { useEffect } from "react";

import fixWebmDuration from "fix-webm-duration";
import { default as fixWebmDurationFallback } from "webm-duration-fix";

import localforage from "localforage";
import type { ClipList } from "../../../types/clip";

localforage.config({
  driver: localforage.INDEXEDDB,
  name: "screenity", // global DB group
  version: 1,
});

const chunksStore = localforage.createInstance({
  name: "chunks", // the actual DB name
  storeName: "keyvaluepairs",
});

// Sandbox ContentState type definition
export interface SandboxContentStateType {
  time: number;
  editLimit: number;
  blob: Blob | null;
  webm: Blob | null;
  originalBlob: Blob | null;
  updatePlayerTime: boolean;
  start: number;
  end: number;
  trimming: boolean;
  cutting: boolean;
  muting: boolean;
  cropping?: boolean;
  history: Partial<SandboxContentStateType>[];
  redoHistory: Partial<SandboxContentStateType>[];
  undoDisabled: boolean;
  redoDisabled: boolean;
  duration: number;
  mode: string;
  ffmpegLoaded: boolean;
  ffmpeg?: boolean;
  frame: string | null;
  getFrame: (() => Promise<void>) | null;
  isFfmpegRunning: boolean;
  reencoding: boolean;
  prevWidth: number;
  width: number;
  prevHeight: number;
  height: number;
  top: number;
  left: number;
  fromCropper: boolean;
  base64: string | null;
  saveDrive: boolean;
  downloading: boolean;
  downloadingWEBM: boolean;
  downloadingGIF: boolean;
  volume: number;
  cropPreset: string;
  replaceAudio: boolean;
  title: string | null;
  ready: boolean;
  mp4ready: boolean;
  saved: boolean;
  iframeRef: HTMLIFrameElement | null;
  offline: boolean;
  updateChrome: boolean;
  driveEnabled: boolean;
  hasBeenEdited: boolean;
  dragInteracted: boolean;
  noffmpeg: boolean;
  openModal: ((
    title: string,
    description: string,
    action: string | null,
    cancel: string | null,
    actionCallback: () => void,
    cancelCallback: () => void,
    image?: string | null | false,
    learn?: string | false,
    learnURL?: string | (() => void) | false
  ) => void) | null;
  rawBlob: Blob | null;
  override: boolean;
  fallback: boolean;
  chunkCount: number;
  chunkIndex: number;
  bannerSupport: boolean;
  clips: ClipList;
  // Functions
  undo?: () => void;
  redo?: () => void;
  addToHistory?: () => void;
  handleTrim?: (cut: boolean) => Promise<void>;
  handleMute?: () => Promise<void>;
  download?: () => Promise<void>;
  handleCrop?: (x: number, y: number, width: number, height: number) => Promise<boolean>;
  handleReencode?: () => Promise<boolean>;
  downloadGIF?: () => Promise<void>;
  downloadWEBM?: () => Promise<void>;
  addAudio?: (videoBlob: Blob, audioBlob: Blob, volume: number) => Promise<void>;
  loadFFmpeg?: () => Promise<void>;
}

type SandboxContextValue = [
  SandboxContentStateType,
  React.Dispatch<React.SetStateAction<SandboxContentStateType>>
];

export const ContentStateContext = createContext<SandboxContextValue | undefined>(undefined);

interface ContentStateProps {
  children: ReactNode;
}

interface ChunkItem {
  timestamp?: number;
  chunk: Blob | ArrayBuffer;
}

interface ChunkMessage {
  chunk: string;
}

// Brave browser detection
declare global {
  interface Navigator {
    brave?: {
      isBrave: () => Promise<boolean>;
    };
  }
}

const ContentState: React.FC<ContentStateProps> = (props) => {
  const videoChunks = useRef<(Uint8Array | Blob)[]>([]);
  const makeVideoCheck = useRef<boolean>(false);
  const chunkCount = useRef<number>(0);

  const defaultState: SandboxContentStateType = {
    time: 0,
    editLimit: 420,
    blob: null,
    webm: null,
    originalBlob: null,
    updatePlayerTime: false,
    start: 0,
    end: 1,
    trimming: false,
    cutting: false,
    muting: false,
    history: [{}],
    redoHistory: [],
    undoDisabled: true,
    redoDisabled: true,
    duration: 0,
    mode: "player",
    ffmpegLoaded: false,
    frame: null,
    getFrame: null,
    isFfmpegRunning: false,
    reencoding: false,
    prevWidth: 0,
    width: 0,
    prevHeight: 0,
    height: 0,
    top: 0,
    left: 0,
    fromCropper: false,
    base64: null,
    saveDrive: false,
    downloading: false,
    downloadingWEBM: false,
    downloadingGIF: false,
    volume: 1,
    cropPreset: "none",
    replaceAudio: false,
    title: null,
    ready: false,
    mp4ready: false,
    saved: false,
    iframeRef: null,
    offline: false,
    updateChrome: false,
    driveEnabled: false,
    hasBeenEdited: false,
    dragInteracted: false,
    noffmpeg: false,
    openModal: null,
    rawBlob: null,
    override: false,
    fallback: false,
    chunkCount: 0,
    chunkIndex: 0,
    bannerSupport: false,
    clips: [],
  };

  const [contentState, setContentState] = useState<SandboxContentStateType>(defaultState);
  const contentStateRef = useRef<SandboxContentStateType>(contentState);

  const buildBlobFromChunks = async (): Promise<void> => {
    const items: ChunkItem[] = [];

    await chunksStore.ready();

    await chunksStore.iterate((value) => (items.push(value as ChunkItem), undefined));

    items.sort((a, b) => (a.timestamp ?? 0) - (b.timestamp ?? 0));
    const parts = items.map((c) =>
      c.chunk instanceof Blob ? c.chunk : new Blob([c.chunk])
    );

    const blob = new Blob(parts, { type: "video/webm" });

    reconstructVideo(blob);
  };

  useEffect(() => {
    contentStateRef.current = contentState;
  }, [contentState]);

  // Generate a title based on the current time
  useEffect(() => {
    const date = new Date();
    const formattedDate = date.toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
    setContentState((prevState) => ({
      ...prevState,
      title: `Screenity video - ${formattedDate}`,
    }));
  }, []);

  // Load clips from chrome.storage.local
  useEffect(() => {
    chrome.storage.local.get(["clips"], (result) => {
      const storedClips = result.clips as ClipList;
      if (storedClips && storedClips.length > 0) {
        setContentState((prevState) => ({
          ...prevState,
          clips: storedClips,
        }));
      }
    });
  }, []);

  // Show a popup when attempting to close the tab if the user has not downloaded their video
  useEffect(() => {
    if (!contentState.saved) {
      window.onbeforeunload = function () {
        return true;
      };
    } else {
      window.onbeforeunload = null;
    }
  }, [contentState.saved]);

  const addToHistory = useCallback(() => {
    setContentState((prevState) => ({
      ...prevState,
      history: [...prevState.history, prevState],
      redoHistory: [],
    }));
  }, [contentState]);

  const undo = useCallback(() => {
    if (contentState.history.length > 1) {
      const previousState =
        contentState.history[contentState.history.length - 2];
      const newHistory = contentState.history.slice(0, -1);
      setContentState((prevState) => ({
        ...prevState,
        ...previousState,
        history: newHistory,
        redoHistory: [contentState, ...contentState.redoHistory],
      }));
    }
  }, [contentState]);

  const redo = useCallback(() => {
    if (contentState.redoHistory.length > 0) {
      const nextState = contentState.redoHistory[0];
      const newRedoHistory = contentState.redoHistory.slice(1);
      setContentState((prevState) => ({
        ...prevState,
        ...nextState,
        history: [...contentState.history, contentState],
        redoHistory: newRedoHistory,
      }));
    }
  }, [contentState]);

  const base64ToUint8Array = (base64: string): Uint8Array | Blob => {
    const dataUrlRegex = /^data:(.*?);base64,/;
    const matches = base64.match(dataUrlRegex);
    if (matches !== null) {
      const mimeType = matches[1];
      const binaryString = atob(base64.slice(matches[0].length));
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      return new Blob([bytes], { type: mimeType });
    } else {
      const binaryString = atob(base64);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      return bytes;
    }
  };

  useEffect(() => {
    if (!contentState.blob) return;

    const video = document.createElement("video");
    video.preload = "metadata";
    video.onloadedmetadata = async () => {
      setContentState((prevState) => ({
        ...prevState,
        duration: video.duration,
        width: video.videoWidth,
        height: video.videoHeight,
        prevWidth: video.videoWidth,
        prevHeight: video.videoHeight,
      }));

      URL.revokeObjectURL(video.src);
      video.remove();
    };
    video.src = URL.createObjectURL(contentState.blob);
  }, [contentState.blob]);

  const reconstructVideo = async (withBlob?: Blob): Promise<void> => {
    const blob = withBlob
      ? withBlob
      : new Blob(
        videoChunks.current.map(chunk =>
          chunk instanceof Blob ? chunk : (chunk.buffer as ArrayBuffer)
        ),
        {
          type: "video/webm; codecs=vp8, opus",
        }
      );

    const storage = await chrome.storage.local.get("recordingDuration");
    const recordingDuration = storage.recordingDuration as number | undefined;

    const tokenStorage = await chrome.storage.local.get("token");
    const token = tokenStorage.token as string | undefined;

    let driveEnabled = false;

    if (token && token !== null) {
      driveEnabled = true;
    }

    setContentState((prevState) => ({
      ...prevState,
      rawBlob: blob,
      duration: (recordingDuration ?? 0) / 1000,
    }));

    const isWindows10 = navigator.userAgent.match(/Windows NT 10.0/);

    try {
      if (recordingDuration && recordingDuration > 0) {
        if (!isWindows10) {
          fixWebmDuration(
            blob,
            recordingDuration,
            async (fixedWebm: Blob) => {
              // MP4変換を無効化: 常にWebMのみを保存
              setContentState((prevState) => ({
                ...prevState,
                webm: fixedWebm,
                ready: true,
              }));
              chrome.runtime.sendMessage({ type: "recording-complete" });
            }
          );
        } else {
          const fixedWebm = await fixWebmDurationFallback(blob) as Blob;

          // MP4変換を無効化: 常にWebMのみを保存
          setContentState((prevState) => ({
            ...prevState,
            webm: fixedWebm,
            ready: true,
          }));
          chrome.runtime.sendMessage({ type: "recording-complete" });
        }
      } else {
        if (
          contentStateRef.current.fallback ||
          contentStateRef.current.updateChrome ||
          contentStateRef.current.noffmpeg ||
          (contentStateRef.current.duration >
            contentStateRef.current.editLimit &&
            !contentStateRef.current.override)
        ) {
          setContentState((prevState) => ({
            ...prevState,
            webm: blob,
            ready: true,
          }));
          chrome.runtime.sendMessage({ type: "recording-complete" });
          return;
        }

        const reader = new FileReader();
        reader.onloadend = function () {
          const base64data = reader.result as string;
          setContentState((prevContentState) => ({
            ...prevContentState,
            base64: base64data,
            driveEnabled: driveEnabled,
          }));
        };
        reader.readAsDataURL(blob);
      }
    } catch (error) {
      setContentState((prevState) => ({
        ...prevState,
        webm: blob,
        ready: true,
      }));
      chrome.runtime.sendMessage({ type: "recording-complete" });
    }
  };

  const checkMemory = (): void => {
    if (typeof contentStateRef.current.openModal === "function") {
      chrome.storage.local.get("memoryError", (result) => {
        const memoryError = result.memoryError as boolean | undefined;
        if (memoryError && memoryError !== null) {
          chrome.storage.local.set({ memoryError: false });
          contentStateRef.current.openModal!(
            chrome.i18n.getMessage("memoryLimitTitle"),
            chrome.i18n.getMessage("memoryLimitDescription"),
            chrome.i18n.getMessage("understoodButton"),
            null,
            () => { },
            () => { },
            null,
            chrome.i18n.getMessage("learnMoreDot"),
            () => {
              chrome.runtime.sendMessage({ type: "memory-limit-help" });
            }
          );
        }
      });
    }
  };

  useEffect(() => {
    chunkCount.current = contentState.chunkCount;
  }, [contentState.chunkCount]);

  const handleBatch = (chunks: ChunkMessage[], sendResponse: (response: { status: string }) => void): boolean => {
    (async () => {
      try {
        await Promise.all(
          chunks.map(async (chunk) => {
            if (contentStateRef.current.chunkIndex >= chunkCount.current) {
              console.warn("Too many chunks received");
              return;
            }

            const chunkData = base64ToUint8Array(chunk.chunk);
            videoChunks.current.push(chunkData);

            setContentState((prevState) => ({
              ...prevState,
              chunkIndex: prevState.chunkIndex + 1,
            }));
          })
        );

        sendResponse({ status: "ok" });
      } catch (error) {
        console.error("Error processing batch", error);
      }
    })();

    return true;
  };

  // Check Chrome version
  useEffect(() => {
    const version = navigator.userAgent.match(/Chrom(e|ium)\/([0-9]+)\./);

    const MIN_CHROME_VERSION = 109;

    if (version && parseInt(version[2], 10) < MIN_CHROME_VERSION) {
      setContentState((prevContentState) => ({
        ...prevContentState,
        updateChrome: true,
        noffmpeg: true,
      }));
    }
  }, []);

  const makeVideoTab = (sendResponse: ((response: { status: string }) => void) | null, message: { override: boolean }): void => {
    if (makeVideoCheck.current) return;
    makeVideoCheck.current = true;

    // リアルタイムアップロードでは動画の再構築は不要
    // 即座に ready 状態にして結果画面を表示
    setContentState((prevState) => ({
      ...prevState,
      ready: true,
      override: message.override,
    }));

    if (sendResponse !== null) {
      sendResponse({ status: "ok" });
    }
  };

  const toBase64 = (blob: Blob): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(blob);
      reader.onloadend = () => {
        resolve(reader.result as string);
      };
      reader.onerror = reject;
    });
  };

  const onChromeMessage = useCallback(
    (request: any, sender: chrome.runtime.MessageSender, sendResponse: (response?: any) => void): boolean | undefined => {
      const message = request;
      if (message.type === "chunk-count") {
        // リアルタイムアップロードでは chunk 処理は不要
        // 即座に ready 状態にする
        setContentState((prevState) => ({
          ...prevState,
          ready: true,
          override: message.override,
        }));
      } else if (message.type === "ping") {
        sendResponse({ status: "ready" });
      } else if (message.type === "new-chunk-tab") {
        // リアルタイムアップロードでは chunk 処理は不要
        // 即座に応答を返す
        if (sendResponse) {
          sendResponse({ status: "ok" });
        }
        return true;
      } else if (message.type === "make-video-tab") {
        makeVideoTab(sendResponse, message);
        return true;
      } else if (message.type === "saved-to-drive") {
        setContentState((prevContentState) => ({
          ...prevContentState,
          saveDrive: false,
          driveEnabled: true,
          saved: true,
        }));
      } else if (message.type === "restore-recording") {
        setContentState((prevContentState) => ({
          ...prevContentState,
          fallback: true,
          isFfmpegRunning: false,
          noffmpeg: true,
          ffmpegLoaded: true,
          ffmpeg: true,
        }));

        buildBlobFromChunks();
      } else if (message.type === "large-recording") {
        setContentState((prevContentState) => ({
          ...prevContentState,
          isFfmpegRunning: false,
          noffmpeg: true,
          ffmpegLoaded: true,
          ffmpeg: true,
        }));

        buildBlobFromChunks();
      } else if (message.type === "fallback-recording") {
        setContentState((prevContentState) => ({
          ...prevContentState,
          fallback: true,
          isFfmpegRunning: false,
          noffmpeg: true,
          ffmpegLoaded: true,
          ffmpeg: true,
        }));
      } else if (message.type === "banner-support") {
        setContentState((prevContentState) => ({
          ...prevContentState,
          bannerSupport: true,
        }));
      }
      return undefined;
    },
    [
      makeVideoCheck.current,
      videoChunks.current,
      contentState,
      contentStateRef.current,
    ]
  );

  useEffect(() => {
    const messageListener = (message: any, sender: chrome.runtime.MessageSender, sendResponse: (response?: any) => void): boolean => {
      const shouldKeepPortOpen = onChromeMessage(message, sender, sendResponse);
      return shouldKeepPortOpen === true;
    };

    chrome.runtime.onMessage.addListener(messageListener);

    return () => {
      chrome.runtime.onMessage.removeListener(messageListener);
    };
  }, []);

  const onMessage = async (event: MessageEvent): Promise<void> => {
    if (event.data.type === "updated-blob") {
      const base64 = event.data.base64 as string;
      const data = base64ToUint8Array(base64);
      const blob = data instanceof Blob ? data : new Blob([data.buffer as ArrayBuffer], {
        type: "video/mp4",
      });

      setContentState((prevContentState) => ({
        ...prevContentState,
        blob: blob,
        mp4ready: true,
        hasBeenEdited: true,
        isFfmpegRunning: false,
        reencoding: false,
        trimming: false,
        cutting: false,
        muting: false,
        cropping: false,
      }));

      const video = document.createElement("video");
      video.preload = "metadata";
      video.onloadedmetadata = async () => {
        setContentState((prevState) => ({
          ...prevState,
          duration: video.duration,
          width: video.videoWidth,
          height: video.videoHeight,
          start: 0,
          end: 1,
        }));

        if (event.data.addToHistory) {
          contentState.addToHistory?.();
        }

        URL.revokeObjectURL(video.src);
        video.remove();
      };
      video.src = URL.createObjectURL(blob);

      if (!contentState.originalBlob) {
        setContentState((prevContentState) => ({
          ...prevContentState,
          originalBlob: blob,
        }));
      }
    } else if (event.data.type === "download-mp4") {
      const base64 = event.data.base64 as string;
      const data = base64ToUint8Array(base64);
      const blob = data instanceof Blob ? data : new Blob([data.buffer as ArrayBuffer], {
        type: "video/mp4",
      });
      const url = URL.createObjectURL(blob);
      requestDownload(url, ".mp4");
      setContentState((prevContentState) => ({
        ...prevContentState,
        saved: true,
        isFfmpegRunning: false,
        downloading: false,
      }));
    } else if (event.data.type === "download-gif") {
      const base64 = event.data.base64 as string;
      const data = base64ToUint8Array(base64);
      const blob = data instanceof Blob ? data : new Blob([data.buffer as ArrayBuffer], {
        type: "image/gif",
      });
      const url = URL.createObjectURL(blob);
      requestDownload(url, ".gif");
      setContentState((prevContentState) => ({
        ...prevContentState,
        saved: true,
        isFfmpegRunning: false,
        downloadingGIF: false,
      }));
    } else if (event.data.type === "new-frame") {
      const url = URL.createObjectURL(event.data.frame);
      setContentState((prevContentState) => ({
        ...prevContentState,
        frame: url,
        isFfmpegRunning: false,
      }));
    } else if (event.data.type === "ffmpeg-loaded") {
      setContentState((prevContentState) => ({
        ...prevContentState,
        ffmpeg: true,
        ffmpegLoaded: true,
        isFfmpegRunning: false,
      }));
    } else if (event.data.type === "ffmpeg-load-error") {
      setContentState((prevContentState) => ({
        ...prevContentState,
        ffmpeg: true,
        noffmpeg: true,
        ffmpegLoaded: true,
        isFfmpegRunning: false,
      }));
    } else if (event.data.type === "crop-update") {
      setContentState((prevContentState) => ({
        ...prevContentState,
        mode: "player",
        start: 0,
        end: 1,
      }));
    }
  };

  useEffect(() => {
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [onMessage]);

  const sendMessage = (message: any): void => {
    window.parent.postMessage(message, "*");
  };

  const getBlob = async (): Promise<void> => {
    if (
      contentState.fallback ||
      contentState.noffmpeg ||
      (contentState.duration > contentState.editLimit && !contentState.override)
    )
      return;
    const data = base64ToUint8Array(contentState.base64!);
    const webmVideo = data instanceof Blob ? data : new Blob([data.buffer as ArrayBuffer], {
      type: "video/webm",
    });

    setContentState((prevState) => ({
      ...prevState,
      webm: webmVideo,
      ready: true,
    }));

    // MP4変換を無効化: FFmpegへの変換リクエストを送信しない
    // if (contentState.offline && contentState.ffmpeg === true) {
    //   // Offline
    // } else if (
    //   !contentState.updateChrome &&
    //   (contentState.duration <= contentState.editLimit || contentState.override)
    // ) {
    //   sendMessage({ type: "base64-to-blob", base64: contentState.base64 });
    // }

    chrome.runtime.sendMessage({ type: "recording-complete" });
  };

  useEffect(() => {
    if (!contentState.base64) return;
    if (!contentState.ffmpeg) return;
    if (!contentState.ffmpegLoaded) return;

    getBlob();
  }, [contentState.base64, contentState.ffmpeg, contentState.ffmpegLoaded]);

  const getImage = useCallback(async (): Promise<void> => {
    if (!contentState.blob) return;
    if (!contentState.ffmpeg) return;
    if (contentState.isFfmpegRunning) return;

    setContentState((prevState) => ({
      ...prevState,
      isFfmpegRunning: true,
    }));

    sendMessage({ type: "get-frame", time: 0, blob: contentState.blob });
  }, [contentState.blob, contentState.ffmpeg, contentState.isFfmpegRunning]);

  const addAudio = async (videoBlob: Blob, audioBlob: Blob, volume: number): Promise<void> => {
    if (contentState.isFfmpegRunning) return;
    if (
      contentState.duration > contentState.editLimit &&
      !contentState.override
    )
      return;

    setContentState((prevState) => ({
      ...prevState,
      isFfmpegRunning: true,
    }));

    sendMessage({
      type: "add-audio-to-video",
      blob: videoBlob,
      audio: audioBlob,
      duration: contentState.duration,
      volume: volume,
      replaceAudio: contentState.replaceAudio,
    });
  };

  const handleTrim = async (cut: boolean): Promise<void> => {
    if (contentState.isFfmpegRunning) return;
    if (
      contentState.duration > contentState.editLimit &&
      !contentState.override
    )
      return;

    if (cut) {
      setContentState((prevState) => ({
        ...prevState,
        cutting: true,
      }));
    } else {
      setContentState((prevState) => ({
        ...prevState,
        trimming: true,
      }));
    }

    setContentState((prevState) => ({
      ...prevState,
      isFfmpegRunning: true,
    }));

    sendMessage({
      type: "cut-video",
      blob: contentState.blob,
      startTime: contentState.start * contentState.duration,
      endTime: contentState.end * contentState.duration,
      cut: cut,
      duration: contentState.duration,
      encode: false,
    });
  };

  const handleMute = async (): Promise<void> => {
    if (contentState.isFfmpegRunning || contentState.muting) {
      return;
    }
    if (
      contentState.duration > contentState.editLimit &&
      !contentState.override
    )
      return;

    setContentState((prevState) => ({
      ...prevState,
      muting: true,
      isFfmpegRunning: true,
    }));

    sendMessage({
      type: "mute-video",
      blob: contentState.blob,
      startTime: contentState.start * contentState.duration,
      endTime: contentState.end * contentState.duration,
      duration: contentState.duration,
    });
  };

  const handleCrop = async (x: number, y: number, width: number, height: number): Promise<boolean> => {
    if (contentState.isFfmpegRunning || contentState.cropping) {
      return false;
    }
    if (
      contentState.duration > contentState.editLimit &&
      !contentState.override
    )
      return false;

    setContentState((prevState) => ({
      ...prevState,
      cropping: true,
      isFfmpegRunning: true,
    }));

    sendMessage({
      type: "crop-video",
      blob: contentState.blob,
      x: x,
      y: y,
      width: width,
      height: height,
    });

    return true;
  };

  const handleReencode = async (): Promise<boolean> => {
    if (contentState.isFfmpegRunning) return false;

    setContentState((prevState) => ({
      ...prevState,
      isFfmpegRunning: true,
      reencoding: true,
    }));

    sendMessage({
      type: "reencode-video",
      blob: contentState.blob,
      duration: contentState.duration,
    });

    return true;
  };

  const requestDownload = async (url: string, ext: string): Promise<void> => {
    const title =
      contentStateRef.current.title!.replace(/[\/\\:?~<>|*]/g, " ").trim() + ext;

    const revoke = () => {
      try {
        URL.revokeObjectURL(url);
      } catch { }
    };

    // Brave fallback
    if ((navigator.brave && (await navigator.brave.isBrave())) || false) {
      const resp = await fetch(url);
      const blob = await resp.blob();
      await new Promise<void>((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          chrome.runtime.sendMessage({
            type: "request-download",
            base64: reader.result,
            title,
          });
          revoke();
          resolve();
        };
        reader.readAsDataURL(blob);
      });
      return;
    }

    const downloadId = await new Promise<number>((resolve, reject) => {
      chrome.downloads.download(
        { url, filename: title, saveAs: true },
        (id) => {
          if (chrome.runtime.lastError || !id) {
            reject(chrome.runtime.lastError || new Error("Download failed"));
          } else {
            resolve(id);
          }
        }
      );
    });

    await new Promise<void>((resolve) => {
      const handler = async (delta: chrome.downloads.DownloadDelta) => {
        if (delta.id !== downloadId || !delta.state) return;

        const done = () => {
          chrome.downloads.onChanged.removeListener(handler);
          revoke();
          resolve();
        };

        if (
          delta.state.current === "interrupted" &&
          delta.error?.current !== "USER_CANCELED"
        ) {
          try {
            const resp = await fetch(url);
            const blob = await resp.blob();
            await new Promise<void>((res) => {
              const reader = new FileReader();
              reader.onloadend = () => {
                chrome.runtime.sendMessage({
                  type: "request-download",
                  base64: reader.result,
                  title,
                });
                res();
              };
              reader.readAsDataURL(blob);
            });
          } finally {
            done();
          }
        } else if (
          delta.state.current === "complete" ||
          delta.state.current === "interrupted"
        ) {
          done();
        }
      };

      chrome.downloads.onChanged.addListener(handler);
    });
  };

  const download = async (): Promise<void> => {
    if (contentState.isFfmpegRunning || contentState.downloading) {
      return;
    }

    setContentState((prevState) => ({
      ...prevState,
      downloading: true,
      isFfmpegRunning: true,
    }));

    const url = URL.createObjectURL(contentState.blob!);
    requestDownload(url, ".mp4");

    setContentState((prevState) => ({
      ...prevState,
      downloading: false,
      isFfmpegRunning: false,
      saved: true,
    }));
  };

  const downloadWEBM = async (): Promise<void> => {
    if (contentState.isFfmpegRunning || contentState.downloadingWEBM) {
      return;
    }

    setContentState((prevState) => ({
      ...prevState,
      downloadingWEBM: true,
      isFfmpegRunning: true,
    }));

    const url = URL.createObjectURL(contentState.webm!);
    requestDownload(url, ".webm");

    setContentState((prevState) => ({
      ...prevState,
      downloadingWEBM: false,
      isFfmpegRunning: false,
      saved: true,
    }));
  };

  const downloadGIF = async (): Promise<void> => {
    if (contentState.isFfmpegRunning || contentState.downloading) {
      return;
    }
    if (contentState.duration > 30) return;

    setContentState((prevState) => ({
      ...prevState,
      downloadingGIF: true,
      isFfmpegRunning: true,
    }));

    sendMessage({
      type: "to-gif",
      blob: contentState.blob,
    });
  };

  const loadFFmpeg = async (): Promise<void> => {
    sendMessage({ type: "load-ffmpeg" });
  };

  // Include all functions in the context
  contentState.undo = undo;
  contentState.redo = redo;
  contentState.addToHistory = addToHistory;
  contentState.handleTrim = handleTrim;
  contentState.handleMute = handleMute;
  contentState.download = download;
  contentState.handleCrop = handleCrop;
  contentState.handleReencode = handleReencode;
  contentState.getFrame = getImage;
  contentState.downloadGIF = downloadGIF;
  contentState.downloadWEBM = downloadWEBM;
  contentState.addAudio = addAudio;
  contentState.loadFFmpeg = loadFFmpeg;

  return (
    <ContentStateContext.Provider value={[contentState, setContentState]}>
      {props.children}
    </ContentStateContext.Provider>
  );
};

export default ContentState;

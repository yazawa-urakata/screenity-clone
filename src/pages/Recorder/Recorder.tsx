import React, { useEffect, useState, useRef, useCallback } from "react";
import localforage from "localforage";
import RecorderUI from "./RecorderUI";
import { createMediaRecorder } from "./mediaRecorderUtils";
import { sendRecordingError, sendStopRecording } from "./messaging";
import { getBitrates, getResolutionForQuality } from "./recorderConfig";
import { useInstantUpload } from "./useInstantUpload";

localforage.config({
  driver: localforage.INDEXEDDB,
  name: "screenity",
  version: 1,
});

// Get chunks store
const chunksStore = localforage.createInstance({
  name: "chunks",
});

interface ChunkData {
  index: number;
  chunk: Blob;
  timestamp: number;
}

interface StreamingData {
  defaultAudioInput: string;
  defaultVideoInput: string;
  recordingType: string;
  micActive: boolean;
}

interface DesktopCaptureOptions {
  canRequestAudioTrack?: boolean;
}

type RecorderMessage =
  | { type: "loaded"; backup: boolean; isTab: boolean; tabID: number }
  | { type: "streaming-data"; data: string }
  | { type: "start-recording-tab" }
  | { type: "restart-recording-tab" }
  | { type: "stop-recording-tab" }
  | { type: "set-mic-active-tab"; active: boolean }
  | { type: "set-audio-output-volume"; volume: number }
  | { type: "pause-recording-tab" }
  | { type: "resume-recording-tab" }
  | { type: "dismiss-recording" };

const Recorder: React.FC = () => {
  const isRestarting = useRef<boolean>(false);
  const isFinishing = useRef<boolean>(false);
  const sentLast = useRef<boolean>(false);
  const lastTimecode = useRef<number>(0);
  const hasChunks = useRef<boolean>(false);

  const lastSize = useRef<number>(0);
  const index = useRef<number>(0);

  const [started, setStarted] = useState<boolean>(false);

  // Main stream (recording)
  const liveStream = useRef<MediaStream | null>(null);

  // Helper streams
  const helperVideoStream = useRef<MediaStream | null>(null);
  const helperAudioStream = useRef<MediaStream | null>(null);

  // Audio controls, with refs to persist across renders
  const aCtx = useRef<AudioContext | null>(null);
  const destination = useRef<MediaStreamAudioDestinationNode | null>(null);
  const audioInputSource = useRef<MediaStreamAudioSourceNode | null>(null);
  const audioOutputSource = useRef<MediaStreamAudioSourceNode | null>(null);
  const audioInputGain = useRef<GainNode | null>(null);
  const audioOutputGain = useRef<GainNode | null>(null);

  const recorder = useRef<MediaRecorder | null>(null);

  const isTab = useRef<boolean>(false);
  const tabID = useRef<string | null>(null);
  const tabPreferred = useRef<boolean>(false);

  const backupRef = useRef<boolean>(false);

  const {
    uploaderRef,
    state: uploadState,
    progress: uploadProgress,
    error: uploadError,
    isEnabled: isUploadEnabled,
    initializeUpload,
    finalizeUpload,
    cancelUpload,
  } = useInstantUpload();

  const pending = useRef<BlobEvent[]>([]);
  const draining = useRef<boolean>(false);
  const lowStorageAbort = useRef<boolean>(false);
  const savedCount = useRef<number>(0);
  const totalRecordedBytes = useRef<number>(0);

  const lastEstimateAt = useRef<number>(0);
  const ESTIMATE_INTERVAL_MS = 5000;
  const MIN_HEADROOM = 25 * 1024 * 1024;
  const MAX_PENDING_BYTES = 8 * 1024 * 1024;
  const pendingBytes = useRef<number>(0);

  async function canFitChunk(byteLength?: number): Promise<boolean> {
    const now = performance.now();
    if (now - lastEstimateAt.current < ESTIMATE_INTERVAL_MS) {
      return !lowStorageAbort.current;
    }
    lastEstimateAt.current = now;

    try {
      const { usage = 0, quota = 0 } = await navigator.storage.estimate();
      const remaining = quota - usage;
      return remaining > MIN_HEADROOM + (byteLength || 0);
    } catch {
      return !lowStorageAbort.current;
    }
  }

  async function saveChunk(e: BlobEvent, i: number): Promise<boolean> {
    const ts = e.timecode ?? 0;

    if (
      savedCount.current > 0 &&
      ts === lastTimecode.current &&
      e.data.size === lastSize.current
    ) {
      return false;
    }

    if (!(await canFitChunk(e.data.size))) {
      lowStorageAbort.current = true;
      chrome.storage.local.set({
        recording: false,
        restarting: false,
        tabRecordedID: null,
        memoryError: true,
      });
      chrome.runtime.sendMessage({ type: "stop-recording-tab" });
      return false;
    }

    try {
      await chunksStore.setItem<ChunkData>(`chunk_${i}`, {
        index: i,
        chunk: e.data,
        timestamp: ts,
      });
    } catch (err) {
      lowStorageAbort.current = true;
      chrome.storage.local.set({
        recording: false,
        restarting: false,
        tabRecordedID: null,
        memoryError: true,
      });
      chrome.runtime.sendMessage({ type: "stop-recording-tab" });
      return false;
    }

    lastTimecode.current = ts;
    lastSize.current = e.data.size;
    savedCount.current += 1;

    if (backupRef.current) {
      chrome.runtime.sendMessage({ type: "write-file", index: i });
    }
    return true;
  }

  async function drainQueue(): Promise<void> {
    if (draining.current) return;
    draining.current = true;

    try {
      while (pending.current.length) {
        if (lowStorageAbort.current) {
          pending.current.length = 0;
          pendingBytes.current = 0;
          break;
        }

        const e = pending.current.shift();
        if (!e) break;

        pendingBytes.current -= e.data.size;

        if (!(await canFitChunk(e.data.size))) {
          lowStorageAbort.current = true;
          chrome.storage.local.set({
            recording: false,
            restarting: false,
            tabRecordedID: null,
            memoryError: true,
          });
          chrome.runtime.sendMessage({ type: "stop-recording-tab" });
          pending.current.length = 0;
          pendingBytes.current = 0;
          break;
        }

        const i = index.current;
        const saved = await saveChunk(e, i);
        if (saved) index.current = i + 1;
      }
    } finally {
      draining.current = false;
    }
  }

  async function waitForDrain(): Promise<void> {
    while (draining.current || pending.current.length) {
      await new Promise((r) => setTimeout(r, 10));
    }
  }

  useEffect(() => {
    chrome.storage.local.get(["backup"], (result) => {
      if (result.backup) {
        backupRef.current = true;
      } else {
        backupRef.current = false;
      }
    });
  }, []);

  async function startRecording(): Promise<void> {
    // Check that a recording is not already in progress
    if (recorder.current !== null) return;

    navigator.storage.persist();
    // Check if the stream actually has data in it
    if (!helperVideoStream.current || helperVideoStream.current.getVideoTracks().length === 0) {
      sendRecordingError("No video tracks available");
      return;
    }

    chunksStore.clear();

    lastTimecode.current = 0;
    lastSize.current = 0;
    hasChunks.current = false;
    savedCount.current = 0;
    pending.current = [];
    draining.current = false;
    lowStorageAbort.current = false;
    pendingBytes.current = 0;
    totalRecordedBytes.current = 0;

    const videoId = `recording-${Date.now()}`;

    try {
      await initializeUpload(videoId);
      console.log("✅ Real-time upload initialized");
    } catch (err) {
      console.warn("⚠️ Failed to initialize real-time upload, falling back to normal recording:", err);
    }

    try {
      const { qualityValue } = await chrome.storage.local.get(["qualityValue"]);

      const { audioBitsPerSecond, videoBitsPerSecond } =
        getBitrates(qualityValue as string);

      recorder.current = createMediaRecorder(liveStream.current!, {
        audioBitsPerSecond,
        videoBitsPerSecond,
      });
    } catch (err) {
      sendRecordingError(JSON.stringify(err));
      return;
    }

    chrome.storage.local.set({
      recording: true,
      restarting: false,
    });

    isRestarting.current = false;
    index.current = 0;

    try {
      recorder.current.start(1000);
    } catch (err) {
      sendRecordingError("Failed to start recording: " + JSON.stringify(err));
      return;
    }

    recorder.current.onerror = (ev: Event) => {
      const errorEvent = ev as ErrorEvent;
      chrome.runtime.sendMessage({
        type: "recording-error",
        error: "mediarecorder",
        why: String(errorEvent?.error || "unknown"),
      });
    };

    recorder.current.onstop = async () => {
      if (isRestarting.current) return;
      console.log("[Recorder] onstop fired");
      await waitForDrain();
      console.log("[Recorder] onstop: drain completed");

      // Finalize upload after all chunks are processed
      if (uploaderRef.current && isFinishing.current) {
        try {
          console.log("[Recorder] onstop: Starting finalize upload...");
          await finalizeUpload();
          console.log("✅ Real-time upload finalized from onstop");

          // アップロード完了状態を Chrome Storage に保存
          await chrome.storage.local.set({
            instantUploadStatus: "completed",
            instantUploadCompleteTime: Date.now(),
          });
        } catch (err) {
          console.error("❌ Failed to finalize upload from onstop:", err);

          // アップロード失敗状態を Chrome Storage に保存
          await chrome.storage.local.set({
            instantUploadStatus: "error",
            instantUploadError: err instanceof Error ? err.message : String(err),
          });
        }
      }

      if (!sentLast.current) {
        sentLast.current = true;
        isFinishing.current = false;
        chrome.runtime.sendMessage({ type: "video-ready" });
      }
    };

    const checkMaxMemory = (): void => {
      try {
        navigator.storage.estimate().then(({ usage = 0, quota = 0 }) => {
          const remaining = quota - usage;
          const minHeadroom = 25 * 1024 * 1024;
          if (remaining < minHeadroom) {
            chrome.storage.local.set({
              recording: false,
              restarting: false,
              tabRecordedID: null,
              memoryError: true,
            });
            sendStopRecording();
          }
        });
      } catch (err) {
        sendRecordingError(
          "Failed to check available memory: " + JSON.stringify(err)
        );
      }
    };

    recorder.current.ondataavailable = (e: BlobEvent) => {
      if (!e || !e.data || !e.data.size) {
        if (recorder.current && recorder.current.state === "inactive") {
          chrome.storage.local.set({
            recording: false,
            restarting: false,
            tabRecordedID: null,
          });
          sendStopRecording();
        }
        return;
      }

      if (lowStorageAbort.current) {
        return;
      }

      if (!hasChunks.current) {
        hasChunks.current = true;
        lastTimecode.current = e.timecode ?? 0;
        lastSize.current = e.data.size;
      }

      pending.current.push(e);
      void drainQueue();

      if (uploaderRef.current && e.data.size > 0) {
        totalRecordedBytes.current += e.data.size;
        uploaderRef.current.handleChunk(e.data, totalRecordedBytes.current);
        console.log(`[InstantUpload] Chunk sent: ${(e.data.size / 1024 / 1024).toFixed(2)}MB, Total: ${(totalRecordedBytes.current / 1024 / 1024).toFixed(2)}MB`);
      }
    };

    recorder.current.onpause = () => {
      lastTimecode.current = 0;
      lastSize.current = 0;
    };
    recorder.current.onresume = () => {
      lastTimecode.current = 0;
      lastSize.current = 0;
    };

    if (liveStream.current) {
      const videoTrack = liveStream.current.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.onended = () => {
          chrome.storage.local.set({
            recording: false,
            restarting: false,
            tabRecordedID: null,
          });
          sendStopRecording();
        };
      }
    }

    if (helperVideoStream.current) {
      const videoTrack = helperVideoStream.current.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.onended = () => {
          chrome.storage.local.set({
            recording: false,
            restarting: false,
            tabRecordedID: null,
          });
          sendStopRecording();
        };
      }
    }
  }

  async function stopRecording(): Promise<void> {
    isFinishing.current = true;
    if (recorder.current) {
      try {
        recorder.current.requestData();
      } catch {}
      recorder.current.stop();
      console.log("[Recorder] Recording stopped, waiting for onstop event...");

      // Note: finalize() is now called in onstop handler
      // to ensure all ondataavailable events have fired

      recorder.current = null;
    }

    if (liveStream.current) {
      liveStream.current.getTracks().forEach((t) => t.stop());
      liveStream.current = null;
    }

    if (helperVideoStream.current) {
      helperVideoStream.current.getTracks().forEach((t) => t.stop());
      helperVideoStream.current = null;
    }

    if (helperAudioStream.current) {
      helperAudioStream.current.getTracks().forEach((t) => t.stop());
      helperAudioStream.current = null;
    }
  }

  const dismissRecording = async (): Promise<void> => {
    isRestarting.current = true;
    if (recorder.current !== null) {
      recorder.current.stop();
      recorder.current = null;
    }
    window.close();
  };

  const restartRecording = async (): Promise<void> => {
    isRestarting.current = true;
    if (recorder.current !== null) {
      recorder.current.stop();
    }
    recorder.current = null;
    chrome.runtime.sendMessage({ type: "reset-active-tab-restart" });
  };

  async function startAudioStream(id: string): Promise<MediaStream | null> {
    const audioStreamOptions: MediaStreamConstraints = {
      audio: {
        deviceId: {
          exact: id,
        },
      },
    };

    const result = await navigator.mediaDevices
      .getUserMedia(audioStreamOptions)
      .then((stream) => {
        return stream;
      })
      .catch((err) => {
        // Try again without the device ID
        const audioStreamOptions: MediaStreamConstraints = {
          audio: true,
        };

        return navigator.mediaDevices
          .getUserMedia(audioStreamOptions)
          .then((stream) => {
            return stream;
          })
          .catch((err) => {
            return null;
          });
      });

    return result;
  }

  // Set audio input volume
  function setAudioInputVolume(volume: number): void {
    if (audioInputGain.current) {
      audioInputGain.current.gain.value = volume;
    }
  }

  // Set audio output volume
  function setAudioOutputVolume(volume: number): void {
    if (audioOutputGain.current) {
      audioOutputGain.current.gain.value = volume;
    }
  }

  const setMic = async (result: { active: boolean }): Promise<void> => {
    if (helperAudioStream.current != null) {
      if (result.active) {
        setAudioInputVolume(1);
      } else {
        setAudioInputVolume(0);
      }
    } else {
      // No microphone available
    }
  };

  async function startStream(
    data: StreamingData,
    id: string | null,
    options: DesktopCaptureOptions | null,
    permissions: PermissionStatus,
    permissions2: PermissionStatus
  ): Promise<void> {
    // Get quality value
    const { qualityValue } = await chrome.storage.local.get(["qualityValue"]);

    const { width, height } = getResolutionForQuality(qualityValue as string);

    const { fpsValue } = await chrome.storage.local.get(["fpsValue"]);
    let fps = parseInt(fpsValue as string);

    // Check if fps is a number
    if (isNaN(fps)) {
      fps = 30;
    }

    // Check if the user selected a tab in desktopcapture
    let userConstraints: MediaStreamConstraints = {
      audio: {
        deviceId: data.defaultAudioInput,
      },
      video: {
        deviceId: data.defaultVideoInput,
        width: {
          ideal: width,
        },
        height: {
          ideal: height,
        },
        frameRate: {
          ideal: fps,
        },
      },
    };
    if (permissions.state === "denied") {
      userConstraints.video = false;
    }
    if (permissions2.state === "denied") {
      userConstraints.audio = false;
    }

    let userStream: MediaStream | undefined;
    // Camera access has been disabled
    // if (
    //   permissions.state != "denied" &&
    //   permissions2.state != "denied" &&
    //   data.recordingType === "camera"
    // ) {
    //   userStream = await navigator.mediaDevices.getUserMedia(userConstraints);
    // }

    // Save the helper streams
    if (data.recordingType === "camera") {
      // Camera access has been disabled
      helperVideoStream.current = null;
    } else {
      const constraints = {
        audio: {
          mandatory: {
            chromeMediaSource: isTab.current ? "tab" : "desktop",
            chromeMediaSourceId: id,
          },
        },
        video: {
          mandatory: {
            chromeMediaSource: isTab.current ? "tab" : "desktop",
            chromeMediaSourceId: id,
            maxWidth: width,
            maxHeight: height,
            maxFrameRate: fps,
          },
        },
      };

      let stream: MediaStream;

      try {
        stream = await navigator.mediaDevices.getUserMedia(constraints as MediaStreamConstraints);

        // Check if the stream actually has data in it
        if (stream.getVideoTracks().length === 0) {
          sendRecordingError("No video tracks available");
          return;
        }
      } catch (err) {
        sendRecordingError("Failed to get user media: " + JSON.stringify(err));
        return;
      }

      if (isTab.current) {
        // Continue to play the captured audio to the user.
        const output = new AudioContext();
        const source = output.createMediaStreamSource(stream);
        source.connect(output.destination);
      }

      helperVideoStream.current = stream;

      const surface = stream.getVideoTracks()[0].getSettings().displaySurface;
      chrome.runtime.sendMessage({ type: "set-surface", surface: surface });
    }

    // Create an audio context, destination, and stream
    aCtx.current = new AudioContext();
    destination.current = aCtx.current.createMediaStreamDestination();
    liveStream.current = new MediaStream();

    const micstream = await startAudioStream(data.defaultAudioInput);
    helperAudioStream.current = micstream;

    // Check if micstream has an audio track
    if (
      helperAudioStream.current != null &&
      helperAudioStream.current.getAudioTracks().length > 0
    ) {
      audioInputGain.current = aCtx.current.createGain();
      audioInputSource.current = aCtx.current.createMediaStreamSource(
        helperAudioStream.current
      );
      audioInputSource.current
        .connect(audioInputGain.current)
        .connect(destination.current);
    } else {
      // No microphone available
    }

    if (helperAudioStream.current != null && !data.micActive) {
      setAudioInputVolume(0);
    }

    // Check if stream has an audio track
    if (helperVideoStream.current && helperVideoStream.current.getAudioTracks().length > 0) {
      audioOutputGain.current = aCtx.current.createGain();
      audioOutputSource.current = aCtx.current.createMediaStreamSource(
        helperVideoStream.current
      );
      audioOutputSource.current
        .connect(audioOutputGain.current)
        .connect(destination.current);
    } else {
      // No system audio available
    }

    // Add the tracks to the stream
    if (helperVideoStream.current) {
      liveStream.current.addTrack(helperVideoStream.current.getVideoTracks()[0]);
      if (
        (helperAudioStream.current != null &&
          helperAudioStream.current.getAudioTracks().length > 0) ||
        helperVideoStream.current.getAudioTracks().length > 0
      ) {
        liveStream.current.addTrack(
          destination.current.stream.getAudioTracks()[0]
        );
      }
    }

    // Send message to go back to the previously active tab
    setStarted(true);

    chrome.runtime.sendMessage({ type: "reset-active-tab" });
  }

  async function startStreaming(data: StreamingData): Promise<void> {
    // Check user permissions for camera and microphone individually
    const permissions = await navigator.permissions.query({
      name: "camera" as PermissionName,
    });
    const permissions2 = await navigator.permissions.query({
      name: "microphone" as PermissionName,
    });

    try {
      if (data.recordingType === "camera") {
        startStream(data, null, null, permissions, permissions2);
      } else if (!isTab.current) {
        let captureTypes = ["screen", "window", "tab", "audio"] as chrome.desktopCapture.DesktopCaptureSourceType[];
        if (tabPreferred.current) {
          captureTypes = ["tab", "screen", "window", "audio"] as chrome.desktopCapture.DesktopCaptureSourceType[];
        }
        chrome.desktopCapture.chooseDesktopMedia(
          captureTypes,
          null,
          (streamId: string, options: DesktopCaptureOptions) => {
            if (
              streamId === undefined ||
              streamId === null ||
              streamId === ""
            ) {
              sendRecordingError("User cancelled the modal", true);
              return;
            } else {
              startStream(data, streamId, options, permissions, permissions2);
            }
          }
        );
      } else {
        startStream(data, tabID.current, null, permissions, permissions2);
      }
    } catch (err) {
      sendRecordingError(
        "Failed to start streaming: " + JSON.stringify(err),
        true
      );
    }
  }

  // Check if trying to record from Playground
  useEffect(() => {
    chrome.storage.local.get(["tabPreferred"], (result) => {
      tabPreferred.current = result.tabPreferred as boolean;
    });
  }, []);

  const getStreamID = async (id: number): Promise<void> => {
    const streamId = await chrome.tabCapture.getMediaStreamId({
      targetTabId: id,
    });
    tabID.current = streamId;
  };

  const onMessage = useCallback(
    (
      request: RecorderMessage,
      sender: chrome.runtime.MessageSender,
      sendResponse: (response?: unknown) => void
    ): void => {
      if (request.type === "loaded") {
        backupRef.current = request.backup;
        // FLAG: I don't know why this was a false check before...
        if (!tabPreferred.current) {
          isTab.current = request.isTab;
          if (request.isTab) {
            getStreamID(request.tabID);
          }
        } else {
          isTab.current = false;
        }
        chrome.runtime.sendMessage({ type: "get-streaming-data" });
      } else if (request.type === "streaming-data") {
        startStreaming(JSON.parse(request.data));
      } else if (request.type === "start-recording-tab") {
        startRecording();
      } else if (request.type === "restart-recording-tab") {
        restartRecording();
      } else if (request.type === "stop-recording-tab") {
        stopRecording();
      } else if (request.type === "set-mic-active-tab") {
        setMic(request);
      } else if (request.type === "set-audio-output-volume") {
        setAudioOutputVolume(request.volume);
      } else if (request.type === "pause-recording-tab") {
        if (!recorder.current) return;
        recorder.current.pause();
      } else if (request.type === "resume-recording-tab") {
        if (!recorder.current) return;
        recorder.current.resume();
      } else if (request.type === "dismiss-recording") {
        dismissRecording();
      }
    },
    []
  );

  useEffect(() => {
    // Event listener (extension messaging)
    chrome.runtime.onMessage.addListener(onMessage);

    return () => {
      chrome.runtime.onMessage.removeListener(onMessage);
    };
  }, [onMessage]);

  return (
    <RecorderUI
      started={started}
      isTab={isTab.current}
      uploadState={uploadState}
      uploadProgress={uploadProgress}
      uploadError={uploadError}
    />
  );
};

export default Recorder;

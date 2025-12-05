import localforage from "localforage";
import type React from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import type { ClipList } from "../../types/clip";
import { getSupabaseAuthState, getWebAppUrl } from "../../utils/supabaseClient";
import { createMediaRecorder } from "./mediaRecorderUtils";
import { sendRecordingError, sendStopRecording } from "./messaging";
import RecorderUI from "./RecorderUI";
import { getBitrates, getResolutionForQuality } from "./recorderConfig";
import { uploadSingleFile } from "./uploadUtils";
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

  const {
    uploaderRef,
    state: uploadState,
    progress: uploadProgress,
    error: uploadError,
    initializeUpload,
    finalizeUpload,
  } = useInstantUpload();

  const pending = useRef<BlobEvent[]>([]);
  const draining = useRef<boolean>(false);
  const lowStorageAbort = useRef<boolean>(false);
  const savedCount = useRef<number>(0);
  const totalRecordedBytes = useRef<number>(0);

  const lastEstimateAt = useRef<number>(0);
  const ESTIMATE_INTERVAL_MS = 5000;
  const MIN_HEADROOM = 25 * 1024 * 1024;
  const pendingBytes = useRef<number>(0);

  const canFitChunk = useCallback(
    async (byteLength?: number): Promise<boolean> => {
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
    },
    [],
  );

  const saveChunk = useCallback(
    async (e: BlobEvent, i: number): Promise<boolean> => {
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
      } catch {
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

      return true;
    },
    [canFitChunk],
  );

  const drainQueue = useCallback(async (): Promise<void> => {
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
  }, [canFitChunk, saveChunk]);

  const waitForDrain = useCallback(async (): Promise<void> => {
    while (draining.current || pending.current.length) {
      await new Promise((r) => setTimeout(r, 10));
    }
  }, []);

  const startRecording = useCallback(async (): Promise<void> => {
    // Check that a recording is not already in progress
    if (recorder.current !== null) return;

    navigator.storage.persist();
    // Check if the stream actually has data in it
    if (
      !helperVideoStream.current ||
      helperVideoStream.current.getVideoTracks().length === 0
    ) {
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

    // 前回の録画のアップロード状態をクリア
    // editorfallback.html が古い状態を表示するのを防ぐ
    await chrome.storage.local.remove([
      "instantUploadStatus",
      "instantUploadCompleteTime",
      "instantUploadError",
    ]);

    // Phase 2: initiate失敗時は録画を開始しない
    try {
      await initializeUpload(videoId);
      console.log("✅ Real-time upload initialized");
    } catch (err) {
      console.error("❌ Failed to initialize real-time upload:", err);

      // Phase 5: より詳細なユーザー通知
      const errorMessage = err instanceof Error ? err.message : String(err);

      // エラーの種類に応じたガイダンス
      let guidanceMessage = "ネットワーク接続を確認してください。";
      if (errorMessage.includes("Not authenticated")) {
        guidanceMessage = "ログインし直してから再度お試しください。";
      } else if (errorMessage.includes("401") || errorMessage.includes("403")) {
        guidanceMessage = "認証が必要です。ログインし直してください。";
      } else if (
        errorMessage.includes("500") ||
        errorMessage.includes("502") ||
        errorMessage.includes("503")
      ) {
        guidanceMessage =
          "サーバーが一時的に利用できません。しばらく待ってから再度お試しください。";
      }

      chrome.runtime.sendMessage({
        type: "show-toast",
        title: "アップロードの準備に失敗しました",
        message: `${guidanceMessage} エラー: ${errorMessage}`,
        duration: 8000,
      });

      // 録画状態をクリア（Content Script のタイマーを止める）
      chrome.storage.local.set({
        recording: false,
        restarting: false,
        tabRecordedID: null,
      });

      // 録画を開始しない
      sendRecordingError(`Upload initialization failed: ${errorMessage}`);
      return;
    }

    try {
      const { qualityValue } = await chrome.storage.local.get(["qualityValue"]);

      const { audioBitsPerSecond, videoBitsPerSecond } = getBitrates(
        qualityValue as string,
      );

      recorder.current = createMediaRecorder(liveStream.current, {
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
      recordingStartTime: Date.now(), // Phase 2: 録画開始時刻を保存
    });

    isRestarting.current = false;
    index.current = 0;

    try {
      recorder.current.start(1000);
    } catch (err) {
      sendRecordingError(`Failed to start recording: ${JSON.stringify(err)}`);
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
          const result = await finalizeUpload();
          console.log("✅ Real-time upload finalized from onstop", result);

          // clips.json のアップロード処理
          console.log(
            "[Recorder] 📦 録画停止 - clips.jsonアップロード処理を開始",
            {
              result,
              hasKey: result?.key,
            },
          );

          if (result?.key) {
            try {
              // クリップリストを取得
              console.log("[Recorder] 🔍 Chrome Storageからclipsを取得中...");
              const storageResult = await chrome.storage.local.get(["clips"]);
              const clips = (storageResult.clips as ClipList) || [];

              console.log("[Recorder] 📋 Chrome Storageから取得したclips:", {
                clipsLength: clips.length,
                clips: clips.map((c) => ({
                  id: c.id,
                  startTime: c.startTime,
                  endTime: c.endTime,
                  duration: c.duration,
                })),
              });

              if (clips.length > 0) {
                console.log(
                  "[Recorder] ✅ Found clips to upload:",
                  clips.length,
                );
                const { isAuthenticated, accessToken } =
                  await getSupabaseAuthState();
                console.log("[Recorder] 🔐 認証状態:", {
                  isAuthenticated,
                  hasToken: !!accessToken,
                });

                if (isAuthenticated && accessToken) {
                  const uploadedS3Key = result.key;
                  const lastSlashIndex = uploadedS3Key.lastIndexOf("/");
                  const recordingDir =
                    lastSlashIndex > 0
                      ? uploadedS3Key.slice(0, lastSlashIndex)
                      : "recordings";
                  const recordingId =
                    recordingDir.split("/").pop() || "unknown";

                  const clipsData = {
                    recordingId,
                    sourceVideoKey: uploadedS3Key,
                    clips,
                  };

                  const clipsBlob = new Blob([JSON.stringify(clipsData)], {
                    type: "application/json",
                  });
                  const apiBaseUrl = getWebAppUrl();

                  await uploadSingleFile(
                    clipsBlob,
                    "clips.json",
                    "application/json",
                    recordingDir,
                    apiBaseUrl,
                    accessToken,
                  );
                  console.log("✅ clips.json uploaded successfully");
                } else {
                  console.warn("⚠️ Cannot upload clips.json: Not authenticated");
                  console.warn(
                    "⚠️ Supabase認証が失敗しました。Web Applicationにログインしてください。",
                  );
                }
              } else {
                console.warn(
                  "[Recorder] Chrome Storageにclipsが保存されていません",
                );
              }
            } catch (clipError) {
              console.error("❌ Failed to upload clips.json:", clipError);
            }
          } else {
            console.warn(
              "[Recorder] ⚠️ 録画ファイルのS3キーが取得できませんでした",
            );
            console.warn(
              "[Recorder] InstantUpload（リアルタイムアップロード）が失敗している可能性があります",
            );
          }

          // アップロード完了状態を Chrome Storage に保存
          await chrome.storage.local.set({
            instantUploadStatus: "completed",
            instantUploadCompleteTime: Date.now(),
          });
        } catch (err) {
          console.error("❌ Failed to finalize upload from onstop:", err);

          // ユーザーにToast通知を表示
          chrome.runtime.sendMessage({
            type: "show-toast",
            title: "動画のアップロードに失敗しました",
            message: `録画は完了しましたが、サーバーへのアップロードに失敗しました。ネットワーク接続を確認してください。`,
            duration: 10000, // 10秒間表示
          });

          // アップロード失敗状態を Chrome Storage に保存
          await chrome.storage.local.set({
            instantUploadStatus: "error",
            instantUploadError:
              err instanceof Error ? err.message : String(err),
          });
        }
      }

      if (!sentLast.current) {
        sentLast.current = true;
        isFinishing.current = false;
        chrome.runtime.sendMessage({ type: "video-ready" });
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
        console.log(
          `[InstantUpload] Chunk sent: ${(e.data.size / 1024 / 1024).toFixed(2)}MB, Total: ${(totalRecordedBytes.current / 1024 / 1024).toFixed(2)}MB`,
        );
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
  }, [
    initializeUpload,
    finalizeUpload,
    drainQueue,
    waitForDrain,
    uploaderRef.current,
  ]);

  const stopRecording = useCallback(async (): Promise<void> => {
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
      liveStream.current.getTracks().forEach((t) => {
        t.stop();
      });
      liveStream.current = null;
    }

    if (helperVideoStream.current) {
      helperVideoStream.current.getTracks().forEach((t) => {
        t.stop();
      });
      helperVideoStream.current = null;
    }

    if (helperAudioStream.current) {
      helperAudioStream.current.getTracks().forEach((t) => {
        t.stop();
      });
      helperAudioStream.current = null;
    }
  }, []);

  const dismissRecording = useCallback(async (): Promise<void> => {
    isRestarting.current = true;
    if (recorder.current !== null) {
      recorder.current.stop();
      recorder.current = null;
    }
    window.close();
  }, []);

  const restartRecording = useCallback(async (): Promise<void> => {
    isRestarting.current = true;
    if (recorder.current !== null) {
      recorder.current.stop();
    }
    recorder.current = null;
    chrome.runtime.sendMessage({ type: "reset-active-tab-restart" });
  }, []);

  const startAudioStream = useCallback(
    async (id: string): Promise<MediaStream | null> => {
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
        .catch(async () => {
          // Try again without the device ID
          const audioStreamOptions: MediaStreamConstraints = {
            audio: true,
          };

          try {
            const stream =
              await navigator.mediaDevices.getUserMedia(audioStreamOptions);
            return stream;
          } catch {
            return null;
          }
        });

      return result;
    },
    [],
  );

  // Set audio input volume
  const setAudioInputVolume = useCallback((volume: number): void => {
    if (audioInputGain.current) {
      audioInputGain.current.gain.value = volume;
    }
  }, []);

  // Set audio output volume
  const setAudioOutputVolume = useCallback((volume: number): void => {
    if (audioOutputGain.current) {
      audioOutputGain.current.gain.value = volume;
    }
  }, []);

  const setMic = useCallback(
    async (result: { active: boolean }): Promise<void> => {
      if (helperAudioStream.current != null) {
        if (result.active) {
          setAudioInputVolume(1);
        } else {
          setAudioInputVolume(0);
        }
      } else {
        // No microphone available
      }
    },
    [setAudioInputVolume],
  );

  const startStream = useCallback(
    async (data: StreamingData, id: string | null): Promise<void> => {
      // Get quality value
      const { qualityValue } = await chrome.storage.local.get(["qualityValue"]);

      const { width, height } = getResolutionForQuality(qualityValue as string);

      const { fpsValue } = await chrome.storage.local.get(["fpsValue"]);
      let fps = parseInt(fpsValue as string, 10);

      // Check if fps is a number
      if (Number.isNaN(fps)) {
        fps = 30;
      }

      // Save the helper streams
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
        stream = await navigator.mediaDevices.getUserMedia(
          constraints as MediaStreamConstraints,
        );

        // Check if the stream actually has data in it
        if (stream.getVideoTracks().length === 0) {
          sendRecordingError("No video tracks available");
          return;
        }
      } catch (err) {
        sendRecordingError(`Failed to get user media: ${JSON.stringify(err)}`);
        return;
      }

      if (isTab.current) {
        // Continue to play the captured audio to the user.
        const output = new AudioContext();
        const source = output.createMediaStreamSource(stream);
        source.connect(output.destination);
      }

      helperVideoStream.current = stream;

      // Get actual recording resolution from video track settings
      const videoTrack = stream.getVideoTracks()[0];
      const settings = videoTrack.getSettings();
      const actualWidth = settings.width || width;
      const actualHeight = settings.height || height;

      // Save recording metadata to Chrome Storage for clip coordinate scaling
      chrome.storage.local.set({
        recordingVideoWidth: actualWidth,
        recordingVideoHeight: actualHeight,
        recordingTabWidth: window.innerWidth,
        recordingTabHeight: window.innerHeight,
        recordingDevicePixelRatio: window.devicePixelRatio || 1,
      });

      console.log("[Recording] Video settings saved:", {
        actualWidth,
        actualHeight,
        tabWidth: window.innerWidth,
        tabHeight: window.innerHeight,
        devicePixelRatio: window.devicePixelRatio || 1,
      });

      const surface = settings.displaySurface;
      chrome.runtime.sendMessage({ type: "set-surface", surface: surface });

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
          helperAudioStream.current,
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
      if (
        helperVideoStream.current &&
        helperVideoStream.current.getAudioTracks().length > 0
      ) {
        audioOutputGain.current = aCtx.current.createGain();
        audioOutputSource.current = aCtx.current.createMediaStreamSource(
          helperVideoStream.current,
        );
        audioOutputSource.current
          .connect(audioOutputGain.current)
          .connect(destination.current);
      } else {
        // No system audio available
      }

      // Add the tracks to the stream
      if (helperVideoStream.current) {
        liveStream.current.addTrack(
          helperVideoStream.current.getVideoTracks()[0],
        );
        if (
          (helperAudioStream.current != null &&
            helperAudioStream.current.getAudioTracks().length > 0) ||
          helperVideoStream.current.getAudioTracks().length > 0
        ) {
          liveStream.current.addTrack(
            destination.current.stream.getAudioTracks()[0],
          );
        }
      }

      // Send message to go back to the previously active tab
      setStarted(true);

      chrome.runtime.sendMessage({ type: "reset-active-tab" });
    },
    [startAudioStream, setAudioInputVolume],
  );

  const startStreaming = useCallback(
    async (data: StreamingData): Promise<void> => {
      try {
        if (!isTab.current) {
          let captureTypes = [
            "screen",
            "window",
            "tab",
            "audio",
          ] as chrome.desktopCapture.DesktopCaptureSourceType[];
          if (tabPreferred.current) {
            captureTypes = [
              "tab",
              "screen",
              "window",
              "audio",
            ] as chrome.desktopCapture.DesktopCaptureSourceType[];
          }
          chrome.desktopCapture.chooseDesktopMedia(
            captureTypes,
            null,
            (streamId: string) => {
              if (
                streamId === undefined ||
                streamId === null ||
                streamId === ""
              ) {
                sendRecordingError("User cancelled the modal", true);
                return;
              } else {
                startStream(data, streamId);
              }
            },
          );
        } else {
          startStream(data, tabID.current);
        }
      } catch (err) {
        sendRecordingError(
          `Failed to start streaming: ${JSON.stringify(err)}`,
          true,
        );
      }
    },
    [startStream],
  );

  // Check if trying to record from Playground
  useEffect(() => {
    chrome.storage.local.get(["tabPreferred"], (result) => {
      tabPreferred.current = result.tabPreferred as boolean;
    });
  }, []);

  const getStreamID = useCallback(async (id: number): Promise<void> => {
    const streamId = await chrome.tabCapture.getMediaStreamId({
      targetTabId: id,
    });
    tabID.current = streamId;
  }, []);

  const onMessage = useCallback(
    (
      request: RecorderMessage,
      _sender: chrome.runtime.MessageSender,
      _sendResponse: (response?: unknown) => void,
    ): void => {
      if (request.type === "loaded") {
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
    [
      getStreamID,
      startStreaming,
      startRecording,
      restartRecording,
      stopRecording,
      setMic,
      setAudioOutputVolume,
      dismissRecording,
    ],
  );

  useEffect(() => {
    // Event listener (extension messaging)
    chrome.runtime.onMessage.addListener(onMessage);

    return () => {
      chrome.runtime.onMessage.removeListener(onMessage);
    };
  }, [onMessage]);

  // beforeunload handler for recorder tab close protection (E8)
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      // 録画中かつ終了処理中でない場合のみ実行
      if (recorder.current && !isFinishing.current) {
        // 1. ブラウザの確認ダイアログを表示
        e.preventDefault();
        e.returnValue = ""; // Chrome の警告文言

        console.warn("[Recorder] Tab is being closed during recording");

        try {
          // 2. MediaRecorder の停止（同期的に実行可能）
          if (recorder.current) {
            recorder.current.requestData(); // 最後のチャンクを取得
            recorder.current.stop();
          }

          // 3. 全メディアストリームの停止
          liveStream.current?.getTracks().forEach((t) => {
            t.stop();
          });
          helperVideoStream.current?.getTracks().forEach((t) => {
            t.stop();
          });
          helperAudioStream.current?.getTracks().forEach((t) => {
            t.stop();
          });

          // 4. InstantUpload の abort（ベストエフォート）
          if (uploaderRef.current) {
            const apiBaseUrl = getWebAppUrl();
            const uploadData = {
              uploadId: uploaderRef.current.uploadId,
              key: uploaderRef.current.key,
            };

            // navigator.sendBeacon() を使用（非同期処理が完了しない制約を回避）
            // 注: 認証トークンは送信できないため、Background Service Worker に abort を任せる
            const abortEndpoint = `${apiBaseUrl}/api/s3/multipart/abort`;
            const blob = new Blob([JSON.stringify(uploadData)], {
              type: "application/json",
            });

            // ⚠️ sendBeacon は成功を保証しない（ベストエフォート）
            const sent = navigator.sendBeacon(abortEndpoint, blob);
            console.log(`[Recorder] Beacon abort sent: ${sent}`);

            // Background Service Worker にも通知（こちらが主要な abort 経路）
            chrome.runtime.sendMessage({
              type: "recorder-tab-closing",
              uploadId: uploadData.uploadId,
              key: uploadData.key,
            });
          }

          // 5. Chrome Storage に状態を保存（同期API）
          chrome.storage.local.set({
            recording: false,
            instantUploadStatus: "aborted",
            abortReason: "tab_closed",
            tabClosedAt: Date.now(),
          });

          console.log("[Recorder] Cleanup completed in beforeunload");
        } catch (error) {
          console.error("[Recorder] beforeunload cleanup failed:", error);
        }
      }
    };

    // beforeunload イベントリスナーを登録
    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [uploaderRef.current]); // ref オブジェクトは不変なので依存配列は空で良い

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

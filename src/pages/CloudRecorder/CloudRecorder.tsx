import React, { useEffect, useState, useRef, useCallback } from "react";
import RecorderUI from "./RecorderUI";
import { sendRecordingError, sendStopRecording } from "./messaging";
import { getResolutionForQuality } from "./recorderConfig";
import BunnyTusUploader from "./bunnyTusUploader";
import localforage from "localforage";
import { createVideoProject } from "./createVideoProject";

localforage.config({
  driver: localforage.INDEXEDDB,
  name: "screenity",
  version: 1,
});

const API_BASE = process.env.SCREENITY_API_BASE_URL;

const chunksStore = localforage.createInstance({ name: "chunks" });

const urlParams = new URLSearchParams(window.location.search);
const IS_INJECTED_IFRAME = urlParams.has("injected");
const IS_IFRAME_CONTEXT =
  IS_INJECTED_IFRAME ||
  (window.top !== window.self &&
    !document.referrer.startsWith("chrome-extension://"));

interface TimerState {
  start: number | null;
  total: number;
  paused: boolean;
  notificationInterval?: NodeJS.Timeout | null;
  warned?: boolean;
}

interface StreamingData {
  recordingType: string;
  defaultAudioInput: string;
  systemAudio?: boolean;
}

interface MediaMeta {
  videoId?: string;
  mediaId?: string;
  status?: string;
  offset?: number;
  error?: string;
  width?: number;
  height?: number;
  sceneId?: string;
  thumbnail?: string;
}

interface AudioMeta {
  mediaId?: string;
  path?: string;
  url?: string;
}

interface UploadMeta {
  screen: MediaMeta | null;
  camera: MediaMeta | null;
  audio: AudioMeta | null;
  sceneId?: string;
}

interface MediaToDelete {
  videoId?: string;
  mediaId: string;
  type: string;
  path?: string;
}

interface Dimensions {
  screen: DimensionDetail;
  camera: CameraDimension | null;
}

interface DimensionDetail {
  width: number;
  height: number;
}

interface CameraDimension extends DimensionDetail {
  flip?: boolean;
}

interface ScenePayload {
  sceneId: string;
  screenMediaId: string | null;
  cameraMediaId: string | null;
  screenVideoId: string | null;
  cameraVideoId: string | null;
  audioMediaId: string | null;
  durations: { screen: number; camera: number };
  captionSource: string;
  transcriptionSourceMediaId: string | null;
  thumbnail: string | null;
  dimensions: Dimensions;
  clickEvents: unknown[];
  surface: string;
  instantMode: boolean;
  newProject: boolean;
  insertAfterSceneId: string | null;
  isTab: boolean;
  domain: string | null;
}

type CloudRecorderMessage =
  | { type: "loaded"; backup: boolean; isTab?: boolean; tabID?: number; region?: boolean }
  | { type: "streaming-data"; data: string }
  | { type: "start-recording-tab"; region?: boolean }
  | { type: "restart-recording-tab" }
  | { type: "stop-recording-tab" }
  | { type: "set-mic-active-tab"; active: boolean }
  | { type: "set-audio-output-volume"; volume: number }
  | { type: "get-video-time" }
  | { type: "pause-recording-tab" }
  | { type: "resume-recording-tab" }
  | { type: "dismiss-recording" };

const CloudRecorder: React.FC = () => {
  const screenTimer = useRef<TimerState>({ start: null, total: 0, paused: false });
  const cameraTimer = useRef<TimerState>({ start: null, total: 0, paused: false });
  const [started, setStarted] = useState<boolean>(false);
  const [initProject, setInitProject] = useState<boolean>(false);

  const isTab = useRef<boolean>(false);
  const tabID = useRef<string | null>(null);
  const tabPreferred = useRef<boolean>(false);

  const screenStream = useRef<MediaStream | null>(null);
  const cameraStream = useRef<MediaStream | null>(null);
  const micStream = useRef<MediaStream | null>(null);
  const rawMicStream = useRef<MediaStream | null>(null);

  const screenRecorder = useRef<MediaRecorder | null>(null);
  const cameraRecorder = useRef<MediaRecorder | null>(null);
  const audioRecorder = useRef<MediaRecorder | null>(null);

  const screenUploader = useRef<BunnyTusUploader | null>(null);
  const cameraUploader = useRef<BunnyTusUploader | null>(null);
  const uploadMetaRef = useRef<UploadMeta | null>(null);

  const backupRef = useRef<boolean>(false);
  const audioInputGain = useRef<GainNode | null>(null);
  const audioOutputGain = useRef<GainNode | null>(null);

  const uploadersInitialized = useRef<boolean>(false);

  const isRestarting = useRef<boolean>(false);
  const isFinishing = useRef<boolean>(false);
  const sentLast = useRef<boolean>(false);
  const lastTimecode = useRef<number>(0);
  const hasChunks = useRef<boolean>(false);
  const index = useRef<number>(0);

  const target = useRef<CropTarget | null>(null);
  const regionRef = useRef<boolean | null>(null);
  const regionWidth = useRef<number>(0);
  const regionHeight = useRef<number>(0);

  const screenChunks = useRef<Blob[]>([]);
  const cameraChunks = useRef<Blob[]>([]);
  const audioChunks = useRef<Blob[]>([]);

  const recordingType = useRef<string>("screen");

  const instantMode = useRef<boolean>(false);

  const consecutiveScreenFailures = useRef<number>(0);
  const consecutiveCameraFailures = useRef<number>(0);

  const isInit = useRef<boolean>(false);

  const aCtx = useRef<AudioContext | null>(null);
  const destination = useRef<MediaStreamAudioDestinationNode | null>(null);

  const keepAliveInterval = useRef<NodeJS.Timeout | null>(null);

  const startKeepAlive = (): void => {
    if (keepAliveInterval.current) clearInterval(keepAliveInterval.current);

    keepAliveInterval.current = setInterval(async () => {
      try {
        const auth = await chrome.runtime.sendMessage({ type: "refresh-auth" });

        if (!auth?.authenticated) {
          console.warn("Auth expired or refresh failed");
          chrome.runtime.sendMessage({ type: "auth-expired" });
        }
      } catch (err) {
        console.error("❌ Failed to check auth via background", err);
      }
    }, 1000 * 60 * 5); // every 5 minutes
  };

  const attachMicToStream = (
    videoStream: MediaStream | null,
    micStream: MediaStream | null
  ): MediaStream | null => {
    if (!videoStream || !micStream) return videoStream;
    return new MediaStream([
      ...videoStream.getVideoTracks(),
      ...micStream.getAudioTracks(),
    ]);
  };

  const checkMaxMemory = (): void => {
    navigator.storage.estimate().then((data) => {
      const minMemory = 26214400;
      if (data.quota && data.quota < minMemory) {
        chrome.storage.local.set({ memoryError: true });
        sendStopRecording();
      }
    });
  };

  const setMic = async (result: { active: boolean }): Promise<void> => {
    if (micStream.current && audioInputGain.current) {
      // Mute merged audio in the main stream
      audioInputGain.current.gain.value = result.active ? 1 : 0;

      // Mute transcription-only mic stream too
      if (rawMicStream.current) {
        rawMicStream.current.getAudioTracks().forEach((track) => {
          track.enabled = result.active;
        });
      }
    }
  };

  const setAudioOutputVolume = (volume: number): void => {
    if (audioOutputGain.current) {
      audioOutputGain.current.gain.value = volume;
    }
  };

  const flushPendingChunks = async (): Promise<void> => {
    if (screenUploader.current) {
      try {
        await screenUploader.current.waitForPendingUploads?.();
      } catch (e) {
        console.warn("Error waiting for screen chunks to finish:", e);
      }
    }
    if (cameraUploader.current) {
      try {
        await cameraUploader.current.waitForPendingUploads?.();
      } catch (e) {
        console.warn("Error waiting for camera chunks to finish:", e);
      }
    }
  };

  const deleteProject = async (
    projectId: string,
    uploadMeta: UploadMeta | null,
    deleteVideo = true
  ): Promise<void> => {
    if (!uploadMeta) return;

    const screenMeta = uploadMeta?.screen;
    const cameraMeta = uploadMeta?.camera;

    const mediaToDelete: MediaToDelete[] = [];

    if (screenMeta?.videoId && screenMeta?.mediaId) {
      mediaToDelete.push({
        videoId: screenMeta.videoId,
        mediaId: screenMeta.mediaId,
        type: "video",
      });
    }

    if (cameraMeta?.videoId && cameraMeta?.mediaId) {
      mediaToDelete.push({
        videoId: cameraMeta.videoId,
        mediaId: cameraMeta.mediaId,
        type: "video",
      });
    }

    if (uploadMeta?.audio?.mediaId && uploadMeta?.audio?.path) {
      mediaToDelete.push({
        mediaId: uploadMeta.audio.mediaId,
        path: uploadMeta.audio.path,
        type: "audio",
      });
    }

    await fetch(`${API_BASE}/videos/${projectId}/delete`, {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        mediaToDelete,
        deleteProject: deleteVideo,
        sceneId: uploadMeta.sceneId,
        purgeAllPendingDeletes: false,
        deferDeleteUntilCommit: false,
        forceDelete: true,
        overrideUsedInCheck: true,
      }),
    });
  };

  const dismissRecording = async (restarting = false): Promise<void> => {
    setInitProject(false);

    const { projectId, multiMode, multiSceneCount, recordingToScene } =
      await chrome.storage.local.get([
        "projectId",
        "multiMode",
        "multiSceneCount",
        "recordingToScene",
      ]);

    if (restarting) {
      await Promise.allSettled([
        screenUploader.current?.abort?.(),
        cameraUploader.current?.abort?.(),
      ]);
      if (!recordingToScene) {
        try {
          const uploadMeta = uploadMetaRef.current;
          const { projectId } = await chrome.storage.local.get(["projectId"]);
          await deleteProject(projectId as string, uploadMeta, false);
        } catch (err) {
          console.warn("❌ Failed to delete media:", err);
        }
      }
      uploadMetaRef.current = null;
      sentLast.current = false;
      screenUploader.current = null;
      cameraUploader.current = null;
      uploadersInitialized.current = false;
      cleanupTimers();
      return;
    }

    cleanupTimers();

    isRestarting.current = true;

    await Promise.allSettled([
      screenUploader.current?.abort?.(),
      cameraUploader.current?.abort?.(),
    ]);

    await stopRecording(false);

    const uploadMeta = uploadMetaRef.current;
    if (!uploadMeta) {
      console.warn("No upload metadata available for cleanup");
      return;
    }

    if (multiMode) {
      if (multiSceneCount === 0) {
        if (!recordingToScene) {
          // Only delete if new project
          if (projectId) {
            try {
              await deleteProject(projectId as string, uploadMeta);
            } catch (err) {
              console.warn("❌ Failed to delete project:", err);
            }
          }
        }
        await chrome.storage.local.remove([
          "multiProjectId",
          "multiSceneCount",
        ]);
        await chrome.storage.local.remove("projectId");
      }

      uploadMetaRef.current = null;

      window.close();
      return;
    }

    // Not multi-mode: original logic
    if (projectId && !recordingToScene) {
      // Only delete if new project
      try {
        await deleteProject(projectId as string, uploadMeta);
      } catch (err) {
        console.warn("❌ Failed to delete project:", err);
      }
    } else if (projectId) {
      // Only delete media, not project
      try {
        await deleteProject(projectId as string, uploadMeta, false);
      } catch (err) {
        console.warn("❌ Failed to delete media:", err);
      }
    }

    if (!multiMode) {
      await chrome.storage.local.remove("projectId");
    }
    uploadMetaRef.current = null;
    isInit.current = false;
    window.close();
  };

  const restartRecording = async (): Promise<void> => {
    isRestarting.current = true;
    await dismissRecording(true);
    uploadersInitialized.current = await initializeUploaders();
    if (!uploadersInitialized.current) {
      sendRecordingError("Failed to re-initialize uploaders on restart.");
      return;
    }
    chrome.runtime.sendMessage({ type: "reset-active-tab-restart" });
  };

  const initializeUploaders = async (): Promise<boolean> => {
    try {
      const { projectId } = await chrome.storage.local.get(["projectId"]);

      const sceneId = crypto.randomUUID();
      chrome.storage.local.set({
        sceneId,
      });

      if (!projectId) {
        throw new Error("Missing projectId");
      }

      if (screenStream.current) {
        screenUploader.current = new BunnyTusUploader();
        const track = screenStream.current.getVideoTracks()[0];
        let width: number, height: number;
        if (regionRef.current && target.current) {
          width = regionWidth.current;
          height = regionHeight.current;
        } else {
          const settings = track.getSettings();
          width = settings.width || 1920;
          height = settings.height || 1080;
        }
        await screenUploader.current.initialize(projectId, {
          title: "Screen Recording",
          type: "screen",
          width,
          height,
          sceneId,
        });
      }

      if (cameraStream.current) {
        cameraUploader.current = new BunnyTusUploader();
        const track = cameraStream.current.getVideoTracks()[0];
        const { width = 1920, height = 1080 } = track.getSettings();
        await cameraUploader.current.initialize(projectId, {
          title: "Camera Recording",
          type: "camera",
          linkedMediaId: screenUploader.current?.getMeta()?.mediaId || null,
          width,
          height,
          sceneId,
        });
      }

      return true;
    } catch (err) {
      console.error("❌ Failed to initialize uploaders:", err);
      sendRecordingError("Failed to initialize uploaders: " + (err instanceof Error ? err.message : String(err)));
      return false;
    }
  };

  const createMediaRecorder = (
    stream: MediaStream,
    options: MediaRecorderOptions,
    onDataAvailable: (blob: Blob) => void
  ): MediaRecorder => {
    try {
      const recorder = new MediaRecorder(stream, options);

      recorder.ondataavailable = (event: BlobEvent) => {
        if (event.data && event.data.size > 0) {
          onDataAvailable(event.data);
        }
      };

      recorder.onerror = (event: Event) => {
        const errorEvent = event as ErrorEvent;
        console.error("MediaRecorder error:", errorEvent.error);
        sendRecordingError("Recording error: " + errorEvent.error?.message);
      };

      return recorder;
    } catch (err) {
      console.error("Failed to create MediaRecorder:", err);
      throw err;
    }
  };

  const startRecording = async (): Promise<void> => {
    setInitProject(false);
    startKeepAlive();

    if (!uploadersInitialized.current) {
      sendRecordingError(
        "Uploaders not initialized. Please restart recording."
      );
      return;
    }

    if (!screenStream.current && !cameraStream.current) {
      sendRecordingError("No streams to record");
      return;
    }

    const { projectId } = await chrome.storage.local.get(["projectId"]);

    if (!projectId) {
      sendRecordingError("No project ID found. Please restart recording.");
      return;
    }

    if (!screenUploader.current && !cameraUploader.current) {
      sendRecordingError("Uploaders not ready. Please restart recording.");
      return;
    }

    await chunksStore.clear();
    lastTimecode.current = 0;
    hasChunks.current = false;
    index.current = 0;

    // Clear blob storage arrays
    screenChunks.current = [];
    cameraChunks.current = [];
    audioChunks.current = [];

    navigator.storage.persist();

    try {
      // Screen recorder setup
      if (screenStream.current) {
        const stream = attachMicToStream(
          screenStream.current,
          micStream.current
        );

        if (!stream) {
          sendRecordingError("Failed to attach mic to screen stream");
          return;
        }

        const screenOptions: MediaRecorderOptions = {
          mimeType: "video/webm;codecs=vp9,opus",
          videoBitsPerSecond: 16000000, // 16 Mbps
          audioBitsPerSecond: 128000, // 128 Kbps
        };

        screenRecorder.current = createMediaRecorder(
          stream,
          screenOptions,
          async (blob: Blob) => {
            checkMaxMemory();

            // Detect empty chunks which indicate recording failure
            if (!blob || blob.size === 0) {
              console.error("❌ MediaRecorder produced empty chunk!");
              consecutiveScreenFailures.current++;
              if (consecutiveScreenFailures.current > 3) {
                sendRecordingError(
                  "Recording failed - no video data being captured. Please try again."
                );
                sendStopRecording();
              }
              return;
            }

            // Store for final blob creation
            screenChunks.current.push(blob);

            const timestamp = Date.now();

            if (!hasChunks.current) {
              hasChunks.current = true;
              lastTimecode.current = timestamp;
            } else if (timestamp < lastTimecode.current) {
              return; // Skip duplicate
            } else {
              lastTimecode.current = timestamp;
            }

            await chunksStore.setItem(`chunk_${index.current}`, {
              index: index.current,
              chunk: blob,
              timestamp,
            });

            if (uploadersInitialized.current && screenUploader.current) {
              try {
                if (screenUploader.current?.isPaused) return;
                await screenUploader.current.write(blob);
                consecutiveScreenFailures.current = 0; // Reset on success
              } catch (uploadErr) {
                console.error("Failed to upload chunk to Bunny:", uploadErr);
                consecutiveScreenFailures.current++;
                if (consecutiveScreenFailures.current > 3) {
                  sendRecordingError(
                    "Screen upload failed repeatedly. Stopping recording."
                  );
                  sendStopRecording();
                }
              }
            }

            if (backupRef.current) {
              chrome.runtime.sendMessage({
                type: "write-file",
                index: index.current,
              });
            }

            index.current++;
          }
        );

        // Start recording with 2-second time slices
        screenRecorder.current.start(2000);

        const videoTrack = screenStream.current.getVideoTracks()[0];
        if (videoTrack) {
          videoTrack.onended = () => {
            chrome.storage.local.set({
              recording: false,
              restarting: false,
            });
            cleanupTimers();
            sendStopRecording();
          };
        }
      }

      // Audio recorder setup (for transcription)
      if (rawMicStream.current) {
        const audioOptions: MediaRecorderOptions = {
          mimeType: "audio/webm", // Using webm instead of wav for better browser support
          audioBitsPerSecond: 128000,
        };

        audioRecorder.current = createMediaRecorder(
          rawMicStream.current,
          audioOptions,
          (blob: Blob) => {
            // Store chunks for final blob creation
            audioChunks.current.push(blob);
          }
        );

        audioRecorder.current.start(2000);
      }

      // Camera recorder setup
      if (cameraStream.current) {
        let streamToRecord = cameraStream.current;

        if (recordingType.current === "camera") {
          if (micStream.current) {
            const attached = attachMicToStream(
              cameraStream.current,
              micStream.current
            );
            if (attached) {
              streamToRecord = attached;
            }
          } else {
            console.warn("⚠️ Camera-only recording: microphone not available");
          }
        }

        const cameraOptions: MediaRecorderOptions = {
          mimeType:
            recordingType.current === "camera"
              ? "video/webm;codecs=vp9,opus"
              : "video/webm;codecs=vp9",
          videoBitsPerSecond: 16000000, // 16 Mbps
          audioBitsPerSecond: 128000, // 128 Kbps
        };

        cameraRecorder.current = createMediaRecorder(
          streamToRecord,
          cameraOptions,
          async (blob: Blob) => {
            // Detect empty chunks
            if (!blob || blob.size === 0) {
              console.warn("⚠️ Camera MediaRecorder produced empty chunk");
              consecutiveCameraFailures.current++;
              return;
            }

            // Store for final blob creation
            cameraChunks.current.push(blob);

            if (uploadersInitialized.current && cameraUploader.current) {
              try {
                if (cameraUploader.current?.isPaused) return;
                await cameraUploader.current.write(blob);
                consecutiveCameraFailures.current = 0; // Reset on success
              } catch (uploadErr) {
                console.error(
                  "Failed to upload camera chunk to Bunny:",
                  uploadErr
                );
                consecutiveCameraFailures.current++;
                if (consecutiveCameraFailures.current > 3) {
                  console.error("Camera upload failing repeatedly");
                  // Don't stop recording, just log - camera is secondary
                }
              }
            }
          }
        );

        cameraRecorder.current.start(2000);
      }

      let warned = false;
      const MAX_DURATION =
        parseFloat(process.env.MAX_RECORDING_DURATION || "") || 60 * 60;
      const WARNING_THRESHOLD =
        parseFloat(process.env.RECORDING_WARNING_THRESHOLD || "") || 60;

      if (screenTimer.current.notificationInterval)
        clearInterval(screenTimer.current.notificationInterval);

      const timerInterval = setInterval(() => {
        // stop if not recording anymore
        if (!screenStream.current && !cameraStream.current) {
          clearInterval(timerInterval);
          cleanupTimers();
          console.warn("Recording stopped, clearing timer");
          return;
        }

        const elapsed = getActiveVideoTime() / 1000;
        const remaining = MAX_DURATION - elapsed;

        if (!warned && remaining <= WARNING_THRESHOLD) {
          warned = true;
          chrome.runtime.sendMessage({
            type: "time-warning",
          });
        }

        if (remaining <= 0) {
          clearInterval(timerInterval);
          chrome.runtime.sendMessage({
            type: "time-stopped",
          });
          sendStopRecording();
        }
      }, 1000);

      // Save to clear later
      screenTimer.current.notificationInterval = timerInterval;
      screenTimer.current.warned = warned;

      chrome.storage.local.set({ recording: true });
      setStarted(true);
    } catch (err) {
      sendRecordingError("Recording failed: " + (err instanceof Error ? err.message : String(err)));
    }

    const now = Date.now();
    if (screenStream.current) {
      screenTimer.current.start = now;
      screenTimer.current.paused = false;
      screenTimer.current.total = 0;
    }
    if (cameraStream.current) {
      cameraTimer.current.start = now;
      cameraTimer.current.paused = false;
      cameraTimer.current.total = 0;
    }
  };

  function cleanupTimers(): void {
    const interval = screenTimer.current.notificationInterval;
    if (interval) clearInterval(interval);
    screenTimer.current.notificationInterval = null;
    screenTimer.current.warned = false;
    screenTimer.current.start = null;
    screenTimer.current.paused = false;
    cameraTimer.current.start = null;
    cameraTimer.current.paused = false;
  }

  async function uploadAudioToBunny(
    audioFile: File,
    projectId: string
  ): Promise<AudioMeta> {
    const formData = new FormData();
    formData.append("file", audioFile);
    formData.append("projectId", projectId);
    formData.append("type", "audio");

    const res = await fetch(`${API_BASE}/bunny/upload`, {
      method: "POST",
      body: formData,
      credentials: "include",
    });

    const result = await res.json();
    if (!res.ok) throw new Error(result?.error || "Audio upload failed");

    return result;
  }

  const stopAllRecorders = async (): Promise<void> => {
    const stopRecorder = async (
      recorderRef: React.MutableRefObject<MediaRecorder | null>
    ): Promise<void> => {
      if (recorderRef.current && recorderRef.current.state !== "inactive") {
        try {
          await Promise.race([
            new Promise<void>((resolve) => {
              if (recorderRef.current) {
                recorderRef.current.onstop = () => resolve();
                recorderRef.current.stop();
              } else {
                resolve();
              }
            }),
            new Promise<void>((_, reject) =>
              setTimeout(() => reject(new Error("Stop timeout")), 5000)
            ),
          ]);
        } catch (err) {
          console.error("Error stopping recorder:", err);
          // Force resolve to prevent hanging
        }
      }
    };

    await Promise.all([
      stopRecorder(screenRecorder),
      stopRecorder(cameraRecorder),
      stopRecorder(audioRecorder),
    ]);

    [screenStream, cameraStream, micStream, rawMicStream].forEach((ref) => {
      ref.current?.getTracks().forEach((track) => track.stop());
    });
  };

  const createBlobFromChunks = (chunks: Blob[], mimeType: string): Blob | null => {
    if (!chunks || chunks.length === 0) return null;
    return new Blob(chunks, { type: mimeType });
  };

  const MIN_DURATION_SECONDS = 1;

  const calculateDurations = (): { screen: number; camera: number } => {
    const now = Date.now();

    const getDuration = (timer: TimerState): number => {
      const elapsed = !timer.paused && timer.start ? now - timer.start : 0;
      const total = (timer.total || 0) + elapsed;
      const duration = total / 1000;

      // If timer ever started but duration is zero, use min duration
      if (timer.start && duration < MIN_DURATION_SECONDS) {
        return MIN_DURATION_SECONDS;
      }

      return duration;
    };

    return {
      screen: getDuration(screenTimer.current),
      camera: getDuration(cameraTimer.current),
    };
  };

  const handleAudioUpload = async (
    audioBlob: Blob | null,
    projectId: string,
    uploadMeta: UploadMeta
  ): Promise<AudioMeta | null> => {
    if (!audioBlob) return null;

    try {
      const audioFile = new File([audioBlob], "audio-recording.webm", {
        type: "audio/webm",
      });
      const result = await uploadAudioToBunny(audioFile, projectId);

      return result;
    } catch (err) {
      console.warn("❌ Audio upload/transcription failed:", err);
      return null;
    }
  };

  const handleTranscription = async (
    uploadMeta: UploadMeta,
    projectId: string
  ): Promise<void> => {
    if (!uploadMeta.audio || !uploadMeta.audio.mediaId) return;
    try {
      const transcriptionTarget =
        uploadMeta.screen?.mediaId || uploadMeta.camera?.mediaId;

      if (transcriptionTarget && uploadMeta.audio?.url) {
        await fetch(`${API_BASE}/transcription/queue`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            input: uploadMeta.audio.url,
            output: `transcriptions/${uploadMeta.audio.mediaId}.json`,
            videoId: projectId,
            sceneId: uploadMeta.sceneId,
            inputMediaId: uploadMeta.audio.mediaId,
            targetMediaId: transcriptionTarget,
            lang: "en",
            model: "tiny",
          }),
        });
      }
    } catch (err) {
      console.warn("❌ Transcription failed:", err);
    }
  };

  const createSceneOrHandleMultiMode = async (
    uploadMeta: UploadMeta,
    durations: { screen: number; camera: number },
    isSilent: boolean
  ): Promise<void> => {
    const {
      projectId,
      clickEvents = [],
      surface,
      multiMode,
      multiSceneCount = 0,
      multiLastSceneId = null,
      activeSceneId = null,
      recordingToScene = false,
      recordedTabDomain = null,
      recordingType = null,
    } = await chrome.storage.local.get([
      "projectId",
      "clickEvents",
      "surface",
      "multiMode",
      "multiSceneCount",
      "multiLastSceneId",
      "activeSceneId",
      "recordingToScene",
      "recordedTabDomain",
      "recordingType",
    ]);

    // Check if cameraFlipped is set in storage, then pass it in payload
    const { cameraFlipped } = await chrome.storage.local.get(["cameraFlipped"]);

    let insertAfterSceneId: string | null = null;
    if (multiMode) {
      insertAfterSceneId = (multiLastSceneId as string | null) || (activeSceneId as string | null);
    } else {
      insertAfterSceneId = activeSceneId as string | null;
    }

    // Validate uploadMeta has required data
    if (!uploadMeta.sceneId) {
      throw new Error("Missing sceneId in uploadMeta");
    }

    if (!uploadMeta.screen?.mediaId && !uploadMeta.camera?.mediaId) {
      throw new Error(
        "No valid media uploaded - both screen and camera mediaId are missing"
      );
    }

    const payload: ScenePayload = {
      sceneId: uploadMeta.sceneId,
      screenMediaId: uploadMeta.screen?.mediaId || null,
      cameraMediaId: uploadMeta.camera?.mediaId || null,
      screenVideoId: uploadMeta.screen?.videoId || null,
      cameraVideoId: uploadMeta.camera?.videoId || null,
      audioMediaId: uploadMeta.audio?.mediaId || null,
      durations,
      captionSource: uploadMeta.screen ? "screen" : "camera",
      transcriptionSourceMediaId: !isSilent
        ? uploadMeta.audio?.mediaId || null
        : null,
      thumbnail: uploadMeta.screen?.thumbnail || null,
      dimensions: {
        screen: {
          width: uploadMeta.screen?.width || 1920,
          height: uploadMeta.screen?.height || 1080,
        },
        camera: uploadMeta.camera
          ? {
            width: uploadMeta.camera?.width || 1920,
            height: uploadMeta.camera?.height || 1080,
            flip: cameraFlipped as boolean,
          }
          : null,
      },
      clickEvents: (clickEvents as unknown[]) || [],
      surface: surface as string,
      instantMode: instantMode.current,
      newProject: !recordingToScene && (!multiMode || multiSceneCount === 0),
      insertAfterSceneId,
      isTab: isTab.current && !regionRef.current,
      domain: (recordedTabDomain as string) || null,
    };

    const res = await fetch(`${API_BASE}/videos/${projectId}/scenes`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(`Failed to create scene: ${errorText}`);
    } else {
      if (multiMode) {
        await chrome.storage.local.set({
          multiSceneCount: (multiSceneCount as number) + 1,
          multiLastSceneId: payload.sceneId,
        });
        chrome.runtime.sendMessage({
          type: "reopen-popup-multi",
        });

        if (recordingToScene) {
          chrome.runtime.sendMessage({
            type: "editor-ready",
            publicUrl: undefined,
            newProject: false,
            multiMode: true,
            sceneId: payload.sceneId,
          });
        }
      } else {
        // Fetch the scene in the editor page
        chrome.runtime.sendMessage({
          type: "editor-ready",
          publicUrl: !recordingToScene
            ? `${process.env.SCREENITY_APP_BASE}/view/${projectId}/`
            : undefined,
          newProject: !recordingToScene,
          multiMode: false,
          instantMode: instantMode.current,
          sceneId: payload.sceneId,
          projectId,
        });
      }
    }

    chrome.storage.local.remove("clickEvents");
  };

  // Check if audio is silent to skip transcription
  const isAudioSilent = async (
    audioBlob: Blob,
    silenceThreshold = 0.01
  ): Promise<boolean> => {
    const arrayBuffer = await audioBlob.arrayBuffer();
    const audioCtx = new OfflineAudioContext(1, 44100 * 40, 44100); // up to 40s
    const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);

    const channelData = audioBuffer.getChannelData(0);
    let total = 0;

    for (let i = 0; i < channelData.length; i++) {
      total += Math.abs(channelData[i]);
    }

    const avg = total / channelData.length;
    return avg < silenceThreshold; // true if basically silent
  };

  const stopRecording = async (shouldFinalize = true): Promise<void> => {
    if (isFinishing.current || sentLast.current) return;

    if (keepAliveInterval.current) {
      clearInterval(keepAliveInterval.current);
      keepAliveInterval.current = null;
    }

    const { projectId, recordingToScene, multiMode } =
      await chrome.storage.local.get([
        "projectId",
        "recordingToScene",
        "multiMode",
      ]);

    if (shouldFinalize) {
      if (recordingToScene) {
        chrome.runtime.sendMessage({
          type: "prepare-editor-existing",
          multiMode: multiMode,
        });
      } else if (!multiMode && !recordingToScene) {
        chrome.runtime.sendMessage({
          type: "prepare-open-editor",
          url: instantMode.current
            ? `${process.env.SCREENITY_APP_BASE}/view/${projectId}?load=true`
            : `${process.env.SCREENITY_APP_BASE}/editor/${projectId}/edit?load=true`,
          publicUrl: `${process.env.SCREENITY_APP_BASE}/view/${projectId}/`,
          instantMode: instantMode.current,
        });
      }
    }
    isFinishing.current = true;
    chrome.storage.local.set({ recording: false });

    await stopAllRecorders();

    const durations = calculateDurations();

    await flushPendingChunks();

    await Promise.allSettled([
      screenUploader.current?.finalize?.(),
      cameraUploader.current?.finalize?.(),
    ]);

    const { sceneId } = await chrome.storage.local.get(["sceneId"]);

    const uploadMeta: UploadMeta = {
      screen: screenUploader.current?.getMeta() || null,
      camera: cameraUploader.current?.getMeta() || null,
      audio: null,
      //sceneId,
      // use sceneId as per the metadata in screenUploader or cameraUploader, whichever exists
      sceneId:
        screenUploader.current?.getMeta()?.sceneId ||
        cameraUploader.current?.getMeta()?.sceneId ||
        sceneId,
    };

    uploadMetaRef.current = uploadMeta;

    cleanupTimers();

    if (!shouldFinalize) return;

    // Validate that at least one media source was successfully uploaded
    const hasValidScreen =
      uploadMeta.screen?.status === "completed" &&
      uploadMeta.screen?.mediaId &&
      uploadMeta.screen?.videoId;
    const hasValidCamera =
      uploadMeta.camera?.status === "completed" &&
      uploadMeta.camera?.mediaId &&
      uploadMeta.camera?.videoId;

    // Warn if upload size seems suspiciously small for recording duration
    const screenDuration = durations.screen || 0;
    const cameraDuration = durations.camera || 0;
    if (hasValidScreen && screenDuration > 5) {
      const screenOffset = uploadMeta.screen?.offset || 0;
      const minExpectedSize = screenDuration * 50000; // ~50KB/sec minimum
      if (screenOffset < minExpectedSize) {
        console.warn(
          `⚠️ Screen upload size (${screenOffset} bytes) seems small for ${screenDuration}s recording. Expected at least ${minExpectedSize} bytes.`
        );
      }
    }

    if (!hasValidScreen && !hasValidCamera) {
      const screenStatus = uploadMeta.screen?.status || "none";
      const cameraStatus = uploadMeta.camera?.status || "none";
      const screenOffset = uploadMeta.screen?.offset || 0;
      const cameraOffset = uploadMeta.camera?.offset || 0;
      const screenError = uploadMeta.screen?.error || "none";
      const cameraError = uploadMeta.camera?.error || "none";
      throw new Error(
        `No media was successfully uploaded. Screen: ${screenStatus} (${screenOffset} bytes, error: ${screenError}), Camera: ${cameraStatus} (${cameraOffset} bytes, error: ${cameraError})`
      );
    }

    // Create final audio blob from chunks
    const audioBlob = createBlobFromChunks(audioChunks.current, "audio/webm");

    const result = await handleAudioUpload(audioBlob, projectId as string, uploadMeta);
    uploadMeta.audio = result;

    chrome.storage.local.set({ uploadMeta });

    isInit.current = false;

    if (!sentLast.current) {
      sentLast.current = true;
      const silent = audioBlob ? await isAudioSilent(audioBlob) : true;
      try {
        await createSceneOrHandleMultiMode(uploadMeta, durations, silent);

        if (!silent && audioBlob) {
          await handleTranscription(uploadMeta, projectId as string);
        }

        chrome.runtime.sendMessage({ type: "video-ready", uploadMeta });

        if (!IS_IFRAME_CONTEXT) {
          window.close();
        } else {
          window.location.reload();
        }
      } catch (err) {
        console.error("❌ Failed to create scene:", err);

        // Provide user-friendly error message based on the error type
        let userMessage = "Failed to save recording: ";
        const errorMessage = err instanceof Error ? err.message : String(err);
        if (
          errorMessage.includes("No data uploaded") ||
          errorMessage.includes("offset is 0")
        ) {
          userMessage +=
            "No video data was uploaded. This may be due to network issues. Please check your connection and try again.";
        } else if (errorMessage.includes("No media was successfully uploaded")) {
          userMessage +=
            "Upload did not complete successfully. Please check your internet connection and try recording again.";
        } else {
          userMessage += errorMessage;
        }

        sendRecordingError(userMessage);

        chrome.storage.local.set({
          failedRecording: {
            uploadMeta,
            durations,
            timestamp: Date.now(),
            error: errorMessage,
          },
        });

        // Still close the window even on error to prevent stuck tabs
        // Give user time to see the error message
        setTimeout(() => {
          if (!IS_IFRAME_CONTEXT) {
            window.close();
          } else {
            window.location.reload();
          }
        }, 3000);
      }
    }
  };

  const startAudioStream = async (id: string): Promise<MediaStream | null> => {
    const audioStreamOptions: MediaStreamConstraints = {
      audio: id ? { deviceId: { exact: id } } : true,
    };

    try {
      const stream = await navigator.mediaDevices.getUserMedia(
        audioStreamOptions
      );
      return stream;
    } catch (err) {
      console.warn(
        "⚠️ Failed to access audio with deviceId, trying fallback:",
        err
      );

      // Fallback without deviceId
      try {
        const fallbackStream = await navigator.mediaDevices.getUserMedia({
          audio: true,
        });
        return fallbackStream;
      } catch (err2) {
        console.error("❌ Failed to access audio stream:", err2);
        sendRecordingError("Failed to access audio stream: " + (err2 instanceof Error ? err2.message : String(err2)));
        return null;
      }
    }
  };

  const startStream = async (
    data: StreamingData,
    id: string | null,
    permissions: PermissionStatus,
    permissions2: PermissionStatus
  ): Promise<void> => {
    // Defaulting quality for now
    //const { qualityValue } = await chrome.storage.local.get(["qualityValue"]);
    const { width = 1920, height = 1080 } = getResolutionForQuality() || {};

    // Defaulting FPS for now
    // const { fpsValue } = await chrome.storage.local.get(["fpsValue"]);
    const fps = parseInt("30");

    const { instantMode: instant } = await chrome.storage.local.get([
      "instantMode",
    ]);
    instantMode.current = (instant as boolean) || false;

    const constraints: MediaStreamConstraints = {
      audio: false,
      video: {
        width: { ideal: width },
        height: { ideal: height },
        frameRate: { ideal: fps },
      },
    };

    recordingType.current = data.recordingType || "screen";

    try {
      const { cameraActive } = await chrome.storage.local.get(["cameraActive"]);
      const shouldUseCamera = cameraActive === true && !instantMode.current;

      if (data.recordingType === "camera") {
        // Camera access has been disabled
        cameraStream.current = null;
      } else if (data.recordingType === "region" && IS_IFRAME_CONTEXT) {
        try {
          const displayConstraints = {
            preferCurrentTab: true,
            video: {
              width: { max: 2560 },
              height: { max: 1440 },
              frameRate: { ideal: 30, max: 60 },
            },
            audio: data.systemAudio,
          };
          const stream = await navigator.mediaDevices.getDisplayMedia(
            displayConstraints as DisplayMediaStreamOptions
          );
          screenStream.current = stream;
          regionRef.current = true;

          if (isTab.current) {
            const ctx = new AudioContext();
            const src = ctx.createMediaStreamSource(screenStream.current);
            src.connect(ctx.destination);
          }

          const videoTrack = screenStream.current.getVideoTracks()[0];
          if (videoTrack) {
            videoTrack.onended = () => {
              chrome.storage.local.set({
                recording: false,
                restarting: false,
              });
              sendStopRecording();
            };
          }
        } catch (err) {
          sendRecordingError("Failed to access region stream: " + (err instanceof Error ? err.message : String(err)));
          return;
        }

        if (shouldUseCamera) {
          // Camera access has been disabled
          cameraStream.current = null;
        }

        try {
          if (target.current) {
            const track = screenStream.current!.getVideoTracks()[0];
            await track.cropTo(target.current);
          } else {
            sendRecordingError(
              "No crop target set for region capture. Please select a region."
            );
            return;
          }
        } catch (err) {
          sendRecordingError("Failed to crop region stream: " + (err instanceof Error ? err.message : String(err)));
          return;
        }
      } else {
        const tabWidth = isTab.current ? window.innerWidth : width;
        const tabHeight = isTab.current ? window.innerHeight : height;

        interface VideoConstraints {
          chromeMediaSource: string;
          chromeMediaSourceId: string | null;
          maxFrameRate: number;
          maxWidth?: number;
          maxHeight?: number;
        }

        const videoConstraints: VideoConstraints = isTab.current
          ? {
            // Tab recording - minimal constraints, let Chrome determine optimal capture
            chromeMediaSource: "tab",
            chromeMediaSourceId: id,
            maxFrameRate: fps,
            // No width/height constraints for tabs - Chrome will capture at the tab's natural size
            maxWidth: tabWidth,
            maxHeight: tabHeight,
          }
          : {
            // Desktop/window recording - use quality settings as max bounds
            chromeMediaSource: "desktop",
            chromeMediaSourceId: id,
            maxWidth: width,
            maxHeight: height,
            maxFrameRate: fps,
          };

        const desktopConstraints = {
          audio: {
            mandatory: {
              chromeMediaSource: isTab.current ? "tab" : "desktop",
              chromeMediaSourceId: id,
            },
          },
          video: {
            mandatory: { ...videoConstraints },
          },
        };

        try {
          screenStream.current = await navigator.mediaDevices.getUserMedia(
            desktopConstraints as MediaStreamConstraints
          );
          const track = screenStream.current.getVideoTracks()[0];
          const {
            width: trackWidth,
            height: trackHeight,
            displaySurface: surface,
          } = track.getSettings(); // Always use displaySurface from track

          const settings = screenStream.current
            .getVideoTracks()[0]
            .getSettings();

          if (surface === "browser") {
            setTimeout(() => {
              chrome.runtime.sendMessage({ type: "preparing-recording" });
            }, 200);
          }

          chrome.runtime.sendMessage(
            { type: "get-monitor-for-window" },
            (response: { monitorId?: string; monitorBounds?: unknown; displays?: unknown; error?: string } | undefined) => {
              if (!response || chrome.runtime.lastError || response.error) {
                console.error(
                  "Failed to get monitor info:",
                  response?.error || chrome.runtime.lastError || "No response"
                );
                return;
              }

              const { monitorId, monitorBounds, displays } = response;

              chrome.storage.local.set({
                surface,
                displays,
                recordedMonitorId: monitorId,
                monitorBounds,
                recordedStreamDimensions: { width: trackWidth, height: trackHeight },
              });
            }
          );

          chrome.runtime.sendMessage({
            type: "set-surface",
            surface: surface,
          });

          if (isTab.current) {
            const ctx = new AudioContext();
            const src = ctx.createMediaStreamSource(screenStream.current);
            src.connect(ctx.destination);
          }

          const videoTrack = screenStream.current.getVideoTracks()[0];
          if (videoTrack) {
            videoTrack.onended = () => {
              chrome.storage.local.set({
                recording: false,
                restarting: false,
              });
              sendStopRecording();
            };
          }
        } catch (err) {
          sendRecordingError("Failed to access screen stream: " + (err instanceof Error ? err.message : String(err)));
          return;
        }

        if (shouldUseCamera) {
          // Camera access has been disabled
          cameraStream.current = null;
        }
      }

      setInitProject(true);

      // Try to get microphone access
      micStream.current = await startAudioStream(data.defaultAudioInput);
      rawMicStream.current = micStream.current;

      // Setup audio context and routing
      aCtx.current = new AudioContext();
      destination.current = aCtx.current.createMediaStreamDestination();

      if (micStream.current?.getAudioTracks().length) {
        audioInputGain.current = aCtx.current.createGain();
        const micSource = aCtx.current.createMediaStreamSource(
          micStream.current
        );
        micSource.connect(audioInputGain.current).connect(destination.current);
        micStream.current = destination.current.stream;

        const { micActive } = await chrome.storage.local.get(["micActive"]);
        if (micActive === false) {
          audioInputGain.current.gain.value = 0;
        }
      }

      if (screenStream.current?.getAudioTracks().length) {
        audioOutputGain.current = aCtx.current.createGain();
        const screenSource = aCtx.current.createMediaStreamSource(
          screenStream.current
        );
        screenSource
          .connect(audioOutputGain.current)
          .connect(destination.current);

        // Set initial system audio volume based on preferences
        const { systemAudioVolume } = await chrome.storage.local.get([
          "systemAudioVolume",
        ]);
        if (systemAudioVolume !== undefined) {
          audioOutputGain.current.gain.value = systemAudioVolume as number;
        }
      }

      try {
        // Try to get projectId from storage - this may have been set externally
        const { projectId, multiMode, multiProjectId, multiSceneCount } =
          await chrome.storage.local.get([
            "projectId",
            "multiMode",
            "multiProjectId",
            "multiSceneCount",
          ]);

        let videoId = projectId || multiProjectId;

        if (videoId) {
          if (multiMode) {
            await chrome.storage.local.set({
              multiSceneCount: multiSceneCount || 0,
            });
          }
        } else {
          const now = new Date();
          const options: Intl.DateTimeFormatOptions = { day: "2-digit", month: "short", year: "numeric" };
          const title = `Untitled video - ${now.toLocaleString(
            "en-GB",
            options
          )}`;

          videoId = await createVideoProject({
            title,
            instantMode: instantMode.current,
          });
          if (!videoId) throw new Error("Failed to create video project");

          if (multiMode) {
            await chrome.storage.local.set({
              multiProjectId: videoId,
              multiSceneCount: 0,
            });
          }
        }

        await chrome.storage.local.set({ projectId: videoId });

        uploadersInitialized.current = await initializeUploaders();
        if (!uploadersInitialized.current) {
          throw new Error("Failed to initialize uploaders");
        }

        setStarted(true);
        setInitProject(false);
        chrome.runtime.sendMessage({ type: "reset-active-tab" });
      } catch (err) {
        sendRecordingError("Failed to initialize uploaders: " + (err instanceof Error ? err.message : String(err)));
      }
    } catch (err) {
      setInitProject(false);
      sendRecordingError("Failed to start stream: " + (err instanceof Error ? err.message : String(err)), true);
    }
  };

  const startStreaming = async (data: StreamingData): Promise<void> => {
    try {
      const permissions = await navigator.permissions.query({ name: "camera" as PermissionName });
      const permissions2 = await navigator.permissions.query({
        name: "microphone" as PermissionName,
      });

      if (data.recordingType === "camera") {
        startStream(data, null, permissions, permissions2);
      } else if (!isTab.current && data.recordingType != "region") {
        chrome.desktopCapture.chooseDesktopMedia(
          ["screen", "window", "tab", "audio"],
          null,
          (streamId: string) => {
            if (!streamId) {
              sendRecordingError("User cancelled stream selection", true);
            } else {
              startStream(data, streamId, permissions, permissions2);
            }
          }
        );
      } else {
        startStream(data, tabID.current, permissions, permissions2);
      }
    } catch (err) {
      sendRecordingError("Failed to setup streaming: " + (err instanceof Error ? err.message : String(err)));
    }
  };

  const getStreamID = async (id: number): Promise<void> => {
    try {
      const streamId = await chrome.tabCapture.getMediaStreamId({
        targetTabId: id,
      });
      tabID.current = streamId;
    } catch (err) {
      sendRecordingError("Failed to get stream ID: " + (err instanceof Error ? err.message : String(err)));
    }
  };

  useEffect(() => {
    if (!IS_IFRAME_CONTEXT) return;

    // Notify parent that the region capture iframe has loaded
    const sendReady = (): void => {
      window.parent.postMessage(
        { type: "screenity-region-capture-loaded" },
        "*"
      );
    };

    sendReady();
  }, []);

  useEffect(() => {
    if (!IS_IFRAME_CONTEXT) return;

    const onMessage = (event: MessageEvent): void => {
      if (event.data.type === "crop-target") {
        target.current = event.data.target;
        regionRef.current = true;
        regionWidth.current = event.data.width;
        regionHeight.current = event.data.height;
      } else if (event.data.type === "restart-recording") {
        restartRecording();
      }
    };
    window.addEventListener("message", (event) => {
      onMessage(event);
    });

    return () => {
      window.removeEventListener("message", onMessage);
    };
  }, []);

  function getActiveVideoTime(): number {
    const now = Date.now();
    // Choose whichever timer is running
    const timer = screenTimer.current.start
      ? screenTimer
      : cameraTimer.current.start
        ? cameraTimer
        : null;
    if (!timer) return 0;

    return timer.current.paused
      ? timer.current.total
      : timer.current.total + (now - timer.current.start!);
  }

  const onMessage = useCallback((
    request: CloudRecorderMessage,
    sender: chrome.runtime.MessageSender,
    sendResponse: (response?: unknown) => void
  ): boolean | void => {
    if (request.type === "loaded") {
      setInitProject(false);
      backupRef.current = request.backup;
      if (IS_IFRAME_CONTEXT) {
        // Only trigger if it's actually a region recording
        if (request.region) {
          isInit.current = true;
          chrome.runtime.sendMessage({ type: "get-streaming-data" });
        }
      } else if (!request.region) {
        if (!tabPreferred.current) {
          isTab.current = request.isTab || false;
          if (request.isTab && request.tabID) getStreamID(request.tabID);
        } else {
          isTab.current = false;
        }
        isInit.current = true;
        chrome.runtime.sendMessage({ type: "get-streaming-data" });
      }
    } else if (request.type === "streaming-data") {
      if (!isInit.current) return;
      if (IS_IFRAME_CONTEXT) {
        if (regionRef.current) {
          startStreaming(JSON.parse(request.data));
        }
      } else if (!regionRef.current) {
        startStreaming(JSON.parse(request.data));
      }
    } else if (request.type === "start-recording-tab") {
      if (!isInit.current) return;

      if (IS_IFRAME_CONTEXT) {
        if (request.region) setTimeout(() => startRecording(), 100);
      } else if (!regionRef.current) {
        setTimeout(() => startRecording(), 100);
      }
    } else if (request.type === "restart-recording-tab") {
      if (!isInit.current) return;
      if (!IS_IFRAME_CONTEXT) {
        restartRecording();
      }
    } else if (request.type === "stop-recording-tab") {
      if (!isInit.current) return;
      stopRecording();
    } else if (request.type === "set-mic-active-tab") {
      if (!isInit.current) return;
      setMic(request);
    } else if (request.type === "set-audio-output-volume") {
      if (!isInit.current) return;
      setAudioOutputVolume(request.volume);
    } else if (request.type === "get-video-time") {
      if (!isInit.current) return;
      const videoTime = getActiveVideoTime() / 1000; // in seconds
      sendResponse({ videoTime });
      return true;
    } else if (request.type === "pause-recording-tab") {
      if (!isInit.current) return;

      // Pause all active recorders
      if (
        screenRecorder.current &&
        screenRecorder.current.state === "recording"
      ) {
        screenRecorder.current.pause();
      }
      if (
        cameraRecorder.current &&
        cameraRecorder.current.state === "recording"
      ) {
        cameraRecorder.current.pause();
      }
      if (
        audioRecorder.current &&
        audioRecorder.current.state === "recording"
      ) {
        audioRecorder.current.pause();
      }

      const now = Date.now();
      if (!screenTimer.current.paused && screenTimer.current.start) {
        screenTimer.current.total += now - screenTimer.current.start;
        screenTimer.current.paused = true;
      }
      if (!cameraTimer.current.paused && cameraTimer.current.start) {
        cameraTimer.current.total += now - cameraTimer.current.start;
        cameraTimer.current.paused = true;
      }
    } else if (request.type === "resume-recording-tab") {
      if (!isInit.current) return;

      // Resume all paused recorders
      if (screenRecorder.current && screenRecorder.current.state === "paused") {
        screenRecorder.current.resume();
      }
      if (cameraRecorder.current && cameraRecorder.current.state === "paused") {
        cameraRecorder.current.resume();
      }
      if (audioRecorder.current && audioRecorder.current.state === "paused") {
        audioRecorder.current.resume();
      }

      const now = Date.now();
      if (screenTimer.current.paused) {
        screenTimer.current.start = now;
        screenTimer.current.paused = false;
      }
      if (cameraTimer.current.paused) {
        cameraTimer.current.start = now;
        cameraTimer.current.paused = false;
      }
    } else if (request.type === "dismiss-recording") {
      if (!isInit.current) return;
      dismissRecording();
    }
  }, []);

  useEffect(() => {
    chrome.storage.local.get(["tabPreferred"], (result) => {
      tabPreferred.current = result.tabPreferred as boolean;
    });

    chrome.runtime.onMessage.addListener(onMessage);
    return () => chrome.runtime.onMessage.removeListener(onMessage);
  }, [onMessage]);

  return (
    <RecorderUI
      started={started}
      isTab={isTab.current}
      initProject={initProject}
    />
  );
};

export default CloudRecorder;

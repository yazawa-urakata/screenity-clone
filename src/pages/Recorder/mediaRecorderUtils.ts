import { MIME_TYPES } from "./recorderConfig";

interface MediaRecorderOptions {
  audioBitsPerSecond: number;
  videoBitsPerSecond: number;
}

export function createMediaRecorder(
  stream: MediaStream,
  { audioBitsPerSecond, videoBitsPerSecond }: MediaRecorderOptions
): MediaRecorder {
  const mimeType = MIME_TYPES.find((type) =>
    MediaRecorder.isTypeSupported(type)
  );

  if (!mimeType) {
    throw new Error("❌ No supported MIME types found");
  }

  return new MediaRecorder(stream, {
    mimeType,
    audioBitsPerSecond,
    videoBitsPerSecond,
  });
}

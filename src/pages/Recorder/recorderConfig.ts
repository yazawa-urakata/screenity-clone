export const MIME_TYPES = [
  "video/webm;codecs=vp9,opus",
  "video/webm;codecs=vp8,opus",
  "video/webm;codecs=h264",
  "video/webm",
  "video/mp4",
  "video/webm;codecs=avc1",
] as const;

export type QualityValue = "4k" | "1080p" | "720p" | "480p" | "360p" | "240p" | "default";

interface Bitrates {
  audioBitsPerSecond: number;
  videoBitsPerSecond: number;
}

export function getBitrates(quality: string): Bitrates {
  const qualityKey = quality as QualityValue;
  switch (qualityKey) {
    case "4k":
      return { audioBitsPerSecond: 256000, videoBitsPerSecond: 35000000 };
    case "1080p":
      return { audioBitsPerSecond: 192000, videoBitsPerSecond: 16000000 };
    case "720p":
      return { audioBitsPerSecond: 128000, videoBitsPerSecond: 8000000 };
    case "480p":
      return { audioBitsPerSecond: 96000, videoBitsPerSecond: 4000000 };
    case "360p":
      return { audioBitsPerSecond: 96000, videoBitsPerSecond: 2000000 };
    case "240p":
      return { audioBitsPerSecond: 64000, videoBitsPerSecond: 1000000 };
    default:
      return { audioBitsPerSecond: 128000, videoBitsPerSecond: 8000000 };
  }
}

interface VideoResolution {
  width: number;
  height: number;
}

export const VIDEO_QUALITIES: Record<QualityValue, VideoResolution> = {
  "4k": { width: 4096, height: 2160 },
  "1080p": { width: 1920, height: 1080 },
  "720p": { width: 1280, height: 720 },
  "480p": { width: 854, height: 480 },
  "360p": { width: 640, height: 360 },
  "240p": { width: 426, height: 240 },
  default: { width: 1920, height: 1080 },
};

export function getResolutionForQuality(qualityValue: string = "default"): VideoResolution {
  return VIDEO_QUALITIES[qualityValue as QualityValue] || VIDEO_QUALITIES.default;
}

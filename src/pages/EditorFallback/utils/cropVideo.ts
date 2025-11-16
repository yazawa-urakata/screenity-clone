interface CropParameters {
  width: number;
  height: number;
  x: number;
  y: number;
}

async function cropVideo(
  ffmpeg: FFmpeg,
  videoBlob: Blob,
  cropParameters: CropParameters
): Promise<Blob> {
  const videoData = new Uint8Array(await videoBlob.arrayBuffer());
  ffmpeg.FS("writeFile", "input.mp4", videoData);

  const ffmpegCommand = [
    "-i",
    "input.mp4",
    "-vf",
    `crop=${cropParameters.width}:${cropParameters.height}:${cropParameters.x}:${cropParameters.y}`,
    "-c:a",
    "copy",
    "-preset",
    "superfast",
    "-threads",
    "0",
    "-r",
    "30",
    "-tune",
    "fastdecode",
    "output-cropped.mp4",
  ];

  await ffmpeg.run(...ffmpegCommand);

  const data = new Uint8Array(ffmpeg.FS("readFile", "output-cropped.mp4"));
  return new Blob([data], { type: "video/mp4" });
}

export default cropVideo;

async function muteVideo(
  ffmpeg: FFmpeg,
  videoBlob: Blob,
  start: number,
  end: number
): Promise<Blob> {
  const videoData = new Uint8Array(await videoBlob.arrayBuffer());
  ffmpeg.FS("writeFile", "input.mp4", videoData);

  await ffmpeg.run(
    "-i",
    "input.mp4",
    "-af",
    `volume=enable='between(t,${start},${end})':volume=0`,
    "-c:v",
    "copy",
    "output-muted.mp4"
  );

  const data = new Uint8Array(ffmpeg.FS("readFile", "output-muted.mp4"));
  return new Blob([data], { type: "video/mp4" });
}

export default muteVideo;

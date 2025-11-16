async function getFrame(
  ffmpeg: FFmpeg,
  videoBlob: Blob,
  time: number
): Promise<Blob> {
  const videoData = new Uint8Array(await videoBlob.arrayBuffer());
  ffmpeg.FS("writeFile", "input.mp4", videoData);

  await ffmpeg.run(
    "-ss",
    time.toString(),
    "-i",
    "input.mp4",
    "-vframes",
    "1",
    "-q:v",
    "2",
    "frame.jpg"
  );

  const data = new Uint8Array(ffmpeg.FS("readFile", "frame.jpg"));
  return new Blob([data], { type: "image/jpeg" });
}

export default getFrame;

async function reencodeVideo(ffmpeg: FFmpeg, videoBlob: Blob): Promise<Blob> {
  const videoData = new Uint8Array(await videoBlob.arrayBuffer());
  ffmpeg.FS("writeFile", "input.mp4", videoData);

  await ffmpeg.run(
    "-i",
    "input.mp4",
    "-preset",
    "superfast",
    "-threads",
    "0",
    "-r",
    "30",
    "-tune",
    "fastdecode",
    "output.mp4"
  );

  const data = new Uint8Array(ffmpeg.FS("readFile", "output.mp4"));
  return new Blob([data], { type: "video/mp4" });
}

export default reencodeVideo;

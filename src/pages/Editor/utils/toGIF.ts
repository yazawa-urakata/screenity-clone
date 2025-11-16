async function toGIF(ffmpeg: FFmpeg, blob: Blob): Promise<Blob> {
  const videoData = new Uint8Array(await blob.arrayBuffer());
  const outputFileName = "output.gif";
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
    outputFileName
  );
  const data = new Uint8Array(ffmpeg.FS("readFile", outputFileName));
  const editedVideoBlob = new Blob([data], {
    type: "image/gif",
  });
  return editedVideoBlob;
}

export default toGIF;

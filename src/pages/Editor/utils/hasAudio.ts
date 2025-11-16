async function hasAudio(ffmpeg: FFmpeg, videoBlob: Blob): Promise<boolean> {
  const videoData = new Uint8Array(await videoBlob.arrayBuffer());
  ffmpeg.FS("writeFile", "input.mp4", videoData);

  try {
    await ffmpeg.run(
      "-i",
      "input.mp4",
      "-c",
      "copy",
      "-map",
      "0:a",
      "audio.mp3"
    );
    return true;
  } catch (e) {
    return false;
  }
}

export default hasAudio;

async function getAudio(ffmpeg: FFmpeg, videoBlob: Blob): Promise<Blob> {
  const videoData = new Uint8Array(await videoBlob.arrayBuffer());
  ffmpeg.FS("writeFile", "input.mp4", videoData);

  await ffmpeg.run("-i", "input.mp4", "-vn", "-acodec", "pcm_s16le", "audio.wav");

  const data = new Uint8Array(ffmpeg.FS("readFile", "audio.wav"));
  return new Blob([data], { type: "audio/wav" });
}

export default getAudio;

async function addAudioToVideo(
  ffmpeg: FFmpeg,
  videoBlob: Blob,
  audioBlob: Blob,
  videoDuration: number,
  audioVolume: number = 1.0,
  replaceAudio: boolean = false
): Promise<Blob> {
  const videoData = new Uint8Array(await videoBlob.arrayBuffer());
  const audioData = new Uint8Array(await audioBlob.arrayBuffer());

  ffmpeg.FS("writeFile", "input-video.mp4", videoData);
  ffmpeg.FS("writeFile", "input-audio.mp3", audioData);

  let ffmpegCommand: string[];

  if (replaceAudio) {
    // Replace audio completely
    ffmpegCommand = [
      "-i",
      "input-video.mp4",
      "-i",
      "input-audio.mp3",
      "-c:v",
      "copy",
      "-map",
      "0:v:0",
      "-map",
      "1:a:0",
      "-shortest",
      "output-with-audio.mp4",
    ];
  } else {
    // Mix audio
    ffmpegCommand = [
      "-i",
      "input-video.mp4",
      "-i",
      "input-audio.mp3",
      "-filter_complex",
      `[0:a]volume=1[a];[1:a]volume=${audioVolume}[b];[a][b]amix=inputs=2:duration=first:dropout_transition=2[v]`,
      "-map",
      "0:v",
      "-map",
      "[v]",
      "-c:v",
      "copy",
      "-c:a",
      "aac",
      "-strict",
      "experimental",
      "-shortest",
      "output-with-audio.mp4",
    ];
  }

  await ffmpeg.run(...ffmpegCommand);

  const data = new Uint8Array(ffmpeg.FS("readFile", "output-with-audio.mp4"));

  // Clean up
  ffmpeg.FS("unlink", "input-video.mp4");
  ffmpeg.FS("unlink", "input-audio.mp3");
  ffmpeg.FS("unlink", "output-with-audio.mp4");

  return new Blob([data], { type: "video/mp4" });
}

export default addAudioToVideo;

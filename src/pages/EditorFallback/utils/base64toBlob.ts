function base64ToUint8Array(base64: string): Uint8Array {
  const dataURLRegex = /^data:.+;base64,/;
  if (dataURLRegex.test(base64)) {
    base64 = base64.replace(dataURLRegex, "");
  }
  const binary_string = window.atob(base64);
  const len = binary_string.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binary_string.charCodeAt(i);
  }
  return bytes;
}

async function base64ToBlob(ffmpeg: FFmpeg, base64: string): Promise<Blob> {
  const input = base64ToUint8Array(base64);
  ffmpeg.FS("writeFile", "input.webm", input);

  await ffmpeg.run(
    "-i",
    "input.webm",
    "-max_muxing_queue_size",
    "512",
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

export default base64ToBlob;

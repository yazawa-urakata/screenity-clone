async function generateThumbstrips(
  videoBlob: Blob,
  ffmpeg: FFmpeg,
  frames: number = 5
): Promise<Blob[]> {
  // Read video data
  const videoData = new Uint8Array(await videoBlob.arrayBuffer());

  // Write video data to the virtual file system
  ffmpeg.FS("writeFile", "input.mp4", videoData);

  const thumbstrips: Blob[] = [];

  const duration = ffmpeg.getInfo("duration") as number;
  const interval = duration / frames;

  for (let i = 0; i < frames; i++) {
    const time = i * interval;
    const outputFileName = `output${i.toString().padStart(3, "0")}.jpg`;

    // Use FFmpeg to extract a frame as a JPEG image
    await ffmpeg.run(
      "-i",
      "input.mp4",
      "-ss",
      time.toString(),
      "-frames:v",
      "1",
      "-q:v",
      "3",
      outputFileName
    );

    // Read the generated thumbnail image
    const thumbnailData = new Uint8Array(ffmpeg.FS("readFile", outputFileName));

    // Create a Blob from the thumbnail data
    const thumbnailBlob = new Blob([thumbnailData], {
      type: "image/jpeg",
    });

    thumbstrips.push(thumbnailBlob);
  }

  return thumbstrips;
}

export default generateThumbstrips;

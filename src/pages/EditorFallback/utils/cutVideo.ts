async function cutVideo(
  ffmpeg: FFmpeg,
  videoBlob: Blob,
  start: number,
  end: number,
  cut: boolean,
  duration: number,
  encode: boolean
): Promise<Blob> {
  const videoData = new Uint8Array(await videoBlob.arrayBuffer());

  // Set the input video file name
  ffmpeg.FS("writeFile", "input.mp4", videoData);

  // Set the output video file name
  const outputFileName = cut ? "output-cut.mp4" : "output-trimmed.mp4";
  let encodeOptions: string[] = [
    "-c:v",
    "copy",
    "-c:a",
    "copy",
    "-reset_timestamps",
    "1",
  ];
  if (encode) {
    encodeOptions = [
      "-preset",
      "superfast",
      "-threads",
      "0",
      "-r",
      "30",
      "-tune",
      "fastdecode",
    ];
  }

  if (cut) {
    if (start > 0 && end < duration) {
      await ffmpeg.run(
        "-ss",
        "0",
        "-i",
        "input.mp4",
        "-to",
        start.toString(),
        ...encodeOptions,
        "part1.mp4"
      );

      // Then, cut the video from the end time to the end
      await ffmpeg.run(
        "-ss",
        end.toString(),
        "-i",
        "input.mp4",
        "-to",
        duration.toString(),
        ...encodeOptions,
        "part2.mp4"
      );

      // Create a text file with the list of input videos
      const inputListContent = "file 'part1.mp4'\nfile 'part2.mp4'";
      const inputListData = new Uint8Array(
        new TextEncoder().encode(inputListContent)
      );
      ffmpeg.FS("writeFile", "input.txt", inputListData);

      // Concatenate the two remaining parts
      await ffmpeg.run(
        "-f",
        "concat",
        "-safe",
        "0",
        "-i",
        "input.txt",
        "-c",
        "copy",
        outputFileName
      );

      // Get the edited video data
      const data = new Uint8Array(ffmpeg.FS("readFile", outputFileName));

      // Create a Blob from the edited video data
      const editedVideoBlob = new Blob([data], { type: "video/mp4" });

      // Return the edited video Blob
      return editedVideoBlob;
    } else if (start === 0 && end < duration) {
      await ffmpeg.run(
        "-ss",
        end.toString(),
        "-i",
        "input.mp4",
        "-to",
        duration.toString(),
        ...encodeOptions,
        outputFileName
      );

      // Get the edited video data
      const data = new Uint8Array(ffmpeg.FS("readFile", outputFileName));

      // Create a Blob from the edited video data
      const editedVideoBlob = new Blob([data], { type: "video/mp4" });

      // Return the edited video Blob
      return editedVideoBlob;
    } else if (start > 0 && end === duration) {
      await ffmpeg.run(
        "-ss",
        "0",
        "-i",
        "input.mp4",
        "-to",
        start.toString(),
        ...encodeOptions,
        outputFileName
      );

      // Get the edited video data
      const data = new Uint8Array(ffmpeg.FS("readFile", outputFileName));

      // Create a Blob from the edited video data
      const editedVideoBlob = new Blob([data], { type: "video/mp4" });

      // Return the edited video Blob
      return editedVideoBlob;
    }
  } else {
    await ffmpeg.run(
      "-ss",
      start.toString(),
      "-i",
      "input.mp4",
      "-t",
      (end - start).toString(),
      ...encodeOptions,
      outputFileName
    );

    // Get the edited video data
    const data = new Uint8Array(ffmpeg.FS("readFile", outputFileName));

    // Create a Blob from the edited video data
    const editedVideoBlob = new Blob([data], { type: "video/mp4" });

    // Return the edited video Blob
    return editedVideoBlob;
  }

  // This should never be reached, but TypeScript requires a return
  throw new Error("Invalid cut parameters");
}

export default cutVideo;

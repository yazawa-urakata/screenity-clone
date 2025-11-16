export function sendRecordingError(
  why: string | Error | unknown,
  cancel: boolean = false
): void {
  chrome.runtime.sendMessage({
    type: "recording-error",
    error: !cancel ? "stream-error" : "cancel-modal",
    why: typeof why === "string" ? why : JSON.stringify(why),
  });
}

export function sendStopRecording(reason: string = "generic"): void {
  chrome.runtime.sendMessage({
    type: "stop-recording-tab",
    reason,
  });
}

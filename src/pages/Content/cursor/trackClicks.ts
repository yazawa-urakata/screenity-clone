interface ContentStateRef {
  current?: {
    blurMode?: boolean;
  };
}

export function startClickTracking(
  isRegion: boolean = false,
  regionWidth: number = 0,
  regionHeight: number = 0,
  regionX: number = 0,
  regionY: number = 0,
  contentStateRef: ContentStateRef | null = null
): () => void {
  const handleClick = async (e: MouseEvent): Promise<void> => {
    // Skip if blur mode is active
    if (contentStateRef?.current?.blurMode) return;

    // Ignore clicks inside the toolbar
    if (
      (e.target as HTMLElement).closest(".ToolbarRoot") ||
      (e.target as HTMLElement).closest(".ToolbarRecordingControls") ||
      (e.target as HTMLElement).closest(".ToolbarToggleWrap") ||
      (e.target as HTMLElement).closest(".ToolbarPaused") ||
      (e.target as HTMLElement).closest(".Toast") ||
      (e.target as HTMLElement).closest("#screenity-root-container")
    ) {
      return;
    }

    const canvasWrapper = document.getElementById("canvas-wrapper-screenity");
    if (canvasWrapper && canvasWrapper.contains(e.target as Node)) {
      return;
    }

    const { surface, recordingWindowId, recordingType } =
      await chrome.storage.local.get([
        "surface",
        "recordingWindowId",
        "recordingType",
      ]);

    if (recordingType === "camera") {
      return;
    }

    let clickX = e.clientX;
    let clickY = e.clientY;

    if (isRegion) {
      // Check if click is inside region bounds
      const inRegion =
        clickX >= regionX &&
        clickX <= regionX + regionWidth &&
        clickY >= regionY &&
        clickY <= regionY + regionHeight;

      if (!inRegion) {
        return;
      }

      // Normalize to region-relative coordinates
      clickX = clickX - regionX;
      clickY = clickY - regionY;
    }

    chrome.runtime.sendMessage({
      type: "click-event",
      payload: {
        x: clickX,
        y: clickY,
        relativeToRegion: isRegion,
        surface: surface || "unknown",
        recordingWindowId,
        timestamp: Date.now(),
        region: isRegion,
        isTab: recordingType === "region",
      },
    });
  };

  window.addEventListener("mousedown", handleClick, true);
  return () => window.removeEventListener("mousedown", handleClick, true);
}

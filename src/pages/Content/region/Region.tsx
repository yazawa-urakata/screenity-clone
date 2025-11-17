import React, { useState, useRef, useContext, useEffect } from "react";
import { Rnd } from "react-rnd";
import type { DraggableData, ResizableDelta, Position } from "react-rnd";

// Context
import { contentStateContext } from "../context/ContentState";

interface ContentStateType {
  recordingType: string;
  customRegion: boolean;
  regionWidth: number;
  regionHeight: number;
  regionX: number;
  regionY: number;
  fromRegion: boolean;
  recording: boolean;
  drawingMode: boolean;
  blurMode: boolean;
  cropTarget?: any;
  clipSelecting?: boolean;
  clipRecording?: boolean;
  clipCrop?: { x: number; y: number; width: number; height: number } | null;
}

const ResizableBox: React.FC = () => {
  const regionRef = useRef<Rnd>(null);
  const parentRef = useRef<HTMLDivElement>(null);
  const cropRef = useRef<HTMLDivElement>(null);
  const recordingRef = useRef<boolean>(false);
  const clipSelectingRef = useRef<boolean>(false);
  const [contentState, setContentState] = useContext(contentStateContext);

  useEffect(() => {
    recordingRef.current = contentState.recording;
  }, [contentState.recording]);

  useEffect(() => {
    clipSelectingRef.current = contentState.clipSelecting || false;
  }, [contentState.clipSelecting]);

  // デバッグ用: clipSelecting の変更を監視
  useEffect(() => {
    console.log('[Region Debug] clipSelecting:', contentState.clipSelecting);
    console.log('[Region Debug] recording:', contentState.recording);
    console.log('[Region Debug] clipRecording:', contentState.clipRecording);
    console.log('[Region Debug] drawingMode:', contentState.drawingMode);
    console.log('[Region Debug] blurMode:', contentState.blurMode);

    const shouldEnablePointerEvents = !(
      contentState.clipRecording ||
      (contentState.recording && !contentState.clipSelecting) ||
      contentState.drawingMode ||
      contentState.blurMode
    );
    console.log('[Region Debug] pointerEvents should be:', shouldEnablePointerEvents ? 'auto' : 'none');

    const shouldEnableDragging = !(
      contentState.clipRecording ||
      (contentState.recording && !contentState.clipSelecting) ||
      contentState.drawingMode ||
      contentState.blurMode
    );
    console.log('[Region Debug] disableDragging should be:', !shouldEnableDragging);

    const shouldEnableResizing = (
      !contentState.clipRecording &&
      (!contentState.recording || contentState.clipSelecting) &&
      !contentState.drawingMode &&
      !contentState.blurMode
    );
    console.log('[Region Debug] enableResizing should be:', shouldEnableResizing);
  }, [contentState.clipSelecting, contentState.recording, contentState.clipRecording, contentState.drawingMode, contentState.blurMode]);

  // Check for contentState.regionDimensions to update the Rnd component width and height
  useEffect(() => {
    // clipSelecting または clipRecording の場合も Region を表示
    if (
      contentState.recordingType != "region" &&
      !contentState.clipSelecting &&
      !contentState.clipRecording
    ) return;

    if (
      !contentState.customRegion &&
      !contentState.clipSelecting &&
      !contentState.clipRecording
    ) return;

    if (regionRef.current === null) return;
    if (
      contentState.regionWidth === 0 ||
      contentState.regionWidth === undefined
    )
      return;
    if (
      contentState.regionHeight === 0 ||
      contentState.regionHeight === undefined
    )
      return;
    if (contentState.regionX === undefined) return;
    if (contentState.regionY === undefined) return;
    if (contentState.fromRegion) return;

    // Get parent element dimensions
    const parentWidth = parentRef.current?.offsetWidth ?? 0;
    const parentHeight = parentRef.current?.offsetHeight ?? 0;

    // Calculate maximum size that fits within parent element
    const maxWidth = parentWidth - contentState.regionX;
    const maxHeight = parentHeight - contentState.regionY;
    const newWidth = Math.min(contentState.regionWidth, maxWidth);
    const newHeight = Math.min(contentState.regionHeight, maxHeight);

    // Update content state with new size
    setContentState((prevContentState: ContentStateType) => ({
      ...prevContentState,
      regionWidth: newWidth,
      regionHeight: newHeight,
      fromRegion: true,
    }));

    chrome.storage.local.set({
      regionWidth: newWidth,
      regionHeight: newHeight,
    });

    regionRef.current.updateSize({
      width: newWidth,
      height: newHeight,
    });
    regionRef.current.updatePosition({
      x: contentState.regionX,
      y: contentState.regionY,
    });
    setCropTarget();
  }, [
    contentState.recordingType,
    contentState.customRegion,
    contentState.clipSelecting,
    contentState.clipRecording,
    contentState.regionWidth,
    contentState.regionHeight,
    contentState.regionX,
    contentState.regionY,
  ]);

  const setCropTarget = async (): Promise<void> => {
    if (!cropRef.current) return;
    const target = await (window as any).CropTarget.fromElement(cropRef.current);
    setContentState((prevContentState: ContentStateType) => ({
      ...prevContentState,
      cropTarget: target,
    }));
  };

  const handleResize = (
    e: MouseEvent | TouchEvent,
    direction: string,
    ref: HTMLElement,
    delta: ResizableDelta,
    position: Position
  ): void => {
    // Get numeric values of width and height
    const width = parseInt(ref.style.width, 10);
    const height = parseInt(ref.style.height, 10);

    // Update content state
    setContentState((prevContentState: ContentStateType) => ({
      ...prevContentState,
      regionWidth: width,
      regionHeight: height,
      regionX: position.x,
      regionY: position.y,
      fromRegion: true,
    }));

    chrome.storage.local.set({
      regionWidth: width,
      regionHeight: height,
      regionX: position.x,
      regionY: position.y,
    });
    setCropTarget();
  };

  const handleMove = (e: any, d: DraggableData): void => {
    setContentState((prevContentState: ContentStateType) => ({
      ...prevContentState,
      regionX: d.x,
      regionY: d.y,
      fromRegion: true,
    }));
    chrome.storage.local.set({
      regionX: d.x,
      regionY: d.y,
    });
    setCropTarget();
  };

  useEffect(() => {
    setCropTarget();
  }, []);

  useEffect(() => {
    const parent = parentRef.current;
    if (!parent) return;

    const handleContextMenu = (e: MouseEvent): void => {
      if ((e.target as HTMLElement).className.includes("resize-handle")) {
        e.preventDefault();
      }
    };

    parent.addEventListener("contextmenu", handleContextMenu);
    return () => {
      parent.removeEventListener("contextmenu", handleContextMenu);
    };
  }, []);

  return (
    <div
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        width: "100%",
        height: "100%",
        zIndex: -1,
        pointerEvents:
          contentState.clipRecording ||
          (contentState.recording && !contentState.clipSelecting) ||
          contentState.drawingMode ||
          contentState.blurMode
            ? "none"
            : "auto",
      }}
      className={recordingRef.current && !clipSelectingRef.current ? "region-recording" : ""}
      onClick={(e: React.MouseEvent) => {
        // showExtension false, as long as not clicking on the region
        if (
          (e.target as HTMLElement).className.indexOf("resize-handle") === -1 &&
          (e.target as HTMLElement).className.indexOf("react-draggable") === -1 &&
          (e.target as HTMLElement).className.indexOf("region-rect") === -1
        ) {
          // setContentState((prevContentState) => ({
          //   ...prevContentState,
          //   showExtension: false,
          // }));
        }
      }}
      ref={parentRef}
    >
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
          zIndex: 1,
          pointerEvents:
            contentState.clipRecording ||
            (contentState.recording && !contentState.clipSelecting) ||
            contentState.drawingMode ||
            contentState.blurMode
              ? "none"
              : "auto",
        }}
      >
        <div className="box-hole" />
      </div>
      <Rnd
        ref={regionRef}
        style={{
          position: "relative",
          zIndex: 2,
          pointerEvents:
            contentState.clipRecording ||
            (contentState.recording && !contentState.clipSelecting) ||
            contentState.drawingMode ||
            contentState.blurMode
              ? "none"
              : "auto",
        }}
        default={{
          x: contentState.regionX,
          y: contentState.regionY,
          width: contentState.regionWidth,
          height: contentState.regionHeight,
        }}
        minWidth={50}
        minHeight={50}
        resizeHandleWrapperClass="resize-handle-wrapper"
        resizeHandleComponent={{
          topLeft: <div className="resize-handle top-left" />,
          top: <div className="resize-handle top" />,
          topRight: <div className="resize-handle top-right" />,
          right: <div className="resize-handle right" />,
          bottomRight: <div className="resize-handle bottom-right" />,
          bottom: <div className="resize-handle bottom" />,
          bottomLeft: <div className="resize-handle bottom-left" />,
          left: <div className="resize-handle left" />,
        }}
        bounds="parent"
        onResizeStop={handleResize}
        onDragStop={handleMove}
        disableDragging={
          contentState.clipRecording ||
          (contentState.recording && !contentState.clipSelecting) ||
          contentState.drawingMode ||
          contentState.blurMode
        } // Disable dragging when recording (except during clip selection)
        enableResizing={
          !contentState.clipRecording &&
          (!contentState.recording || contentState.clipSelecting) &&
          !contentState.drawingMode &&
          !contentState.blurMode
        } // Enable resizing during clip selection or when not recording
      >
        <div
          ref={cropRef}
          className="region-rect"
          style={{
            width: "100%",
            height: "100%",
            outline: recordingRef.current ? "none" : "2px dashed #D9D9D9",
            outlineOffset: "2px", // Pushes it inside the box to avoid it being visible in recordings
            boxShadow: "0 0 0 9999px rgba(0, 0, 0, 0.2)",
            borderRadius: "5px",
            zIndex: 2,
            boxSizing: "border-box",
            pointerEvents:
              contentState.clipRecording ||
              (contentState.recording && !contentState.clipSelecting) ||
              contentState.drawingMode ||
              contentState.blurMode
                ? "none"
                : "auto",
          }}
        />
      </Rnd>
    </div>
  );
};

export default ResizableBox;

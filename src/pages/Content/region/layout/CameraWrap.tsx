import React, { useEffect, useContext, useRef, useState } from "react";

import { Rnd } from "react-rnd";
import type { Props as RndProps, DraggableData } from "react-rnd";

// Context
import { contentStateContext } from "../../context/ContentState";

import CameraToolbar from "./CameraToolbar";
import ResizeHandle from "../components/ResizeHandle";

interface CameraWrapProps {
  shadowRef: React.RefObject<HTMLDivElement & { shadowRoot: ShadowRoot }>;
}

interface ContentStateType {
  cameraDimensions: {
    size: number;
    x: number;
    y: number;
  };
  cameraFlipped: boolean;
}

const CameraWrap: React.FC<CameraWrapProps> = (props) => {
  const [contentState, setContentState] = useContext(contentStateContext);
  const cameraRef = useRef<Rnd>(null);
  const [cx, setCx] = useState<number>(200);
  const [cy, setCy] = useState<number>(200);
  const [w, setW] = useState<number>(200);
  const [h, setH] = useState<number>(200);

  const updateUIPosition = (): void => {
    const ref =
      props.shadowRef.current?.shadowRoot.querySelector(".camera-draggable");
    const circleCenterX =
      (ref?.getBoundingClientRect().left ?? 0) + (ref?.getBoundingClientRect().width ?? 0) / 2;
    const circleCenterY =
      (ref?.getBoundingClientRect().top ?? 0) + (ref?.getBoundingClientRect().height ?? 0) / 2;
    const circleRadius = (ref?.getBoundingClientRect().width ?? 0) / 2;
    const squareBottomRightX =
      (ref?.getBoundingClientRect().left ?? 0) + (ref?.getBoundingClientRect().width ?? 0);
    const squareBottomRightY =
      (ref?.getBoundingClientRect().top ?? 0) + (ref?.getBoundingClientRect().height ?? 0);
    const handle =
      props.shadowRef.current?.shadowRoot.querySelector(".camera-resize");
    const toolbar =
      props.shadowRef.current?.shadowRoot.querySelector(".camera-toolbar");

    // Calculate 'r' using the formula we derived earlier
    const c = Math.sqrt(
      Math.pow(circleCenterX - squareBottomRightX, 2) +
        Math.pow(circleCenterY - squareBottomRightY, 2)
    );
    const a = circleRadius / Math.sqrt(2);
    const r = (c + Math.sqrt(c ** 2 + 16 * a ** 2)) / 4;

    // Calculate the handle position
    const x = r - r / Math.sqrt(2);
    const y = r - r / Math.sqrt(2);

    // Position the handle element to the calculated coordinates
    if (handle instanceof HTMLElement) {
      handle.style.bottom = `${y - handle.getBoundingClientRect().width / 2}px`;
      handle.style.right = `${x - handle.getBoundingClientRect().height / 2}px`;
    }
    if (toolbar instanceof HTMLElement) {
      toolbar.style.top = `${y - toolbar.getBoundingClientRect().width / 2}px`;
      toolbar.style.left = `${x - toolbar.getBoundingClientRect().height / 2}px`;
    }
  };

  const saveDimensions = (): void => {
    const ref =
      props.shadowRef.current?.shadowRoot.querySelector(".camera-draggable");

    if (!ref) return;

    setContentState((prevContentState: ContentStateType) => ({
      ...prevContentState,
      cameraDimensions: {
        size: ref.getBoundingClientRect().width,
        x: ref.getBoundingClientRect().x,
        y: ref.getBoundingClientRect().y,
      },
    }));
    chrome.storage.local.set({
      cameraDimensions: {
        size: ref.getBoundingClientRect().width,
        x: ref.getBoundingClientRect().x,
        y: ref.getBoundingClientRect().y,
      },
    });
  };

  useEffect(() => {
    if (!cameraRef.current) return;
    if (!props.shadowRef.current?.shadowRoot.querySelector(".camera-resize"))
      return;
    if (!props.shadowRef.current?.shadowRoot.querySelector(".camera-toolbar"))
      return;

    updateUIPosition();
  }, [cameraRef.current]);

  return (
    <div>
      <Rnd
        default={{
          x: contentState.cameraDimensions.x,
          y: contentState.cameraDimensions.y,
          width: contentState.cameraDimensions.size,
          height: contentState.cameraDimensions.size,
        }}
        ref={cameraRef}
        className="camera-draggable"
        dragHandleClassName="camera-grab"
        resizeHandleComponent={{
          bottomRight: <ResizeHandle />,
        }}
        minHeight={150}
        minWidth={150}
        enableResizing={{
          bottom: false,
          bottomRight: true,
          bottomLeft: false,
          left: false,
          right: false,
          top: false,
          topRight: false,
          topLeft: false,
        }}
        onResize={() => {
          updateUIPosition();
        }}
        onResizeStop={() => {
          saveDimensions();
        }}
        onDragStop={() => {
          saveDimensions();
        }}
        lockAspectRatio={1}
        bounds={"window"}
      >
        <div className="camera-grab"></div>
        <CameraToolbar />
        <iframe
          style={{
            width: "100%",
            height: "100%",
            borderRadius: "50%",
            outline: "none",
            border: "none",
            pointerEvents: "none",
          }}
          className={contentState.cameraFlipped ? "camera-flipped" : ""}
          src={chrome.runtime.getURL("camera.html")}
          allow="camera; microphone"
        ></iframe>
      </Rnd>
    </div>
  );
};

export default CameraWrap;

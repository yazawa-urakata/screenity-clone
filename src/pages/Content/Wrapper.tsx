import React, { useContext, useRef, useEffect, CSSProperties } from "react";

import PopupContainer from "./popup/PopupContainer";
import Toolbar from "./toolbar/Toolbar";
import Countdown from "./countdown/Countdown";
import Modal from "./modal/Modal";
import Warning from "./warning/Warning";

import Region from "./region/Region";

// Using ShadowDOM
import root from "react-shadow";

// Import styles raw to add into the ShadowDOM
import styles from "!raw-loader!./styles/app.css";

import ZoomContainer from "./utils/ZoomContainer";
import BlurTool from "./utils/BlurTool";
import CursorModes from "./utils/CursorModes";

import { contentStateContext, ContentStateType } from "./context/ContentState";

import { startClickTracking } from "./cursor/trackClicks";

/*
 * RecordingLoader コンポーネントを削除
 * 理由：
 * - Sandbox.tsx で contentState.ready の条件を削除し、即座に結果画面を表示するようになった
 * - "Preparing recording..." のローディング画面は不要
 * - preparingRecording 状態は既存のメッセージングフローで使用されているため維持
 */

const Wrapper: React.FC = () => {
  const contextValue = useContext(contentStateContext);
  if (!contextValue) return null;
  const [contentState, setContentState] = contextValue;

  const shadowRef = useRef<HTMLDivElement | null>(null);
  const parentRef = useRef<HTMLDivElement | null>(null);
  const permissionsRef = useRef<HTMLIFrameElement | null>(null);
  const regionCaptureRef = useRef<HTMLIFrameElement | null>(null);
  const contentStateRef = useRef<ContentStateType>(contentState);

  useEffect(() => {
    contentStateRef.current = contentState;
  }, [contentState]);

  useEffect(() => {
    if (!parentRef.current) return;

    setContentState((prevContentState) => ({
      ...prevContentState,
      parentRef: parentRef.current!,
    }));
  }, [parentRef.current]);

  useEffect(() => {
    if (!shadowRef.current) return;
    setContentState((prevContentState) => ({
      ...prevContentState,
      shadowRef: shadowRef.current!,
    }));
  }, [shadowRef.current]);

  useEffect(() => {
    if (!regionCaptureRef.current) return;
    setContentState((prevContentState) => ({
      ...prevContentState,
      regionCaptureRef: regionCaptureRef.current!,
    }));
  }, [regionCaptureRef.current]);

  useEffect(() => {
    if (contentState.permissionsChecked) return;
    if (!permissionsRef.current) return;
    if (!contentState.showExtension) return;
    if (!contentState.permissionsLoaded) return;

    permissionsRef.current.contentWindow?.postMessage(
      {
        type: "screenity-get-permissions",
      },
      "*"
    );

    setContentState((prevContentState) => ({
      ...prevContentState,
      permissionsChecked: true,
    }));
  }, [
    permissionsRef.current,
    contentState.showExtension,
    contentState.permissionsLoaded,
  ]);

  useEffect(() => {
    let stopTracking: (() => void) | null = null;

    // Start tracking clicks only when recording starts
    if (contentState.recording) {
      stopTracking = startClickTracking(
        contentState.customRegion,
        contentState.regionWidth,
        contentState.regionHeight,
        contentState.regionX,
        contentState.regionY,
        contentStateRef
      );
    }

    return () => {
      stopTracking?.();
    };
  }, [
    contentState.recording,
    contentState.customRegion,
    contentState.regionWidth,
    contentState.regionHeight,
    contentState.regionX,
    contentState.regionY,
  ]);

  const overlayStyle: CSSProperties = {
    width: "100%",
    height: "100%",
    zIndex: 999999999,
    pointerEvents: "all",
    position: "fixed",
    background:
      window.location.href.indexOf(
        chrome.runtime.getURL("setup.html")
      ) === -1 &&
        window.location.href.indexOf(
          chrome.runtime.getURL("playground.html")
        ) === -1 &&
        !contentState.pendingRecording
        ? "rgba(0,0,0,0.15)"
        : "rgba(0,0,0,0)",
    top: 0,
    left: 0,
  };

  const handleOverlayClick = (): void => {
    if (
      window.location.href.indexOf(
        chrome.runtime.getURL("setup.html")
      ) === -1 &&
      window.location.href.indexOf(
        chrome.runtime.getURL("playground.html")
      ) === -1 &&
      !contentState.pendingRecording &&
      !contentState.customRegion
    ) {
      setContentState((prevContentState) => ({
        ...prevContentState,
        showExtension: false,
        showPopup: false,
      }));
    }
  };

  const rootContainerStyle: CSSProperties = {
    display: "block",
    width: "100%",
    height: "100%",
    position: "absolute",
    pointerEvents: "none", // オーバーレイはクリックを妨げない、UI要素は container で制御
    left: "0px",
    top: "0px",
    zIndex: 9999999999,
  };

  return (
    <div ref={parentRef}>
      {contentState.showExtension && (
        <iframe
          style={{
            display: "none",
            visibility: "hidden",
          }}
          ref={permissionsRef}
          src={chrome.runtime.getURL("permissions.html")}
          allow="camera *; microphone *"
        ></iframe>
      )}
      {contentState.hasOpenedBefore && (
        <iframe
          style={{
            display: "none",
            visibility: "hidden",
          }}
          ref={regionCaptureRef}
          src={chrome.runtime.getURL("region.html")}
          allow="camera *; microphone *; display-capture *"
        ></iframe>
      )}

      {contentState.zoomEnabled && <ZoomContainer />}
      <BlurTool />
      {contentState.showExtension || contentState.recording ? (
        <div>
          {!contentState.recording &&
            !contentState.drawingMode &&
            !contentState.blurMode && (
              <div
                style={overlayStyle}
                onClick={handleOverlayClick}
              ></div>
            )}
          <CursorModes />
          <root.div
            className="root-container"
            id="screenity-root-container"
            style={rootContainerStyle}
            ref={shadowRef}
          >
            <div
              className="container"
              style={{
                pointerEvents: "auto" // UI要素を常に操作可能にする（個々の要素で細かく制御）
              }}
            >
              <Warning />
              {contentState.recordingType === "region" &&
                contentState.customRegion && <Region />}
              {shadowRef.current && <Modal shadowRef={shadowRef} />}
              {/* RecordingLoader を削除: 即座に結果画面を表示するため不要 */}
              <Countdown />
              {!contentState.onboarding &&
                !(
                  contentState.isSubscribed === false &&
                  contentState.isLoggedIn === true
                ) &&
                !(!contentState.isLoggedIn && contentState.wasLoggedIn) && (
                  <Toolbar />
                )}
              {contentState.showPopup && (
                <PopupContainer shadowRef={shadowRef} />
              )}
            </div>
            <style type="text/css">{styles}</style>
          </root.div>
        </div>
      ) : (
        <div></div>
      )}
    </div>
  );
};

export default Wrapper;

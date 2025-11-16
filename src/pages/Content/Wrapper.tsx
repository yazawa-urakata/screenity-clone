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

const RecordingLoader: React.FC = () => {
  const loaderStyle: CSSProperties = {
    position: "fixed",
    inset: 0,
    background: "rgba(0, 0, 0, 0.5)",
    backdropFilter: "blur(20px) saturate(180%)",
    WebkitBackdropFilter: "blur(20px) saturate(180%)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 99999999999,
  };

  const contentStyle: CSSProperties = {
    background: "rgba(255, 255, 255, 0.15)",
    border: "1px solid rgba(255, 255, 255, 0.2)",
    borderRadius: 20,
    padding: 40,
    width: 160,
    height: 160,
    boxShadow: `
      0 8px 32px 0 rgba(0, 0, 0, 0.1),
      0 0 0 1px rgba(255, 255, 255, 0.05),
      inset 0 1px 0 rgba(255, 255, 255, 0.1)
    `,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    fontFamily:
      'Satoshi-Medium, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen, Ubuntu, Cantarell, sans-serif',
    userSelect: "none",
    animation: "fadeIn 0.3s ease-out",
  };

  const spinnerStyle: CSSProperties = {
    width: 60,
    height: 60,
    border: "3px solid rgba(255, 255, 255, 0.2)",
    borderTop: "3px solid rgba(255, 255, 255, 0.8)",
    borderRadius: "50%",
    animation: "spin 1s linear infinite",
  };

  const textStyle: CSSProperties = {
    marginTop: 20,
    fontSize: 15,
    fontWeight: 500,
    color: "rgba(255, 255, 255, 0.9)",
    textAlign: "center",
    letterSpacing: "-0.01em",
    animation: "pulse 2s ease-in-out infinite",
  };

  return (
    <div
      style={loaderStyle}
      aria-label="Loading overlay"
      role="alert"
    >
      <div style={contentStyle}>
        <div style={spinnerStyle} />
        <div style={textStyle}>
          Preparing recording...
        </div>
        <style>
          {`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        @keyframes fadeIn {
          0% { opacity: 0; transform: scale(0.95); }
          100% { opacity: 1; transform: scale(1); }
        }
        @keyframes pulse {
          0%, 100% { opacity: 0.8; }
          50% { opacity: 1; }
        }
      `}
        </style>
      </div>
    </div>
  );
};

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
    pointerEvents: "none",
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
          src={
            contentState.isSubscribed
              ? chrome.runtime.getURL("cloudrecorder.html?injected=true")
              : chrome.runtime.getURL("region.html")
          }
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
            <div className="container">
              <Warning />
              {contentState.recordingType === "region" &&
                contentState.customRegion && <Region />}
              {shadowRef.current && <Modal shadowRef={shadowRef} />}
              {contentState.preparingRecording && <RecordingLoader />}
              <Countdown />
              {!(contentState.hideToolbar && contentState.hideUI) &&
                !contentState.onboarding &&
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

import "./styles/edit/_VideoPlayer.scss";
import "./styles/global/_app.scss";

import React, { useState, useEffect, useRef, useContext } from "react";
// Layout
import Editor from "./layout/editor/Editor";
import Player from "./layout/player/Player";
import Modal from "./components/global/Modal";

// Context
import { ContentStateContext } from "./context/ContentState"; // Import the ContentState context

const Sandbox = () => {
  const [contentState, setContentState] = useContext(ContentStateContext); // Access the ContentState context
  const parentRef = useRef(null);

  const getChromeVersion = () => {
    var raw = navigator.userAgent.match(/Chrom(e|ium)\/([0-9]+)\./);

    return raw ? parseInt(raw[2], 10) : false;
  };

  useEffect(() => {
    const MIN_CHROME_VERSION = 110;
    const chromeVersion = getChromeVersion();

    if (chromeVersion && chromeVersion > MIN_CHROME_VERSION) {
      contentState.loadFFmpeg();
    } else {
      setContentState((prevState) => ({
        ...prevState,
        updateChrome: true,
        ffmpeg: true,
      }));
    }
  }, []);

  useEffect(() => {
    if (!contentState.blob || !contentState.ffmpeg) return;
    if (contentState.frame) return;
    contentState.getFrame();
  }, [contentState.blob, contentState.ffmpeg]);

  // Programmatically add custom scrollbars
  useEffect(() => {
    if (!parentRef) return;
    if (!parentRef.current) return;

    // Check if on mac
    const isMac = navigator.platform.toUpperCase().indexOf("MAC") >= 0;
    if (isMac) return;

    const parentDiv = parentRef.current;

    const elements = parentDiv.querySelectorAll("*");
    elements.forEach((element) => {
      element.classList.add("screenity-scrollbar");
    });

    const observer = new MutationObserver((mutationsList) => {
      for (const mutation of mutationsList) {
        if (mutation.type === "childList") {
          const addedNodes = Array.from(mutation.addedNodes);
          const removedNodes = Array.from(mutation.removedNodes);

          addedNodes.forEach((node) => {
            if (node.nodeType === Node.ELEMENT_NODE) {
              node.classList.add("screenity-scrollbar");
            }
          });

          removedNodes.forEach((node) => {
            if (node.nodeType === Node.ELEMENT_NODE) {
              node.classList.remove("screenity-scrollbar");
            }
          });
        }
      }
    });

    observer.observe(parentDiv, { childList: true, subtree: true });

    return () => {
      observer.disconnect();
    };
  }, [parentRef.current]);

  useEffect(() => {
    // Check if we need to show support banner
    chrome.runtime.sendMessage({ type: "check-banner-support" }, (response) => {
      if (response && response.bannerSupport) {
        setContentState((prev) => ({
          ...prev,
          bannerSupport: true,
        }));
      }
    });
  }, []);

  return (
    <div ref={parentRef}>
      <Modal />
      <video></video>
      {/* Render the WaveformGenerator component and pass the ffmpeg instance as a prop */}
      {contentState.ffmpeg &&
        contentState.ready &&
        contentState.mode === "edit" && <Editor />}
      {/*
        動画再生機能を削除:
        - contentState.ready の条件を削除し、録画完了後すぐに Player を表示
        - Player 内の SimpleResultPanel がタイトルとクリップ一覧を表示
        - RightPanel で S3 アップロード状態が利用可能
      */}
      {contentState.mode != "edit" && <Player />}
      <style>
        {`
/* スクロールバーのカスタムスタイル（Windows用） */
.screenity-scrollbar *::-webkit-scrollbar, .screenity-scrollbar::-webkit-scrollbar {
  background-color: rgba(0,0,0,0);
  width: 16px;
  height: 16px;
  z-index: 999999;
}
.screenity-scrollbar *::-webkit-scrollbar-track, .screenity-scrollbar::-webkit-scrollbar-track {
  background-color: rgba(0,0,0,0);
}
.screenity-scrollbar *::-webkit-scrollbar-thumb, .screenity-scrollbar::-webkit-scrollbar-thumb {
  background-color: rgba(0,0,0,0);
  border-radius:16px;
  border:0px solid #fff;
}
.screenity-scrollbar *::-webkit-scrollbar-button, .screenity-scrollbar::-webkit-scrollbar-button {
  display:none;
}
.screenity-scrollbar *:hover::-webkit-scrollbar-thumb, .screenity-scrollbar:hover::-webkit-scrollbar-thumb {
  background-color: #a0a0a5;
  border:4px solid #fff;
}
::-webkit-scrollbar-thumb *:hover, ::-webkit-scrollbar-thumb:hover {
    background-color:#a0a0a5;
    border:4px solid #f4f4f4
}

					`}
      </style>
    </div>
  );
};

export default Sandbox;

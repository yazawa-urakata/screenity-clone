import React, { useState, useEffect, useContext, useRef } from "react";

import { useHotkeys } from "react-hotkeys-hook";

// Context
import { contentStateContext } from "../context/ContentState";

const Shortcuts = ({ shortcuts }) => {
  const [contentState, setContentState] = useContext(contentStateContext);
  const contentStateRef = useRef(contentState);

  useEffect(() => {
    contentStateRef.current = contentState;
  }, [contentState]);
  /* For the record, this is the shortcuts object:
	shortcuts: {
      "start-recording": "ctrl+shift+1",
      "stop-recording": "ctrl+shift+2",
      "pause-recording": "ctrl+shift+3",
      "resume-recording": "ctrl+shift+4",
      "dismiss-recording": "ctrl+shift+5",
      "restart-recording": "ctrl+shift+6",
      "toggle-drawing-mode": "ctrl+shift+7",
    },
	*/

  // Set up all the hotkeys programmatically from the shortcuts object, without using useEffect

  /*
  useHotkeys(shortcuts["toggle-drawing-mode"], () => {
    setContentState((prevContentState) => ({
      ...prevContentState,
      drawingMode: !prevContentState.drawingMode,
    }));
  });
	*/

  return <></>;
};

export default Shortcuts;

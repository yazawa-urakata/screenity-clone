import React, { useState, useEffect, useContext } from "react";
import EditorNav from "./EditorNav";
import VideoPlayer from "../../components/editor/VideoPlayer";
import { ContentStateContext } from "../../context/ContentState"; // Import the ContentState context

import HelpButton from "../../components/player/HelpButton";

interface EditorProps {
  ffmpeg: any;
}

const Editor: React.FC<EditorProps> = ({ ffmpeg }) => {
  const [contentState, setContentState] = useContext(ContentStateContext); // Access the ContentState context

  const handleSeek = (t: number, updateTime: boolean): void => {
    setContentState((prevContentState: any) => ({
      ...prevContentState,
      updatePlayerTime: updateTime,
      time: t,
    }));
  };

  useEffect(() => {
    setContentState((prevContentState: any) => ({
      ...prevContentState,
      history: [{}],
      redoHistory: [],
    }));
    contentState.addToHistory();
  }, []);

  return (
    <div>
      <EditorNav />
      <VideoPlayer onSeek={handleSeek} />
      <HelpButton />
    </div>
  );
};

export default Editor;

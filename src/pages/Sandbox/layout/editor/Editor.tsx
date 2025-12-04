import type React from "react";
import { useContext, useEffect, useState } from "react";
import VideoPlayer from "../../components/editor/VideoPlayer";
import HelpButton from "../../components/player/HelpButton";
import { ContentStateContext } from "../../context/ContentState"; // Import the ContentState context
import EditorNav from "./EditorNav";

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

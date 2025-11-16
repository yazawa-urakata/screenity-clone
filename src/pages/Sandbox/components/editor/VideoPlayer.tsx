import React, { useContext, useEffect, useState, useRef, useMemo } from "react";
import Plyr from "plyr-react";
import "plyr-react/plyr.css";
import { ContentStateContext } from "../../context/ContentState";
import type { APITypes, PlyrProps, PlyrInstance } from "plyr-react";

interface PlyrSource {
  type: "video" | "audio";
  sources: {
    src: string;
    type: string;
  }[];
}

interface PlyrRef {
  plyr: PlyrInstance;
}

interface VideoPlayerProps {
  onSeek?: (time: number, updateTime: boolean) => void;
}

const VideoPlayer: React.FC<VideoPlayerProps> = (props) => {
  const contextValue = useContext(ContentStateContext);
  if (!contextValue) return null;
  const [contentState, setContentState] = contextValue;

  const playerRef = useRef<PlyrRef | null>(null);
  const [url, setUrl] = useState<string | null>(null);
  const [source, setSource] = useState<PlyrSource | null>(null);
  const [isSet, setIsSet] = useState<boolean>(false);
  const timeupdateCallbackRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (
      playerRef.current &&
      playerRef.current.plyr &&
      contentState.updatePlayerTime
    ) {
      playerRef.current.plyr.currentTime = contentState.time;
    }
  }, [contentState.time]);

  const options = useMemo(
    () => ({
      controls: ["play", "mute", "captions", "settings", "pip", "fullscreen"],
      ratio: "16:9",
      blankVideo:
        "chrome-extension://" +
        chrome.i18n.getMessage("@@extension_id") +
        "/assets/blank.mp4",
      keyboard: {
        global: true,
      },
    }),
    []
  );

  useEffect(() => {
    if (contentState.blob) {
      const objectURL = URL.createObjectURL(contentState.blob);
      setSource({
        type: "video",
        sources: [
          {
            src: objectURL,
            type: "video/mp4",
          },
        ],
      });
      setUrl(objectURL);

      return () => {
        URL.revokeObjectURL(objectURL);
      };
    }
  }, [contentState.blob, playerRef]);

  useEffect(() => {
    if (playerRef.current && playerRef.current.plyr) {
      // Check when the video is playing, update the time in real time
      const callback = () => {
        if (playerRef.current && playerRef.current.plyr) {
          setContentState((prevContentState) => ({
            ...prevContentState,
            time: playerRef.current!.plyr.currentTime,
            updatePlayerTime: false,
          }));
        }
      };
      timeupdateCallbackRef.current = callback;
      playerRef.current.plyr.on("timeupdate", callback);
    }

    return () => {
      if (playerRef.current && playerRef.current.plyr && timeupdateCallbackRef.current) {
        playerRef.current.plyr.off("timeupdate", timeupdateCallbackRef.current);
      }
    };
  }, [playerRef]);

  const handleClick = (): void => {
    if (isSet) return;
    if (playerRef.current && playerRef.current.plyr) {
      setIsSet(true);
      playerRef.current.plyr.on("timeupdate", () => {
        if (playerRef.current && playerRef.current.plyr) {
          setContentState((prevContentState) => ({
            ...prevContentState,
            time: playerRef.current!.plyr.currentTime,
            updatePlayerTime: false,
          }));
        }
      });
    }
  };

  useEffect(() => {
    if (isSet) return;
    const handleKeyPress = (event: KeyboardEvent): void => {
      if (playerRef.current && playerRef.current.plyr) {
        setIsSet(true);
        playerRef.current.plyr.on("timeupdate", () => {
          if (playerRef.current && playerRef.current.plyr) {
            setContentState((prevContentState) => ({
              ...prevContentState,
              time: playerRef.current!.plyr.currentTime,
              updatePlayerTime: false,
            }));
          }
        });
      }
    };
    window.addEventListener("keydown", handleKeyPress);
    return () => {
      window.removeEventListener("keydown", handleKeyPress);
    };
  }, [isSet]);

  return (
    <div className="videoPlayer">
      <div className="playerWrap" onClick={handleClick}>
        {url && (
          <Plyr
            ref={playerRef}
            id="plyr-player"
            source={source}
            options={options}
          />
        )}
      </div>
      <style>
        {`
					.plyr {
						height: 90%!important;
					}
					@media (max-width: 900px) {
						.videoPlayer {
							height: 100%!important;
							top: 40px!important;
						}
						.playerWrap {
							height: calc(100% - 300px)!important;
						}
					`}
      </style>
    </div>
  );
};

export default VideoPlayer;

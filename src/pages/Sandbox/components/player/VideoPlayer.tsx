import React, { useContext, useEffect, useState, useRef, useMemo } from "react";
import Plyr from "plyr-react";
import "../../styles/plyr.css";
import { ContentStateContext } from "../../context/ContentState";

// Components
import Title from "./Title";

interface PlyrSource {
  type: string;
  sources: Array<{
    src: string;
    type: string;
  }>;
}

interface PlyrOptions {
  controls: string[];
  urls: null;
  ratio: string;
  blankVideo: string;
  keyboard: {
    global: boolean;
  };
}

interface PlyrInstance {
  plyr: {
    currentTime: number;
  };
}

interface VideoPlayerProps {}

const VideoPlayer: React.FC<VideoPlayerProps> = (props) => {
  const contextValue = useContext(ContentStateContext);

  if (!contextValue) {
    throw new Error("VideoPlayer must be used within ContentStateContext");
  }

  const [contentState, setContentState] = contextValue;

  const playerRef = useRef<PlyrInstance | null>(null);
  const [url, setUrl] = useState<string | null>(null);
  const [source, setSource] = useState<PlyrSource | null>(null);
  const contentStateRef = useRef(contentState);
  const bannerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    contentStateRef.current = contentState;
  }, [contentState]);

  useEffect(() => {
    if (
      playerRef.current &&
      playerRef.current.plyr &&
      contentState.updatePlayerTime
    ) {
      playerRef.current.plyr.currentTime = contentState.time;
    }
  }, [contentState.time, contentState.updatePlayerTime]);

  const options = useMemo<PlyrOptions>(
    () => ({
      controls: [
        "play",
        "rewind",
        "fast-forward",
        "progress",
        "current-time",
        "duration",
        "mute",
        "captions",
        "settings",
        "pip",
        "fullscreen",
      ],
      urls: null,
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

  /*
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
	*/

  useEffect(() => {
    if (contentState.webm || contentState.blob) {
      let vid: Blob;
      if (contentState.blob) {
        if (bannerRef.current) {
          bannerRef.current.style.display = "none";
          bannerRef.current.remove();
        }
        vid = contentState.blob;
      } else if (contentState.webm) {
        vid = contentState.webm;
      } else {
        return;
      }
      const objectURL = URL.createObjectURL(vid);
      setSource({
        type: "video",
        sources: [
          {
            src: objectURL,
            type: contentState.blob ? "video/mp4" : "video/webm",
          },
        ],
      });
      setUrl(objectURL);

      return () => {
        URL.revokeObjectURL(objectURL);
      };
    }
  }, [
    contentState.webm,
    contentState.blob,
    contentState.hasBeenEdited,
  ]);

  // Use a mutation observer to check if .plyr--video is added to the DOM
  useEffect(() => {
    if (contentStateRef.current.mp4ready || contentStateRef.current.blob)
      return;
    const config: MutationObserverInit = { attributes: true, childList: true, subtree: true };

    const callback = function (mutationsList: MutationRecord[], observer: MutationObserver): void {
      for (let mutation of mutationsList) {
        if (
          document.querySelector(".plyr--video") &&
          !contentStateRef.current.mp4ready &&
          !contentStateRef.current.blob &&
          !bannerRef.current &&
          !contentStateRef.current.noffmpeg &&
          !(
            contentStateRef.current.duration >
              contentStateRef.current.editLimit &&
            !contentStateRef.current.override
          )
        ) {
          bannerRef.current = document.createElement("div");
          bannerRef.current.classList.add("videoBanner");
          bannerRef.current.innerHTML =
            "<img src='" +
            chrome.runtime.getURL("assets/editor/icons/alert-white.svg") +
            "'/> <span>" +
            chrome.i18n.getMessage("processingBannerEditor") +
            "</span>";

          const plyrElement = document.querySelector(".plyr--video");
          if (plyrElement) {
            plyrElement.appendChild(bannerRef.current);
          }
        }
      }
    };

    const observer = new MutationObserver(callback);
    observer.observe(document.body, config);

    return () => {
      observer.disconnect();

      if (bannerRef.current) {
        bannerRef.current.style.display = "none";
        bannerRef.current.remove();
        bannerRef.current = null;
      }
    };
  }, []);

  return (
    <div className="videoPlayer">
      <div className="playerWrap">
        {url && (
          <Plyr
            ref={playerRef as any}
            id="plyr-player"
            source={source as any}
            options={options}
          />
        )}
        {contentState.mode === "player" && <Title />}
      </div>
      <style>
        {`
					@media (max-width: 900px) {
						.videoPlayer {
							position: relative!important;
						}
					}
					`}
      </style>
    </div>
  );
};

export default VideoPlayer;

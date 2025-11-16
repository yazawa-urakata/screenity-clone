import React, { useContext, useState, useEffect, useRef } from "react";

// Styles
import styles from "../../styles/player/_Title.module.scss";
const URL = "/assets/";

// Icon
import { ReactSVG } from "react-svg";

import ShareModal from "./ShareModal";

// Context
import { ContentStateContext } from "../../context/ContentState";

const Title: React.FC = () => {
  const [showShare, setShowShare] = useState<boolean>(false);
  const contextValue = useContext(ContentStateContext);

  if (!contextValue) {
    throw new Error("Title must be used within ContentStateContext");
  }

  const [contentState, setContentState] = contextValue;
  const inputRef = useRef<HTMLInputElement>(null);

  // Show the video title, as a heading by default (multiline), on click show a text input to edit the title
  const [showTitle, setShowTitle] = useState<boolean>(true);
  const [title, setTitle] = useState<string>(contentState.title || "");
  const [displayTitle, setDisplayTitle] = useState<string>(contentState.title || "");

  useEffect(() => {
    const currentTitle = contentState.title || "";
    setTitle(currentTitle);
    if (currentTitle.length > 80) {
      setDisplayTitle(currentTitle.slice(0, 80) + "...");
    } else {
      setDisplayTitle(currentTitle);
    }
  }, [contentState.title]);

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
    setTitle(e.target.value);
  };

  const handleTitleClick = (): void => {
    setShowTitle(false);
  };

  const handleTitleBlur = (): void => {
    setShowTitle(true);
    setContentState((prevState) => ({
      ...prevState,
      title: title,
    }));
  };

  useEffect(() => {
    if (!showTitle && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [showTitle]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent): void => {
      if (e.key === "Enter") {
        setShowTitle(true);
        setContentState((prevState) => ({
          ...prevState,
          title: title,
        }));
      } else if (e.key === "Escape") {
        setShowTitle(true);
        setTitle(contentState.title || "");
      }
    };

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [title, contentState.title, setContentState]);

  return (
    <div className={styles.TitleParent}>
      {showShare && (
        <ShareModal showShare={showShare} setShowShare={setShowShare} />
      )}
      <div className={styles.TitleWrap}>
        {showTitle ? (
          <>
            <h1 onClick={handleTitleClick}>
              {displayTitle}{" "}
              <ReactSVG
                src={URL + "editor/icons/pencil.svg"}
                className={styles.pencil}
                style={{ display: "inline-block" }}
              />
            </h1>
            {/* <div
              className={styles.shareButton}
              onClick={() => {
                chrome.runtime.sendMessage({ type: "handle-login" });
              }}
            >
              <ReactSVG
                src={URL + "editor/icons/link.svg"}
                className={styles.shareIcon}
              />
              {chrome.i18n.getMessage("shareUnlockButton") ||
                "Sign in to share (pro)"}
            </div> */}
          </>
        ) : (
          <input
            type="text"
            value={title}
            onChange={handleTitleChange}
            onBlur={handleTitleBlur}
            ref={inputRef}
          />
        )}
      </div>
    </div>
  );
};

export default Title;

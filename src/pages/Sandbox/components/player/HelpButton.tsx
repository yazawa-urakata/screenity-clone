import React, { useContext, useState, useEffect } from "react";
import styles from "../../styles/player/_HelpButton.module.scss";
import { ReactSVG } from "react-svg";
import { ContentStateContext } from "../../context/ContentState";

const HelpButton: React.FC = () => {
  const contextValue = useContext(ContentStateContext);

  if (!contextValue) {
    throw new Error("HelpButton must be used within ContentStateContext");
  }

  const [contentState] = contextValue;
  const [windowWidth, setWindowWidth] = useState<number>(
    typeof window !== "undefined" ? window.innerWidth : 1000
  );

  useEffect(() => {
    const handleResize = (): void => setWindowWidth(window.innerWidth);
    window.addEventListener("resize", handleResize);

    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const shouldOffset: boolean = contentState.bannerSupport && windowWidth > 900;

  return (
    <button
      className={styles.HelpButton}
      style={shouldOffset ? { bottom: "110px" } : {}}
      aria-label="Help button"
      onClick={() => {
        chrome.runtime.sendMessage({ type: "open-help" });
      }}
    >
      <ReactSVG
        src="/assets/editor/icons/help.svg"
        width="18px"
        height="18px"
      />
    </button>
  );
};

export default HelpButton;

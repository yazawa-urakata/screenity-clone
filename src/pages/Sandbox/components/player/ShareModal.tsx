import React, { useContext } from "react";

import styles from "../../styles/player/_ShareModal.module.scss";

import { ReactSVG } from "react-svg";

// Context
import { ContentStateContext } from "../../context/ContentState";

const URL = "/assets/";

interface ShareModalProps {
  showShare: boolean;
  setShowShare: (show: boolean) => void;
}

const ShareModal: React.FC<ShareModalProps> = ({ showShare, setShowShare }) => {
  const contextValue = useContext(ContentStateContext);

  if (!contextValue) {
    throw new Error("ShareModal must be used within ContentStateContext");
  }

  const [contentState, setContentState] = contextValue;

  return (
    <div className={styles.modalWrap}>
      <div className={styles.modal}>
        <div
          className={styles.close}
          onClick={() => {
            setShowShare(false);
          }}
        >
          <ReactSVG
            src={URL + "editor/icons/close-button.svg"}
            width="16px"
            height="16px"
          />
        </div>
        <div className={styles.emoji}>👋</div>
        <div className={styles.title}>
          {chrome.i18n.getMessage("shareModalSandboxTitle")}
        </div>
        <div className={styles.subtitle}>
          {chrome.i18n.getMessage("shareModalSandboxDescription")}
        </div>
        <div
          className={styles.button}
          onClick={() => {
            chrome.runtime.sendMessage({ type: "join-waitlist" });
            setShowShare(false);
          }}
        >
          {chrome.i18n.getMessage("shareModalSandboxButton")}
        </div>
      </div>
      <div
        className={styles.modalBackground}
        onClick={() => {
          setShowShare(false);
        }}
      ></div>
    </div>
  );
};

export default ShareModal;

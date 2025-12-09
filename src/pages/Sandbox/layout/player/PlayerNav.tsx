import type React from "react";
import { useContext, useEffect, useRef } from "react";
// Icons
import { ContentStateContext } from "../../context/ContentState"; // Import the ContentState context
import styles from "../../styles/player/_Nav.module.scss";

const PlayerNav: React.FC = () => {
  const [contentState, setContentState] = useContext(ContentStateContext); // Access the ContentState context
  const contentStateRef = useRef<any>(null);

  useEffect(() => {
    contentStateRef.current = contentState;
  }, [contentState]);

  return (
    <div className={styles.nav}>
      <div className={styles.navWrap}>
        <button
          type="button"
          onClick={() => {
            chrome.runtime.sendMessage({ type: "open-home" });
          }}
          aria-label="home"
          className={styles.navLeft}
        >
          logo
        </button>
      </div>
    </div>
  );
};

export default PlayerNav;

import React, { useContext } from "react";
import * as S from "@radix-ui/react-switch";

// Styles
import styles from "../../styles/edit/_Switch.module.scss";

// Context
import { ContentStateContext } from "../../context/ContentState";

const Switch: React.FC = () => {
  const contextValue = useContext(ContentStateContext);
  if (!contextValue) return null;
  const [contentState, setContentState] = contextValue;

  return (
    <form>
      <div className={styles.SwitchRow}>
        <label
          className={styles.Label}
          htmlFor="replaceAudio"
          style={{ paddingRight: 15 }}
        >
          {chrome.i18n.getMessage("replaceAudioEditor")}
        </label>
        <S.Root
          className={styles.SwitchRoot}
          checked={contentState.replaceAudio}
          onCheckedChange={(checked: boolean) => {
            setContentState((prevContentState) => ({
              ...prevContentState,
              replaceAudio: checked,
            }));
          }}
        >
          <S.Thumb className={styles.SwitchThumb} />
        </S.Root>
      </div>
    </form>
  );
};

export default Switch;

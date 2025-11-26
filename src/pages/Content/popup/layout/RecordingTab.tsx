import React, { useContext } from "react";

import RecordingType from "./RecordingType";
import {
  CloseWhiteIcon,
} from "../../images/popup/images";

// Context
import { contentStateContext, ContentStateType } from "../../context/ContentState";

interface RecordingTabProps {
  shadowRef: React.RefObject<HTMLDivElement & { shadowRoot: ShadowRoot }>;
}

const RecordingTab: React.FC<RecordingTabProps> = (props) => {
  const context = useContext(contentStateContext);

  if (!context) {
    throw new Error("RecordingTab must be used within ContentStateProvider");
  }

  const [contentState, setContentState] = context;

  return (
    <div className="recording-ui">
      {contentState.recordingToScene && (
        <div className="projectActiveBanner">
          <div className="projectActiveBannerLeft">
            {chrome.i18n.getMessage("addingToLabel") || "Adding to: "}
            {contentState.recordingProjectTitle}
          </div>
          <div className="projectActiveBannerRight">
            <div className="projectActiveBannerDivider"></div>
            <div
              className="projectActiveBannerClose"
              onClick={() => {
                setContentState((prev: ContentStateType) => ({
                  ...prev,
                  projectId: null,
                  activeSceneId: null,
                  recordingToScene: false,
                }));

                // also in chrome local storage
                chrome.storage.local.set({
                  recordingProjectTitle: "",
                  projectId: null,
                  activeSceneId: null,
                  recordingToScene: false,
                });

                // show toast
                contentState.openToast?.(
                  chrome.i18n.getMessage("projectRecordingCancelledToast"),
                  3000
                );
              }}
            >
              <img src={CloseWhiteIcon} alt="Close" />
            </div>
          </div>
        </div>
      )}
      <RecordingType shadowRef={props.shadowRef} />
    </div>
  );
};

export default RecordingTab;

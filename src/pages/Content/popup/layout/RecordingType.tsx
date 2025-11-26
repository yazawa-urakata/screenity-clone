import React, { useEffect, useContext, useState, useRef } from "react";

import Dropdown from "../components/Dropdown";
import Switch from "../components/Switch";
import RegionDimensions from "../components/RegionDimensions";
import Settings from "./Settings";
import { contentStateContext } from "../../context/ContentState";
import { MicOffBlue } from "../../images/popup/images";
import TooltipWrap from "../components/TooltipWrap";

import { AlertIcon, TimeIcon, NoInternet } from "../../toolbar/components/SVG";

const CLOUD_FEATURES_ENABLED =
  process.env.SCREENITY_ENABLE_CLOUD_FEATURES === "true";

interface RecordingTypeProps {
  shadowRef: React.RefObject<HTMLDivElement & { shadowRoot: ShadowRoot }>;
}

const RecordingType: React.FC<RecordingTypeProps> = (props) => {
  const [contentState, setContentState] = useContext(contentStateContext);
  const [time, setTime] = useState<string>("0:00");
  const [URL, setURL] = useState<string>(
    "https://help.screenity.io/getting-started/77KizPC8MHVGfpKpqdux9D/what-are-the-technical-requirements-for-using-screenity/6kdB6qru6naVD8ZLFvX3m9"
  );
  const [URL2, setURL2] = useState<string>(
    "https://help.screenity.io/troubleshooting/9Jy5RGjNrBB42hqUdREQ7W/how-to-grant-screenity-permission-to-record-your-camera-and-microphone/x6U69TnrbMjy5CQ96Er2E9"
  );

  const buttonRef = useRef<HTMLButtonElement>(null);
  const isMac = navigator.platform.toUpperCase().indexOf("MAC") >= 0;

  useEffect(() => {
    const locale = chrome.i18n.getMessage("@@ui_locale");
    if (!locale.includes("en")) {
      setURL(
        `https://translate.google.com/translate?sl=en&tl=${locale}&u=https://help.screenity.io/getting-started/77KizPC8MHVGfpKpqdux9D/what-are-the-technical-requirements-for-using-screenity/6kdB6qru6naVD8ZLFvX3m9`
      );
      setURL2(
        `https://translate.google.com/translate?sl=en&tl=${locale}&u=https://help.screenity.io/troubleshooting/9Jy5RGjNrBB42hqUdREQ7W/how-to-grant-screenity-permission-to-record-your-camera-and-microphone/x6U69TnrbMjy5CQ96Er2E9`
      );
    }
  }, []);

  useEffect(() => {
    // Convert seconds to mm:ss
    let minutes = Math.floor(contentState.alarmTime / 60);
    let seconds: string | number = contentState.alarmTime - minutes * 60;
    if (seconds < 10) {
      seconds = "0" + seconds;
    }
    setTime(minutes + ":" + seconds);
  }, []);

  useEffect(() => {
    // Convert seconds to mm:ss
    let minutes = Math.floor(contentState.alarmTime / 60);
    let seconds: string | number = contentState.alarmTime - minutes * 60;
    if (seconds < 10) {
      seconds = "0" + seconds;
    }
    setTime(minutes + ":" + seconds);
  }, [contentState.alarmTime]);

  // Start recording
  const startStreaming = (): void => {
    contentState.startStreaming();
  };

  useEffect(() => {
    if (contentState.recording) {
      setContentState((prevContentState: any) => ({
        ...prevContentState,
        pendingRecording: false,
      }));
    }
  }, [contentState.recording]);

  return (
    <div>
      {contentState.updateChrome && (
        <div className="popup-warning">
          <div className="popup-warning-left">
            <AlertIcon />
          </div>
          <div className="popup-warning-middle">
            <div className="popup-warning-title">
              {chrome.i18n.getMessage("customAreaRecordingDisabledTitle")}
            </div>
            <div className="popup-warning-description">
              {chrome.i18n.getMessage("customAreaRecordingDisabledDescription")}
            </div>
          </div>
          <div className="popup-warning-right">
            <a href={URL} target="_blank">
              {chrome.i18n.getMessage("customAreaRecordingDisabledAction")}
            </a>
          </div>
        </div>
      )}
      {!contentState.microphonePermission && (
        <button
          className="permission-button"
          onClick={() => {
            if (typeof contentState.openModal === "function") {
              contentState.openModal(
                chrome.i18n.getMessage("permissionsModalTitle"),
                chrome.i18n.getMessage("permissionsModalDescription"),
                chrome.i18n.getMessage("permissionsModalReview"),
                chrome.i18n.getMessage("permissionsModalDismiss"),
                () => {
                  chrome.runtime.sendMessage({
                    type: "extension-media-permissions",
                  });
                },
                () => { },
                chrome.runtime.getURL("assets/helper/permissions.webp"),
                chrome.i18n.getMessage("learnMoreDot"),
                URL2,
                true,
                false
              );
            }
          }}
        >
          <img src={MicOffBlue} />
          <span>{chrome.i18n.getMessage("allowMicrophoneAccessButton")}</span>
        </button>
      )}
      {contentState.microphonePermission && (
        <Dropdown type="mic" shadowRef={props.shadowRef} />
      )}
      {contentState.customRegion && <RegionDimensions />}
      {contentState.isLoggedIn &&
        !contentState.recordingToScene &&
        CLOUD_FEATURES_ENABLED && (
          <>
            <div className="popup-content-divider"></div>
            <TooltipWrap
              content={
                chrome.i18n.getMessage("instantRecordingModeTooltip") ||
                "Instant download, but camera and layout won't be editable later."
              }
              side="bottom"
              sideOffset={2}
            >
              <div style={{ pointerEvents: "auto" }}>
                <Switch
                  label={
                    chrome.i18n.getMessage("instantRecordingModeLabel") ||
                    "Instant recording mode"
                  }
                  name="instantMode"
                  value="instantMode"
                  onChange={async (checked: boolean) => {
                    if (checked) {
                      contentState.openModal(
                        chrome.i18n.getMessage("instantRecordingModeTitle") ||
                        "Instant recording mode",
                        chrome.i18n.getMessage(
                          "instantRecordingModeDescription"
                        ) ||
                        "This records everything into one video for instant download and sharing. You won't be able to change the camera layout afterward, but other edits are still possible.",
                        chrome.i18n.getMessage("instantRecordingModeAction") ||
                        "Got it",
                        chrome.i18n.getMessage("permissionsModalDismiss") ||
                        "Dismiss",
                        () => { },
                        () => { },
                        null,
                        "",
                        "",
                        true,
                        false
                      );
                    } else {
                      // Turn off background effects in chrome.storage
                      chrome.storage.local.set({
                        backgroundEffectsActive: false,
                      });

                      // Update in memory
                      setContentState((prev: any) => ({
                        ...prev,
                        backgroundEffectsActive: false,
                      }));
                    }
                  }}
                />
              </div>
            </TooltipWrap>
          </>
        )}
      <button
        role="button"
        className="main-button recording-button"
        ref={buttonRef}
        tabIndex={0}
        onClick={startStreaming}
        disabled={contentState.pendingRecording}
      >
        {contentState.alarm && contentState.alarmTime > 0 && (
          <div className="alarm-time-button">
            <TimeIcon />
            {time}
          </div>
        )}
        <span className="main-button-label">
          {contentState.pendingRecording
            ? chrome.i18n.getMessage("recordButtonInProgressLabel")
            : chrome.i18n.getMessage("recordButtonLabel")}
        </span>
        <span className="main-button-shortcut">
          {contentState.recordingShortcut}
        </span>
      </button>
      <Settings />
    </div>
  );
};

export default RecordingType;

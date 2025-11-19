import React, { useContext, useEffect, useState, useRef } from "react";
import styles from "../../styles/player/_RightPanel.module.scss";
import { ReactSVG } from "react-svg";

const URL =
  "chrome-extension://" + chrome.i18n.getMessage("@@extension_id") + "/assets/";

// Components
import CropUI from "../editor/CropUI";
import AudioUI from "../editor/AudioUI";
import { S3UploadButton } from "../../components/upload/S3UploadButton";

// Context
import { ContentStateContext } from "../../context/ContentState"; // Import the ContentState context

const RightPanel: React.FC = () => {
  const [contentState, setContentState] = useContext(ContentStateContext); // Access the ContentState context
  const contentStateRef = useRef<any>(contentState);
  const consoleErrorRef = useRef<any[]>([]);

  // Override console.error to catch errors from ffmpeg.wasm
  useEffect(() => {
    console.error = (error: any) => {
      consoleErrorRef.current.push(error);
    };
  }, []);

  useEffect(() => {
    contentStateRef.current = contentState;
  }, [contentState]);

  return (
    <div className={styles.panel}>
      {contentState.mode === "audio" && <AudioUI />}
      {contentState.mode === "crop" && <CropUI />}
      {contentState.mode === "player" && (
        <div>
          {!contentState.fallback && contentState.offline && (
            <div className={styles.alert}>
              <div className={styles.buttonLeft}>
                <ReactSVG src={URL + "editor/icons/no-internet.svg"} />
              </div>
              <div className={styles.buttonMiddle}>
                <div className={styles.buttonTitle}>
                  {chrome.i18n.getMessage("offlineLabelTitle")}
                </div>
                <div className={styles.buttonDescription}>
                  {chrome.i18n.getMessage("offlineLabelDescription")}
                </div>
              </div>
              <div className={styles.buttonRight}>
                {chrome.i18n.getMessage("offlineLabelTryAgain")}
              </div>
            </div>
          )}
          {contentState.fallback && (
            <div className={styles.alert}>
              <div className={styles.buttonLeft}>
                <ReactSVG src={URL + "editor/icons/alert.svg"} />
              </div>
              <div className={styles.buttonMiddle}>
                <div className={styles.buttonTitle}>
                  {chrome.i18n.getMessage("recoveryModeTitle")}
                </div>
                <div className={styles.buttonDescription}>
                  {chrome.i18n.getMessage("overLimitLabelDescription")}
                </div>
              </div>
            </div>
          )}
          {!contentState.fallback &&
            contentState.updateChrome &&
            !contentState.offline &&
            contentState.duration <= contentState.editLimit && (
              <div className={styles.alert}>
                <div className={styles.buttonLeft}>
                  <ReactSVG src={URL + "editor/icons/alert.svg"} />
                </div>
                <div className={styles.buttonMiddle}>
                  <div className={styles.buttonTitle}>
                    {chrome.i18n.getMessage("updateChromeLabelTitle")}
                  </div>
                  <div className={styles.buttonDescription}>
                    {chrome.i18n.getMessage("updateChromeLabelDescription")}
                  </div>
                </div>
                <div
                  className={styles.buttonRight}
                  onClick={() => {
                    chrome.runtime.sendMessage({ type: "chrome-update-info" });
                  }}
                >
                  {chrome.i18n.getMessage("learnMoreLabel")}
                </div>
              </div>
            )}
          {!contentState.fallback &&
            contentState.duration > contentState.editLimit &&
            !contentState.override &&
            !contentState.offline &&
            !contentState.updateChrome && (
              <div className={styles.alert}>
                <div className={styles.buttonLeft}>
                  <ReactSVG src={URL + "editor/icons/alert.svg"} />
                </div>
                <div className={styles.buttonMiddle}>
                  <div className={styles.buttonTitle}>
                    {chrome.i18n.getMessage("overLimitLabelTitle")}
                  </div>
                  <div className={styles.buttonDescription}>
                    {chrome.i18n.getMessage("overLimitLabelDescription")}
                  </div>
                </div>
                <div
                  className={styles.buttonRight}
                  onClick={() => {
                    //chrome.runtime.sendMessage({ type: "upgrade-info" });
                    if (typeof contentState.openModal === "function") {
                      contentState.openModal(
                        chrome.i18n.getMessage("overLimitModalTitle"),
                        chrome.i18n.getMessage("overLimitModalDescription"),
                        chrome.i18n.getMessage("overLimitModalButton"),
                        chrome.i18n.getMessage("sandboxEditorCancelButton"),
                        () => {
                          setContentState((prevContentState: any) => ({
                            ...prevContentState,
                            saved: true,
                          }));
                          chrome.runtime.sendMessage({
                            type: "force-processing",
                          });
                        },
                        () => { },
                        null,
                        chrome.i18n.getMessage("overLimitModalLearnMore"),
                        () => {
                          chrome.runtime.sendMessage({ type: "upgrade-info" });
                        }
                      );
                    }
                  }}
                >
                  {chrome.i18n.getMessage("learnMoreLabel")}
                </div>
              </div>
            )}
          {(!contentState.mp4ready || contentState.isFfmpegRunning) &&
            (contentState.duration <= contentState.editLimit ||
              contentState.override) &&
            !contentState.offline &&
            !contentState.updateChrome &&
            !contentState.noffmpeg && (
              <div className={styles.alert}>
                <div className={styles.buttonLeft}>
                  <ReactSVG src={URL + "editor/icons/alert.svg"} />
                </div>
                <div className={styles.buttonMiddle}>
                  <div className={styles.buttonTitle}>
                    {chrome.i18n.getMessage("videoProcessingLabelTitle")}
                  </div>
                  <div className={styles.buttonDescription}>
                    {chrome.i18n.getMessage("videoProcessingLabelDescription")}
                  </div>
                </div>
                <div
                  className={styles.buttonRight}
                  onClick={() => {
                    chrome.runtime.sendMessage({
                      type: "pricing",
                    });
                  }}
                >
                  {chrome.i18n.getMessage("learnMoreLabel")}
                </div>
              </div>
            )}

          <div className={styles.section}>
            <div className={styles.sectionTitle}>
              {chrome.i18n.getMessage("sandboxExportTitle")}
            </div>
            <div className={styles.buttonWrap}>
              {contentState.fallback && (
                <div
                  role="button"
                  className={styles.button}
                  onClick={() => contentState.downloadWEBM()}
                  {...({ disabled: contentState.isFfmpegRunning } as any)}
                >
                  <div className={styles.buttonLeft}>
                    <ReactSVG src={URL + "editor/icons/download.svg"} />
                  </div>
                  <div className={styles.buttonMiddle}>
                    <div className={styles.buttonTitle}>
                      {contentState.downloadingWEBM
                        ? chrome.i18n.getMessage("downloadingLabel")
                        : chrome.i18n.getMessage("downloadWEBMButtonTitle")}
                    </div>
                    <div className={styles.buttonDescription}>
                      {chrome.i18n.getMessage("downloadWEBMButtonDescription")}
                    </div>
                  </div>
                  <div className={styles.buttonRight}>
                    <ReactSVG src={URL + "editor/icons/right-arrow.svg"} />
                  </div>
                </div>
              )}

              <div
                role="button"
                className={styles.button}
                onClick={() => {
                  if (!contentState.mp4ready) return;
                  contentState.download();
                }}
                {...({
                  disabled:
                    contentState.isFfmpegRunning ||
                    contentState.noffmpeg ||
                    !contentState.mp4ready ||
                    contentState.noffmpeg
                } as any)}
              >
                <div className={styles.buttonLeft}>
                  <ReactSVG src={URL + "editor/icons/download.svg"} />
                </div>
                <div className={styles.buttonMiddle}>
                  <div className={styles.buttonTitle}>
                    {contentState.downloading
                      ? chrome.i18n.getMessage("downloadingLabel")
                      : chrome.i18n.getMessage("downloadMP4ButtonTitle")}
                  </div>
                  <div className={styles.buttonDescription}>
                    {contentState.offline && !contentState.ffmpegLoaded
                      ? chrome.i18n.getMessage("noConnectionLabel")
                      : contentState.updateChrome ||
                        contentState.noffmpeg ||
                        (contentState.duration > contentState.editLimit &&
                          !contentState.override)
                        ? chrome.i18n.getMessage("notAvailableLabel")
                        : contentState.mp4ready && !contentState.isFfmpegRunning
                          ? chrome.i18n.getMessage("downloadMP4ButtonDescription")
                          : chrome.i18n.getMessage("preparingLabel")}
                  </div>
                </div>
                <div className={styles.buttonRight}>
                  <ReactSVG src={URL + "editor/icons/right-arrow.svg"} />
                </div>
              </div>

              {!contentState.fallback && (
                <div
                  role="button"
                  className={styles.button}
                  onClick={() => contentState.downloadWEBM()}
                  {...({ disabled: contentState.isFfmpegRunning } as any)}
                >
                  <div className={styles.buttonLeft}>
                    <ReactSVG src={URL + "editor/icons/download.svg"} />
                  </div>
                  <div className={styles.buttonMiddle}>
                    <div className={styles.buttonTitle}>
                      {contentState.downloadingWEBM
                        ? chrome.i18n.getMessage("downloadingLabel")
                        : chrome.i18n.getMessage("downloadWEBMButtonTitle")}
                    </div>
                    <div className={styles.buttonDescription}>
                      {!contentState.isFfmpegRunning
                        ? chrome.i18n.getMessage(
                          "downloadWEBMButtonDescription"
                        )
                        : chrome.i18n.getMessage("preparingLabel")}
                    </div>
                  </div>
                  <div className={styles.buttonRight}>
                    <ReactSVG src={URL + "editor/icons/right-arrow.svg"} />
                  </div>
                </div>
              )}

              <S3UploadButton />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RightPanel;

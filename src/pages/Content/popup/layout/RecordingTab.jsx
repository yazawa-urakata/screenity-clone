import React, { useEffect, useState, useContext } from "react";
import * as Tabs from "@radix-ui/react-tabs";

import RecordingType from "./RecordingType";
import {
  ScreenTabOn,
  ScreenTabOff,
  RegionTabOn,
  RegionTabOff,
  CloseWhiteIcon,
} from "../../images/popup/images";

import TooltipWrap from "../components/TooltipWrap";

// Context
import { contentStateContext } from "../../context/ContentState";

const RecordingTab = (props) => {
  const [contentState, setContentState] = useContext(contentStateContext);

  const [tabRecordingDisabled, setTabRecordingDisabled] = useState(false);

  useEffect(() => {
    if (tabRecordingDisabled && contentState.recordingType === "region") {
      setContentState((prev) => ({
        ...prev,
        recordingType: "screen",
      }));
      chrome.storage.local.set({ recordingType: "screen" });

      contentState.openToast?.(
        chrome.i18n.getMessage("tabRecordingDisabledToast"),
        4000
      );
    }
  }, [tabRecordingDisabled]);

  useEffect(() => {
    const currentUrl = window.location.href;
    const isBlocked = currentUrl.includes(process.env.SCREENITY_APP_BASE);

    setTabRecordingDisabled(isBlocked);

    if (isBlocked && contentState.recordingType === "region") {
      setContentState((prev) => ({
        ...prev,
        recordingType: "screen",
      }));
      chrome.storage.local.set({ recordingType: "screen" });

      contentState.openToast?.(
        chrome.i18n.getMessage("tabRecordingDisabledToast"),
        4000
      );
    }
  }, [contentState.recordingType]);

  const onValueChange = (tab) => {
    console.log("[RecordingTab] onValueChange called with tab:", tab);
    console.log("[RecordingTab] Current recordingType:", contentState.recordingType);

    setContentState((prevContentState) => ({
      ...prevContentState,
      recordingType: tab,
    }));
    chrome.storage.local.set({ recordingType: tab });

    chrome.runtime.sendMessage({ type: "screen-update" });
  };

  return (
    <div className="recording-ui">
      <Tabs.Root
        className="TabsRoot"
        defaultValue="screen"
        onValueChange={onValueChange}
        value={contentState.recordingType}
      >
        {contentState.recordingToScene && (
          <div className="projectActiveBanner">
            <div className="projectActiveBannerLeft">
              {chrome.i18n.getMessage("addingToLabel") || "Adding to: "}
              {contentState.recordingProjectTitle}
            </div>
            {(!contentState.multiMode ||
              contentState.multiSceneCount === 0) && (
                <div className="projectActiveBannerRight">
                  <div className="projectActiveBannerDivider"></div>
                  <div
                    className="projectActiveBannerClose"
                    onClick={() => {
                      setContentState((prev) => ({
                        ...prev,
                        projectTitle: "",
                        projectId: null,
                        activeSceneId: null,
                        recordingToScene: false,
                        multiMode: false,
                        multiSceneCount: 0,
                        multiProjectId: null,
                      }));

                      // also in chrome local storage
                      chrome.storage.local.set({
                        recordingProjectTitle: "",
                        projectId: null,
                        activeSceneId: null,
                        recordingToScene: false,
                        multiMode: false,
                        multiProjectId: null,
                      });

                      // show toast
                      contentState.openToast(
                        chrome.i18n.getMessage("projectRecordingCancelledToast"),
                        3000
                      );
                    }}
                  >
                    <img src={CloseWhiteIcon} alt="Close" />
                  </div>
                </div>
              )}
          </div>
        )}
        <Tabs.List
          className={"TabsList"}
          aria-label="Manage your account"
        >
          <Tabs.Trigger
            className="TabsTrigger"
            value="screen"
            onClick={() => console.log("[RecordingTab] Screen trigger clicked")}
          >
            <div className="TabsTriggerLabel">
              <div className="TabsTriggerIcon">
                <img
                  src={
                    contentState.recordingType === "screen"
                      ? ScreenTabOn
                      : ScreenTabOff
                  }
                />
              </div>
              <span>{chrome.i18n.getMessage("screenType")}</span>
            </div>
          </Tabs.Trigger>
          {tabRecordingDisabled ? (
            <TooltipWrap
              content={
                chrome.i18n.getMessage("tabRecordingDisabledTooltip") ||
                "Tab recording is disabled on this page."
              }
              side={"bottom"}
            >
              <Tabs.Trigger
                className="TabsTrigger"
                value="region"
                disabled={tabRecordingDisabled}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                }}
                style={{ cursor: "not-allowed", opacity: 0.5 }}
              >
                <div className="TabsTriggerLabel">
                  <div className="TabsTriggerIcon">
                    <img
                      src={
                        contentState.recordingType === "region"
                          ? RegionTabOn
                          : RegionTabOff
                      }
                    />
                  </div>
                  <span>{chrome.i18n.getMessage("tabType")}</span>
                </div>
              </Tabs.Trigger>
            </TooltipWrap>
          ) : (
            <Tabs.Trigger
              className="TabsTrigger"
              value="region"
              onClick={() => console.log("[RecordingTab] Tab area trigger clicked")}
            >
              <div className="TabsTriggerLabel">
                <div className="TabsTriggerIcon">
                  <img
                    src={
                      contentState.recordingType === "region"
                        ? RegionTabOn
                        : RegionTabOff
                    }
                  />
                </div>
                <span>{chrome.i18n.getMessage("tabType")}</span>
              </div>
            </Tabs.Trigger>
          )}
        </Tabs.List>

        <Tabs.Content className="TabsContent" value="screen">
          <RecordingType shadowRef={props.shadowRef} />
        </Tabs.Content>
        <Tabs.Content className="TabsContent" value="region">
          <RecordingType shadowRef={props.shadowRef} />
        </Tabs.Content>
      </Tabs.Root>
    </div>
  );
};

export default RecordingTab;

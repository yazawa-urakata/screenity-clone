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

  const [tabRecordingDisabled, setTabRecordingDisabled] = useState<boolean>(false);

  useEffect(() => {
    if (tabRecordingDisabled && contentState.recordingType === "region") {
      setContentState((prev: ContentStateType) => ({
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
      setContentState((prev: ContentStateType) => ({
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

  const onValueChange = (tab: string): void => {
    setContentState((prevContentState: ContentStateType) => ({
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
        <Tabs.List
          className={"TabsList"}
          aria-label="Manage your account"
          tabIndex={0}
        >
          <Tabs.Trigger className="TabsTrigger" value="screen" tabIndex={0}>
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
          <TooltipWrap
            content={
              tabRecordingDisabled
                ? chrome.i18n.getMessage("tabRecordingDisabledTooltip") ||
                "Tab recording is disabled on this page."
                : ""
            }
            side={"bottom"}
          >
            <Tabs.Trigger
              className="TabsTrigger"
              value="region"
              tabIndex={0}
              disabled={tabRecordingDisabled}
              onClick={(e: React.MouseEvent) => {
                if (tabRecordingDisabled) {
                  e.preventDefault();
                  e.stopPropagation();
                }
              }}
              style={
                tabRecordingDisabled
                  ? { cursor: "not-allowed", opacity: 0.5 }
                  : {}
              }
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

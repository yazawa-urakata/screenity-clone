import React, { FC, useContext, ChangeEvent, FocusEvent } from "react";

// Context
import { contentStateContext } from "../../context/ContentState";
import { ContentStateContextType } from "../../../../types/context";

const RegionDimensions: FC = () => {
  const contextValue = useContext(contentStateContext);
  if (!contextValue) return null;
  const [contentState, setContentState] = contextValue;

  const handleWidth = (e: ChangeEvent<HTMLInputElement>): void => {
    const value = e.target.value;
    if (isNaN(Number(value))) {
      return;
    }
    if (Number(value) < 0) {
      return;
    }

    setContentState((prevContentState) => ({
      ...prevContentState,
      regionWidth: Number(value),
      fromRegion: false,
    }));
    chrome.storage.local.set({
      regionWidth: Number(value),
    });
  };

  const handleHeight = (e: ChangeEvent<HTMLInputElement>): void => {
    const value = e.target.value;
    if (isNaN(Number(value))) {
      return;
    }
    if (Number(value) < 0) {
      return;
    }

    setContentState((prevContentState) => ({
      ...prevContentState,
      regionHeight: Number(value),
      fromRegion: false,
    }));
    chrome.storage.local.set({
      regionHeight: Number(value),
    });
  };

  return (
    <div className="region-dimensions">
      <div className="region-input">
        <label htmlFor="region-width" style={{ display: "none" }}>
          {chrome.i18n.getMessage("regionWidthLabel")}
        </label>
        <input
          id="region-width"
          onChange={(e: ChangeEvent<HTMLInputElement>) => handleWidth(e)}
          onBlur={(e: FocusEvent<HTMLInputElement>) => {
            if (e.target.value === "") {
              setContentState((prevContentState) => ({
                ...prevContentState,
                regionWidth: 100,
                fromRegion: false,
              }));
              chrome.storage.local.set({
                regionWidth: 100,
              });
            }
          }}
          value={contentState?.regionWidth}
        />
        <span>W</span>
      </div>
      <div className="region-input">
        <label htmlFor="region-height" style={{ display: "none" }}>
          {chrome.i18n.getMessage("regionHeightLabel")}
        </label>
        <input
          id="region-height"
          onChange={(e: ChangeEvent<HTMLInputElement>) => handleHeight(e)}
          onBlur={(e: FocusEvent<HTMLInputElement>) => {
            if (e.target.value === "") {
              setContentState((prevContentState) => ({
                ...prevContentState,
                regionHeight: 100,
                fromRegion: false,
              }));
              chrome.storage.local.set({
                regionHeight: 100,
              });
            }
          }}
          value={contentState?.regionHeight}
        />
        <span>H</span>
      </div>
    </div>
  );
};

export default RegionDimensions;

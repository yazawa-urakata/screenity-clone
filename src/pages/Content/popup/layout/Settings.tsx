import React, { useContext, useEffect, useState } from "react";

// Components
import Switch from "../components/Switch";
import TimeSetter from "../components/TimeSetter";

// Context
import { contentStateContext } from "../../context/ContentState";

const Settings: React.FC = () => {
  const [contentState, setContentState] = useContext(contentStateContext);
  const [chromeVersion, setChromeVersion] = useState<number | false | null>(null);
  // Check if Mac
  const isMac = navigator.platform.toUpperCase().indexOf("MAC") >= 0;
  // Set shortcut to Option+Shift+E on Mac and Alt+Shift+E on Windows, using character codes
  const shortcut = isMac ? "⌥⇧E" : "Alt⇧E";

  // Get Chrome version
  const getChromeVersion = (): number | false => {
    const raw = navigator.userAgent.match(/Chrom(e|ium)\/([0-9]+)\./);
    return raw ? parseInt(raw[2], 10) : false;
  };

  useEffect(() => {
    setChromeVersion(getChromeVersion());
  }, []);

  return (
    <div className="SettingsContainer">
      <Switch
        label={chrome.i18n.getMessage("hideToolbarLabel")}
        name="hideUI"
        value="hideUI"
      />
      <Switch
        label={chrome.i18n.getMessage("countdownLabel")}
        name="countdown"
        value="countdown"
      />
      <Switch
        label={chrome.i18n.getMessage("alarmLabel")}
        name="alarm"
        value="alarm"
      />
      {contentState.alarm && <TimeSetter />}
      <Switch
        label={chrome.i18n.getMessage("micReminderPopup")}
        name="askMicrophone"
        value="askMicrophone"
      />
      {contentState.recordingType != "region" &&
        contentState.recordingType != "camera" &&
        !contentState.isSubscribed &&
        (chromeVersion === null || chromeVersion >= 109) && (
          <Switch
            label={chrome.i18n.getMessage("stayInPagePopup")}
            name="offscreenRecording"
            value="offscreenRecording"
          />
        )}
    </div>
  );
};

export default Settings;

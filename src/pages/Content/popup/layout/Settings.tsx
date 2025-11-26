import React, { useEffect, useState } from "react";

// Components
import Switch from "../components/Switch";;

const Settings: React.FC = () => {
  const [chromeVersion, setChromeVersion] = useState<number | false | null>(null);

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
        label={chrome.i18n.getMessage("countdownLabel")}
        name="countdown"
        value="countdown"
      />
      <Switch
        label={chrome.i18n.getMessage("micReminderPopup")}
        name="askMicrophone"
        value="askMicrophone"
      />
    </div>
  );
};

export default Settings;

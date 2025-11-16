import React, { FC, useContext, useEffect, useState, ChangeEvent, FocusEvent } from "react";

// Context
import { contentStateContext } from "../../context/ContentState";
import { ContentStateContextType } from "../../../../types/context";

const TimeSetter: FC = () => {
  const contextValue = useContext(contentStateContext);
  if (!contextValue) return null;
  const [contentState, setContentState] = contextValue;

  const [hours, setHours] = useState<number | string>(
    Math.floor(contentState.alarmTime / 3600)
  );
  const [minutes, setMinutes] = useState<number | string>(
    Math.floor((contentState.alarmTime % 3600) / 60)
  );
  const [seconds, setSeconds] = useState<number | string>(
    Math.floor((contentState.alarmTime % 3600) % 60)
  );

  useEffect(() => {
    // Get from contentState
    setHours(Math.floor(contentState.alarmTime / 3600));
    setMinutes(Math.floor((contentState.alarmTime % 3600) / 60));
    setSeconds(Math.floor((contentState.alarmTime % 3600) % 60));
  }, []);

  useEffect(() => {
    if (!contentState.fromAlarm) return;
    // Set the time in seconds
    setHours(Math.floor(contentState.alarmTime / 3600));
    setMinutes(Math.floor((contentState.alarmTime % 3600) / 60));
    setSeconds(Math.floor((contentState.alarmTime % 3600) % 60));
  }, [contentState.alarmTime]);

  useEffect(() => {
    const hoursNum = typeof hours === "string" ? parseFloat(hours) : hours;
    const minutesNum = typeof minutes === "string" ? parseFloat(minutes) : minutes;
    const secondsNum = typeof seconds === "string" ? parseFloat(seconds) : seconds;

    if (isNaN(hoursNum) || isNaN(minutesNum) || isNaN(secondsNum)) return;
    if (hours === "" || minutes === "" || seconds === "") return;

    setHours(hoursNum);
    setMinutes(minutesNum);
    setSeconds(secondsNum);

    // Set the time in seconds
    const totalSeconds = hoursNum * 3600 + minutesNum * 60 + secondsNum;
    setContentState((prevContentState) => ({
      ...prevContentState,
      alarmTime: totalSeconds,
      fromAlarm: false,
      time: totalSeconds,
      timer: totalSeconds,
    }));
    chrome.storage.local.set({
      alarmTime: totalSeconds,
    });
  }, [hours, minutes, seconds]);

  useEffect(() => {
    const hoursNum = typeof hours === "string" ? parseFloat(hours) : hours;
    const minutesNum = typeof minutes === "string" ? parseFloat(minutes) : minutes;
    const secondsNum = typeof seconds === "string" ? parseFloat(seconds) : seconds;

    if (isNaN(hoursNum) || isNaN(minutesNum) || isNaN(secondsNum)) return;

    const totalSeconds = hoursNum * 3600 + minutesNum * 60 + secondsNum;

    if (contentState.alarm) {
      setContentState((prevContentState) => ({
        ...prevContentState,
        time: totalSeconds,
        timer: totalSeconds,
        fromAlarm: false,
      }));
    } else {
      setContentState((prevContentState) => ({
        ...prevContentState,
        time: 0,
        timer: 0,
      }));
    }
  }, [contentState.alarm]);

  const handleHours = (e: ChangeEvent<HTMLInputElement>): void => {
    // Limit between 0 to 4, number only
    // Only 1 digit
    const value = e.target.value;

    if (value.length > 1) {
      if (value[0] === "0") {
        e.target.value = parseFloat(value[1]).toString();
      } else {
        return;
      }
    }

    if (isNaN(Number(value))) {
      return;
    }

    if (Number(value) > 4) {
      e.target.value = "4";
    }

    setContentState((prevContentState) => ({
      ...prevContentState,
      fromAlarm: true,
    }));

    setHours(e.target.value);
  };

  const handleMinutes = (e: ChangeEvent<HTMLInputElement>): void => {
    // Limit between 0 to 59, number only
    const value = e.target.value;

    if (isNaN(Number(value))) {
      return;
    }

    if (Number(value) > 59) {
      e.target.value = "59";
    }

    setContentState((prevContentState) => ({
      ...prevContentState,
      fromAlarm: true,
    }));

    setMinutes(e.target.value);
  };

  const handleSeconds = (e: ChangeEvent<HTMLInputElement>): void => {
    // Limit between 0 to 59, number only
    const value = e.target.value;

    if (isNaN(Number(value))) {
      return;
    }

    if (Number(value) > 59) {
      e.target.value = "59";
    }

    setContentState((prevContentState) => ({
      ...prevContentState,
      fromAlarm: true,
    }));

    setSeconds(e.target.value);
  };

  return (
    <div className="time-set-parent">
      <div className="time-set-input">
        <input
          placeholder="0"
          onChange={handleMinutes}
          value={minutes}
          onBlur={(e: FocusEvent<HTMLInputElement>) => {
            if (e.target.value === "") {
              e.target.value = "0";
              setMinutes(0);
            }
          }}
          onFocus={(e: FocusEvent<HTMLInputElement>) => {
            e.target.select();
          }}
        />
        <span>M</span>
      </div>
      <div className="time-set-input">
        <input
          placeholder="0"
          onChange={handleSeconds}
          value={seconds}
          onBlur={(e: FocusEvent<HTMLInputElement>) => {
            if (e.target.value === "") {
              e.target.value = "0";
              setSeconds(0);
            }
          }}
          onFocus={(e: FocusEvent<HTMLInputElement>) => {
            e.target.select();
          }}
        />
        <span>S</span>
      </div>
    </div>
  );
};

export default TimeSetter;

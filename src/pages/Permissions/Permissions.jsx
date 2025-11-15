import React, { useEffect, useState, useRef, useCallback } from "react";

const Recorder = () => {
  useEffect(() => {
    window.parent.postMessage(
      {
        type: "screenity-permissions-loaded",
      },
      "*"
    );
  }, []);

  useEffect(() => {
    const handleDeviceChange = () => {
      // Recheck permissions and enumerate devices
      checkPermissions();
    };

    navigator.mediaDevices.addEventListener("devicechange", handleDeviceChange);

    return () => {
      navigator.mediaDevices.removeEventListener(
        "devicechange",
        handleDeviceChange
      );
    };
  }, []);

  const checkPermissions = async () => {
    // Check the microphone permissions using the Permissions API. Then enumerate devices respectively.
    try {
      const microphonePermission = await navigator.permissions.query({
        name: "microphone",
      });

      microphonePermission.onchange = () => {
        checkPermissions();
      };

      // If the permissions are granted, enumerate devices
      if (microphonePermission.state === "granted") {
        enumerateDevices(microphonePermission.state === "granted");
      } else {
        // Post message to parent window
        window.parent.postMessage(
          {
            type: "screenity-permissions",
            success: false,
            error: "Permission not granted",
          },
          "*"
        );
      }
    } catch (err) {
      enumerateDevices();
    }
  };

  const enumerateDevices = async (micGranted = true) => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: micGranted,
        video: false,
      });

      const devicesInfo = await navigator.mediaDevices.enumerateDevices();

      let audioinput = [];
      let audiooutput = [];

      if (micGranted) {
        // Filter by audio input
        audioinput = devicesInfo
          .filter((device) => device.kind === "audioinput")
          .map((device) => ({
            deviceId: device.deviceId,
            label: device.label,
          }));

        // Filter by audio output and extract relevant properties
        audiooutput = devicesInfo
          .filter((device) => device.kind === "audiooutput")
          .map((device) => ({
            deviceId: device.deviceId,
            label: device.label,
          }));
      }

      // Save in Chrome local storage
      chrome.storage.local.set({
        // Set available devices
        audioinput: audioinput,
        audiooutput: audiooutput,
        videoinput: [],
        cameraPermission: false,
        microphonePermission: micGranted,
      });

      // Post message to parent window
      window.parent.postMessage(
        {
          type: "screenity-permissions",
          success: true,
          audioinput: audioinput,
          audiooutput: audiooutput,
          videoinput: [],
          cameraPermission: false,
          microphonePermission: micGranted,
        },
        "*"
      );

      //sendResponse({ success: true, audioinput, audiooutput, videoinput });

      // End the stream
      stream.getTracks().forEach(function (track) {
        track.stop();
      });
    } catch (err) {
      // Post message to parent window
      window.parent.postMessage(
        {
          type: "screenity-permissions",
          success: false,
          error: err.name,
        },
        "*"
      );
      //sendResponse({ success: false, error: err.name });
    }
  };

  const onMessage = (message) => {
    if (message.type === "screenity-get-permissions") {
      checkPermissions();
    }
  };

  // Post message listener
  useEffect(() => {
    window.addEventListener("message", (event) => {
      onMessage(event.data);
    });
  }, []);

  return <div></div>;
};

export default Recorder;

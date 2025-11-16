import React, { useEffect, useState, useRef, useCallback } from "react";

interface DeviceInfo {
  deviceId: string;
  label: string;
}

interface PermissionsMessage {
  type: string;
  success?: boolean;
  error?: string;
  audioinput?: DeviceInfo[];
  audiooutput?: DeviceInfo[];
  videoinput?: DeviceInfo[];
  cameraPermission?: boolean;
  microphonePermission?: boolean;
}

interface StorageData {
  audioinput: DeviceInfo[];
  audiooutput: DeviceInfo[];
  videoinput: DeviceInfo[];
  cameraPermission: boolean;
  microphonePermission: boolean;
}

interface IncomingMessage {
  type: string;
}

const Recorder: React.FC = () => {
  useEffect(() => {
    window.parent.postMessage(
      {
        type: "screenity-permissions-loaded",
      },
      "*"
    );
  }, []);

  useEffect(() => {
    const handleDeviceChange = (): void => {
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

  const checkPermissions = async (): Promise<void> => {
    // Check the microphone permissions using the Permissions API. Then enumerate devices respectively.
    try {
      const microphonePermission = await navigator.permissions.query({
        name: "microphone" as PermissionName,
      });

      microphonePermission.onchange = (): void => {
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
          } as PermissionsMessage,
          "*"
        );
      }
    } catch (err) {
      enumerateDevices();
    }
  };

  const enumerateDevices = async (micGranted: boolean = true): Promise<void> => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: micGranted,
        video: false,
      });

      const devicesInfo = await navigator.mediaDevices.enumerateDevices();

      let audioinput: DeviceInfo[] = [];
      let audiooutput: DeviceInfo[] = [];

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
      } as StorageData);

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
        } as PermissionsMessage,
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
          error: (err as Error).name,
        } as PermissionsMessage,
        "*"
      );
      //sendResponse({ success: false, error: err.name });
    }
  };

  const onMessage = (message: IncomingMessage): void => {
    if (message.type === "screenity-get-permissions") {
      checkPermissions();
    }
  };

  // Post message listener
  useEffect(() => {
    window.addEventListener("message", (event: MessageEvent) => {
      onMessage(event.data);
    });
  }, []);

  return <div></div>;
};

export default Recorder;

import { useEffect, useRef } from "react";

// Import all the utils
import cropVideo from "./utils/cropVideo";
import cutVideo from "./utils/cutVideo";
import getFrame from "./utils/getFrame";
import reencodeVideo from "./utils/reencodeVideo";

const Sandbox = () => {
  const iframeRef = useRef(null);
  const triggerLoad = useRef(false);
  const ffmpegInstance = useRef(null);

  const sendMessage = (message) => {
    iframeRef.current.contentWindow.postMessage(message, "*");
  };

  const loadFfmpeg = async () => {
    sendMessage({ type: "ffmpeg-load-error", fallback: true });
  };

  const toBase64 = (blob) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(blob);
      reader.onloadend = () => {
        resolve(reader.result);
      };
      reader.onerror = reject;
    });
  };

  const onMessage = async (message) => {
    if (message.type === "load-ffmpeg") {
      triggerLoad.current = true;
      loadFfmpeg();
    } else if (message.type === "crop-video") {
      try {
        const blob = await cropVideo(ffmpegInstance.current, message.blob, {
          x: message.x,
          y: message.y,
          width: message.width,
          height: message.height,
        });
        const base64 = await toBase64(blob);
        sendMessage({ type: "updated-blob", base64: base64 });
        sendMessage({ type: "crop-update" });
      } catch (error) {
        sendMessage({ type: "ffmpeg-error", error: JSON.stringify(error) });
      }
    } else if (message.type === "cut-video") {
      try {
        const blob = await cutVideo(
          ffmpegInstance.current,
          message.blob,
          message.startTime,
          message.endTime,
          message.cut,
          message.duration,
          message.encode,
        );
        const base64 = await toBase64(blob);
        sendMessage({
          type: "updated-blob",
          base64: base64,
          addToHistory: true,
        });
      } catch (error) {
        sendMessage({ type: "ffmpeg-error", error: JSON.stringify(error) });
      }
    } else if (message.type === "get-frame") {
      try {
        const blob = await getFrame(
          ffmpegInstance.current,
          message.blob,
          message.time,
        );
        sendMessage({ type: "new-frame", frame: blob });
      } catch (error) {
        sendMessage({ type: "ffmpeg-error", error: JSON.stringify(error) });
      }
    } else if (message.type === "reencode-video") {
      try {
        const blob = await reencodeVideo(
          ffmpegInstance.current,
          message.blob,
          message.duration,
        );
        const base64 = await toBase64(blob);
        sendMessage({ type: "updated-blob", base64: base64 });
      } catch (error) {
        sendMessage({ type: "ffmpeg-error", error: JSON.stringify(error) });
      }
    }
  };

  useEffect(() => {
    window.addEventListener("message", (event) => {
      onMessage(event.data);
    });

    return () => {
      window.removeEventListener("message", (event) => {
        onMessage(event.data);
      });
    };
  }, []);

  return (
    <div>
      <iframe
        ref={iframeRef}
        src="sandbox.html"
        title="Recording result panel"
        allowFullScreen={true}
        style={{
          width: "100%",
          border: "none",
          height: "100vh",
          position: "absolute",
          top: 0,
          left: 0,
        }}
      ></iframe>
    </div>
  );
};

export default Sandbox;

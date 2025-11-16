import React, { useEffect, useRef } from "react";

const Waveform: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  let audioContext: AudioContext | undefined;
  let analyser: AnalyserNode | undefined;
  let dataArray: Float32Array | undefined;
  let dataArrayBuffer: ArrayBuffer | undefined;
  let animationFrameId: number | undefined;
  let audioStream: MediaStream | undefined;

  useEffect(() => {
    const canvas = canvasRef.current;
    const canvasContext = canvas!.getContext("2d")!;

    function initializeAudioContext(): void {
      if (!audioContext) {
        audioContext = new (window.AudioContext || (window as Window & typeof globalThis & { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
        analyser = audioContext.createAnalyser();
        analyser.fftSize = 2048;
        analyser.maxDecibels = -60;
        dataArrayBuffer = new ArrayBuffer(analyser.fftSize * Float32Array.BYTES_PER_ELEMENT);
        dataArray = new Float32Array(dataArrayBuffer);
        const source = audioContext.createMediaStreamDestination();
        analyser.connect(source);
        audioContext.resume();
        startVisualization();
      }
    }

    function startVisualization(): void {
      analyser!.getFloatTimeDomainData(new Float32Array(dataArrayBuffer!));
      canvasContext.clearRect(0, 0, canvas!.width, canvas!.height);
      canvasContext.beginPath();
      const sliceWidth = 0.7;
      const waveformHeight = canvas!.height * 0.9;
      const waveformOffset = (canvas!.height - waveformHeight) / 2;
      let x = 0;
      for (let i = 0; i < dataArray!.length; i++) {
        const v = (dataArray![i] + 1) / 2;
        const y = v * waveformHeight + waveformOffset;
        if (i === 0) {
          canvasContext.moveTo(x, y);
        } else {
          canvasContext.lineTo(x, y);
        }
        x += sliceWidth;
      }
      canvasContext.strokeStyle = "#78C072";
      canvasContext.lineWidth = 1.5;
      canvasContext.stroke();

      animationFrameId = requestAnimationFrame(startVisualization);
    }

    function stopVisualization(): void {
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
    }

    function startAudioCapture(): void {
      navigator.mediaDevices
        .getUserMedia({ audio: true, video: false })
        .then((stream) => {
          audioStream = stream;
          initializeAudioContext();
          const audioSource = audioContext!.createMediaStreamSource(audioStream);
          audioSource.connect(analyser!);
        })
        .catch((error) => {
          console.error("Error capturing audio:", error);
        });
    }

    function stopAudioCapture(): void {
      if (audioStream) {
        const tracks = audioStream.getTracks();
        tracks.forEach((track) => track.stop());
        audioStream = undefined;
        stopVisualization();
      }
    }

    startAudioCapture();

    return () => {
      stopAudioCapture();
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      width="324"
      height="30"
      style={{ background: "#f5f6fa" }}
    />
  );
};

export default Waveform;

// Audio management for screen recording
export class AudioManager {
  private aCtx: AudioContext | null;
  private destination: MediaStreamAudioDestinationNode | null;
  private audioInputSource: MediaStreamAudioSourceNode | null;
  private audioOutputSource: MediaStreamAudioSourceNode | null;
  private audioInputGain: GainNode | null;
  private audioOutputGain: GainNode | null;
  private helperAudioStream: MediaStream | null;

  constructor() {
    this.aCtx = null;
    this.destination = null;
    this.audioInputSource = null;
    this.audioOutputSource = null;
    this.audioInputGain = null;
    this.audioOutputGain = null;
    this.helperAudioStream = null;
  }

  async initialize(): Promise<MediaStreamAudioDestinationNode> {
    this.aCtx = new AudioContext();
    this.destination = this.aCtx.createMediaStreamDestination();
    return this.destination;
  }

  async startAudioStream(id: string): Promise<MediaStream | null> {
    const audioStreamOptions: MediaStreamConstraints = {
      audio: {
        deviceId: {
          exact: id,
        },
      },
    };

    try {
      const stream = await navigator.mediaDevices.getUserMedia(
        audioStreamOptions
      );
      return stream;
    } catch (err) {
      // Try again without the device ID
      const fallbackOptions: MediaStreamConstraints = {
        audio: true,
      };

      try {
        return await navigator.mediaDevices.getUserMedia(fallbackOptions);
      } catch (err) {
        return null;
      }
    }
  }

  setupAudioNodes(
    micStream: MediaStream | null,
    videoStream: MediaStream | null
  ): MediaStream {
    if (!this.aCtx || !this.destination) {
      throw new Error("AudioContext not initialized");
    }

    // Set up microphone audio if available
    if (micStream && micStream.getAudioTracks().length > 0) {
      this.helperAudioStream = micStream;
      this.audioInputGain = this.aCtx.createGain();
      this.audioInputSource = this.aCtx.createMediaStreamSource(micStream);
      this.audioInputSource
        .connect(this.audioInputGain)
        .connect(this.destination);
    }

    // Set up system audio if available
    if (videoStream && videoStream.getAudioTracks().length > 0) {
      this.audioOutputGain = this.aCtx.createGain();
      this.audioOutputSource = this.aCtx.createMediaStreamSource(videoStream);
      this.audioOutputSource
        .connect(this.audioOutputGain)
        .connect(this.destination);
    }

    return this.destination.stream;
  }

  setInputVolume(volume: number): void {
    if (this.audioInputGain) {
      this.audioInputGain.gain.value = volume;
    }
  }

  setOutputVolume(volume: number): void {
    if (this.audioOutputGain) {
      this.audioOutputGain.gain.value = volume;
    }
  }

  cleanup(): void {
    if (this.helperAudioStream) {
      this.helperAudioStream.getTracks().forEach((track) => track.stop());
      this.helperAudioStream = null;
    }

    if (this.aCtx) {
      this.aCtx.close();
      this.aCtx = null;
    }

    this.destination = null;
    this.audioInputSource = null;
    this.audioOutputSource = null;
    this.audioInputGain = null;
    this.audioOutputGain = null;
  }
}

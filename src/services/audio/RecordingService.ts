/**
 * RecordingService — Robust Audio Capture & Live Audio Processing
 * 
 * Manages MediaRecorder lifecycle, microphone permissions, high-precision
 * pause/resume timing, and Web Audio AnalyserNode for live visualizer meters.
 */

export type RecordingState = 'idle' | 'requesting_permission' | 'recording' | 'paused' | 'stopping' | 'error';

export interface RecordingResult {
  blob: Blob;
  durationMs: number;
  mimeType: string;
  sizeBytes: number;
}

export type StateChangeCallback = (state: RecordingState) => void;
export type TimeUpdateCallback = (elapsedMs: number) => void;
export type AudioLevelCallback = (level: number, frequencyData: Uint8Array) => void;
export type ErrorCallback = (error: Error, errorCode: string) => void;

class RecordingService {
  private mediaRecorder: MediaRecorder | null = null;
  private audioStream: MediaStream | null = null;
  private audioContext: AudioContext | null = null;
  private analyserNode: AnalyserNode | null = null;
  private audioSourceNode: MediaStreamAudioSourceNode | null = null;
  private animFrameId: number | null = null;

  private recordedChunks: Blob[] = [];
  private state: RecordingState = 'idle';

  // High-precision timing
  private startTime: number = 0;
  private totalElapsedMs: number = 0;
  private lastResumeTime: number = 0;
  private timerIntervalId: number | null = null;

  // Listeners
  private onStateChangeListeners: Set<StateChangeCallback> = new Set();
  private onTimeUpdateListeners: Set<TimeUpdateCallback> = new Set();
  private onAudioLevelListeners: Set<AudioLevelCallback> = new Set();
  private onErrorListeners: Set<ErrorCallback> = new Set();

  /**
   * Determine best supported audio MIME type
   */
  public getPreferredMimeType(): string {
    const types = [
      'audio/webm;codecs=opus',
      'audio/webm',
      'audio/mp4',
      'audio/aac',
      'audio/ogg;codecs=opus',
      'audio/ogg'
    ];

    if (typeof MediaRecorder === 'undefined') {
      return 'audio/webm';
    }

    for (const type of types) {
      if (MediaRecorder.isTypeSupported(type)) {
        return type;
      }
    }
    return '';
  }

  /**
   * Current recorder state
   */
  public getState(): RecordingState {
    return this.state;
  }

  public getElapsedMs(): number {
    if (this.state === 'recording') {
      return this.totalElapsedMs + (Date.now() - this.lastResumeTime);
    }
    return this.totalElapsedMs;
  }

  private setState(newState: RecordingState): void {
    this.state = newState;
    this.onStateChangeListeners.forEach(cb => cb(newState));
  }

  /**
   * Request microphone permission and initialize stream & analyser
   */
  public async startRecording(): Promise<void> {
    if (this.state === 'recording' || this.state === 'paused') {
      console.warn('Recorder already active.');
      return;
    }

    try {
      this.setState('requesting_permission');

      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Microphone access is not supported on this browser or context.');
      }

      // 1. Request audio stream
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 44100
        }
      });
      this.audioStream = stream;

      // Handle sudden device disconnection or interruptions
      const audioTrack = stream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.onended = () => {
          this.handleInterruption('Microphone device was disconnected or interrupted.');
        };
      }

      // 2. Setup Web Audio Analyser for live visualizer
      this.setupAudioAnalysis(stream);

      // 3. Negotiate mime type
      const mimeType = this.getPreferredMimeType();
      const options: MediaRecorderOptions = mimeType ? { mimeType } : {};

      const recorder = new MediaRecorder(stream, options);
      this.mediaRecorder = recorder;
      this.recordedChunks = [];

      recorder.ondataavailable = (event: BlobEvent) => {
        if (event.data && event.data.size > 0) {
          this.recordedChunks.push(event.data);
        }
      };

      recorder.onerror = (event: Event) => {
        const error = (event as any).error || new Error('MediaRecorder encountered an error');
        this.emitError(error, 'RECORDER_ERROR');
      };

      // 4. Start recording with 500ms time slices to avoid memory spikes
      recorder.start(500);

      // 5. Initialize timing
      this.startTime = Date.now();
      this.lastResumeTime = this.startTime;
      this.totalElapsedMs = 0;
      this.startTimer();

      this.setState('recording');
    } catch (err: any) {
      this.cleanup();
      const code = err.name === 'NotAllowedError' ? 'PERMISSION_DENIED'
        : err.name === 'NotFoundError' ? 'NO_MICROPHONE'
        : 'START_FAILED';
      this.setState('error');
      this.emitError(err, code);
      throw err;
    }
  }

  /**
   * Pause the active recording
   */
  public pauseRecording(): void {
    if (this.state !== 'recording' || !this.mediaRecorder) return;

    if (this.mediaRecorder.state === 'recording') {
      this.mediaRecorder.pause();
    }

    // Accumulate elapsed time up to now
    this.totalElapsedMs += (Date.now() - this.lastResumeTime);
    this.stopTimer();

    this.setState('paused');
  }

  /**
   * Resume recording from paused state
   */
  public resumeRecording(): void {
    if (this.state !== 'paused' || !this.mediaRecorder) return;

    if (this.mediaRecorder.state === 'paused') {
      this.mediaRecorder.resume();
    }

    this.lastResumeTime = Date.now();
    this.startTimer();

    this.setState('recording');
  }

  /**
   * Stop recording and package the recorded audio blob
   */
  public async stopRecording(): Promise<RecordingResult> {
    if (this.state !== 'recording' && this.state !== 'paused') {
      throw new Error('Cannot stop: recorder is not active');
    }

    const finalDuration = this.getElapsedMs();
    this.setState('stopping');
    this.stopTimer();

    return new Promise<RecordingResult>((resolve, reject) => {
      if (!this.mediaRecorder) {
        this.cleanup();
        this.setState('idle');
        return reject(new Error('MediaRecorder was not initialized.'));
      }

      this.mediaRecorder.onstop = () => {
        try {
          const mimeType = this.mediaRecorder?.mimeType || this.getPreferredMimeType() || 'audio/webm';
          const blob = new Blob(this.recordedChunks, { type: mimeType });
          const result: RecordingResult = {
            blob,
            durationMs: finalDuration,
            mimeType,
            sizeBytes: blob.size
          };

          this.cleanup();
          this.setState('idle');
          resolve(result);
        } catch (err: any) {
          this.cleanup();
          this.setState('error');
          reject(err);
        }
      };

      try {
        if (this.mediaRecorder.state !== 'inactive') {
          this.mediaRecorder.stop();
        }
      } catch (err) {
        this.cleanup();
        this.setState('error');
        reject(err);
      }
    });
  }

  /**
   * Cancel / Discard active recording without saving
   */
  public discardRecording(): void {
    this.stopTimer();
    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
      try {
        this.mediaRecorder.stop();
      } catch (e) {
        // ignore
      }
    }
    this.cleanup();
    this.setState('idle');
  }

  /**
   * Set up Web Audio Analyser node for live visual waveform meter
   */
  private setupAudioAnalysis(stream: MediaStream): void {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;

      this.audioContext = new AudioCtx();
      this.analyserNode = this.audioContext.createAnalyser();
      this.analyserNode.fftSize = 256;
      this.analyserNode.smoothingTimeConstant = 0.8;

      this.audioSourceNode = this.audioContext.createMediaStreamSource(stream);
      this.audioSourceNode.connect(this.analyserNode);

      const bufferLength = this.analyserNode.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);

      const pollLevels = () => {
        if (!this.analyserNode || (this.state !== 'recording' && this.state !== 'requesting_permission')) {
          this.animFrameId = requestAnimationFrame(pollLevels);
          return;
        }

        this.analyserNode.getByteFrequencyData(dataArray);

        // Compute average volume level (0.0 to 1.0)
        let sum = 0;
        for (let i = 0; i < bufferLength; i++) {
          sum += dataArray[i];
        }
        const average = sum / bufferLength;
        const normalizedLevel = Math.min(1.0, Math.max(0.0, average / 128.0));

        this.onAudioLevelListeners.forEach(cb => cb(normalizedLevel, dataArray));

        this.animFrameId = requestAnimationFrame(pollLevels);
      };

      this.animFrameId = requestAnimationFrame(pollLevels);
    } catch (err) {
      console.warn('Web Audio API analysis not available:', err);
    }
  }

  private startTimer(): void {
    this.stopTimer();
    this.timerIntervalId = window.setInterval(() => {
      const elapsed = this.getElapsedMs();
      this.onTimeUpdateListeners.forEach(cb => cb(elapsed));
    }, 100);
  }

  private stopTimer(): void {
    if (this.timerIntervalId !== null) {
      clearInterval(this.timerIntervalId);
      this.timerIntervalId = null;
    }
  }

  private handleInterruption(reason: string): void {
    console.warn('Audio interruption:', reason);
    if (this.state === 'recording' || this.state === 'paused') {
      this.pauseRecording();
      this.emitError(new Error(reason), 'INTERRUPTED');
    }
  }

  private emitError(error: Error, code: string): void {
    this.onErrorListeners.forEach(cb => cb(error, code));
  }

  private cleanup(): void {
    this.stopTimer();

    if (this.animFrameId !== null) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }

    if (this.audioStream) {
      this.audioStream.getTracks().forEach(track => {
        try {
          track.stop();
        } catch (e) {
          // ignore
        }
      });
      this.audioStream = null;
    }

    if (this.audioSourceNode) {
      try {
        this.audioSourceNode.disconnect();
      } catch (e) {
        // ignore
      }
      this.audioSourceNode = null;
    }

    if (this.audioContext) {
      try {
        if (this.audioContext.state !== 'closed') {
          this.audioContext.close();
        }
      } catch (e) {
        // ignore
      }
      this.audioContext = null;
    }

    this.analyserNode = null;
    this.mediaRecorder = null;
    this.recordedChunks = [];
  }

  // Event Subscription APIs
  public onStateChange(callback: StateChangeCallback): () => void {
    this.onStateChangeListeners.add(callback);
    return () => this.onStateChangeListeners.delete(callback);
  }

  public onTimeUpdate(callback: TimeUpdateCallback): () => void {
    this.onTimeUpdateListeners.add(callback);
    return () => this.onTimeUpdateListeners.delete(callback);
  }

  public onAudioLevel(callback: AudioLevelCallback): () => void {
    this.onAudioLevelListeners.add(callback);
    return () => this.onAudioLevelListeners.delete(callback);
  }

  public onError(callback: ErrorCallback): () => void {
    this.onErrorListeners.add(callback);
    return () => this.onErrorListeners.delete(callback);
  }
}

export const recordingService = new RecordingService();

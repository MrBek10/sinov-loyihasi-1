export interface AudioRecorderState {
  isRecording: boolean;
  duration: number;
  audioBlob: Blob | null;
  audioUrl: string | null;
  error: string | null;
}

export class AudioRecorder {
  private mediaRecorder: MediaRecorder | null = null;
  private audioChunks: Blob[] = [];
  private stream: MediaStream | null = null;
  private timerInterval: number | null = null;
  private startTime: number = 0;
  private onStateChange: (state: AudioRecorderState) => void;
  private currentState: AudioRecorderState = {
    isRecording: false,
    duration: 0,
    audioBlob: null,
    audioUrl: null,
    error: null,
  };

  constructor(onStateChange: (state: AudioRecorderState) => void) {
    this.onStateChange = onStateChange;
  }

  private updateState(partial: Partial<AudioRecorderState>) {
    this.currentState = { ...this.currentState, ...partial };
    this.onStateChange(this.currentState);
  }

  async start(): Promise<boolean> {
    this.audioChunks = [];
    this.updateState({ error: null, audioBlob: null, audioUrl: null, duration: 0 });

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error("Brauzeringizda mikrofondan ovoz yozish imkoniyati mavjud emas.");
      }

      this.stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      const options = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? { mimeType: 'audio/webm;codecs=opus' }
        : MediaRecorder.isTypeSupported('audio/mp4')
        ? { mimeType: 'audio/mp4' }
        : undefined;

      this.mediaRecorder = new MediaRecorder(this.stream, options);

      this.mediaRecorder.ondataavailable = (event: BlobEvent) => {
        if (event.data && event.data.size > 0) {
          this.audioChunks.push(event.data);
        }
      };

      this.mediaRecorder.onstop = () => {
        const mimeType = this.mediaRecorder?.mimeType || 'audio/webm';
        const blob = new Blob(this.audioChunks, { type: mimeType });
        const url = URL.createObjectURL(blob);
        this.updateState({
          isRecording: false,
          audioBlob: blob,
          audioUrl: url,
        });

        // Stop all audio tracks
        if (this.stream) {
          this.stream.getTracks().forEach((track) => track.stop());
          this.stream = null;
        }
      };

      this.mediaRecorder.start(250); // Emit data every 250ms
      this.startTime = Date.now();

      this.timerInterval = window.setInterval(() => {
        const elapsed = Math.floor((Date.now() - this.startTime) / 1000);
        this.updateState({ duration: elapsed });
      }, 500);

      this.updateState({ isRecording: true });
      return true;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Mikrofonga ulanishda xatolik yuz berdi';
      this.updateState({
        isRecording: false,
        error: message.includes('denied')
          ? 'Mikrofondan foydalanishga ruxsat berilmadi. Iltimos brauzer sozlamalarida ruxsat bering.'
          : message,
      });
      return false;
    }
  }

  stop(): void {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }

    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
      this.mediaRecorder.stop();
    }
  }

  reset(): void {
    this.stop();
    if (this.currentState.audioUrl) {
      URL.revokeObjectURL(this.currentState.audioUrl);
    }
    this.updateState({
      isRecording: false,
      duration: 0,
      audioBlob: null,
      audioUrl: null,
      error: null,
    });
  }
}

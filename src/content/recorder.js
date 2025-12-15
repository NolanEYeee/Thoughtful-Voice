export class Recorder {
    constructor() {
        this.mediaRecorder = null;
        this.audioChunks = [];
        this.stream = null;
        this.startTime = 0;
        this.timerInterval = null;
        this.onTimerUpdate = null; // Callback for UI timer
    }

    async start(onTimerUpdate) {
        this.onTimerUpdate = onTimerUpdate;
        this.audioChunks = [];

        try {
            this.stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            this.mediaRecorder = new MediaRecorder(this.stream);

            this.mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    this.audioChunks.push(event.data);
                }
            };

            this.mediaRecorder.start();
            this.startTime = Date.now();
            this.startTimer();

            console.log("Recording started");
            return true;
        } catch (error) {
            console.error("Error starting recording:", error);
            alert("Could not access microphone. Please check permissions.");
            return false;
        }
    }

    stop() {
        return new Promise((resolve) => {
            if (!this.mediaRecorder) {
                resolve(null);
                return;
            }

            this.mediaRecorder.onstop = () => {
                // Chrome MediaRecorder records to WebM by default.
                const audioBlob = new Blob(this.audioChunks, { type: 'audio/webm' });

                this.stopTimer();
                this.stream.getTracks().forEach(track => track.stop());
                this.stream = null;
                this.mediaRecorder = null;

                console.log("Recording stopped, blob size:", audioBlob.size);
                resolve({
                    blob: audioBlob,
                    duration: Date.now() - this.startTime
                });
            };

            this.mediaRecorder.stop();
        });
    }

    startTimer() {
        this.stopTimer();
        this.timerInterval = setInterval(() => {
            const elapsed = Date.now() - this.startTime;
            const seconds = Math.floor(elapsed / 1000);
            const m = Math.floor(seconds / 60).toString().padStart(2, '0');
            const s = (seconds % 60).toString().padStart(2, '0');
            if (this.onTimerUpdate) this.onTimerUpdate(`${m}:${s}`);
        }, 1000);
    }

    stopTimer() {
        if (this.timerInterval) {
            clearInterval(this.timerInterval);
            this.timerInterval = null;
        }
    }
}

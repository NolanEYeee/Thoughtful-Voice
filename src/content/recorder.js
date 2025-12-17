export class Recorder {
    constructor() {
        this.audioContext = null;
        this.mediaStreamSource = null;
        this.recorder = null;
        this.audioBuffers = [];
        this.stream = null;
        this.startTime = 0;
        this.pausedTime = 0;      // Total time spent paused
        this.pauseStartTime = 0;  // When current pause started
        this.timerInterval = null;
        this.onTimerUpdate = null;
        this.isPaused = false;
    }

    async start(onTimerUpdate) {
        this.onTimerUpdate = onTimerUpdate;
        this.audioBuffers = [];
        this.pausedTime = 0;
        this.isPaused = false;

        try {
            // Load settings from chrome.storage
            const result = await chrome.storage.local.get(['settings']);
            const settings = result.settings || {};

            // Apply defaults
            const audioSettings = {
                sampleRate: 44100,
                bufferSize: 4096,
                ...(settings.audio || {})
            };

            console.log('Audio settings:', audioSettings);

            this.stream = await navigator.mediaDevices.getUserMedia({ audio: true });

            // Create AudioContext with configured sample rate
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)({
                sampleRate: audioSettings.sampleRate
            });

            this.mediaStreamSource = this.audioContext.createMediaStreamSource(this.stream);

            // Use ScriptProcessor with configured buffer size
            this.recorder = this.audioContext.createScriptProcessor(
                audioSettings.bufferSize,
                1, // inputChannels
                1  // outputChannels
            );

            this.recorder.onaudioprocess = (e) => {
                // Only record if not paused
                if (!this.isPaused) {
                    const input = e.inputBuffer.getChannelData(0);
                    this.audioBuffers.push(new Float32Array(input));
                }
            };

            this.mediaStreamSource.connect(this.recorder);
            this.recorder.connect(this.audioContext.destination);

            this.startTime = Date.now();
            this.startTimer();

            console.log(`WAV Recording started: ${audioSettings.sampleRate}Hz, buffer ${audioSettings.bufferSize}`);
            return true;
        } catch (error) {
            console.error("Error starting recording:", error);
            alert("Could not access microphone. Please check permissions.");
            return false;
        }
    }

    /**
     * Pause the recording
     */
    pause() {
        if (this.isPaused || !this.recorder) return false;

        this.isPaused = true;
        this.pauseStartTime = Date.now();
        console.log("Recording paused");
        return true;
    }

    /**
     * Resume the recording after pause
     */
    resume() {
        if (!this.isPaused || !this.recorder) return false;

        this.isPaused = false;
        this.pausedTime += Date.now() - this.pauseStartTime;
        console.log("Recording resumed");
        return true;
    }

    /**
     * Check if recording is currently paused
     */
    get paused() {
        return this.isPaused;
    }

    stop() {
        return new Promise(async (resolve) => {
            if (!this.recorder || !this.audioContext) {
                resolve(null);
                return;
            }

            // If paused when stopping, add the final pause duration
            if (this.isPaused) {
                this.pausedTime += Date.now() - this.pauseStartTime;
            }

            // Disconnect and Cleanup
            this.recorder.disconnect();
            this.mediaStreamSource.disconnect();

            this.stopTimer();

            // Stop Stream
            this.stream.getTracks().forEach(track => track.stop());
            this.stream = null;

            // Process Audio Data
            const blob = this.exportWAV(this.audioBuffers, this.audioContext.sampleRate);

            // Calculate actual recording duration (excluding paused time)
            const totalElapsed = Date.now() - this.startTime;
            const actualDuration = totalElapsed - this.pausedTime;

            // Close Context
            if (this.audioContext.state !== 'closed') {
                await this.audioContext.close();
            }

            this.recorder = null;
            this.audioContext = null;
            this.isPaused = false;

            console.log("Recording stopped, WAV blob size:", blob.size);
            console.log(`Total time: ${totalElapsed}ms, Paused: ${this.pausedTime}ms, Actual: ${actualDuration}ms`);

            resolve({
                blob: blob,
                duration: actualDuration
            });
        });
    }

    startTimer() {
        this.stopTimer();
        this.timerInterval = setInterval(() => {
            // Calculate elapsed time excluding paused time
            let elapsed;
            if (this.isPaused) {
                // When paused, show the time when we paused
                elapsed = this.pauseStartTime - this.startTime - this.pausedTime;
            } else {
                elapsed = Date.now() - this.startTime - this.pausedTime;
            }

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

    // --- WAV Encoding Helpers ---

    mergeBuffers(buffers, length) {
        const result = new Float32Array(length);
        let offset = 0;
        for (const buffer of buffers) {
            result.set(buffer, offset);
            offset += buffer.length;
        }
        return result;
    }

    exportWAV(buffers, sampleRate) {
        const totalLength = buffers.reduce((acc, b) => acc + b.length, 0);
        const mergedBuffers = this.mergeBuffers(buffers, totalLength);

        const buffer = new ArrayBuffer(44 + mergedBuffers.length * 2);
        const view = new DataView(buffer);

        // RIFF chunk descriptor
        this.writeString(view, 0, 'RIFF');
        view.setUint32(4, 36 + mergedBuffers.length * 2, true);
        this.writeString(view, 8, 'WAVE');

        // fmt sub-chunk
        this.writeString(view, 12, 'fmt ');
        view.setUint32(16, 16, true);
        view.setUint16(20, 1, true);
        view.setUint16(22, 1, true);
        view.setUint32(24, sampleRate, true);
        view.setUint32(28, sampleRate * 2, true);
        view.setUint16(32, 2, true);
        view.setUint16(34, 16, true);

        // data sub-chunk
        this.writeString(view, 36, 'data');
        view.setUint32(40, mergedBuffers.length * 2, true);

        this.floatTo16BitPCM(view, 44, mergedBuffers);

        return new Blob([view], { type: 'audio/wav' });
    }

    writeString(view, offset, string) {
        for (let i = 0; i < string.length; i++) {
            view.setUint8(offset + i, string.charCodeAt(i));
        }
    }

    floatTo16BitPCM(output, offset, input) {
        for (let i = 0; i < input.length; i++, offset += 2) {
            let s = Math.max(-1, Math.min(1, input[i]));
            s = s < 0 ? s * 0x8000 : s * 0x7FFF;
            output.setInt16(offset, s, true);
        }
    }
}

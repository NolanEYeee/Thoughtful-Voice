export class Recorder {
    constructor() {
        this.audioContext = null;
        this.mediaStreamSource = null;
        this.recorder = null;
        this.audioBuffers = [];
        this.stream = null;
        this.startTime = 0;
        this.timerInterval = null;
        this.onTimerUpdate = null;
    }

    async start(onTimerUpdate) {
        this.onTimerUpdate = onTimerUpdate;
        this.audioBuffers = []; // Store Float32Arrays

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
                // Clone the data because the buffer is reused
                const input = e.inputBuffer.getChannelData(0);
                this.audioBuffers.push(new Float32Array(input));
            };

            this.mediaStreamSource.connect(this.recorder);
            this.recorder.connect(this.audioContext.destination); // Necessary for the script processor to run

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

    stop() {
        return new Promise(async (resolve) => {
            if (!this.recorder || !this.audioContext) {
                resolve(null);
                return;
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

            // Close Context
            if (this.audioContext.state !== 'closed') {
                await this.audioContext.close();
            }

            this.recorder = null;
            this.audioContext = null;

            console.log("Recording stopped, WAV blob size:", blob.size);
            resolve({
                blob: blob,
                duration: Date.now() - this.startTime
            });
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
        // 1. Merge buffers
        const totalLength = buffers.reduce((acc, b) => acc + b.length, 0);
        const mergedBuffers = this.mergeBuffers(buffers, totalLength);

        // 2. Downsample (Optional, but 44.1/48kHz is standard, keep it simple)
        // 3. Encode to 16-bit PCM
        const buffer = new ArrayBuffer(44 + mergedBuffers.length * 2);
        const view = new DataView(buffer);

        // RIFF chunk descriptor
        this.writeString(view, 0, 'RIFF');
        view.setUint32(4, 36 + mergedBuffers.length * 2, true);
        this.writeString(view, 8, 'WAVE');

        // fmt sub-chunk
        this.writeString(view, 12, 'fmt ');
        view.setUint32(16, 16, true);
        view.setUint16(20, 1, true); // PCM (linear quantization)
        view.setUint16(22, 1, true); // Mono
        view.setUint32(24, sampleRate, true);
        view.setUint32(28, sampleRate * 2, true); // Byte rate
        view.setUint16(32, 2, true); // Block align
        view.setUint16(34, 16, true); // Bits per sample

        // data sub-chunk
        this.writeString(view, 36, 'data');
        view.setUint32(40, mergedBuffers.length * 2, true);

        // Write PCM samples
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

import fixWebmDuration from 'fix-webm-duration';

export class ScreenRecorder {
    constructor(platform = 'chatgpt') {
        this.mediaRecorder = null;
        this.recordedChunks = [];
        this.stream = null;
        this.startTime = 0;
        this.timerInterval = null;
        this.onTimerUpdate = null;
        this.platform = platform;
    }

    async start(onTimerUpdate) {
        this.onTimerUpdate = onTimerUpdate;
        this.recordedChunks = [];

        try {
            // Load settings from chrome.storage
            const result = await chrome.storage.local.get(['settings']);
            const settings = result.settings || {};

            // Apply defaults
            const videoSettings = {
                codec: 'vp9',
                resolution: '720p',
                bitrate: 2000,
                fps: 30,
                timeslice: 1000,
                ...(settings.video || {})
            };

            console.log('Video settings:', videoSettings);

            // Resolution presets
            const resolutionPresets = {
                '1080p': { width: 1920, height: 1080 },
                '720p': { width: 1280, height: 720 },
                '480p': { width: 854, height: 480 }
            };

            const resolution = resolutionPresets[videoSettings.resolution] || resolutionPresets['720p'];

            // Request screen capture with audio
            this.stream = await navigator.mediaDevices.getDisplayMedia({
                video: {
                    displaySurface: "monitor",
                    logicalSurface: true,
                    cursor: "always",
                    width: { ideal: resolution.width, max: 1920 },
                    height: { ideal: resolution.height, max: 1080 },
                    frameRate: { ideal: videoSettings.fps, max: 60 }
                },
                audio: true
            });

            // Also request microphone audio
            let micStream = null;
            try {
                micStream = await navigator.mediaDevices.getUserMedia({
                    audio: {
                        echoCancellation: true,
                        noiseSuppression: true,
                        sampleRate: 44100
                    }
                });
            } catch (micError) {
                console.warn("Could not access microphone:", micError);
            }

            // Merge audio tracks
            const audioTracks = [];
            const screenAudioTrack = this.stream.getAudioTracks()[0];
            if (screenAudioTrack) audioTracks.push(screenAudioTrack);

            if (micStream) {
                const micAudioTrack = micStream.getAudioTracks()[0];
                if (micAudioTrack) audioTracks.push(micAudioTrack);
            }

            let finalStream = this.stream;
            if (audioTracks.length > 1) {
                const audioContext = new AudioContext();
                const audioDestination = audioContext.createMediaStreamDestination();

                audioTracks.forEach(track => {
                    const source = audioContext.createMediaStreamSource(new MediaStream([track]));
                    source.connect(audioDestination);
                });

                const videoTrack = this.stream.getVideoTracks()[0];
                finalStream = new MediaStream([
                    videoTrack,
                    ...audioDestination.stream.getAudioTracks()
                ]);

                this.micStream = micStream;
                this.audioContext = audioContext;
            } else if (micStream && audioTracks.length === 1) {
                const videoTrack = this.stream.getVideoTracks()[0];
                finalStream = new MediaStream([
                    videoTrack,
                    micStream.getAudioTracks()[0]
                ]);
                this.micStream = micStream;
            }

            // Codec options
            const codecOptions = {
                'vp9': 'video/webm;codecs=vp9,opus',
                'vp8': 'video/webm;codecs=vp8,opus',
                'h264': 'video/webm;codecs=h264,opus'
            };

            let mimeType = codecOptions[videoSettings.codec] || codecOptions['vp9'];

            // Check if codec is supported, fallback if needed
            if (!MediaRecorder.isTypeSupported(mimeType)) {
                if (MediaRecorder.isTypeSupported(codecOptions['vp9'])) {
                    mimeType = codecOptions['vp9'];
                } else if (MediaRecorder.isTypeSupported(codecOptions['vp8'])) {
                    mimeType = codecOptions['vp8'];
                } else {
                    mimeType = 'video/webm';
                }
                console.warn(`Codec ${videoSettings.codec} not supported, using fallback: ${mimeType}`);
            }

            const options = {
                mimeType: mimeType,
                videoBitsPerSecond: videoSettings.bitrate * 1000, // Convert kbps to bps
                audioBitsPerSecond: 128000
            };

            console.log(`Using codec: ${mimeType}, bitrate: ${videoSettings.bitrate} kbps`);
            this.mediaRecorder = new MediaRecorder(finalStream, options);

            this.mediaRecorder.ondataavailable = (event) => {
                if (event.data && event.data.size > 0) {
                    this.recordedChunks.push(event.data);
                }
            };

            this.mediaRecorder.start(videoSettings.timeslice);
            this.startTime = Date.now();
            this.startTimer();

            this.stream.getVideoTracks()[0].onended = () => {
                console.log("Screen sharing stopped by user");
                if (this.mediaRecorder && this.mediaRecorder.state === 'recording') {
                    this.stop();
                }
            };

            console.log(`Screen recording started for ${this.platform}`);
            console.log(`Settings: ${videoSettings.resolution} @ ${videoSettings.fps}fps, timeslice: ${videoSettings.timeslice}ms`);
            return true;
        } catch (error) {
            console.error("Error starting screen recording:", error);
            if (error.name !== 'NotAllowedError') {
                alert("Could not start screen recording. Please check permissions.");
            }
            return false;
        }
    }

    stop() {
        return new Promise((resolve) => {
            if (!this.mediaRecorder) {
                resolve(null);
                return;
            }

            this.stopTimer();

            this.mediaRecorder.onstop = async () => {
                // Stop all tracks
                if (this.stream) {
                    this.stream.getTracks().forEach(track => track.stop());
                    this.stream = null;
                }
                if (this.micStream) {
                    this.micStream.getTracks().forEach(track => track.stop());
                    this.micStream = null;
                }
                if (this.audioContext) {
                    this.audioContext.close();
                    this.audioContext = null;
                }

                // Create blob from recorded chunks
                const rawBlob = new Blob(this.recordedChunks, { type: 'video/webm' });
                const duration = Date.now() - this.startTime;

                console.log(`Raw WebM size: ${(rawBlob.size / 1024 / 1024).toFixed(2)} MB`);
                console.log(`Duration: ${Math.floor(duration / 1000)} seconds`);

                // FIX: Add proper duration metadata to the WebM file
                // This is crucial for Gemini and other services that check duration
                let fixedBlob;
                try {
                    console.log("Fixing WebM duration metadata...");
                    fixedBlob = await fixWebmDuration(rawBlob, duration, { logger: false });
                    console.log("WebM duration fixed successfully!");
                } catch (e) {
                    console.warn("Could not fix WebM duration:", e);
                    fixedBlob = rawBlob;
                }

                console.log(`Final WebM size: ${(fixedBlob.size / 1024 / 1024).toFixed(2)} MB`);

                this.mediaRecorder = null;
                this.recordedChunks = [];

                resolve({
                    blob: fixedBlob,
                    duration: duration,
                    format: 'webm'
                });
            };

            if (this.mediaRecorder.state === 'recording') {
                this.mediaRecorder.stop();
            } else {
                const blob = new Blob(this.recordedChunks, { type: 'video/webm' });
                this.mediaRecorder = null;
                this.recordedChunks = [];
                resolve({
                    blob: blob,
                    duration: Date.now() - this.startTime,
                    format: 'webm'
                });
            }
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

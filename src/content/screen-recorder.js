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

        // Microphone control
        this.micStream = null;
        this.micGainNode = null;
        this.audioContext = null;
        this.isMicMuted = false;
        this.onMicStateChange = null;

        // Callback for when user stops screen sharing via browser controls
        this.onExternalStop = null;

        // Pause state
        this.isPaused = false;
    }

    async start(onTimerUpdate, onMicStateChange) {
        this.onTimerUpdate = onTimerUpdate;
        this.onMicStateChange = onMicStateChange;
        this.recordedChunks = [];
        this.isMicMuted = false;
        this.isPaused = false;  // Reset pause state on start

        try {
            // Load settings from chrome.storage
            const result = await chrome.storage.local.get(['settings']);
            const settings = result.settings || {};

            // Apply defaults
            const videoSettings = {
                codec: 'vp9',
                resolution: '1080p',
                bitrate: 4000,
                fps: 60,
                timeslice: 1000,
                ...(settings.video || {})
            };

            const audioSettings = {
                systemAudioEnabled: true,  // Default: record system audio
                ...(settings.audio || {})
            };

            console.log('Video settings:', videoSettings);
            console.log('Audio settings:', audioSettings);

            // Resolution presets
            const resolutionPresets = {
                '2160p': { width: 3840, height: 2160 },  // 4K Ultra HD
                '1440p': { width: 2560, height: 1440 },  // 2K Quad HD
                '1080p': { width: 1920, height: 1080 },  // Full HD
                '720p': { width: 1280, height: 720 },   // HD
                '480p': { width: 854, height: 480 }     // SD
            };

            const resolution = resolutionPresets[videoSettings.resolution] || resolutionPresets['1080p'];

            // Request screen capture with audio (system audio)
            // Use systemAudio: 'include' to hint Chrome to show audio sharing option
            const displayMediaOptions = {
                video: {
                    displaySurface: "monitor",
                    logicalSurface: true,
                    cursor: "always",
                    width: { ideal: resolution.width },
                    height: { ideal: resolution.height },
                    frameRate: { ideal: videoSettings.fps, max: 120 }
                },
                audio: audioSettings.systemAudioEnabled ? {
                    // Chrome 105+ supports systemAudio hint
                    // This tells the browser to show the "Share system audio" option
                    suppressLocalAudioPlayback: false
                } : false,
                // Chrome 105+: Hint to include system audio in the sharing dialog
                systemAudio: audioSettings.systemAudioEnabled ? 'include' : 'exclude',
                // Prefer current tab for easier audio capture
                preferCurrentTab: false,
                // Allow user to select any surface
                selfBrowserSurface: 'include',
                surfaceSwitching: 'include',
                monitorTypeSurfaces: 'include'
            };

            console.log("getDisplayMedia options:", displayMediaOptions);
            this.stream = await navigator.mediaDevices.getDisplayMedia(displayMediaOptions);

            // Also request microphone audio
            try {
                this.micStream = await navigator.mediaDevices.getUserMedia({
                    audio: {
                        echoCancellation: true,
                        noiseSuppression: true,
                        sampleRate: 44100
                    }
                });
            } catch (micError) {
                console.warn("Could not access microphone:", micError);
            }

            // Create audio context for mixing and mic control
            this.audioContext = new AudioContext();
            const audioDestination = this.audioContext.createMediaStreamDestination();

            // Check what audio tracks we have from screen capture
            const screenAudioTracks = this.stream.getAudioTracks();
            console.log(`Screen capture audio tracks: ${screenAudioTracks.length}`);

            // Add screen audio if available and enabled
            if (audioSettings.systemAudioEnabled) {
                if (screenAudioTracks.length > 0) {
                    const screenAudioTrack = screenAudioTracks[0];
                    const screenSource = this.audioContext.createMediaStreamSource(
                        new MediaStream([screenAudioTrack])
                    );
                    screenSource.connect(audioDestination);
                    console.log("✅ System audio: ENABLED and connected");
                    console.log(`   Track label: ${screenAudioTrack.label}`);
                } else {
                    console.warn("⚠️ System audio was requested but not available!");
                    console.warn("   Make sure to check 'Share audio' in the screen sharing dialog");
                    console.warn("   Note: Audio sharing only works when sharing a tab or entire screen, not a window");
                }
            } else {
                console.log("ℹ️ System audio: DISABLED by user setting");
            }

            // Add microphone audio with gain control
            if (this.micStream) {
                const micAudioTrack = this.micStream.getAudioTracks()[0];
                if (micAudioTrack) {
                    const micSource = this.audioContext.createMediaStreamSource(
                        new MediaStream([micAudioTrack])
                    );

                    // Create gain node for mic muting
                    this.micGainNode = this.audioContext.createGain();
                    this.micGainNode.gain.value = 1; // Start unmuted

                    micSource.connect(this.micGainNode);
                    this.micGainNode.connect(audioDestination);
                }
            }

            // Create final stream with video + mixed audio
            const videoTrack = this.stream.getVideoTracks()[0];
            const finalStream = new MediaStream([
                videoTrack,
                ...audioDestination.stream.getAudioTracks()
            ]);

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
                videoBitsPerSecond: videoSettings.bitrate * 1000,
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
            this.pausedDuration = 0;  // Track total paused time
            this.pauseStartTime = 0;  // Track when current pause started
            this.startTimer();

            this.stream.getVideoTracks()[0].onended = async () => {
                console.log("Screen sharing stopped by user via browser controls");
                // Handle both recording and paused states
                if (this.mediaRecorder && (this.mediaRecorder.state === 'recording' || this.mediaRecorder.state === 'paused')) {
                    const result = await this.stop();
                    // Notify the injector so it can update UI and save the file
                    if (this.onExternalStop && result) {
                        this.onExternalStop(result);
                    }
                }
            };

            console.log(`Screen recording started for ${this.platform}`);
            console.log(`Settings: ${videoSettings.resolution} @ ${videoSettings.fps}fps, timeslice: ${videoSettings.timeslice}ms`);
            console.log(`Microphone: ${this.micStream ? 'enabled' : 'disabled'}`);

            return true;
        } catch (error) {
            console.error("Error starting screen recording:", error);
            if (error.name !== 'NotAllowedError') {
                alert("Could not start screen recording. Please check permissions.");
            }
            return false;
        }
    }

    /**
     * Pause the screen recording
     */
    pause() {
        console.log("ScreenRecorder.pause() called");

        if (!this.mediaRecorder) {
            console.log("  FAILED: mediaRecorder is null");
            return false;
        }

        if (this.mediaRecorder.state !== 'recording') {
            console.log("  FAILED: mediaRecorder.state is not 'recording', it's:", this.mediaRecorder.state);
            return false;
        }

        this.mediaRecorder.pause();
        this.isPaused = true;
        this.pauseStartTime = Date.now();

        // Stop the timer display
        this.stopTimer();

        console.log("  SUCCESS: Screen recording paused");
        return true;
    }

    /**
     * Resume the screen recording
     */
    resume() {
        console.log("ScreenRecorder.resume() called");

        if (!this.mediaRecorder) {
            console.log("  FAILED: mediaRecorder is null");
            return false;
        }

        if (this.mediaRecorder.state !== 'paused') {
            console.log("  FAILED: mediaRecorder.state is not 'paused', it's:", this.mediaRecorder.state);
            return false;
        }

        // Calculate how long we were paused
        if (this.pauseStartTime > 0) {
            this.pausedDuration += Date.now() - this.pauseStartTime;
            console.log("  Total paused duration so far:", this.pausedDuration, "ms");
        }

        this.mediaRecorder.resume();
        this.isPaused = false;
        this.pauseStartTime = 0;

        // Restart the timer (adjusted for paused time)
        this.startTimer();

        console.log("  SUCCESS: Screen recording resumed");
        return true;
    }

    /**
     * Check if recording is paused
     */
    get paused() {
        return this.isPaused || false;
    }

    /**
     * Mute the microphone (audio from screen will still be recorded)
     */
    muteMic() {
        if (!this.micGainNode || this.isMicMuted) return false;

        this.micGainNode.gain.value = 0;
        this.isMicMuted = true;

        if (this.onMicStateChange) {
            this.onMicStateChange(true); // true = muted
        }

        console.log("Microphone muted");
        return true;
    }

    /**
     * Unmute the microphone
     */
    unmuteMic() {
        if (!this.micGainNode || !this.isMicMuted) return false;

        this.micGainNode.gain.value = 1;
        this.isMicMuted = false;

        if (this.onMicStateChange) {
            this.onMicStateChange(false); // false = unmuted
        }

        console.log("Microphone unmuted");
        return true;
    }

    /**
     * Toggle microphone mute state
     * @returns {boolean} New mute state (true = muted, false = unmuted)
     */
    toggleMic() {
        if (this.isMicMuted) {
            this.unmuteMic();
            return false;
        } else {
            this.muteMic();
            return true;
        }
    }

    /**
     * Check if microphone is currently muted
     */
    get micMuted() {
        return this.isMicMuted;
    }

    /**
     * Check if microphone is available
     */
    get hasMic() {
        return this.micStream !== null && this.micGainNode !== null;
    }

    stop() {
        return new Promise((resolve) => {
            if (!this.mediaRecorder) {
                resolve(null);
                return;
            }

            this.stopTimer();

            // If stopped while paused, add the final pause duration
            if (this.isPaused && this.pauseStartTime > 0) {
                this.pausedDuration += Date.now() - this.pauseStartTime;
            }

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
                this.micGainNode = null;
                this.isMicMuted = false;
                this.isPaused = false;

                // Create blob from recorded chunks
                const rawBlob = new Blob(this.recordedChunks, { type: 'video/webm' });
                const totalDuration = Date.now() - this.startTime;
                const actualDuration = totalDuration - (this.pausedDuration || 0);

                console.log(`Raw WebM size: ${(rawBlob.size / 1024 / 1024).toFixed(2)} MB`);
                console.log(`Total time: ${Math.floor(totalDuration / 1000)}s, Paused: ${Math.floor((this.pausedDuration || 0) / 1000)}s, Actual: ${Math.floor(actualDuration / 1000)}s`);

                // Fix WebM duration metadata for Gemini compatibility
                let fixedBlob;
                try {
                    console.log("Fixing WebM duration metadata...");
                    fixedBlob = await fixWebmDuration(rawBlob, actualDuration);
                    console.log("WebM duration fixed successfully!");
                } catch (e) {
                    console.warn("Could not fix WebM duration:", e);
                    fixedBlob = rawBlob;
                }

                console.log(`Final WebM size: ${(fixedBlob.size / 1024 / 1024).toFixed(2)} MB`);

                this.mediaRecorder = null;
                this.recordedChunks = [];
                this.pausedDuration = 0;
                this.pauseStartTime = 0;

                resolve({
                    blob: fixedBlob,
                    duration: actualDuration,
                    format: 'webm'
                });
            };

            if (this.mediaRecorder.state === 'recording' || this.mediaRecorder.state === 'paused') {
                this.mediaRecorder.stop();
            } else {
                const blob = new Blob(this.recordedChunks, { type: 'video/webm' });
                this.mediaRecorder = null;
                this.recordedChunks = [];
                this.isPaused = false;
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
            // Calculate elapsed time minus any paused duration
            const elapsed = Date.now() - this.startTime - (this.pausedDuration || 0);
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

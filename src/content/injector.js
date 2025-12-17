export class Injector {
    constructor(recorder, screenRecorder, handleUpload, handleVideoUpload) {
        this.recorder = recorder;
        this.screenRecorder = screenRecorder;
        this.handleUpload = handleUpload;
        this.handleVideoUpload = handleVideoUpload;

        // Buttons
        this.button = null;           // Audio record button
        this.screenButton = null;     // Screen record button  
        this.pauseButton = null;      // Pause button (appears during recording)

        // State
        this.isRecording = false;
        this.isRecordingPaused = false;
        this.isScreenRecording = false;
        this.isScreenPaused = false;
        this.isMicMuted = false;
        this.audioRecordingStartUrl = null;
        this.videoRecordingStartUrl = null;
    }

    createButton() {
        const btn = document.createElement('button');
        btn.id = 'thoughtful-voice-btn';
        btn.innerHTML = '🎙️';
        btn.className = 'ai-voice-btn';
        btn.title = 'Record audio';

        btn.onclick = async () => {
            // If screen recording, control mic
            if (this.isScreenRecording) {
                this.toggleMicDuringScreenRecording();
                return;
            }

            // Audio: click = start/stop
            if (this.isRecording) {
                await this.stopRecording();
            } else {
                const startUrl = await this.startRecording();
                this.audioRecordingStartUrl = startUrl;
            }
        };

        this.button = btn;
        return btn;
    }

    createScreenRecordButton() {
        const btn = document.createElement('button');
        btn.id = 'ai-screen-recorder-btn';
        btn.innerHTML = '📺';
        btn.className = 'ai-voice-btn';
        btn.title = 'Record screen';

        btn.onclick = async () => {
            // Screen: click = start/stop
            if (this.isScreenRecording) {
                await this.stopScreenRecording();
            } else {
                const startUrl = await this.startScreenRecording();
                this.videoRecordingStartUrl = startUrl;
            }
        };

        this.screenButton = btn;
        return btn;
    }

    createPauseButton() {
        const btn = document.createElement('button');
        btn.id = 'ai-pause-btn';
        btn.innerHTML = '⏸';
        btn.className = 'ai-voice-btn pause-btn';
        btn.title = 'Pause';
        btn.style.display = 'none';

        btn.onclick = () => {
            if (this.isRecording) {
                this.toggleRecordingPause();
            } else if (this.isScreenRecording) {
                this.toggleScreenPause();
            }
        };

        this.pauseButton = btn;
        return btn;
    }

    // ========== Audio Recording ==========

    async startRecording() {
        const startUrl = window.location.href;

        const started = await this.recorder.start((time) => {
            if (this.button) {
                this.button.innerHTML = `🔴 ${time}`;
            }
        });

        if (started) {
            this.isRecording = true;
            this.isRecordingPaused = false;
            this.button.classList.add('recording');
            this.button.innerHTML = '🔴 00:00';
            this.button.title = 'Stop recording';

            // Show pause button, hide screen button
            this.showPauseButton();
            if (this.screenButton) this.screenButton.style.display = 'none';
        }

        return startUrl;
    }

    toggleRecordingPause() {
        if (this.isRecordingPaused) {
            // Resume
            const resumed = this.recorder.resume();
            if (resumed) {
                this.isRecordingPaused = false;
                this.button.classList.remove('paused');
                this.pauseButton.innerHTML = '⏸';
                this.pauseButton.title = 'Pause';
            }
        } else {
            // Pause
            const paused = this.recorder.pause();
            if (paused) {
                this.isRecordingPaused = true;
                this.button.classList.add('paused');
                this.pauseButton.innerHTML = '▶';
                this.pauseButton.title = 'Resume';
            }
        }
    }

    async stopRecording() {
        this.isRecording = false;
        this.isRecordingPaused = false;
        this.button.classList.remove('recording', 'paused');
        this.button.innerHTML = '⏳';
        this.button.title = 'Processing...';

        this.hidePauseButton();

        const result = await this.recorder.stop();

        this.button.innerHTML = '🎙️';
        this.button.title = 'Record audio';
        if (this.screenButton) this.screenButton.style.display = '';

        if (result) {
            console.log("Audio recorded:", result);
            await this.handleUpload(result.blob, result.duration);
        }
    }

    // ========== Screen Recording ==========

    async startScreenRecording() {
        const startUrl = window.location.href;

        // Set up callback for when user stops screen sharing via browser controls
        this.screenRecorder.onExternalStop = async (result) => {
            console.log("External stop detected, processing recording...");

            // Update UI state
            this.isScreenRecording = false;
            this.isScreenPaused = false;
            this.isMicMuted = false;
            this.screenButton.classList.remove('screen-recording', 'paused');
            this.screenButton.innerHTML = '⏳';
            this.screenButton.title = 'Processing...';

            this.hidePauseButton();
            this.updateMicButtonState();

            // Process and save the recording
            this.screenButton.innerHTML = '📺';
            this.screenButton.title = 'Record screen';

            if (result) {
                console.log("Screen recording completed via external stop:", result);
                await this.handleVideoUpload(result);
            }
        };

        const started = await this.screenRecorder.start(
            (time) => {
                if (this.screenButton) {
                    this.screenButton.innerHTML = `🔴 ${time}`;
                }
            },
            (isMuted) => {
                this.isMicMuted = isMuted;
                this.updateMicButtonState();
            }
        );

        if (started) {
            this.isScreenRecording = true;
            this.isScreenPaused = false;
            this.isMicMuted = false;
            this.screenButton.classList.add('screen-recording');
            this.screenButton.innerHTML = '🔴 00:00';
            this.screenButton.title = 'Stop recording';

            // Show pause button, update audio button to mic control
            this.showPauseButton();
            this.updateMicButtonState();
        }

        return startUrl;
    }

    toggleScreenPause() {
        console.log("toggleScreenPause called, isScreenPaused:", this.isScreenPaused);

        if (this.isScreenPaused) {
            // Resume
            const resumed = this.screenRecorder.resume();
            console.log("Screen resume result:", resumed);
            if (resumed) {
                this.isScreenPaused = false;
                this.screenButton.classList.remove('paused');
                this.pauseButton.innerHTML = '⏸';
                this.pauseButton.title = 'Pause';
                // Update mic button to show active state
                this.updateMicButtonState();
            }
        } else {
            // Pause
            const paused = this.screenRecorder.pause();
            console.log("Screen pause result:", paused);
            if (paused) {
                this.isScreenPaused = true;
                this.screenButton.classList.add('paused');
                this.pauseButton.innerHTML = '▶';
                this.pauseButton.title = 'Resume';
                // Update mic button to show paused state
                this.updateMicButtonState();
            }
        }
    }

    async stopScreenRecording() {
        this.isScreenRecording = false;
        this.isScreenPaused = false;
        this.isMicMuted = false;
        this.screenButton.classList.remove('screen-recording', 'paused');
        this.screenButton.innerHTML = '⏳';
        this.screenButton.title = 'Processing...';

        this.hidePauseButton();
        this.updateMicButtonState();

        const result = await this.screenRecorder.stop();

        this.screenButton.innerHTML = '📺';
        this.screenButton.title = 'Record screen';

        if (result) {
            console.log("Screen recording completed:", result);
            await this.handleVideoUpload(result);
        }
    }

    // ========== Pause Button Control ==========

    showPauseButton() {
        if (this.pauseButton) {
            this.pauseButton.style.display = '';
            this.pauseButton.innerHTML = '⏸';
            this.pauseButton.title = 'Pause';
        }
    }

    hidePauseButton() {
        if (this.pauseButton) {
            this.pauseButton.style.display = 'none';
        }
    }

    // ========== Mic Control ==========

    toggleMicDuringScreenRecording() {
        // Don't allow mic toggle when paused
        if (!this.isScreenRecording || !this.screenRecorder.hasMic || this.isScreenPaused) return;

        const newMuteState = this.screenRecorder.toggleMic();
        this.isMicMuted = newMuteState;
        this.updateMicButtonState();
    }

    updateMicButtonState() {
        if (!this.button) return;

        if (this.isScreenRecording) {
            this.button.classList.add('mic-control');

            // When paused, show paused state for mic button too
            if (this.isScreenPaused) {
                this.button.innerHTML = '⏸️';
                this.button.classList.remove('mic-muted', 'mic-active', 'mic-unavailable');
                this.button.classList.add('mic-paused');
                this.button.title = 'Recording paused';
            } else if (this.screenRecorder.hasMic) {
                this.button.classList.remove('mic-paused');
                if (this.isMicMuted) {
                    this.button.innerHTML = '🔇';
                    this.button.classList.add('mic-muted');
                    this.button.classList.remove('mic-active');
                    this.button.title = 'Mic OFF - Click to unmute';
                } else {
                    this.button.innerHTML = '🎙️';
                    this.button.classList.add('mic-active');
                    this.button.classList.remove('mic-muted');
                    this.button.title = 'Mic ON - Click to mute';
                }
            } else {
                this.button.classList.remove('mic-paused');
                this.button.innerHTML = '🚫';
                this.button.classList.add('mic-unavailable');
                this.button.title = 'No microphone';
            }
        } else {
            this.button.classList.remove('mic-control', 'mic-muted', 'mic-active', 'mic-unavailable', 'mic-paused');
            this.button.innerHTML = '🎙️';
            this.button.title = 'Record audio';
        }
    }

    // ========== Injection ==========

    inject(targetSpec) {
        if (!this.button) this.createButton();
        if (!this.screenButton) this.createScreenRecordButton();
        if (!this.pauseButton) this.createPauseButton();

        if (document.getElementById('thoughtful-voice-btn')) return;

        let container = null;
        let insertBefore = null;

        if (targetSpec instanceof Element) {
            container = targetSpec;
        } else if (targetSpec && targetSpec.container) {
            container = targetSpec.container;
            insertBefore = targetSpec.insertBefore || null;
        }

        if (container) {
            if (insertBefore) {
                try {
                    container.insertBefore(this.button, insertBefore);
                    container.insertBefore(this.screenButton, insertBefore);
                    container.insertBefore(this.pauseButton, insertBefore);
                } catch (e) {
                    console.warn("Injection failed, falling back to append", e);
                    container.appendChild(this.button);
                    container.appendChild(this.screenButton);
                    container.appendChild(this.pauseButton);
                }
            } else {
                container.appendChild(this.button);
                container.appendChild(this.screenButton);
                container.appendChild(this.pauseButton);
            }
        } else {
            document.body.appendChild(this.button);
            this.button.style.position = 'fixed';
            this.button.style.bottom = '100px';
            this.button.style.right = '20px';
            this.button.style.zIndex = '9999';

            document.body.appendChild(this.screenButton);
            this.screenButton.style.position = 'fixed';
            this.screenButton.style.bottom = '100px';
            this.screenButton.style.right = '80px';
            this.screenButton.style.zIndex = '9999';

            document.body.appendChild(this.pauseButton);
            this.pauseButton.style.position = 'fixed';
            this.pauseButton.style.bottom = '100px';
            this.pauseButton.style.right = '140px';
            this.pauseButton.style.zIndex = '9999';
        }
        console.log("Buttons injected");
    }
}

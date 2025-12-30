export class Injector {
    constructor(recorder, screenRecorder, handleUpload, handleVideoUpload) {
        this.recorder = recorder;
        this.screenRecorder = screenRecorder;
        this.handleUpload = handleUpload;
        this.handleVideoUpload = handleVideoUpload;

        // UI Style (simple or aesthetic)
        this.uiStyle = 'aesthetic'; // Default to aesthetic, will be loaded from settings

        // Simple UI Buttons
        this.button = null;           // Audio record button
        this.screenButton = null;     // Screen record button  
        this.pauseButton = null;      // Pause button (appears during recording)

        // Aesthetic UI Modules
        this.audioModule = null;
        this.screenModule = null;

        // State
        this.isRecording = false;
        this.isRecordingPaused = false;
        this.isScreenRecording = false;
        this.isScreenPaused = false;
        this.isMicMuted = false;
        this.audioRecordingStartUrl = null;
        this.videoRecordingStartUrl = null;

        // Waveform animation interval
        this.waveformInterval = null;
        this.notificationTimeout = null;
        this.notificationClosingTimeout = null;

        // Icons - Apple Style SVGs
        this.icons = {
            mic: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"></path><path d="M19 10v2a7 7 0 0 1-14 0v-2"></path><line x1="12" y1="19" x2="12" y2="23"></line><line x1="8" y1="23" x2="16" y2="23"></line></svg>`,
            micMuted: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="1" y1="1" x2="23" y2="23"></line><path d="M9 10v2a3 3 0 0 0 3 3v0"></path><path d="M15 10.34V4a3 3 0 0 0-5.94-.6"></path><path d="M17 10v2a7 7 0 0 1-14 0v-2"></path><line x1="12" y1="19" x2="12" y2="23"></line><line x1="8" y1="23" x2="16" y2="23"></line></svg>`,
            screen: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect><line x1="8" y1="21" x2="16" y2="21"></line><line x1="12" y1="17" x2="12" y2="21"></line></svg>`,
            pause: `<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16" rx="1"></rect><rect x="14" y="4" width="4" height="16" rx="1"></rect></svg>`,
            play: `<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"></path></svg>`,
            stop: `<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><rect x="4" y="4" width="16" height="16" rx="2"></rect></svg>`,
            loading: `<svg class="thoughtful-spin" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="2" x2="12" y2="6"></line><line x1="12" y1="18" x2="12" y2="22"></line><line x1="4.93" y1="4.93" x2="7.76" y2="7.76"></line><line x1="16.24" y1="16.24" x2="19.07" y2="19.07"></line><line x1="2" y1="12" x2="6" y2="12"></line><line x1="18" y1="12" x2="22" y2="12"></line><line x1="4.93" y1="19.07" x2="7.76" y2="16.24"></line><line x1="16.24" y1="7.76" x2="19.07" y2="4.93"></line></svg>`,
            dot: `<span class="record-dot"></span>`,
            none: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"></line></svg>`
        };
    }

    // ========== Simple UI Button Creation ==========

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
        btn.innerHTML = this.icons.pause;
        btn.className = 'ai-voice-btn pause-btn';
        btn.title = 'Pause';
        btn.classList.add('hidden');

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

    // ========== Aesthetic UI Module Creation ==========

    createAudioModule() {
        const module = document.createElement('div');
        module.id = 'aesthetic-audio-module';
        module.className = 'aesthetic-module audio-module idle';

        module.innerHTML = `
            <div class="audio-main">
                <div class="reel-chassis">
                    <div class="reel-housing">
                        <div class="tape-mechanism">
                            <div class="bearing-ruby"></div>
                        </div>
                    </div>
                    <div class="pause-overlay">
                        <div class="pause-text"></div>
                    </div>
                </div>
            </div>
            <div class="audio-sidecar">
                <div class="led-timer">00:00</div>
                <div class="waveform-v12">
                    <div class="wave-bar-v12"></div>
                    <div class="wave-bar-v12"></div>
                    <div class="wave-bar-v12"></div>
                    <div class="wave-bar-v12"></div>
                    <div class="wave-bar-v12"></div>
                    <div class="wave-bar-v12"></div>
                    <div class="wave-bar-v12"></div>
                    <div class="wave-bar-v12"></div>
                    <div class="wave-bar-v12"></div>
                </div>
                <div class="action-ctrl pause-btn-aesthetic">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/>
                    </svg>
                </div>
            </div>
        `;

        // Main click handler (start/stop)
        const audioMain = module.querySelector('.audio-main');
        audioMain.onclick = async () => {
            if (this.isScreenRecording) {
                this.toggleMicDuringScreenRecording();
                return;
            }
            if (this.isRecording) {
                await this.stopRecording();
            } else {
                const startUrl = await this.startRecording();
                this.audioRecordingStartUrl = startUrl;
            }
        };

        // Pause button handler
        const pauseBtn = module.querySelector('.pause-btn-aesthetic');
        pauseBtn.onclick = (e) => {
            e.stopPropagation();
            this.toggleRecordingPause();
        };

        this.audioModule = module;
        return module;
    }

    createScreenModule() {
        const module = document.createElement('div');
        module.id = 'aesthetic-screen-module';
        module.className = 'aesthetic-module screen-module idle';

        module.innerHTML = `
            <div class="screen-main">
                <div class="antenna-system">
                    <div class="antenna left"></div>
                    <div class="antenna right"></div>
                </div>
                <div class="monitor-chassis">
                    <div class="crt-glass">
                        <div class="grid-system">
                            <div class="grid-sweep"></div>
                            <div class="grid-markers"></div>
                        </div>
                        <div class="crt-scanlines"></div>
                        <div class="crt-noise"></div>
                        <div class="viewfinder">
                            <div style="font-size: 7px; color: var(--phosphor-green); font-weight: 700;">
                                <span class="live-dot"></span>LIVE
                            </div>
                            <div style="font-size: 6px; color: #FFF; text-align: right; margin-top: auto; opacity: 0.6;">
                                SYSTEM ACTIVE
                            </div>
                        </div>
                        <div class="pause-overlay">
                            <div class="pause-text"></div>
                        </div>
                    </div>
                </div>
            </div>
            <div class="screen-sidecar">
                <div class="led-timer">00:00</div>
                <div class="action-ctrl mute-btn">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                        <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"></path>
                        <path d="M19 10v2a7 7 0 0 1-14 0v-2"></path>
                    </svg>
                </div>
                <div class="action-ctrl pause-btn-aesthetic">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/>
                    </svg>
                </div>
            </div>
        `;

        // Main click handler (start/stop)
        const screenMain = module.querySelector('.screen-main');
        screenMain.onclick = async () => {
            if (this.isScreenRecording) {
                await this.stopScreenRecording();
            } else {
                const startUrl = await this.startScreenRecording();
                this.videoRecordingStartUrl = startUrl;
            }
        };

        // Mute button handler
        const muteBtn = module.querySelector('.mute-btn');
        muteBtn.onclick = (e) => {
            e.stopPropagation();
            this.toggleMicDuringScreenRecording();
        };

        // Pause button handler
        const pauseBtn = module.querySelector('.pause-btn-aesthetic');
        pauseBtn.onclick = (e) => {
            e.stopPropagation();
            this.toggleScreenPause();
        };

        this.screenModule = module;
        return module;
    }

    // ========== Audio Recording ==========

    async startRecording() {
        const startUrl = window.location.href;

        const started = await this.recorder.start((time) => {
            // Update simple UI
            if (this.button) {
                this.button.innerHTML = `${this.icons.dot} ${time}`;
            }
            // Update aesthetic UI
            if (this.audioModule) {
                const timer = this.audioModule.querySelector('.led-timer');
                if (timer) timer.textContent = time;
            }
        });

        if (started) {
            this.isRecording = true;
            this.isRecordingPaused = false;

            // Simple UI updates
            if (this.button) {
                this.button.classList.add('recording');
                this.button.innerHTML = `${this.icons.dot} 00:00`;
                this.button.title = 'Stop recording';
            }
            this.showPauseButton();
            if (this.screenButton) this.screenButton.classList.add('hidden');

            // Aesthetic UI updates
            if (this.audioModule) {
                this.audioModule.classList.remove('idle');
                this.audioModule.classList.add('recording');
                this.startWaveformAnimation();
            }
            if (this.screenModule) {
                this.screenModule.classList.add('disabled');
            }
        }

        return startUrl;
    }

    toggleRecordingPause() {
        if (this.isRecordingPaused) {
            // Resume
            const resumed = this.recorder.resume();
            if (resumed) {
                this.isRecordingPaused = false;

                // Simple UI
                if (this.button) this.button.classList.remove('paused');
                if (this.pauseButton) {
                    this.pauseButton.innerHTML = this.icons.pause;
                    this.pauseButton.title = 'Pause';
                }

                // Aesthetic UI
                if (this.audioModule) {
                    this.audioModule.classList.remove('paused');
                    this.updateAestheticPauseIcon('audio', false);
                }
            }
        } else {
            // Pause
            const paused = this.recorder.pause();
            if (paused) {
                this.isRecordingPaused = true;

                // Simple UI
                if (this.button) this.button.classList.add('paused');
                if (this.pauseButton) {
                    this.pauseButton.innerHTML = this.icons.play;
                    this.pauseButton.title = 'Resume';
                }

                // Aesthetic UI
                if (this.audioModule) {
                    this.audioModule.classList.add('paused');
                    this.updateAestheticPauseIcon('audio', true);
                }
            }
        }
    }

    async stopRecording() {
        this.isRecording = false;
        this.isRecordingPaused = false;
        this.stopWaveformAnimation();

        // Simple UI
        if (this.button) {
            this.button.classList.remove('recording', 'paused');
            this.button.innerHTML = this.icons.loading;
            this.button.title = 'Processing...';
        }
        this.hidePauseButton();

        // Aesthetic UI
        if (this.audioModule) {
            this.audioModule.classList.remove('recording', 'paused');
            this.audioModule.classList.add('idle');
        }
        if (this.screenModule) {
            this.screenModule.classList.remove('disabled');
        }

        const result = await this.recorder.stop();

        // Restore UI
        if (this.button) {
            this.button.innerHTML = '🎙️';
            this.button.title = 'Record audio';
        }
        if (this.screenButton) this.screenButton.classList.remove('hidden');

        // Reset aesthetic timer
        if (this.audioModule) {
            const timer = this.audioModule.querySelector('.led-timer');
            if (timer) timer.textContent = '00:00';
        }

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

            // Simple UI
            if (this.screenButton) {
                this.screenButton.classList.remove('screen-recording', 'paused');
                this.screenButton.innerHTML = this.icons.loading;
                this.screenButton.title = 'Processing...';
            }
            this.hidePauseButton();
            this.updateMicButtonState();

            // Aesthetic UI
            if (this.screenModule) {
                this.screenModule.classList.remove('recording', 'paused');
                this.screenModule.classList.add('idle');
            }
            if (this.audioModule) {
                this.audioModule.classList.remove('disabled');
            }

            // Process and save the recording
            if (this.screenButton) {
                this.screenButton.innerHTML = '📺';
                this.screenButton.title = 'Record screen';
            }

            // Reset aesthetic timer
            if (this.screenModule) {
                const timer = this.screenModule.querySelector('.led-timer');
                if (timer) timer.textContent = '00:00';
            }

            if (result) {
                console.log("Screen recording completed via external stop:", result);
                await this.handleVideoUpload(result);
            }
        };

        const started = await this.screenRecorder.start(
            (time) => {
                // Update simple UI
                if (this.screenButton) {
                    this.screenButton.innerHTML = `${this.icons.dot} ${time}`;
                }
                // Update aesthetic UI
                if (this.screenModule) {
                    const timer = this.screenModule.querySelector('.led-timer');
                    if (timer) timer.textContent = time;
                }
            },
            (isMuted) => {
                this.isMicMuted = isMuted;
                this.updateMicButtonState();
                this.updateAestheticMuteState();
            }
        );

        if (started) {
            this.isScreenRecording = true;
            this.isScreenPaused = false;
            this.isMicMuted = false;

            // Simple UI
            if (this.screenButton) {
                this.screenButton.classList.add('screen-recording');
                this.screenButton.innerHTML = `${this.icons.dot} 00:00`;
                this.screenButton.title = 'Stop recording';
            }
            this.showPauseButton();
            this.updateMicButtonState();

            // Aesthetic UI
            if (this.screenModule) {
                this.screenModule.classList.remove('idle');
                this.screenModule.classList.add('recording');
            }
            if (this.audioModule) {
                this.audioModule.classList.add('disabled');
            }
            this.updateAestheticMuteState();
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

                // Simple UI
                if (this.screenButton) this.screenButton.classList.remove('paused');
                if (this.pauseButton) {
                    this.pauseButton.innerHTML = this.icons.pause;
                    this.pauseButton.title = 'Pause';
                }
                this.updateMicButtonState();

                // Aesthetic UI
                if (this.screenModule) {
                    this.screenModule.classList.remove('paused');
                    this.updateAestheticPauseIcon('screen', false);
                }
            }
        } else {
            // Pause
            const paused = this.screenRecorder.pause();
            console.log("Screen pause result:", paused);
            if (paused) {
                this.isScreenPaused = true;

                // Simple UI
                if (this.screenButton) this.screenButton.classList.add('paused');
                if (this.pauseButton) {
                    this.pauseButton.innerHTML = this.icons.play;
                    this.pauseButton.title = 'Resume';
                }
                this.updateMicButtonState();

                // Aesthetic UI
                if (this.screenModule) {
                    this.screenModule.classList.add('paused');
                    this.updateAestheticPauseIcon('screen', true);
                }
            }
        }
    }

    async stopScreenRecording() {
        this.isScreenRecording = false;
        this.isScreenPaused = false;
        this.isMicMuted = false;

        // Simple UI
        if (this.screenButton) {
            this.screenButton.classList.remove('screen-recording', 'paused');
            this.screenButton.innerHTML = this.icons.loading;
            this.screenButton.title = 'Processing...';
        }
        this.hidePauseButton();
        this.updateMicButtonState();

        // Aesthetic UI
        if (this.screenModule) {
            this.screenModule.classList.remove('recording', 'paused');
            this.screenModule.classList.add('idle');
        }
        if (this.audioModule) {
            this.audioModule.classList.remove('disabled');
        }

        const result = await this.screenRecorder.stop();

        // Restore UI
        if (this.screenButton) {
            this.screenButton.innerHTML = '📺';
            this.screenButton.title = 'Record screen';
        }

        // Reset aesthetic timer
        if (this.screenModule) {
            const timer = this.screenModule.querySelector('.led-timer');
            if (timer) timer.textContent = '00:00';
        }

        if (result) {
            console.log("Screen recording completed:", result);
            await this.handleVideoUpload(result);
        }
    }

    // ========== Pause Button Control ==========

    showPauseButton() {
        if (this.pauseButton) {
            this.pauseButton.classList.remove('hidden');
            this.pauseButton.innerHTML = this.icons.pause;
            this.pauseButton.title = 'Pause';
        }
    }

    hidePauseButton() {
        if (this.pauseButton) {
            this.pauseButton.classList.add('hidden');
        }
    }

    // ========== Mic Control ==========

    toggleMicDuringScreenRecording() {
        // Don't allow mic toggle when paused
        if (!this.isScreenRecording || !this.screenRecorder.hasMic || this.isScreenPaused) return;

        const newMuteState = this.screenRecorder.toggleMic();
        this.isMicMuted = newMuteState;
        this.updateMicButtonState();
        this.updateAestheticMuteState();
    }

    updateMicButtonState() {
        if (!this.button) return;

        if (this.isScreenRecording) {
            this.button.classList.add('mic-control');

            // When paused, show paused state for mic button too
            if (this.isScreenPaused) {
                this.button.innerHTML = this.icons.pause;
                this.button.classList.remove('mic-muted', 'mic-active', 'mic-unavailable');
                this.button.classList.add('mic-paused');
                this.button.title = 'Recording paused';
            } else if (this.screenRecorder.hasMic) {
                this.button.classList.remove('mic-paused');
                if (this.isMicMuted) {
                    this.button.innerHTML = this.icons.micMuted;
                    this.button.classList.add('mic-muted');
                    this.button.classList.remove('mic-active');
                    this.button.title = 'Mic OFF - Click to unmute';
                } else {
                    this.button.innerHTML = this.icons.mic;
                    this.button.classList.add('mic-active');
                    this.button.classList.remove('mic-muted');
                    this.button.title = 'Mic ON - Click to mute';
                }
            } else {
                this.button.classList.remove('mic-paused');
                this.button.innerHTML = this.icons.none;
                this.button.classList.add('mic-unavailable');
                this.button.title = 'No microphone';
            }
        } else {
            this.button.classList.remove('mic-control', 'mic-muted', 'mic-active', 'mic-unavailable', 'mic-paused');
            this.button.innerHTML = '🎙️';
            this.button.title = 'Record audio';
        }
    }

    // ========== Aesthetic UI Helpers ==========

    updateAestheticPauseIcon(type, isPaused) {
        const module = type === 'audio' ? this.audioModule : this.screenModule;
        if (!module) return;

        const pauseBtn = module.querySelector('.pause-btn-aesthetic');
        if (pauseBtn) {
            pauseBtn.innerHTML = isPaused
                ? '<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>'
                : '<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>';
        }
    }

    updateAestheticMuteState() {
        if (!this.screenModule) return;

        const muteBtn = this.screenModule.querySelector('.mute-btn');
        if (!muteBtn) return;

        if (this.isMicMuted) {
            muteBtn.classList.add('active');
            muteBtn.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                <path d="m1 1 22 22M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V4a3 3 0 0 0-5.94-.6"></path>
                <path d="M17 16.95A7 7 0 0 1 5 12v-2m14 0v2a7 7 0 0 1-.11 1.23M12 19v4M8 23h8"></path>
            </svg>`;
        } else {
            muteBtn.classList.remove('active');
            muteBtn.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"></path>
                <path d="M19 10v2a7 7 0 0 1-14 0v-2"></path>
            </svg>`;
        }
    }

    startWaveformAnimation() {
        if (this.waveformInterval) return;

        this.waveformInterval = setInterval(() => {
            if (!this.audioModule || this.isRecordingPaused) return;

            const bars = this.audioModule.querySelectorAll('.wave-bar-v12');
            bars.forEach((bar, i) => {
                const height = Math.floor(Math.random() * 24) + 2;
                bar.style.height = height + 'px';
                const isCenter = i >= 3 && i <= 6;
                bar.style.background = height > 22 ? 'var(--active-orange)' : (isCenter ? '#444' : '#777');
            });
        }, 100);
    }

    stopWaveformAnimation() {
        if (this.waveformInterval) {
            clearInterval(this.waveformInterval);
            this.waveformInterval = null;
        }

        // Reset bars
        if (this.audioModule) {
            const bars = this.audioModule.querySelectorAll('.wave-bar-v12');
            bars.forEach(bar => {
                bar.style.height = '4px';
                bar.style.background = '#555';
            });
        }
    }

    // ========== Injection ==========

    async inject(targetSpec) {
        // Load UI style setting
        try {
            const result = await chrome.storage.local.get(['settings']);
            const settings = result.settings || {};
            this.uiStyle = settings.uiStyle || 'aesthetic';
        } catch (e) {
            console.warn('Failed to load UI style setting, using default:', e);
            this.uiStyle = 'aesthetic';
        }

        // Apply UI style class to body
        document.body.classList.remove('ui-style-simple', 'ui-style-aesthetic');
        document.body.classList.add(`ui-style-${this.uiStyle}`);

        // Apply site-specific class for targeted CSS rules
        const hostname = window.location.hostname;
        document.body.classList.remove('site-chatgpt', 'site-gemini', 'site-aistudio', 'site-perplexity');
        if (hostname.includes('chatgpt.com') || hostname.includes('chat.openai.com')) {
            document.body.classList.add('site-chatgpt');
        } else if (hostname.includes('aistudio.google.com')) {
            document.body.classList.add('site-aistudio');
        } else if (hostname.includes('gemini.google.com')) {
            document.body.classList.add('site-gemini');
        } else if (hostname.includes('perplexity.ai')) {
            document.body.classList.add('site-perplexity');
        }

        // Always create both UIs (CSS will control visibility)
        if (!this.button) this.createButton();
        if (!this.screenButton) this.createScreenRecordButton();
        if (!this.pauseButton) this.createPauseButton();
        if (!this.audioModule) this.createAudioModule();
        if (!this.screenModule) this.createScreenModule();

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
            const injectElements = (elements) => {
                elements.forEach(el => {
                    if (insertBefore) {
                        try {
                            container.insertBefore(el, insertBefore);
                        } catch (e) {
                            container.appendChild(el);
                        }
                    } else {
                        container.appendChild(el);
                    }
                });
            };

            // Inject all elements (CSS controls visibility based on ui-style class)
            injectElements([
                this.button,
                this.screenButton,
                this.pauseButton,
                this.audioModule,
                this.screenModule
            ]);
        } else {
            // Fallback: fixed position
            const fixedStyle = (el, right) => {
                el.style.position = 'fixed';
                el.style.bottom = '100px';
                el.style.right = right;
                el.style.zIndex = '9999';
            };

            document.body.appendChild(this.button);
            fixedStyle(this.button, '20px');

            document.body.appendChild(this.screenButton);
            fixedStyle(this.screenButton, '80px');

            document.body.appendChild(this.pauseButton);
            fixedStyle(this.pauseButton, '140px');

            document.body.appendChild(this.audioModule);
            fixedStyle(this.audioModule, '200px');

            document.body.appendChild(this.screenModule);
            fixedStyle(this.screenModule, '300px');
        }

        console.log(`Buttons injected (UI Style: ${this.uiStyle})`);
    }
}
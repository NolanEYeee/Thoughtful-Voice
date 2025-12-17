export class Injector {
    constructor(recorder, screenRecorder, handleUpload, handleVideoUpload) {
        this.recorder = recorder;
        this.screenRecorder = screenRecorder;
        this.handleUpload = handleUpload;
        this.handleVideoUpload = handleVideoUpload;
        this.button = null;
        this.screenButton = null;
        this.isRecording = false;
        this.isScreenRecording = false;
        this.audioRecordingStartUrl = null;
        this.videoRecordingStartUrl = null;
    }

    createButton() {
        const btn = document.createElement('button');
        btn.id = 'thoughtful-voice-btn';
        btn.innerHTML = '🎙️'; // Default icon
        btn.className = 'ai-voice-btn';
        btn.title = 'Click to record audio';

        // Simple click toggle logic
        btn.onclick = async () => {
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
        btn.innerHTML = '📺'; // TV emoji
        btn.className = 'ai-voice-btn';
        btn.title = 'Click to record screen + audio';

        // Screen recording toggle logic
        btn.onclick = async () => {
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

    async startRecording() {
        // Capture URL when recording starts
        const startUrl = window.location.href;

        const started = await this.recorder.start((time) => {
            if (this.button) {
                this.button.innerHTML = `🔴 ${time}`;
            }
        });

        if (started) {
            this.isRecording = true;
            this.button.classList.add('recording');
            this.button.innerHTML = '🔴 00:00';
        }

        return startUrl; // Return the URL when recording started
    }

    async stopRecording() {
        this.isRecording = false;
        this.button.classList.remove('recording');
        this.button.innerHTML = '⏳'; // Processing

        const result = await this.recorder.stop();
        this.button.innerHTML = '🎙️';

        if (result) {
            console.log("Audio recorded:", result);
            // Call the upload handler
            await this.handleUpload(result.blob, result.duration);
        }
    }

    async startScreenRecording() {
        // Capture URL when screen recording starts
        const startUrl = window.location.href;

        const started = await this.screenRecorder.start((time) => {
            if (this.screenButton) {
                this.screenButton.innerHTML = `🔴 ${time}`;
            }
        });

        if (started) {
            this.isScreenRecording = true;
            this.screenButton.classList.add('screen-recording');
            this.screenButton.innerHTML = '🔴 00:00';
        }

        return startUrl; // Return the URL when recording started
    }

    async stopScreenRecording() {
        this.isScreenRecording = false;
        this.screenButton.classList.remove('screen-recording');
        this.screenButton.innerHTML = '⏳'; // Processing

        const result = await this.screenRecorder.stop();
        this.screenButton.innerHTML = '📺';

        if (result) {
            console.log("Screen recording completed:", result);
            // Call the video upload handler with the complete result object
            await this.handleVideoUpload(result);
        }
    }

    inject(targetSpec) {
        if (!this.button) this.createButton();
        if (!this.screenButton) this.createScreenRecordButton();

        // Avoid double injection
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
                // Insert audio button first
                try {
                    container.insertBefore(this.button, insertBefore);
                    // Insert screen button right after audio button
                    container.insertBefore(this.screenButton, insertBefore);
                } catch (e) {
                    console.warn("Injection failed with insertBefore, falling back to append", e);
                    container.appendChild(this.button);
                    container.appendChild(this.screenButton);
                }
            } else {
                // Append both buttons
                container.appendChild(this.button);
                container.appendChild(this.screenButton);
            }
        } else {
            // Fallback: Fixed position
            document.body.appendChild(this.button);
            this.button.style.position = 'fixed';
            this.button.style.bottom = '100px';
            this.button.style.right = '20px';
            this.button.style.zIndex = '9999';

            document.body.appendChild(this.screenButton);
            this.screenButton.style.position = 'fixed';
            this.screenButton.style.bottom = '100px';
            this.screenButton.style.right = '80px'; // To the left of audio button
            this.screenButton.style.zIndex = '9999';
        }
        console.log("Buttons injected (audio + screen)");
    }
}

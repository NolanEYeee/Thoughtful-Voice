export class Injector {
    constructor(recorder, handleUpload) {
        this.recorder = recorder;
        this.handleUpload = handleUpload;
        this.button = null;
        this.isRecording = false;
    }

    createButton() {
        const btn = document.createElement('button');
        btn.id = 'ai-voice-uploader-btn';
        btn.innerHTML = '🎙️'; // Default icon
        btn.className = 'ai-voice-btn';
        btn.title = 'Hold to record (or click to toggle)';

        // Simple click toggle logic
        btn.onclick = async () => {
            if (this.isRecording) {
                await this.stopRecording();
            } else {
                await this.startRecording();
            }
        };

        this.button = btn;
        return btn;
    }

    async startRecording() {
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

    inject(targetSpec) {
        if (!this.button) this.createButton();

        // Avoid double injection
        if (document.getElementById('ai-voice-uploader-btn')) return;

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
                // If insertBefore is valid and is a child of container (or we trust the caller)
                try {
                    container.insertBefore(this.button, insertBefore);
                } catch (e) {
                    console.warn("Injection failed with insertBefore, falling back to append", e);
                    container.appendChild(this.button);
                }
            } else {
                container.appendChild(this.button);
            }
        } else {
            // Fallback: Fixed position
            document.body.appendChild(this.button);
            this.button.style.position = 'fixed';
            this.button.style.bottom = '100px';
            this.button.style.right = '20px';
            this.button.style.zIndex = '9999';
        }
        console.log("Button injected");
    }
}

import { DEFAULT_PROMPT_TEXT, generateAudioFilename } from '../../utils/config.js';

export class GeminiStrategy {
    constructor() {
        this.name = 'Gemini';
    }

    async waitForDOM() {
        return new Promise(resolve => {
            const check = () => {
                // Look for the upload button (plus icon) or text box
                if (document.querySelector('.upload-card-button') || document.querySelector('[role="textbox"]')) {
                    resolve();
                } else {
                    setTimeout(check, 500);
                }
            };
            check();
        });
    }

    getInjectionTarget() {
        // Priority 1: Next to the Tools button (toolbox-drawer-button-container)
        // This container holds the Tools button. We want to be a sibling of this container.
        const toolsContainer = document.querySelector('.toolbox-drawer-button-container');
        if (toolsContainer && toolsContainer.parentElement) {
            return {
                container: toolsContainer.parentElement,
                insertBefore: toolsContainer.nextSibling // Insert AFTER the tools container
            };
        }

        // Priority 2: Next to the Upload (+) button (Fallback if tools not found)
        const uploadButton = document.querySelector('.upload-card-button');
        if (uploadButton && uploadButton.parentElement) {
            return {
                container: uploadButton.parentElement,
                insertBefore: null // Append to end
            };
        }

        // Priority 3: Next to the native mic button (fallback)
        const micButton = document.querySelector('.speech_dictation_mic_button');
        if (micButton && micButton.parentElement) {
            return {
                container: micButton.parentElement,
                insertBefore: micButton.nextSibling
            };
        }

        // Priority 4: Input area wrapper (Textbox parent)
        const inputArea = document.querySelector('[role="textbox"]');
        if (inputArea && inputArea.parentElement) {
            // Usually the input row is the parent or grandparent
            const target = inputArea.parentElement.parentElement || document.body;
            return {
                container: target,
                insertBefore: null
            };
        }

        return null;
    }

    async handleUpload(blob, durationString) {
        console.log("GeminiStrategy: Handling upload via Clipboard Paste (Alternative Method)");

        // 1. Create File object (Now TRUE WAV with Date Format)
        const filename = generateAudioFilename();
        const file = new File([blob], filename, { type: 'audio/wav' });

        // Strategy: Simulate "Paste" event
        // This is distinct from DnD and File Input.

        const textBox = document.querySelector('[role="textbox"]');
        if (!textBox) {
            console.warn("Gemini Input (textbox) not found for paste. Falling back to Drag and Drop.");
            await this.performDragAndDrop(file);
            return;
        }

        try {
            // method 1: Synthetic Paste Event
            const dataTransfer = new DataTransfer();
            dataTransfer.items.add(file);

            const pasteEvent = new ClipboardEvent('paste', {
                bubbles: true,
                cancelable: true,
                formattedInputValue: '', // Legacy/React stuff might check this
                clipboardData: dataTransfer
            });

            // Focus is crucial for paste
            textBox.focus();
            textBox.dispatchEvent(pasteEvent);

            console.log("GeminiStrategy: Paste event dispatched");

            // Wait to see if it worked (tricky to detect without observing DOM)
            // But let's assume it works or fall back.

            // ALSO perform text insertion immediately
            await this.insertText();

        } catch (e) {
            console.error("Paste failed, falling back to Drag and Drop.", e);
            await this.performDragAndDrop(file);
        }
    }

    async insertText() {
        const textBox = document.querySelector('[role="textbox"]');
        if (textBox) {
            textBox.focus();

            // Get custom prompt from storage
            const result = await chrome.storage.local.get(['promptText']);
            const textToInsert = result.promptText || DEFAULT_PROMPT_TEXT;

            document.execCommand('insertText', false, textToInsert) || (textBox.innerText += textToInsert);
        }
    }

    async performDragAndDrop(file) {
        const dropZone = document.querySelector('[role="textbox"]');
        if (!dropZone) {
            console.warn("GeminiStrategy: No textbox found for Drag and Drop fallback. Attempting to drop on body.");
            // Fallback to dropping on the body if no specific drop zone is found
            const bodyDropZone = document.body;
            if (!bodyDropZone) return; // Should not happen

            const dataTransfer = new DataTransfer();
            dataTransfer.items.add(file);

            const createEvent = (type) => new DragEvent(type, {
                bubbles: true, cancelable: true, composed: true, view: window, dataTransfer
            });

            bodyDropZone.dispatchEvent(createEvent('dragenter'));
            await new Promise(r => setTimeout(r, 50));
            bodyDropZone.dispatchEvent(createEvent('dragover'));
            await new Promise(r => setTimeout(r, 50));
            bodyDropZone.dispatchEvent(createEvent('drop'));
            console.log("GeminiStrategy: Drag and Drop performed on body.");

        } else {
            const dataTransfer = new DataTransfer();
            dataTransfer.items.add(file);

            const createEvent = (type) => new DragEvent(type, {
                bubbles: true, cancelable: true, composed: true, view: window, dataTransfer
            });

            dropZone.dispatchEvent(createEvent('dragenter'));
            await new Promise(r => setTimeout(r, 50));
            dropZone.dispatchEvent(createEvent('dragover'));
            await new Promise(r => setTimeout(r, 50));
            dropZone.dispatchEvent(createEvent('drop'));
            console.log("GeminiStrategy: Drag and Drop performed on textbox.");
        }

        this.insertText();
    }
}

import { DEFAULT_PROMPT_TEXT, generateAudioFilename } from '../../utils/config.js';

export class GeminiStrategy {
    constructor() {
        this.name = 'Gemini';
    }

    async waitForDOM() {
        return new Promise(resolve => {
            const check = () => {
                // PRIORITY: Wait specifically for the Tools button container
                // This ensures we inject at the correct location from the start
                const toolsContainer = document.querySelector('.toolbox-drawer-button-container');
                if (toolsContainer) {
                    console.log("AI Voice Uploader: Tools button found, ready to inject");
                    resolve();
                    return;
                }

                // Fallback: Look for the upload button or text box
                // Only use this if Tools button doesn't appear after some time
                if (document.querySelector('.upload-card-button') || document.querySelector('[role="textbox"]')) {
                    console.log("AI Voice Uploader: Tools button not found, using fallback");
                    // Give it a bit more time for Tools to appear
                    setTimeout(() => {
                        if (document.querySelector('.toolbox-drawer-button-container')) {
                            console.log("AI Voice Uploader: Tools button appeared during wait");
                        }
                        resolve();
                    }, 1000);
                } else {
                    setTimeout(check, 500);
                }
            };
            check();
        });
    }

    getInjectionTarget() {
        // Strategy: Find the parent container that holds both the Tools button and other action buttons
        // We want to insert our button as a sibling to the Tools button container

        console.log("AI Voice Uploader: Looking for injection target...");

        // Priority 1: Next to the Tools button (toolbox-drawer-button-container)
        // Look for the Tools button container and its parent
        const toolsContainer = document.querySelector('.toolbox-drawer-button-container');
        if (toolsContainer && toolsContainer.parentElement) {
            console.log("AI Voice Uploader: Found Tools button container");
            // Insert AFTER the tools container (as a next sibling)
            return {
                container: toolsContainer.parentElement,
                insertBefore: toolsContainer.nextSibling
            };
        }

        // Priority 2: Look for the action buttons row more broadly
        // Some Gemini UI variants might use different class names
        const actionButtonsRow = document.querySelector('[class*="action-button-row"], [class*="input-area-tools"]');
        if (actionButtonsRow) {
            console.log("AI Voice Uploader: Found action buttons row");
            return {
                container: actionButtonsRow,
                insertBefore: null // Append to end of the row
            };
        }

        // Priority 3: Look for any container that has the upload button
        // This helps us find the right parent even if class names change
        const uploadButton = document.querySelector('.upload-card-button, [class*="upload-button"]');
        if (uploadButton) {
            // Try to find a common parent that would contain all action buttons
            let parent = uploadButton.parentElement;
            while (parent && parent !== document.body) {
                // Look for a parent that has multiple button-like children
                const buttonChildren = parent.querySelectorAll('button, [role="button"]');
                if (buttonChildren.length > 1) {
                    console.log("AI Voice Uploader: Found common parent with multiple buttons");
                    return {
                        container: parent,
                        insertBefore: null
                    };
                }
                parent = parent.parentElement;
            }

            // Fallback: just use the upload button's parent
            if (uploadButton.parentElement) {
                console.log("AI Voice Uploader: Using upload button parent as fallback");
                return {
                    container: uploadButton.parentElement,
                    insertBefore: null
                };
            }
        }

        // Priority 4: Next to the native mic button (fallback)
        const micButton = document.querySelector('.speech_dictation_mic_button, [class*="mic-button"]');
        if (micButton && micButton.parentElement) {
            console.log("AI Voice Uploader: Found native mic button");
            return {
                container: micButton.parentElement,
                insertBefore: micButton.nextSibling
            };
        }

        // Priority 5: Input area wrapper (last resort)
        const inputArea = document.querySelector('[role="textbox"]');
        if (inputArea && inputArea.parentElement) {
            console.log("AI Voice Uploader: Using textbox parent as last resort");
            // Usually the input row is the parent or grandparent
            const target = inputArea.parentElement.parentElement || document.body;
            return {
                container: target,
                insertBefore: null
            };
        }

        console.warn("AI Voice Uploader: No suitable injection target found");
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

    async handleVideoUpload(result) {
        console.log("GeminiStrategy: Handling video upload via Clipboard Paste");

        const blob = result.blob;
        const format = result.format || 'webm';

        // Create a friendly filename with date and time
        const now = new Date();
        const dateStr = now.toLocaleDateString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit' }).replace(/\//g, '-');
        const timeStr = now.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }).replace(/:/g, '-');
        const filename = `Screen-${dateStr}_${timeStr}.${format}`;

        const mimeType = format === 'mp4' ? 'video/mp4' : 'video/webm';
        const file = new File([blob], filename, { type: mimeType });

        const textBox = document.querySelector('[role="textbox"]');
        if (!textBox) {
            console.warn("Gemini Input (textbox) not found for paste. Falling back to Drag and Drop.");
            await this.performDragAndDrop(file);
            return;
        }

        try {
            // Method 1: Synthetic Paste Event
            const dataTransfer = new DataTransfer();
            dataTransfer.items.add(file);

            const pasteEvent = new ClipboardEvent('paste', {
                bubbles: true,
                cancelable: true,
                clipboardData: dataTransfer
            });

            // Focus is crucial for paste
            textBox.focus();
            textBox.dispatchEvent(pasteEvent);

            console.log(`GeminiStrategy: Video paste event dispatched (${format.toUpperCase()})`);

            // Insert text prompt
            await this.insertText();

        } catch (e) {
            console.error("Video paste failed, falling back to Drag and Drop.", e);
            await this.performDragAndDrop(file);
        }
    }
}

import { DEFAULT_PROMPT_TEXT, generateAudioFilename } from '../../utils/config.js';

export class AIStudioStrategy {
    constructor() {
        this.name = 'AI Studio';
    }

    async waitForDOM() {
        return new Promise(resolve => {
            const check = () => {
                // Wait for the Insert button or textarea to appear
                const insertButton = document.querySelector('button[aria-label="Insert images, videos, audio, or files"]');
                const textarea = document.querySelector('textarea');

                if (insertButton || textarea) {
                    console.log("Thoughtful Voice: AI Studio page elements found, ready to inject");
                    resolve();
                } else {
                    setTimeout(check, 500);
                }
            };
            check();
        });
    }

    getInjectionTarget() {
        console.log("Thoughtful Voice: Looking for AI Studio injection target...");

        // Strategy: Find the Insert button and inject RIGHT AFTER IT as a sibling
        // The Insert button has aria-label="Insert images, videos, audio, or files"

        const insertButton = document.querySelector('button[aria-label="Insert images, videos, audio, or files"]');

        if (insertButton) {
            console.log("Thoughtful Voice: Found Insert button");

            // Get the direct parent of Insert button (ms-add-media-button or similar)
            const insertButtonWrapper = insertButton.parentElement;

            if (insertButtonWrapper && insertButtonWrapper.parentElement) {
                // We want to inject at the same level as the Insert button wrapper
                // This ensures our buttons appear right next to the Insert button
                console.log("Thoughtful Voice: Injecting at Insert button wrapper level");
                return {
                    container: insertButtonWrapper.parentElement,
                    insertBefore: insertButtonWrapper.nextElementSibling // Insert right after Insert button wrapper
                };
            }
        }

        // Fallback: Find textarea and work from there
        const textarea = document.querySelector('textarea[aria-label="Enter a prompt"], textarea');
        if (textarea) {
            console.log("Thoughtful Voice: Fallback to textarea area");
            let container = textarea.parentElement;
            let attempts = 0;

            while (container && attempts < 10) {
                const buttons = container.querySelectorAll('button');
                if (buttons.length > 1) {
                    const runButton = Array.from(buttons).find(btn =>
                        btn.textContent && btn.textContent.includes('Run')
                    );
                    return {
                        container: container,
                        insertBefore: runButton || null
                    };
                }
                container = container.parentElement;
                attempts++;
            }

            return {
                container: textarea.parentElement,
                insertBefore: null
            };
        }

        console.warn("Thoughtful Voice: No suitable injection target found for AI Studio");
        return null;
    }

    async handleUpload(blob, durationString) {
        console.log("AIStudioStrategy: Handling audio upload via File Input or Paste");
        const filename = generateAudioFilename();
        const file = new File([blob], filename, { type: 'audio/wav' });

        const fileInput = document.querySelector('input[type="file"]');
        if (fileInput) {
            console.log("AIStudioStrategy: Using file input method");
            try {
                const dataTransfer = new DataTransfer();
                dataTransfer.items.add(file);
                fileInput.files = dataTransfer.files;
                const changeEvent = new Event('change', { bubbles: true });
                fileInput.dispatchEvent(changeEvent);
                await this.insertText();
                return;
            } catch (e) {
                console.warn("File input method failed, trying paste", e);
            }
        }

        const textarea = document.querySelector('textarea[placeholder*="prompt" i], textarea[aria-label*="prompt" i], .prompt-input textarea, textarea');
        if (textarea) {
            try {
                console.log("AIStudioStrategy: Using paste method");
                const dataTransfer = new DataTransfer();
                dataTransfer.items.add(file);
                const pasteEvent = new ClipboardEvent('paste', {
                    bubbles: true,
                    cancelable: true,
                    clipboardData: dataTransfer
                });
                textarea.focus();
                textarea.dispatchEvent(pasteEvent);
                console.log("AIStudioStrategy: Paste event dispatched");
                await this.insertText();
            } catch (e) {
                console.error("Paste failed, falling back to drag and drop", e);
                await this.performDragAndDrop(file);
            }
        } else {
            await this.performDragAndDrop(file);
        }
    }

    async insertText() {
        const textarea = document.querySelector('textarea[placeholder*="prompt" i], textarea[aria-label*="prompt" i], .prompt-input textarea, textarea');
        if (textarea) {
            textarea.focus();
            const result = await chrome.storage.local.get(['promptText']);
            const textToInsert = result.promptText || DEFAULT_PROMPT_TEXT;
            if (!document.execCommand('insertText', false, textToInsert)) {
                const currentValue = textarea.value || '';
                textarea.value = currentValue + (currentValue ? '\n' : '') + textToInsert;
                const inputEvent = new Event('input', { bubbles: true });
                textarea.dispatchEvent(inputEvent);
            }
        }
    }

    async performDragAndDrop(file) {
        const dropZone = document.querySelector('textarea, [class*="prompt" i], .input-area') || document.body;
        const dataTransfer = new DataTransfer();
        dataTransfer.items.add(file);
        const createEvent = (type) => new DragEvent(type, {
            bubbles: true,
            cancelable: true,
            composed: true,
            view: window,
            dataTransfer
        });
        dropZone.dispatchEvent(createEvent('dragenter'));
        await new Promise(r => setTimeout(r, 50));
        dropZone.dispatchEvent(createEvent('dragover'));
        await new Promise(r => setTimeout(r, 50));
        dropZone.dispatchEvent(createEvent('drop'));
        console.log("AIStudioStrategy: Drag and Drop performed");
        await this.insertText();
    }

    async handleVideoUpload(result) {
        console.log("AIStudioStrategy: Handling video upload");
        const blob = result.blob;
        const format = result.format || 'webm';
        const now = new Date();
        const dateStr = now.toLocaleDateString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit' }).replace(/\//g, '-');
        const timeStr = now.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }).replace(/:/g, '-');
        const filename = `Screen-${dateStr}_${timeStr}.${format}`;
        const mimeType = format === 'mp4' ? 'video/mp4' : 'video/webm';
        const file = new File([blob], filename, { type: mimeType });

        const fileInput = document.querySelector('input[type="file"]');
        if (fileInput) {
            try {
                const dataTransfer = new DataTransfer();
                dataTransfer.items.add(file);
                fileInput.files = dataTransfer.files;
                const changeEvent = new Event('change', { bubbles: true });
                fileInput.dispatchEvent(changeEvent);
                await this.insertText();
                return;
            } catch (e) {
                console.warn("File input method failed for video, trying paste", e);
            }
        }

        const textarea = document.querySelector('textarea[placeholder*="prompt" i], textarea[aria-label*="prompt" i], .prompt-input textarea, textarea');
        if (textarea) {
            try {
                const dataTransfer = new DataTransfer();
                dataTransfer.items.add(file);
                const pasteEvent = new ClipboardEvent('paste', {
                    bubbles: true,
                    cancelable: true,
                    clipboardData: dataTransfer
                });
                textarea.focus();
                textarea.dispatchEvent(pasteEvent);
                console.log(`AIStudioStrategy: Video paste event dispatched (${format.toUpperCase()})`);
                await this.insertText();
            } catch (e) {
                console.error("Video paste failed, falling back to drag and drop", e);
                await this.performDragAndDrop(file);
            }
        } else {
            await this.performDragAndDrop(file);
        }
    }
}

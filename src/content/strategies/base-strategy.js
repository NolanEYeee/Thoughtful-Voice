import { DEFAULT_PROMPT_TEXT, generateAudioFilename } from '../../utils/config.js';

/**
 * BaseStrategy - Abstract base class for all AI platform strategies
 * 
 * This class implements the Template Method pattern, providing:
 * - Common upload logic (paste, file input, drag & drop)
 * - Common text insertion logic
 * - Common video/audio file handling
 * 
 * Subclasses only need to implement platform-specific methods:
 * - waitForDOM(): Wait for the platform's UI to be ready
 * - getInjectionTarget(): Find where to inject our buttons
 * - getInputElement(): Return the text input element
 * - (optional) getUploadStrategies(): Override upload method priority
 */
export class BaseStrategy {
    constructor(name) {
        this.name = name;
    }

    // ========== Abstract Methods (MUST be implemented by subclasses) ==========

    /**
     * Wait for the DOM to be ready for button injection
     * @returns {Promise<void>}
     */
    async waitForDOM() {
        throw new Error(`${this.name}Strategy: waitForDOM() must be implemented`);
    }

    /**
     * Get the injection target for our buttons
     * @returns {{ container: HTMLElement, insertBefore: HTMLElement|null } | null}
     */
    getInjectionTarget() {
        throw new Error(`${this.name}Strategy: getInjectionTarget() must be implemented`);
    }

    /**
     * Get the main text input element for the platform
     * @returns {HTMLElement|null}
     */
    getInputElement() {
        throw new Error(`${this.name}Strategy: getInputElement() must be implemented`);
    }

    // ========== Optional Override Methods ==========

    /**
     * Get the priority order of upload strategies to try
     * Subclasses can override this to change the order or exclude certain methods
     * @returns {string[]} Array of strategy names: 'paste', 'fileInput', 'dragAndDrop'
     */
    getUploadStrategies() {
        return ['paste', 'fileInput', 'dragAndDrop'];
    }

    /**
     * Get file input element (some platforms may need custom selector)
     * @returns {HTMLElement|null}
     */
    getFileInputElement() {
        return document.querySelector('input[type="file"]');
    }

    /**
     * Get the drop zone for drag and drop uploads
     * Defaults to the input element, can be overridden
     * @returns {HTMLElement}
     */
    getDropZone() {
        return this.getInputElement() || document.body;
    }

    // ========== Common Upload Logic ==========

    /**
     * Handle audio file upload - tries multiple strategies in order
     * @param {Blob} blob - The audio blob to upload
     * @param {string} durationString - Duration string for logging
     */
    async handleUpload(blob, durationString) {
        console.log(`${this.name}Strategy: Handling audio upload`);

        const filename = generateAudioFilename();
        const file = new File([blob], filename, { type: 'audio/wav' });

        const success = await this._executeUploadStrategies(file);

        if (success) {
            await this.insertText();
        } else {
            console.error(`${this.name}Strategy: All upload strategies failed`);
        }
    }

    /**
     * Handle video file upload - tries multiple strategies in order
     * @param {Object} result - Object containing blob, duration, and format
     */
    async handleVideoUpload(result) {
        console.log(`${this.name}Strategy: Handling video upload`);

        const blob = result.blob;
        const format = result.format || 'webm';
        const filename = this._generateVideoFilename(format);
        const mimeType = format === 'mp4' ? 'video/mp4' : 'video/webm';
        const file = new File([blob], filename, { type: mimeType });

        const success = await this._executeUploadStrategies(file);

        if (success) {
            console.log(`${this.name}Strategy: Video upload successful (${format.toUpperCase()})`);
            await this.insertText();
        } else {
            console.error(`${this.name}Strategy: All video upload strategies failed`);
        }
    }

    /**
     * Insert prompt text into the input element
     * Only inserts if the text doesn't already exist in the input
     */
    async insertText() {
        const inputEl = this.getInputElement();
        if (!inputEl) {
            console.warn(`${this.name}Strategy: No input element found for text insertion`);
            return;
        }

        // Get custom prompt from storage
        const result = await chrome.storage.local.get(['settings']);
        const textToInsert = result.settings?.promptText || DEFAULT_PROMPT_TEXT;

        // Get current content of the input element
        const currentContent = this._getInputContent(inputEl);

        // Check if the prompt text already exists in the input
        if (currentContent.includes(textToInsert)) {
            console.log(`${this.name}Strategy: Prompt text already exists, skipping insertion`);
            return;
        }

        inputEl.focus();

        // Try execCommand first (works in most editable contexts)
        const success = document.execCommand('insertText', false, textToInsert);

        if (!success) {
            // Fallback for different element types
            if (inputEl.tagName === 'TEXTAREA' || inputEl.tagName === 'INPUT') {
                const currentValue = inputEl.value || '';
                inputEl.value = currentValue + (currentValue ? '\n' : '') + textToInsert;
                inputEl.dispatchEvent(new Event('input', { bubbles: true }));
            } else if (inputEl.getAttribute('contenteditable') || inputEl.getAttribute('role') === 'textbox') {
                // For contenteditable elements
                inputEl.innerText += textToInsert;
                inputEl.dispatchEvent(new Event('input', { bubbles: true }));
            }
        }
    }

    /**
     * Get the current text content of an input element
     * Works with textarea, input, and contenteditable elements
     * @param {HTMLElement} inputEl - The input element
     * @returns {string} - The current text content
     */
    _getInputContent(inputEl) {
        if (inputEl.tagName === 'TEXTAREA' || inputEl.tagName === 'INPUT') {
            return inputEl.value || '';
        } else {
            // For contenteditable elements
            return inputEl.innerText || inputEl.textContent || '';
        }
    }

    // ========== Private Helper Methods ==========

    /**
     * Execute upload strategies in order until one succeeds
     * @param {File} file - The file to upload
     * @returns {Promise<boolean>} - Whether any strategy succeeded
     */
    async _executeUploadStrategies(file) {
        const strategies = this.getUploadStrategies();

        for (const strategyName of strategies) {
            try {
                console.log(`${this.name}Strategy: Trying ${strategyName} upload...`);
                const success = await this._tryUploadStrategy(strategyName, file);
                if (success) {
                    console.log(`${this.name}Strategy: ${strategyName} upload succeeded`);
                    return true;
                }
            } catch (e) {
                console.warn(`${this.name}Strategy: ${strategyName} failed, trying next...`, e);
            }
        }

        return false;
    }

    /**
     * Try a specific upload strategy
     * @param {string} strategyName - Name of the strategy to try
     * @param {File} file - The file to upload
     * @returns {Promise<boolean>} - Whether the strategy succeeded
     */
    async _tryUploadStrategy(strategyName, file) {
        switch (strategyName) {
            case 'paste':
                return await this._pasteUpload(file);
            case 'fileInput':
                return await this._fileInputUpload(file);
            case 'dragAndDrop':
                return await this._dragAndDropUpload(file);
            default:
                console.warn(`${this.name}Strategy: Unknown upload strategy: ${strategyName}`);
                return false;
        }
    }

    /**
     * Upload file via clipboard paste event
     * @param {File} file - The file to upload
     * @returns {Promise<boolean>} - Whether the upload succeeded
     */
    async _pasteUpload(file) {
        const targetEl = this.getInputElement();
        if (!targetEl) {
            console.warn(`${this.name}Strategy: No input element for paste upload`);
            return false;
        }

        const dataTransfer = new DataTransfer();
        dataTransfer.items.add(file);

        const pasteEvent = new ClipboardEvent('paste', {
            bubbles: true,
            cancelable: true,
            clipboardData: dataTransfer
        });

        targetEl.focus();
        targetEl.dispatchEvent(pasteEvent);
        console.log(`${this.name}Strategy: Paste event dispatched`);
        return true;
    }

    /**
     * Upload file via hidden file input
     * @param {File} file - The file to upload
     * @returns {Promise<boolean>} - Whether the upload succeeded
     */
    async _fileInputUpload(file) {
        const fileInput = this.getFileInputElement();
        if (!fileInput) {
            console.warn(`${this.name}Strategy: No file input found`);
            return false;
        }

        const dataTransfer = new DataTransfer();
        dataTransfer.items.add(file);
        fileInput.files = dataTransfer.files;

        const changeEvent = new Event('change', { bubbles: true });
        fileInput.dispatchEvent(changeEvent);

        console.log(`${this.name}Strategy: File input upload completed`);
        return true;
    }

    /**
     * Upload file via drag and drop
     * @param {File} file - The file to upload
     * @returns {Promise<boolean>} - Whether the upload succeeded
     */
    async _dragAndDropUpload(file) {
        const dropZone = this.getDropZone();
        if (!dropZone) {
            console.warn(`${this.name}Strategy: No drop zone found`);
            return false;
        }

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
        await this._delay(50);
        dropZone.dispatchEvent(createEvent('dragover'));
        await this._delay(50);
        dropZone.dispatchEvent(createEvent('drop'));

        console.log(`${this.name}Strategy: Drag and drop completed`);
        return true;
    }

    /**
     * Generate a video filename with timestamp
     * @param {string} format - Video format (webm or mp4)
     * @returns {string} - Generated filename
     */
    _generateVideoFilename(format) {
        const now = new Date();
        const dateStr = now.toLocaleDateString('zh-CN', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit'
        }).replace(/\//g, '-');
        const timeStr = now.toLocaleTimeString('zh-CN', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: false
        }).replace(/:/g, '-');
        return `Screen-${dateStr}_${timeStr}.${format}`;
    }

    /**
     * Utility delay function
     * @param {number} ms - Milliseconds to delay
     * @returns {Promise<void>}
     */
    _delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    // ========== DOM Utility Methods ==========

    /**
     * Wait for an element to appear in the DOM
     * @param {string} selector - CSS selector
     * @param {number} timeout - Maximum wait time in ms (default: 10000)
     * @returns {Promise<HTMLElement|null>}
     */
    async _waitForElement(selector, timeout = 10000) {
        const startTime = Date.now();

        return new Promise((resolve) => {
            const check = () => {
                const element = document.querySelector(selector);
                if (element) {
                    resolve(element);
                    return;
                }

                if (Date.now() - startTime > timeout) {
                    resolve(null);
                    return;
                }

                setTimeout(check, 100);
            };
            check();
        });
    }

    /**
     * Find parent element matching a condition
     * @param {HTMLElement} element - Starting element
     * @param {Function} condition - Function that returns true when parent is found
     * @param {number} maxDepth - Maximum depth to search (default: 10)
     * @returns {HTMLElement|null}
     */
    _findParent(element, condition, maxDepth = 10) {
        let current = element;
        let depth = 0;

        while (current && depth < maxDepth) {
            if (condition(current)) {
                return current;
            }
            current = current.parentElement;
            depth++;
        }

        return null;
    }
}

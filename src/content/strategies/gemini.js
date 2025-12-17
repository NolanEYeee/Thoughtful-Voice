import { BaseStrategy } from './base-strategy.js';

/**
 * GeminiStrategy - Strategy for gemini.google.com
 * 
 * Gemini uses a contenteditable div with role="textbox" for input.
 * Upload is best done via clipboard paste event.
 */
export class GeminiStrategy extends BaseStrategy {
    constructor() {
        super('Gemini');
    }

    // ========== Required Implementations ==========

    async waitForDOM() {
        return new Promise(resolve => {
            const check = () => {
                // PRIORITY: Wait specifically for the Tools button container
                // This ensures we inject at the correct location from the start
                const toolsContainer = document.querySelector('.toolbox-drawer-button-container');
                if (toolsContainer) {
                    console.log("Thoughtful Voice: Tools button found, ready to inject");
                    resolve();
                    return;
                }

                // Fallback: Look for the upload button or text box
                if (document.querySelector('.upload-card-button') || document.querySelector('[role="textbox"]')) {
                    console.log("Thoughtful Voice: Tools button not found, using fallback");
                    // Give it a bit more time for Tools to appear
                    setTimeout(() => {
                        if (document.querySelector('.toolbox-drawer-button-container')) {
                            console.log("Thoughtful Voice: Tools button appeared during wait");
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
        console.log("Thoughtful Voice: Looking for Gemini injection target...");

        // Priority 1: Next to the Tools button (toolbox-drawer-button-container)
        const toolsContainer = document.querySelector('.toolbox-drawer-button-container');
        if (toolsContainer?.parentElement) {
            console.log("Thoughtful Voice: Found Tools button container");
            return {
                container: toolsContainer.parentElement,
                insertBefore: toolsContainer.nextSibling
            };
        }

        // Priority 2: Look for the action buttons row
        const actionButtonsRow = document.querySelector('[class*="action-button-row"], [class*="input-area-tools"]');
        if (actionButtonsRow) {
            console.log("Thoughtful Voice: Found action buttons row");
            return {
                container: actionButtonsRow,
                insertBefore: null
            };
        }

        // Priority 3: Look for any container that has the upload button
        const uploadButton = document.querySelector('.upload-card-button, [class*="upload-button"]');
        if (uploadButton) {
            const parent = this._findParent(uploadButton, (el) => {
                const buttonChildren = el.querySelectorAll('button, [role="button"]');
                return buttonChildren.length > 1;
            });

            if (parent) {
                console.log("Thoughtful Voice: Found common parent with multiple buttons");
                return { container: parent, insertBefore: null };
            }

            if (uploadButton.parentElement) {
                console.log("Thoughtful Voice: Using upload button parent as fallback");
                return { container: uploadButton.parentElement, insertBefore: null };
            }
        }

        // Priority 4: Next to the native mic button
        const micButton = document.querySelector('.speech_dictation_mic_button, [class*="mic-button"]');
        if (micButton?.parentElement) {
            console.log("Thoughtful Voice: Found native mic button");
            return {
                container: micButton.parentElement,
                insertBefore: micButton.nextSibling
            };
        }

        // Priority 5: Input area wrapper (last resort)
        const inputArea = document.querySelector('[role="textbox"]');
        if (inputArea?.parentElement) {
            console.log("Thoughtful Voice: Using textbox parent as last resort");
            const target = inputArea.parentElement.parentElement || document.body;
            return { container: target, insertBefore: null };
        }

        console.warn("Thoughtful Voice: No suitable injection target found for Gemini");
        return null;
    }

    getInputElement() {
        return document.querySelector('[role="textbox"]');
    }

    // ========== Optional Overrides ==========

    getUploadStrategies() {
        // Gemini works best with paste, then drag & drop
        // File input is less reliable
        return ['paste', 'dragAndDrop'];
    }

    getDropZone() {
        // Gemini's textbox is the best drop zone
        return this.getInputElement() || document.body;
    }
}

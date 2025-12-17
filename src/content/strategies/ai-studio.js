import { BaseStrategy } from './base-strategy.js';

/**
 * AIStudioStrategy - Strategy for aistudio.google.com
 * 
 * AI Studio uses a standard textarea for input.
 * Upload can be done via file input, paste, or drag & drop.
 * File input tends to work more reliably than paste for this platform.
 */
export class AIStudioStrategy extends BaseStrategy {
    constructor() {
        super('AI Studio');
    }

    // ========== Required Implementations ==========

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

        // Priority 1: Find the Insert button and inject RIGHT AFTER IT as a sibling
        const insertButton = document.querySelector('button[aria-label="Insert images, videos, audio, or files"]');
        if (insertButton) {
            console.log("Thoughtful Voice: Found Insert button");

            const insertButtonWrapper = insertButton.parentElement;
            if (insertButtonWrapper?.parentElement) {
                console.log("Thoughtful Voice: Injecting at Insert button wrapper level");
                return {
                    container: insertButtonWrapper.parentElement,
                    insertBefore: insertButtonWrapper.nextElementSibling
                };
            }
        }

        // Priority 2: Fallback to textarea area
        const textarea = document.querySelector('textarea[aria-label="Enter a prompt"], textarea');
        if (textarea) {
            console.log("Thoughtful Voice: Fallback to textarea area");

            // Find a container with multiple buttons
            const container = this._findParent(textarea, (el) => {
                const buttons = el.querySelectorAll('button');
                return buttons.length > 1;
            });

            if (container) {
                const runButton = Array.from(container.querySelectorAll('button')).find(btn =>
                    btn.textContent?.includes('Run')
                );
                return {
                    container: container,
                    insertBefore: runButton || null
                };
            }

            return {
                container: textarea.parentElement,
                insertBefore: null
            };
        }

        console.warn("Thoughtful Voice: No suitable injection target found for AI Studio");
        return null;
    }

    getInputElement() {
        return document.querySelector('textarea[aria-label="Enter a prompt"], textarea[placeholder*="prompt" i], textarea');
    }

    // ========== Optional Overrides ==========

    getUploadStrategies() {
        // AI Studio works better with file input first, then paste, then drag & drop
        return ['fileInput', 'paste', 'dragAndDrop'];
    }

    getDropZone() {
        // For AI Studio, the textarea or any prompt-related element works
        return document.querySelector('textarea, [class*="prompt" i], .input-area') || document.body;
    }
}

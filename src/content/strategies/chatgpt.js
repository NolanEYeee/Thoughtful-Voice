import { BaseStrategy } from './base-strategy.js';

/**
 * ChatGPTStrategy - Strategy for chatgpt.com / openai.com
 * 
 * ChatGPT uses a div with id="prompt-textarea" (contenteditable or textarea-like).
 * Upload is done via clipboard paste event.
 */
export class ChatGPTStrategy extends BaseStrategy {
    constructor() {
        super('ChatGPT');
    }

    // ========== Required Implementations ==========

    async waitForDOM() {
        return new Promise(resolve => {
            const check = () => {
                // Wait for the prompt textarea which is central to the UI
                if (document.getElementById('prompt-textarea')) {
                    console.log("Thoughtful Voice: ChatGPT prompt textarea found");
                    resolve();
                } else {
                    setTimeout(check, 500);
                }
            };
            check();
        });
    }

    getInjectionTarget() {
        console.log("Thoughtful Voice: Looking for ChatGPT injection target...");

        // Priority 1: Find the attachment button by various aria-labels
        const attachButton = document.querySelector('button[aria-label="Attach files"]')
            || document.querySelector('button[aria-label="Add photos"]')
            || Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('Attach'));

        if (attachButton?.parentElement) {
            console.log("Thoughtful Voice: Found attach button, aria-label:", attachButton.getAttribute('aria-label'));
            return {
                container: attachButton.parentElement,
                insertBefore: attachButton // Insert before the attach button
            };
        }

        // Priority 2: Try to find the button row container directly
        const buttonRow = document.querySelector('.flex.min-w-fit.items-center');
        if (buttonRow) {
            const firstButton = buttonRow.querySelector('button');
            if (firstButton) {
                console.log("Thoughtful Voice: Found button row container");
                return {
                    container: buttonRow,
                    insertBefore: firstButton
                };
            }
        }

        // Priority 3: Try to find the textarea and its wrapper
        const textarea = document.getElementById('prompt-textarea');
        if (textarea) {
            // Look for the flex container that holds the buttons
            const inputWrapper = textarea.closest('.flex.items-end');
            if (inputWrapper) {
                const firstButton = inputWrapper.querySelector('button');
                if (firstButton) {
                    console.log("Thoughtful Voice: Found input wrapper with buttons");
                    return {
                        container: inputWrapper,
                        insertBefore: firstButton.nextSibling
                    };
                }
            }
        }

        console.warn("Thoughtful Voice: No suitable injection target found for ChatGPT");
        return null;
    }

    getInputElement() {
        return document.getElementById('prompt-textarea');
    }

    // ========== Optional Overrides ==========

    getUploadStrategies() {
        // ChatGPT works best with paste
        return ['paste'];
    }
}

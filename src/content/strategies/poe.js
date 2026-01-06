import { BaseStrategy } from './base-strategy.js';

/**
 * PoeStrategy - Strategy for poe.com
 * 
 * Poe uses a textarea for input with action buttons in a footer area.
 * The button layout is:
 * - Initial state: [+] [@] [___input___] [🎤] [➡️]
 * - Chat state: [📥] [+] [@] [⚙️] [___input___] [🎤] [➡️]
 * 
 * We inject our buttons after the @ or last icon button on the left side.
 */
export class PoeStrategy extends BaseStrategy {
    constructor() {
        super('Poe');
    }

    // ========== Required Implementations ==========

    async waitForDOM() {
        return new Promise(resolve => {
            const check = () => {
                // Look for the main textarea
                const textarea = document.querySelector('textarea[class*="ChatMessageInputContainer"], textarea[class*="GrowingTextArea"], textarea[placeholder]');

                // Look for the footer/button container
                const footer = document.querySelector('[class*="ChatMessageInputFooter"], [class*="InputFooter"]');

                // Also try to find action buttons
                const actionButtons = document.querySelectorAll('button[aria-label*="Attach"], button[aria-label*="Mention"], button[aria-label*="attachment"]');

                if (textarea && (footer || actionButtons.length > 0)) {
                    console.log("Thoughtful Voice: Poe DOM ready (found textarea and footer/buttons)");
                    resolve();
                } else if (document.readyState === 'complete') {
                    // Fallback: if page is fully loaded, try to proceed anyway
                    setTimeout(() => {
                        const retryTextarea = document.querySelector('textarea');
                        if (retryTextarea) {
                            console.log("Thoughtful Voice: Poe DOM ready (fallback - found basic textarea)");
                            resolve();
                        } else {
                            setTimeout(check, 500);
                        }
                    }, 1000);
                } else {
                    setTimeout(check, 500);
                }
            };
            check();
        });
    }

    getInjectionTarget() {
        console.log("Thoughtful Voice: Looking for Poe injection target...");

        // Strategy 1: Find the left buttons container directly by class
        // Poe uses CSS Modules with randomized suffixes, so we use "starts with" selectors
        const leftButtonsContainer = document.querySelector('[class*="leftButtons"], [class*="LeftButtons"]');

        if (leftButtonsContainer) {
            console.log("Thoughtful Voice: Found Poe leftButtons container directly");

            // Check if wrapper already exists
            let wrapper = leftButtonsContainer.querySelector('#thoughtful-voice-poe-wrapper');
            if (!wrapper) {
                wrapper = document.createElement('div');
                wrapper.id = 'thoughtful-voice-poe-wrapper';
                wrapper.className = 'thoughtful-voice-poe-container';
                // Use display: contents so the wrapper doesn't break the flex layout
                // This makes the child elements behave as if they were direct children of leftButtonsContainer
                wrapper.style.cssText = 'display: contents;';
                leftButtonsContainer.appendChild(wrapper);
            }

            return {
                container: wrapper,
                insertBefore: null
            };
        }

        // Strategy 2: Find by button proximity - look for Mention or Attach button
        const mentionBtn = document.querySelector('button[aria-label*="Mention"], button[aria-label*="mention"]');
        const attachBtn = document.querySelector('button[aria-label*="Attach"], button[aria-label*="attach"], button[aria-label*="attachment"]');
        const referenceBtn = mentionBtn || attachBtn;

        if (referenceBtn) {
            console.log("Thoughtful Voice: Found reference button, injecting in same container");

            // Get the parent container - this should be the flex row with buttons
            const btnContainer = referenceBtn.parentElement;

            if (btnContainer) {
                // Verify it's a flex container
                const style = window.getComputedStyle(btnContainer);
                const isFlexContainer = style.display === 'flex' || style.display === 'inline-flex';

                if (isFlexContainer) {
                    console.log("Thoughtful Voice: Parent is flex container, injecting inside");

                    let wrapper = btnContainer.querySelector('#thoughtful-voice-poe-wrapper');
                    if (!wrapper) {
                        wrapper = document.createElement('div');
                        wrapper.id = 'thoughtful-voice-poe-wrapper';
                        wrapper.className = 'thoughtful-voice-poe-container';
                        // Use display: contents to not break flex layout
                        wrapper.style.cssText = 'display: contents;';
                        btnContainer.appendChild(wrapper);
                    }

                    return {
                        container: wrapper,
                        insertBefore: null
                    };
                } else {
                    // Parent is not flex, try grandparent or insert next to button
                    const grandParent = btnContainer.parentElement;
                    if (grandParent) {
                        const gpStyle = window.getComputedStyle(grandParent);
                        if (gpStyle.display === 'flex' || gpStyle.display === 'inline-flex') {
                            let wrapper = grandParent.querySelector('#thoughtful-voice-poe-wrapper');
                            if (!wrapper) {
                                wrapper = document.createElement('div');
                                wrapper.id = 'thoughtful-voice-poe-wrapper';
                                wrapper.className = 'thoughtful-voice-poe-container';
                                wrapper.style.cssText = 'display: contents;';
                                grandParent.appendChild(wrapper);
                            }

                            return {
                                container: wrapper,
                                insertBefore: null
                            };
                        }
                    }
                }
            }
        }

        // Strategy 3: Find footer and look for button group inside
        const footer = document.querySelector('[class*="ChatMessageInputFooter"], [class*="InputFooter"], [class*="footer"]');

        if (footer) {
            console.log("Thoughtful Voice: Found Poe footer, looking for button group");

            const leftButtonGroup = this._findLeftButtonGroup(footer);

            if (leftButtonGroup) {
                let wrapper = leftButtonGroup.querySelector('#thoughtful-voice-poe-wrapper');
                if (!wrapper) {
                    wrapper = document.createElement('div');
                    wrapper.id = 'thoughtful-voice-poe-wrapper';
                    wrapper.className = 'thoughtful-voice-poe-container';
                    wrapper.style.cssText = 'display: contents;';
                    leftButtonGroup.appendChild(wrapper);
                }

                return {
                    container: wrapper,
                    insertBefore: null
                };
            }
        }

        // Strategy 4: Ultimate Fallback - find textarea and look for nearby buttons row
        const textarea = this.getInputElement();
        if (textarea) {
            const inputContainer = textarea.closest('[class*="ChatMessageInput"], [class*="InputContainer"], form');

            if (inputContainer) {
                console.log("Thoughtful Voice: Using input container fallback for Poe");

                // Look for any flex container with buttons
                const flexContainers = inputContainer.querySelectorAll('div');
                for (const container of flexContainers) {
                    const style = window.getComputedStyle(container);
                    if ((style.display === 'flex' || style.display === 'inline-flex') &&
                        container.querySelectorAll('button').length >= 2) {

                        let wrapper = container.querySelector('#thoughtful-voice-poe-wrapper');
                        if (!wrapper) {
                            wrapper = document.createElement('div');
                            wrapper.id = 'thoughtful-voice-poe-wrapper';
                            wrapper.className = 'thoughtful-voice-poe-container';
                            wrapper.style.cssText = 'display: contents;';
                            container.appendChild(wrapper);
                        }

                        return {
                            container: wrapper,
                            insertBefore: null
                        };
                    }
                }
            }
        }

        console.warn("Thoughtful Voice: No injection target found for Poe");
        return null;
    }

    /**
     * Find the left button group by looking for containers with multiple buttons
     */
    _findLeftButtonGroup(footer) {
        // Look for divs that contain multiple buttons and are on the left side
        const divs = footer.querySelectorAll('div');

        for (const div of divs) {
            const buttons = div.querySelectorAll('button');
            // Left button group typically has 2-4 buttons (attach, mention, etc.)
            if (buttons.length >= 2 && buttons.length <= 5) {
                // Check if it's actually a button group (has flex display)
                const style = window.getComputedStyle(div);
                if (style.display === 'flex' || style.display === 'inline-flex') {
                    return div;
                }
            }
        }

        return null;
    }

    getInputElement() {
        // Poe uses a textarea with various class names
        // Try multiple selectors in order of specificity
        return document.querySelector('textarea[class*="ChatMessageInputContainer"]') ||
            document.querySelector('textarea[class*="GrowingTextArea"]') ||
            document.querySelector('textarea[placeholder*="Message"]') ||
            document.querySelector('textarea[placeholder*="chat"]') ||
            document.querySelector('[class*="ChatMessageInput"] textarea') ||
            document.querySelector('textarea');
    }

    // ========== Optional Overrides ==========

    getUploadStrategies() {
        // Poe supports paste and drag-drop, prioritize paste
        return ['paste', 'dragAndDrop', 'fileInput'];
    }

    getDropZone() {
        // The entire chat input container
        const textarea = this.getInputElement();
        if (textarea) {
            return textarea.closest('[class*="ChatMessageInput"], [class*="InputContainer"], form') || textarea;
        }
        return document.body;
    }

    getFileInputElement() {
        // Look for file input that might be hidden
        return document.querySelector('input[type="file"][accept*="image"]') ||
            document.querySelector('input[type="file"]');
    }
}

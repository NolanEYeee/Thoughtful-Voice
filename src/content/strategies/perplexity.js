import { BaseStrategy } from './base-strategy.js';

/**
 * PerplexityStrategy - Strategy for perplexity.ai
 * 
 * Perplexity uses a contenteditable div with id="ask-input" for input.
 * The toolbar at the bottom uses a grid layout.
 * Red circle indicates the middle gap (column 2 of the 3-column grid).
 */
export class PerplexityStrategy extends BaseStrategy {
    constructor() {
        super('Perplexity');
    }

    // ========== Required Implementations ==========

    async waitForDOM() {
        return new Promise(resolve => {
            const check = () => {
                // Perplexity uses a Lexical editor (contenteditable div)
                const input = document.getElementById('ask-input') || document.querySelector('[role="textbox"]');

                // Look for the action button container (right group)
                const attachButton = document.querySelector('button[aria-label*="Attach"]');

                if (input && attachButton) {
                    console.log("Thoughtful Voice: Perplexity DOM ready (found input and attach button)");
                    resolve();
                } else if (input && document.readyState === 'complete') {
                    console.log("Thoughtful Voice: Perplexity input found but toolbar search continuing...");
                    resolve();
                } else {
                    setTimeout(check, 500);
                }
            };
            check();
        });
    }

    getInjectionTarget() {
        console.log("Thoughtful Voice: Looking for Perplexity injection target...");

        const input = this.getInputElement();
        if (!input) return null;

        // The input and toolbar are both inside a main container
        const container = input.closest('div.bg-raised, div.border, .rounded-2xl, [class*="SearchBox"]');

        // Priority 1: Find the RIGHT-SIDE button group directly
        // We inject INSIDE this group at the beginning so they cluster with the existing icons
        const rightGroup = container?.querySelector('.justify-self-end.col-start-3, .col-start-3.justify-self-end') ||
            document.querySelector('.justify-self-end.col-start-3, .col-start-3.justify-self-end') ||
            document.querySelector('button[aria-label*="Attach"]')?.parentElement;

        if (rightGroup) {
            console.log("Thoughtful Voice: Found Perplexity right group, injecting at the start");

            // We use a small wrapper just for shared styling/layout, but it stays inside their col-start-3
            let wrapper = rightGroup.querySelector('#thoughtful-voice-perplexity-wrapper');
            if (!wrapper) {
                wrapper = document.createElement('div');
                wrapper.id = 'thoughtful-voice-perplexity-wrapper';
                wrapper.className = 'flex items-center gap-1.5 mr-1';
                wrapper.style.display = 'contents'; // Use display contents to inherit flex from parent
                rightGroup.prepend(wrapper);
            }

            return {
                container: wrapper,
                insertBefore: null
            };
        }

        console.warn("Thoughtful Voice: No injection target found for Perplexity");
        return null;
    }

    getInputElement() {
        // Main input is a contenteditable div
        return document.getElementById('ask-input') || document.querySelector('[role="textbox"]');
    }

    // ========== Optional Overrides ==========

    getUploadStrategies() {
        // Perplexity works with paste (clipboard) and drag & drop
        return ['paste', 'dragAndDrop'];
    }

    getDropZone() {
        // The entire search box container
        const inputEl = this.getInputElement();
        if (inputEl) {
            return inputEl.closest('.bg-raised, .border') || inputEl;
        }
        return document.body;
    }
}

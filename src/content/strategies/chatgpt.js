export class ChatGPTStrategy {
    constructor() {
        this.name = 'ChatGPT';
    }

    async waitForDOM() {
        return new Promise(resolve => {
            const check = () => {
                // Wait for the prompt textarea which is central to the UI
                if (document.getElementById('prompt-textarea')) {
                    resolve();
                } else {
                    setTimeout(check, 500);
                }
            };
            check();
        });
    }

    getInjectionTarget() {
        // We want to place the button to the RIGHT of the "+" (Upload/Attachment) button.
        // Usually, the layout is: [ + ] [ Input Area ] [ Send ]

        // 1. Find the attachment button.
        // It often has an aria-label "Attach files" or similar.
        // Current ChatGPT UI: The + button is often a button with aria-label="Attach files"

        const attachButton = document.querySelector('button[aria-label="Attach files"]');

        if (attachButton && attachButton.parentElement) {
            // We want to insert BEFORE the attachButton.
            return {
                container: attachButton.parentElement,
                insertBefore: attachButton // Insert before the + button
            };
        }

        // Fallback: Try to find the wrapper of the text area and put it before the text area?
        // Or if the user meant "Right of +号", maybe they mean inside the input bar on the left side?

        // Let's try to find the textarea parent
        const textarea = document.getElementById('prompt-textarea');
        if (textarea) {
            // Traverse up to find the main input row wrapper.
            // Usually textarea is in a wrapper that might be a sibling of the + button.

            // If we didn't find the attach button (maybe it's a different icon or label),
            // let's try to just prepend to the input container if suitable.

            // But let's stick to the user's specific request: "right of the + sign"
            // If we can't find the + sign, we might default to fixed position or left of input.

            // Strategy: Look for the specific class structure if aria-label changes.
            // Common pattern for the left-side buttons group
            const inputWrapper = textarea.closest('.flex.items-end'); // Often the row wrapper
            if (inputWrapper) {
                // Try to find the first button child
                const firstButton = inputWrapper.querySelector('button');
                if (firstButton) {
                    return {
                        container: inputWrapper,
                        insertBefore: firstButton.nextSibling
                    }
                }
            }
        }

        return null;
    }

    async handleUpload(blob, durationString) {
        console.log("ChatGPTStrategy: Handling upload via Clipboard Paste");

        const file = new File([blob], `audio_recording_${Date.now()}.wav`, { type: 'audio/wav' });
        const textBox = document.getElementById('prompt-textarea');

        if (!textBox) {
            console.error("ChatGPT input not found");
            return;
        }

        try {
            const dataTransfer = new DataTransfer();
            dataTransfer.items.add(file);

            const pasteEvent = new ClipboardEvent('paste', {
                bubbles: true,
                cancelable: true,
                clipboardData: dataTransfer
            });

            textBox.focus();
            textBox.dispatchEvent(pasteEvent);

            console.log("ChatGPTStrategy: Paste event dispatched");

            // Optional: Insert text
            // this.insertText(textBox);

        } catch (e) {
            console.error("ChatGPT Paste failed", e);
        }
    }

    insertText(textBox) {
        if (textBox) {
            const textToInsert = "Please analyze this audio";
            textBox.focus();
            document.execCommand('insertText', false, textToInsert);
        }
    }
}

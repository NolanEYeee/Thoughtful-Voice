import { Recorder } from './recorder.js';
import { Injector } from './injector.js';
import { BubbleRenderer } from './bubble.js';
import { StorageHelper } from './storage.js';
import { GeminiStrategy } from './strategies/gemini.js';
// import { ChatGPTStrategy } from './strategies/chatgpt.js';

console.log("AI Voice Uploader: Content script loaded");

async function init() {
    const host = window.location.hostname;
    let strategy = null;

    if (host.includes('gemini.google.com')) {
        strategy = new GeminiStrategy();
    } else if (host.includes('openai.com')) {
        console.log("ChatGPT support postponed");
        return;
    }

    if (!strategy) {
        console.log("AI Voice Uploader: Unknown platform");
        return;
    }

    console.log(`AI Voice Uploader: Using ${strategy.name}`);

    // Wait for DOM to be ready for injection
    await strategy.waitForDOM();

    // Initialize Bubble Renderer
    const bubbleRenderer = new BubbleRenderer();
    bubbleRenderer.init();

    const recorder = new Recorder();

    const injector = new Injector(recorder, async (blob, duration) => {
        // 1. Upload to Platform
        await strategy.handleUpload(blob, duration);

        // 2. Save to History
        const seconds = Math.floor(duration / 1000);
        const m = Math.floor(seconds / 60).toString().padStart(2, '0');
        const s = (seconds % 60).toString().padStart(2, '0');

        await StorageHelper.saveRecording({
            timestamp: Date.now(),
            site: 'Gemini',
            durationString: `${m}:${s}`,
            filename: `audio_recording_${Date.now()}.webm`
        }, blob);
    });

    // Initial check
    const target = strategy.getInjectionTarget();
    injector.inject(target);

    // Watch for page changes (SPA navigation)
    const observer = new MutationObserver(() => {
        const newTarget = strategy.getInjectionTarget();
        if (newTarget && !document.getElementById('ai-voice-uploader-btn')) {
            injector.inject(newTarget);
        }
    });

    observer.observe(document.body, { childList: true, subtree: true });
}

// Give a small delay to ensure page frameworks are loading
setTimeout(init, 2000);

import { Recorder } from './recorder.js';
import { ScreenRecorder } from './screen-recorder.js';
import { Injector } from './injector.js';
import { BubbleRenderer } from './bubble.js';
import { StorageHelper } from './storage.js';
import { GeminiStrategy } from './strategies/gemini.js';
import { ChatGPTStrategy } from './strategies/chatgpt.js';
import { generateAudioFilename } from '../utils/config.js';

console.log("AI Voice Uploader: Content script loaded");

async function init() {
    const host = window.location.hostname;
    let strategy = null;

    if (host.includes('gemini.google.com')) {
        strategy = new GeminiStrategy();
    } else if (host.includes('chatgpt.com') || host.includes('openai.com')) {
        strategy = new ChatGPTStrategy();
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
    const screenRecorder = new ScreenRecorder(strategy.name.toLowerCase()); // Pass 'gemini' or 'chatgpt'

    // Audio upload handler
    const handleAudioUpload = async (blob, duration) => {
        // 1. Upload to Platform
        await strategy.handleUpload(blob, duration);

        // 2. Save to History
        const seconds = Math.floor(duration / 1000);
        const m = Math.floor(seconds / 60).toString().padStart(2, '0');
        const s = (seconds % 60).toString().padStart(2, '0');

        await StorageHelper.saveRecording({
            type: 'audio',
            timestamp: Date.now(),
            site: strategy.name,
            url: window.location.href, // Save chatroom URL
            durationString: `${m}:${s}`,
            filename: generateAudioFilename()
        }, blob);
    };

    // Video upload handler
    const handleVideoUpload = async (result) => {
        // 1. Upload video to Platform (pass the whole result object with blob, duration, and format)
        await strategy.handleVideoUpload(result);

        // 2. Save to History
        const seconds = Math.floor(result.duration / 1000);
        const m = Math.floor(seconds / 60).toString().padStart(2, '0');
        const s = (seconds % 60).toString().padStart(2, '0');

        await StorageHelper.saveRecording({
            type: 'video',
            timestamp: Date.now(),
            site: strategy.name,
            url: window.location.href, // Save chatroom URL
            durationString: `${m}:${s}`,
            filename: `video_recording_${Date.now()}.webm`,
            format: result.format
        }, result.blob);

        console.log(`Screen recording uploaded: ${m}:${s} (${result.format.toUpperCase()})`);
    };

    const injector = new Injector(recorder, screenRecorder, handleAudioUpload, handleVideoUpload);

    // Initial check
    const target = strategy.getInjectionTarget();
    injector.inject(target);

    // Watch for page changes (SPA navigation) and re-position if needed
    const observer = new MutationObserver(() => {
        const newTarget = strategy.getInjectionTarget();
        const existingButton = document.getElementById('ai-voice-uploader-btn');
        const existingScreenButton = document.getElementById('ai-screen-recorder-btn');

        if (!existingButton && newTarget) {
            // Button doesn't exist, inject it
            injector.inject(newTarget);
        } else if (existingButton && newTarget) {
            // Button exists, but check if it's in the correct location
            // The correct location is next to the Tools button
            const toolsContainer = document.querySelector('.toolbox-drawer-button-container');

            if (toolsContainer) {
                // Check if our button is a sibling of the toolsContainer
                const expectedParent = toolsContainer.parentElement;
                const currentParent = existingButton.parentElement;

                // If button is not in the expected parent, re-inject it
                if (currentParent !== expectedParent) {
                    console.log("AI Voice Uploader: Button in wrong location, re-positioning...");
                    existingButton.remove();
                    if (existingScreenButton) existingScreenButton.remove();
                    injector.inject(newTarget);
                }
            }
        }
    });

    observer.observe(document.body, { childList: true, subtree: true });
}

// Give a small delay to ensure page frameworks are loading
setTimeout(init, 2000);

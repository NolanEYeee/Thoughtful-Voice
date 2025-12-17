import { Recorder } from './recorder.js';
import { ScreenRecorder } from './screen-recorder.js';
import { Injector } from './injector.js';
import { BubbleRenderer } from './bubble.js';
import { StorageHelper } from './storage.js';
import { GeminiStrategy } from './strategies/gemini.js';
import { ChatGPTStrategy } from './strategies/chatgpt.js';
import { generateAudioFilename } from '../utils/config.js';

console.log("Thoughtful Voice: Content script loaded");

async function init() {
    const host = window.location.hostname;
    let strategy = null;

    if (host.includes('gemini.google.com')) {
        strategy = new GeminiStrategy();
    } else if (host.includes('chatgpt.com') || host.includes('openai.com')) {
        strategy = new ChatGPTStrategy();
    }

    if (!strategy) {
        console.log("Thoughtful Voice: Unknown platform");
        return;
    }

    console.log(`Thoughtful Voice: Using ${strategy.name}`);

    // Wait for DOM to be ready for injection
    await strategy.waitForDOM();

    // Initialize Bubble Renderer
    const bubbleRenderer = new BubbleRenderer();
    bubbleRenderer.init();

    const recorder = new Recorder();
    const screenRecorder = new ScreenRecorder(strategy.name.toLowerCase()); // Pass 'gemini' or 'chatgpt'

    // Track URL changes and update storage
    let lastRecordingTimestamp = null;
    let urlUpdateWatcher = null;

    const startUrlWatcher = (timestamp, type) => {
        const initialUrl = window.location.href;
        lastRecordingTimestamp = timestamp;

        // Clear any existing watcher
        if (urlUpdateWatcher) {
            clearInterval(urlUpdateWatcher);
        }

        // Watch for URL changes for up to 30 seconds after upload
        let watchDuration = 0;
        const maxWatchTime = 30000; // 30 seconds

        urlUpdateWatcher = setInterval(async () => {
            watchDuration += 500;
            const currentUrl = window.location.href;

            // If URL changed, update the recording
            if (currentUrl !== initialUrl) {
                console.log(`Thoughtful Voice: URL changed from ${initialUrl} to ${currentUrl}`);
                await StorageHelper.updateRecordingUrl(timestamp, currentUrl);
                clearInterval(urlUpdateWatcher);
                urlUpdateWatcher = null;
            }

            // Stop watching after max time
            if (watchDuration >= maxWatchTime) {
                clearInterval(urlUpdateWatcher);
                urlUpdateWatcher = null;
            }
        }, 500); // Check every 500ms
    };

    // Declare injector placeholder (will be created after handlers)
    let injector = null;

    // Audio upload handler
    const handleAudioUpload = async (blob, duration) => {
        // Get URL from when recording started (stored in injector)
        const recordingUrl = injector.audioRecordingStartUrl || window.location.href;

        // 1. Upload to Platform
        await strategy.handleUpload(blob, duration);

        // 2. Save to History
        const seconds = Math.floor(duration / 1000);
        const m = Math.floor(seconds / 60).toString().padStart(2, '0');
        const s = (seconds % 60).toString().padStart(2, '0');

        const timestamp = Date.now();
        await StorageHelper.saveRecording({
            type: 'audio',
            timestamp: timestamp,
            site: strategy.name,
            url: recordingUrl, // Use URL from when recording started
            durationString: `${m}:${s}`,
            filename: generateAudioFilename()
        }, blob);

        // Start watching for URL changes after upload
        startUrlWatcher(timestamp, 'audio');

        // Reset the start URL in injector
        injector.audioRecordingStartUrl = null;
    };

    // Video upload handler
    const handleVideoUpload = async (result) => {
        // Get URL from when recording started (stored in injector)
        const recordingUrl = injector.videoRecordingStartUrl || window.location.href;

        // 1. Upload video to Platform (pass the whole result object with blob, duration, and format)
        await strategy.handleVideoUpload(result);

        // 2. Save to History
        const seconds = Math.floor(result.duration / 1000);
        const m = Math.floor(seconds / 60).toString().padStart(2, '0');
        const s = (seconds % 60).toString().padStart(2, '0');

        const timestamp = Date.now();
        await StorageHelper.saveRecording({
            type: 'video',
            timestamp: timestamp,
            site: strategy.name,
            url: recordingUrl, // Use URL from when recording started
            durationString: `${m}:${s}`,
            filename: `video_recording_${Date.now()}.webm`,
            format: result.format
        }, result.blob);

        console.log(`Screen recording uploaded: ${m}:${s} (${result.format.toUpperCase()})`);

        // Start watching for URL changes after upload
        startUrlWatcher(timestamp, 'video');

        // Reset the start URL in injector
        injector.videoRecordingStartUrl = null;
    };

    injector = new Injector(recorder, screenRecorder, handleAudioUpload, handleVideoUpload);

    // Initial check
    const target = strategy.getInjectionTarget();
    injector.inject(target);

    // Watch for page changes (SPA navigation) and re-position if needed
    const observer = new MutationObserver(() => {
        const newTarget = strategy.getInjectionTarget();
        const existingButton = document.getElementById('thoughtful-voice-btn');
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
                    console.log("Thoughtful Voice: Button in wrong location, re-positioning...");
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

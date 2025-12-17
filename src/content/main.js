/**
 * Main Content Script - Thoughtful Voice
 * 
 * This is the entry point for the content script.
 * It uses the strategy pattern to support multiple AI platforms.
 */

import { Recorder } from './recorder.js';
import { ScreenRecorder } from './screen-recorder.js';
import { Injector } from './injector.js';
import { BubbleRenderer } from './bubble.js';
import { StorageHelper } from './storage.js';
import { getStrategyForHost } from './strategies/index.js';
import { generateAudioFilename } from '../utils/config.js';

console.log("Thoughtful Voice: Content script loaded");

async function init() {
    const host = window.location.hostname;

    // Get the appropriate strategy for this platform
    const strategy = getStrategyForHost(host);

    if (!strategy) {
        console.log("Thoughtful Voice: Unknown platform, extension inactive");
        return;
    }

    console.log(`Thoughtful Voice: Using ${strategy.name} strategy`);

    // Wait for DOM to be ready for injection
    await strategy.waitForDOM();

    // Initialize Bubble Renderer
    const bubbleRenderer = new BubbleRenderer();
    bubbleRenderer.init();

    // Initialize recorders
    const recorder = new Recorder();
    const screenRecorder = new ScreenRecorder(strategy.name.toLowerCase());

    // URL tracking for recording provenance
    let urlUpdateWatcher = null;

    /**
     * Start watching for URL changes after upload
     * This allows recordings to be linked to their chat conversation
     */
    const startUrlWatcher = (timestamp) => {
        const initialUrl = window.location.href;

        // Clear any existing watcher
        if (urlUpdateWatcher) {
            clearInterval(urlUpdateWatcher);
        }

        // Watch for URL changes for up to 30 seconds after upload
        let watchDuration = 0;
        const maxWatchTime = 30000;

        urlUpdateWatcher = setInterval(async () => {
            watchDuration += 500;
            const currentUrl = window.location.href;

            if (currentUrl !== initialUrl) {
                console.log(`Thoughtful Voice: URL changed to ${currentUrl}`);
                await StorageHelper.updateRecordingUrl(timestamp, currentUrl);
                clearInterval(urlUpdateWatcher);
                urlUpdateWatcher = null;
            }

            if (watchDuration >= maxWatchTime) {
                clearInterval(urlUpdateWatcher);
                urlUpdateWatcher = null;
            }
        }, 500);
    };

    // Declare injector placeholder (will be created after handlers)
    let injector = null;

    /**
     * Handle audio recording completion
     */
    const handleAudioUpload = async (blob, duration) => {
        // Get URL from when recording started
        const recordingUrl = injector.audioRecordingStartUrl || window.location.href;

        // 1. Upload to Platform (using strategy)
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
            url: recordingUrl,
            durationString: `${m}:${s}`,
            filename: generateAudioFilename()
        }, blob);

        // Start watching for URL changes
        startUrlWatcher(timestamp);

        // Reset the start URL
        injector.audioRecordingStartUrl = null;
    };

    /**
     * Handle video recording completion
     */
    const handleVideoUpload = async (result) => {
        // Get URL from when recording started
        const recordingUrl = injector.videoRecordingStartUrl || window.location.href;

        // 1. Upload video to Platform (using strategy)
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
            url: recordingUrl,
            durationString: `${m}:${s}`,
            filename: `video_recording_${Date.now()}.webm`,
            format: result.format
        }, result.blob);

        console.log(`Screen recording uploaded: ${m}:${s} (${result.format.toUpperCase()})`);

        // Start watching for URL changes
        startUrlWatcher(timestamp);

        // Reset the start URL
        injector.videoRecordingStartUrl = null;
    };

    // Create injector with handlers
    injector = new Injector(recorder, screenRecorder, handleAudioUpload, handleVideoUpload);

    // Initial injection
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
            // Button exists, check if it's in the correct location
            // This handles SPA navigation where elements are recreated
            const expectedParent = newTarget.container;
            const currentParent = existingButton.parentElement;

            if (currentParent !== expectedParent) {
                console.log("Thoughtful Voice: Button in wrong location, re-positioning...");
                existingButton.remove();
                if (existingScreenButton) existingScreenButton.remove();
                injector.inject(newTarget);
            }
        }
    });

    observer.observe(document.body, { childList: true, subtree: true });
}

// Give a small delay to ensure page frameworks are loading
setTimeout(init, 2000);

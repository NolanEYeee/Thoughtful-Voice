/**
 * Settings Manager
 * Handles storage and retrieval of recording settings
 */

// Default settings
export const DEFAULT_SETTINGS = {
    // Prompt settings
    promptText: "Please answer based on this audio",

    // Video settings (screen recording)
    video: {
        codec: 'vp9',           // 'vp9', 'vp8', 'h264'
        resolution: '720p',     // '1080p', '720p', '480p'
        bitrate: 2000,          // kbps
        fps: 30,                // frames per second
        timeslice: 1000         // ms - data collection interval
    },

    // Audio settings (voice recording)
    audio: {
        sampleRate: 44100,      // Hz
        bufferSize: 4096        // samples
    }
};

// Resolution presets
export const RESOLUTION_PRESETS = {
    '1080p': { width: 1920, height: 1080 },
    '720p': { width: 1280, height: 720 },
    '480p': { width: 854, height: 480 }
};

// Codec options
export const CODEC_OPTIONS = {
    'vp9': 'video/webm;codecs=vp9,opus',
    'vp8': 'video/webm;codecs=vp8,opus',
    'h264': 'video/webm;codecs=h264,opus'
};

/**
 * Load settings from chrome.storage.local
 * @returns {Promise<Object>} Settings object
 */
export async function loadSettings() {
    const result = await chrome.storage.local.get(['settings']);
    return { ...DEFAULT_SETTINGS, ...result.settings };
}

/**
 * Save settings to chrome.storage.local
 * @param {Object} settings - Settings to save
 */
export async function saveSettings(settings) {
    await chrome.storage.local.set({ settings });
}

/**
 * Reset settings to defaults
 */
export async function resetSettings() {
    await chrome.storage.local.set({ settings: DEFAULT_SETTINGS });
    return DEFAULT_SETTINGS;
}

/**
 * Get video constraints based on settings
 * @param {Object} videoSettings - Video settings object
 * @returns {Object} MediaTrackConstraints for getDisplayMedia
 */
export function getVideoConstraints(videoSettings) {
    const resolution = RESOLUTION_PRESETS[videoSettings.resolution] || RESOLUTION_PRESETS['720p'];
    return {
        displaySurface: "monitor",
        logicalSurface: true,
        cursor: "always",
        width: { ideal: resolution.width, max: 1920 },
        height: { ideal: resolution.height, max: 1080 },
        frameRate: { ideal: videoSettings.fps, max: 60 }
    };
}

/**
 * Get MediaRecorder options based on settings
 * @param {Object} videoSettings - Video settings object
 * @returns {Object} MediaRecorder options
 */
export function getMediaRecorderOptions(videoSettings) {
    let mimeType = CODEC_OPTIONS[videoSettings.codec] || CODEC_OPTIONS['vp9'];

    // Check if codec is supported
    if (!MediaRecorder.isTypeSupported(mimeType)) {
        // Fallback chain
        if (MediaRecorder.isTypeSupported(CODEC_OPTIONS['vp9'])) {
            mimeType = CODEC_OPTIONS['vp9'];
        } else if (MediaRecorder.isTypeSupported(CODEC_OPTIONS['vp8'])) {
            mimeType = CODEC_OPTIONS['vp8'];
        } else {
            mimeType = 'video/webm';
        }
        console.warn(`Codec ${videoSettings.codec} not supported, using fallback: ${mimeType}`);
    }

    return {
        mimeType: mimeType,
        videoBitsPerSecond: videoSettings.bitrate * 1000, // Convert kbps to bps
        audioBitsPerSecond: 128000 // 128 kbps for audio
    };
}

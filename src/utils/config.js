export const DEFAULT_PROMPT_TEXT = "Please answer based on this audio";

/**
 * Generates a standardized filename for recordings
 * Format: Thoughtful-Voice_Audio_ChatGPT_20251220_120602.wav
 * @param {string} type 'Audio' or 'Video'
 * @param {string} extension 'wav' or 'webm'
 * @param {string} platform e.g., 'ChatGPT', 'Gemini'
 */
export function generateFilename(type = 'Audio', extension = 'wav', platform = '') {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');

    const platformSuffix = platform ? `_${platform}` : '';
    const dateStr = `${year}${month}${day}_${hours}${minutes}${seconds}`;

    return `Thoughtful-Voice_${type}${platformSuffix}_${dateStr}.${extension}`;
}

export function generateAudioFilename(platform = '') {
    return generateFilename('Audio', 'wav', platform);
}

export function generateVideoFilename(format = 'webm', platform = '') {
    return generateFilename('Video', format, platform);
}



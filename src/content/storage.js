export class StorageHelper {
    static blobToBase64(blob) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsDataURL(blob);
        });
    }

    static async saveRecording(metadata, blob) {
        // metadata: { id, filename, durationString, timestamp, site }
        try {
            if (blob) {
                metadata.audioData = await this.blobToBase64(blob);
            }

            const result = await chrome.storage.local.get(['recordings']);
            const recordings = result.recordings || [];

            // Limit storage to last 20 items to avoid quota limits
            if (recordings.length >= 20) {
                recordings.pop();
            }

            recordings.unshift(metadata); // Add to top
            await chrome.storage.local.set({ recordings });
            console.log("Recording saved to storage");
        } catch (e) {
            console.error("Failed to save recording", e);
        }
    }

    static async getRecordings() {
        try {
            const result = await chrome.storage.local.get(['recordings']);
            return result.recordings || [];
        } catch (e) {
            console.error("Failed to get recordings", e);
            return [];
        }
    }

    static async isExtensionRecording(filename) {
        // Heuristic check
        return filename.startsWith('audio_recording_');
    }
}

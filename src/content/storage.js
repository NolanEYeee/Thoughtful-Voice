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
                console.log(`Converting blob to Base64... size: ${(blob.size / 1024 / 1024).toFixed(2)} MB`);
                metadata.audioData = await this.blobToBase64(blob);
                console.log(`Base64 string length: ${(metadata.audioData.length / 1024 / 1024).toFixed(2)} MB`);
            }

            // Get user settings for max recordings
            const settingsResult = await chrome.storage.local.get(['settings']);
            const settings = settingsResult.settings || {};
            const maxRecordings = settings.maxRecordings || 10; // Default to 10

            // 2. Save to History
            const result = await chrome.storage.local.get(['recordings', 'stats']);
            const recordings = result.recordings || [];
            const stats = result.stats || { lifetimeAudioMs: 0, lifetimeVideoMs: 0, totalRecordings: 0 };

            // Update lifetime stats
            if (metadata.type === 'audio') {
                stats.lifetimeAudioMs = (stats.lifetimeAudioMs || 0) + (metadata.durationMs || 0);
            } else if (metadata.type === 'video') {
                stats.lifetimeVideoMs = (stats.lifetimeVideoMs || 0) + (metadata.durationMs || 0);
            }
            stats.totalRecordings = (stats.totalRecordings || 0) + 1;

            // Limit storage based on user settings
            while (recordings.length >= maxRecordings) {
                recordings.pop(); // Remove oldest
            }

            recordings.unshift(metadata); // Add to top

            // Try to save
            try {
                await chrome.storage.local.set({ recordings, stats });
                console.log("Recording and stats saved to storage successfully");

                // Log storage usage
                if (chrome.storage.local.getBytesInUse) {
                    chrome.storage.local.getBytesInUse(null, (bytesInUse) => {
                        console.log(`Storage usage: ${(bytesInUse / 1024 / 1024).toFixed(2)} MB`);
                    });
                }
            } catch (storageError) {
                console.error("Storage quota exceeded or save failed:", storageError);

                // If it's a quota error, try saving without the audio data
                if (storageError.message && storageError.message.includes('QUOTA')) {
                    console.warn("Attempting to save metadata only (without audio data)...");
                    delete metadata.audioData;
                    recordings[0] = metadata; // Update the first item
                    await chrome.storage.local.set({ recordings });
                    console.log("Saved metadata only (audio data was too large)");

                    // Notify user
                    console.warn("Recording was too large to save audio data. Only metadata was saved.");
                } else {
                    throw storageError;
                }
            }
        } catch (e) {
            console.error("Failed to save recording:", e);
            console.error("Error details:", e.message, e.stack);
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

    static async updateRecordingUrl(timestamp, newUrl) {
        // Update the URL of a recording by its timestamp
        try {
            const result = await chrome.storage.local.get(['recordings']);
            const recordings = result.recordings || [];

            // Find the recording by timestamp
            const recording = recordings.find(rec => rec.timestamp === timestamp);
            if (recording) {
                recording.url = newUrl;
                await chrome.storage.local.set({ recordings });
                console.log(`Updated recording URL to: ${newUrl}`);
            }
        } catch (e) {
            console.error("Failed to update recording URL", e);
        }
    }

    static async isExtensionRecording(filename) {
        // Heuristic check
        return filename.startsWith('audio_recording_');
    }
}

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
        // metadata: { id, filename, durationString, timestamp, site, type }
        try {
            let audioData = null;
            if (blob) {
                console.log(`Converting blob to Base64... size: ${(blob.size / 1024 / 1024).toFixed(2)} MB`);
                audioData = await this.blobToBase64(blob);
                console.log(`Base64 string length: ${(audioData.length / 1024 / 1024).toFixed(2)} MB`);
            }

            // Get user settings for max recordings
            const settingsResult = await chrome.storage.local.get(['settings']);
            const settings = settingsResult.settings || {};
            const maxRecordings = settings.maxRecordings || 10; // Default to 10

            // 1. Prepare Metadata (NO audioData here to keep the list lightweight)
            const metadataToSave = { ...metadata };
            delete metadataToSave.audioData;

            // 2. Load History
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

            // 3. Handle data retention and cleanup
            while (recordings.length >= maxRecordings) {
                const oldest = recordings.pop(); // Remove oldest from list
                // Also remove the associated data key
                if (oldest && oldest.timestamp) {
                    await chrome.storage.local.remove(`rec_data_${oldest.timestamp}`);
                }
            }

            recordings.unshift(metadataToSave); // Add metadata to top

            // 4. Save both metadata list and the specific data chunk
            try {
                const storagePayload = {
                    recordings,
                    stats
                };

                // Add the actual data as a separate key
                if (audioData) {
                    storagePayload[`rec_data_${metadata.timestamp}`] = audioData;
                }

                await chrome.storage.local.set(storagePayload);
                console.log(`Recording ${metadata.timestamp} saved with split data strategy.`);

                // Log storage usage
                if (chrome.storage.local.getBytesInUse) {
                    chrome.storage.local.getBytesInUse(null, (bytesInUse) => {
                        console.log(`Storage usage: ${(bytesInUse / 1024 / 1024).toFixed(2)} MB`);
                    });
                }
            } catch (storageError) {
                console.error("Storage quota exceeded or save failed:", storageError);

                // If it's a quota error, we already saved metadata only by not having audioData in the payload
                // but let's be explicit and try to save just the list if the combined set failed
                if (storageError.message && storageError.message.includes('QUOTA')) {
                    console.warn("Attempting to save metadata only due to quota...");
                    await chrome.storage.local.set({ recordings, stats });
                } else {
                    throw storageError;
                }
            }
        } catch (e) {
            console.error("Failed to save recording:", e);
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
        // Heuristic check to see if this file was created by our extension
        return filename.startsWith('Thoughtful-Voice_') ||
            filename.startsWith('audio_') ||
            filename.startsWith('video_recording_');
    }

}

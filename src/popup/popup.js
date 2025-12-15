import { StorageHelper } from '../content/storage.js';

// Note: StorageHelper is in content/ but accessible if we bundle or strict pathing. 
// However, in extension context, popup has its own context. 
// We should copy or import StorageHelper. 
// Since we are using modules, relative import works if the file structure allows.

// Chrome extensions handle modules relative to root if specified in manifest, 
// but here we are loading popup.js as module from popup.html.
// We need to ensure logic is shared.

async function loadRecordings() {
    // For the popup, we can access chrome.storage.local directly, 
    // but the StorageHelper class might use 'export' which is fine for module type.

    // Check if there are recordings
    const result = await chrome.storage.local.get(['recordings']);
    const recordings = result.recordings || [];

    const list = document.getElementById('list');
    list.innerHTML = '';

    if (recordings.length === 0) {
        list.innerHTML = '<div class="empty-state">No recordings yet. Go to Gemini or ChatGPT to record.</div>';
        return;
    }

    recordings.forEach((rec, index) => {
        const item = document.createElement('div');
        item.className = 'recording-item';

        const date = new Date(rec.timestamp).toLocaleString();

        // Note: We cannot play the BLOB directly if it wasn't saved as a base64 string or similar.
        // Chrome storage only saves JSON-serializable data. Blobs are NOT serializable.
        // CRITICAL FIX: We need to change Recorder/Storage to save Base64 string of the audio!

        // Assuming for now we missed that step in Recorder -> let's fix it here or note the bug.
        // If we only saved metadata, we can't play it.
        // I will assume for this step we need to update StorageHelper/Recorder to save data as DataURL.

        item.innerHTML = `
            <div class="meta">
                <span class="site-name">${rec.site || 'Unknown Site'}</span>
                <span>${date}</span>
                <span>${rec.durationString || ''}</span>
            </div>
            <div class="controls">
                <!-- Audio player will only work if we have the data -->
                ${rec.audioData ? `<audio controls src="${rec.audioData}"></audio>` : '<span style="color:red; font-size:10px;">Audio data missing</span>'}
                <button class="delete-btn" data-index="${index}">Delete</button>
            </div>
        `;
        list.appendChild(item);
    });

    // Add delete listeners
    document.querySelectorAll('.delete-btn').forEach(btn => {
        btn.onclick = async (e) => {
            const idx = parseInt(e.target.dataset.index);
            recordings.splice(idx, 1);
            await chrome.storage.local.set({ recordings });
            loadRecordings();
        };
    });
}

document.addEventListener('DOMContentLoaded', async () => {
    await loadRecordings();
    setupSettings();
});

async function setupSettings() {
    const settingsBtn = document.getElementById('settings-btn');
    const modal = document.getElementById('settings-modal');
    const cancelBtn = document.getElementById('cancel-settings');
    const saveBtn = document.getElementById('save-settings');
    const promptInput = document.getElementById('prompt-text');

    // Default from shared config or fallback
    const DEFAULT_PROMPT = "Please answer based on this audio";

    // Open Modal
    settingsBtn.onclick = async () => {
        const result = await chrome.storage.local.get(['promptText']);
        promptInput.value = result.promptText || DEFAULT_PROMPT;
        modal.style.display = 'block';
    };

    // Close Modal
    cancelBtn.onclick = () => {
        modal.style.display = 'none';
    };

    // Save Settings
    saveBtn.onclick = async () => {
        const text = promptInput.value;
        await chrome.storage.local.set({ promptText: text });
        modal.style.display = 'none';
    };

    // Close on click outside
    window.onclick = (event) => {
        if (event.target == modal) {
            modal.style.display = 'none';
        }
    };
}

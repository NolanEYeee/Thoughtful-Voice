import { StorageHelper } from '../content/storage.js';

// Track Shift key state globally for quick-delete feature
let isShiftPressed = false;

// Update Shift key visual feedback on delete buttons
function updateShiftKeyFeedback() {
    const deleteButtons = document.querySelectorAll('.retro-btn.delete');
    deleteButtons.forEach(btn => {
        if (isShiftPressed) {
            btn.classList.add('shift-ready');
            btn.title = 'Click to delete immediately (Shift held)';
        } else {
            btn.classList.remove('shift-ready');
            btn.title = 'Delete (Hold Shift for quick delete)';
        }
    });
}

// Set up global Shift key listeners
document.addEventListener('keydown', (e) => {
    if (e.key === 'Shift' && !isShiftPressed) {
        isShiftPressed = true;
        updateShiftKeyFeedback();
    }
});

document.addEventListener('keyup', (e) => {
    if (e.key === 'Shift') {
        isShiftPressed = false;
        updateShiftKeyFeedback();
    }
});

// Reset shift state when window loses focus
window.addEventListener('blur', () => {
    isShiftPressed = false;
    updateShiftKeyFeedback();
});

// Custom Confirmation Modal System
function showConfirmModal(message, onConfirm, onCancel) {
    // Create modal if not exists
    let modal = document.getElementById('confirm-modal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'confirm-modal';
        modal.innerHTML = `
            <div class="confirm-backdrop"></div>
            <div class="confirm-dialog">
                <div class="confirm-icon">
                    <svg width="48" height="48" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
                    </svg>
                </div>
                <div class="confirm-message"></div>
                <div class="confirm-buttons">
                    <button class="confirm-btn cancel">Cancel</button>
                    <button class="confirm-btn confirm">Confirm</button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
        // Force reflow after creation to ensure animation works on first show
        void modal.offsetHeight;
    }

    const messageEl = modal.querySelector('.confirm-message');
    const confirmBtn = modal.querySelector('.confirm-btn.confirm');
    const cancelBtn = modal.querySelector('.confirm-btn.cancel');

    messageEl.textContent = message;

    // Use requestAnimationFrame to ensure the browser has painted the initial state
    // This fixes the first-time animation issue
    requestAnimationFrame(() => {
        requestAnimationFrame(() => {
            modal.classList.add('show');
        });
    });

    // Clean up previous listeners
    const newConfirmBtn = confirmBtn.cloneNode(true);
    const newCancelBtn = cancelBtn.cloneNode(true);
    confirmBtn.parentNode.replaceChild(newConfirmBtn, confirmBtn);
    cancelBtn.parentNode.replaceChild(newCancelBtn, cancelBtn);

    const closeModal = () => {
        modal.classList.remove('show');
    };

    newConfirmBtn.addEventListener('click', () => {
        closeModal();
        if (onConfirm) onConfirm();
    });

    newCancelBtn.addEventListener('click', () => {
        closeModal();
        if (onCancel) onCancel();
    });

    modal.querySelector('.confirm-backdrop').addEventListener('click', () => {
        closeModal();
        if (onCancel) onCancel();
    });
}

async function loadRecordings() {
    const result = await chrome.storage.local.get(['recordings']);
    const recordings = result.recordings || [];

    const list = document.getElementById('list');
    list.innerHTML = '';

    if (recordings.length === 0) {
        list.innerHTML = '<div style="text-align: center; color: #666; padding: 40px; font-family: monospace;">[NO TAPES FOUND]</div>';
        return;
    }

    // Group by Date
    // Sort descending first
    recordings.sort((a, b) => b.timestamp - a.timestamp);

    const groups = {};
    recordings.forEach((rec, originalIndex) => {
        const date = new Date(rec.timestamp);
        const dateKey = date.toLocaleDateString();

        if (!groups[dateKey]) {
            groups[dateKey] = {
                dateObj: date,
                items: []
            };
        }
        groups[dateKey].items.push({ ...rec, originalIndex });
    });

    // Render Groups (simplified - no date badges)
    Object.keys(groups).forEach(dateKey => {
        const group = groups[dateKey];

        // Create container in list for this date group
        const groupContainer = document.createElement('div');
        groupContainer.className = 'recording-group';
        groupContainer.id = `group-${dateKey.replace(/\//g, '-')}`;

        // Render items for this group
        group.items.forEach(item => {
            const el = createRecordingElement(item, item.originalIndex);
            groupContainer.appendChild(el);
        });

        list.appendChild(groupContainer);
    });

    attachListeners(recordings);
}

function createRecordingElement(rec, index) {
    const isVideo = rec.type === 'video';
    const date = new Date(rec.timestamp);

    // Unified date/time formatting
    const dateStr = date.toLocaleDateString('zh-CN', { month: '2-digit', day: '2-digit' }); // 12/16
    const timeStr = date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', hour12: false }); // 20:10
    const dateTimeStr = `${dateStr} ${timeStr}`; // 12/16 20:10

    const div = document.createElement('div');

    if (isVideo) {
        // CRT Video Card - Unified layout
        div.className = 'crt-card';

        // Create site link if URL exists
        const siteName = (rec.site || 'VIDEO').toUpperCase();
        const siteLabel = rec.url
            ? `<a href="${rec.url}" target="_blank" class="site-link" title="Open ${siteName} chat">📹 ${siteName}</a>`
            : `<span>📹 ${siteName}</span>`;

        div.innerHTML = `
            <div class="viewfinder-label">
                <div class="label-left">${siteLabel}</div>
                <div class="label-right">${dateStr}</div>
            </div>
            <div class="crt-screen">
                <div class="crt-overlay"></div>
                <video controls src="${rec.audioData}" preload="metadata"></video>
            </div>
            <div class="crt-controls">
                <div class="time-info">
                    <span class="time-display">${timeStr}</span>
                    <span class="time-display duration">${rec.durationString || '00:00'}</span>
                </div>
                <div class="control-group">
                    <a class="retro-btn" href="${rec.audioData}" download="video_${dateStr.replace('/', '')}_${timeStr.replace(':', '')}.webm" title="Download">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M19 12v7H5v-7H3v7c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2v-7h-2zm-6 .67l2.59-2.58L17 11.5l-5 5-5-5 1.41-1.41L11 12.67V3h2z"/>
                        </svg>
                    </a>
                    <button class="retro-btn delete" data-index="${index}" title="Delete">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/>
                        </svg>
                    </button>
                </div>
            </div>
        `;
    } else {
        // Cassette Tape Card - Unified layout
        div.className = 'tape-card';
        const audioId = `audio-${index}`;

        // Create site link if URL exists (match video card style)
        const siteName = (rec.site || 'AUDIO').toUpperCase();
        const siteLabel = rec.url
            ? `<a href="${rec.url}" target="_blank" class="site-link" title="Open ${siteName} chat">🎙️ ${siteName}</a>`
            : `🎙️ ${siteName}`;

        div.innerHTML = `
            <div class="tape-label">
                <div class="label-left">
                    <span class="tape-site-name">${siteLabel}</span>
                </div>
                <div class="label-right">${dateStr}</div>
            </div>
            <div class="tape-window" id="tape-win-${index}">
                 <div class="reel"></div>
                 <div class="reel"></div>
            </div>
            <div class="tape-controls">
                <audio id="${audioId}" src="${rec.audioData}" style="display:none;"></audio>
                <div class="time-info">
                    <span class="time-display">${timeStr}</span>
                    <span class="time-display duration">${rec.durationString || '00:00'}</span>
                </div>
                <div class="control-group">
                    <button class="retro-btn primary play-btn" data-id="${audioId}" data-win="tape-win-${index}" title="Play">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M8 5v14l11-7z"/>
                        </svg>
                    </button>
                    <a class="retro-btn" href="${rec.audioData}" download="audio_${dateStr.replace('/', '')}_${timeStr.replace(':', '')}.wav" title="Download">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M19 12v7H5v-7H3v7c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2v-7h-2zm-6 .67l2.59-2.58L17 11.5l-5 5-5-5 1.41-1.41L11 12.67V3h2z"/>
                        </svg>
                    </a>
                    <button class="retro-btn delete" data-index="${index}" title="Delete">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/>
                        </svg>
                    </button>
                </div>
            </div>
        `;
    }
    return div;
}

function attachListeners(recordings) {
    // Delete Handlers - Use closest() to handle clicks on SVG inside button
    document.querySelectorAll('.retro-btn.delete').forEach(btn => {
        // Set initial title
        btn.title = 'Delete (Hold Shift for quick delete)';

        btn.onclick = async (e) => {
            // Use closest to get the button element, even if click was on SVG inside
            const button = e.target.closest('.retro-btn.delete');
            if (!button) return;

            const idx = parseInt(button.dataset.index);
            if (isNaN(idx)) return;

            // Helper function to perform the actual deletion
            const performDelete = async () => {
                // Find the card element (parent of parent of button)
                const card = button.closest('.tape-card, .crt-card');

                if (card) {
                    // Add deleting animation class
                    card.classList.add('recording-deleting');

                    // Wait for animation to complete
                    await new Promise(resolve => setTimeout(resolve, 300));
                }

                // Now actually delete
                recordings.splice(idx, 1);
                await chrome.storage.local.set({ recordings });
                loadRecordings();
            };

            // If Shift is held, delete immediately without confirmation
            if (e.shiftKey) {
                await performDelete();
            } else {
                // Show confirmation modal
                showConfirmModal('Eject and destroy this tape?', performDelete);
            }
        };
    });

    // Update shift key feedback after attaching listeners
    updateShiftKeyFeedback();

    // Audio Play Handlers (Custom Spin Animation)
    document.querySelectorAll('.play-btn').forEach(btn => {
        btn.onclick = (e) => {
            const audioId = btn.dataset.id;
            const winId = btn.dataset.win;
            const audio = document.getElementById(audioId);
            const tapeWindow = document.getElementById(winId);

            if (audio.paused) {
                // Stop all others first
                document.querySelectorAll('audio').forEach(a => {
                    if (a !== audio) {
                        a.pause();
                        a.currentTime = 0;
                    }
                });
                document.querySelectorAll('.tape-window').forEach(w => w.classList.remove('playing'));
                document.querySelectorAll('.play-btn').forEach(b => {
                    b.innerHTML = '<svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>';
                });

                audio.play();
                tapeWindow.classList.add('playing');
                btn.innerHTML = '<svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>';
            } else {
                audio.pause();
                tapeWindow.classList.remove('playing');
                btn.innerHTML = '<svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>';
            }

            audio.onended = () => {
                tapeWindow.classList.remove('playing');
                btn.innerHTML = '<svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>';
            };
        };
    });
}

document.addEventListener('DOMContentLoaded', async () => {
    await loadRecordings();
    setupSettings();
});

// Settings Logic (Preserved but styled)
async function setupSettings() {
    const settingsBtn = document.getElementById('settings-btn');
    const modal = document.getElementById('settings-modal');
    const cancelBtn = document.getElementById('cancel-settings');
    const saveBtn = document.getElementById('save-settings');
    const resetBtn = document.getElementById('reset-settings');
    const clearAllBtn = document.getElementById('clear-all-recordings');

    const promptInput = document.getElementById('prompt-text');
    const videoCodec = document.getElementById('video-codec');
    const videoResolution = document.getElementById('video-resolution');
    const audioSampleRate = document.getElementById('audio-sample-rate');
    const maxRecordingsInput = document.getElementById('max-recordings');

    // Hidden inputs handling to match old logic without breaking
    const videoBitrate = document.getElementById('video-bitrate');
    const videoFps = document.getElementById('video-fps');
    const videoTimeslice = document.getElementById('video-timeslice');
    const audioBufferSize = document.getElementById('audio-buffer-size');
    const systemAudioEnabled = document.getElementById('system-audio-enabled');

    async function loadSettings() {
        const result = await chrome.storage.local.get(['settings']);
        const settings = result.settings || {};
        const defaults = {
            promptText: "Please answer based on this audio",
            maxRecordings: 10,
            video: { codec: 'vp9', resolution: '1080p', bitrate: 4000, fps: 60, timeslice: 1000 },
            audio: { sampleRate: 44100, bufferSize: 4096, systemAudioEnabled: true }
        };
        const merged = {
            promptText: settings.promptText || defaults.promptText,
            maxRecordings: settings.maxRecordings || defaults.maxRecordings,
            video: { ...defaults.video, ...(settings.video || {}) },
            audio: { ...defaults.audio, ...(settings.audio || {}) }
        };

        if (promptInput) promptInput.value = merged.promptText;
        if (maxRecordingsInput) maxRecordingsInput.value = merged.maxRecordings;
        if (videoCodec) videoCodec.value = merged.video.codec;
        if (videoResolution) videoResolution.value = merged.video.resolution;
        if (audioSampleRate) audioSampleRate.value = merged.audio.sampleRate;

        // Update bitrate display if exists
        const bitrateValue = document.getElementById('bitrate-value');
        if (bitrateValue && videoBitrate) {
            videoBitrate.value = merged.video.bitrate;
            bitrateValue.textContent = merged.video.bitrate;
        }
        if (videoFps) videoFps.value = merged.video.fps;
        if (videoTimeslice) videoTimeslice.value = merged.video.timeslice;
        if (audioBufferSize) audioBufferSize.value = merged.audio.bufferSize;
        if (systemAudioEnabled) systemAudioEnabled.checked = merged.audio.systemAudioEnabled !== false;
    }

    async function saveSettings() {
        const settings = {
            promptText: promptInput.value,
            maxRecordings: parseInt(maxRecordingsInput?.value) || 10,
            video: {
                codec: videoCodec.value,
                resolution: videoResolution.value,
                bitrate: parseInt(videoBitrate.value),
                fps: parseInt(videoFps.value),
                timeslice: parseInt(videoTimeslice.value)
            },
            audio: {
                sampleRate: parseInt(audioSampleRate.value),
                bufferSize: parseInt(audioBufferSize.value),
                systemAudioEnabled: systemAudioEnabled?.checked !== false
            }
        };
        await chrome.storage.local.set({ settings });

        // Apply max recordings limit immediately
        await applyMaxRecordingsLimit(settings.maxRecordings);
    }

    async function applyMaxRecordingsLimit(maxRecordings) {
        const result = await chrome.storage.local.get(['recordings']);
        const recordings = result.recordings || [];

        if (recordings.length > maxRecordings) {
            // Keep only the newest recordings
            const trimmedRecordings = recordings.slice(0, maxRecordings);
            await chrome.storage.local.set({ recordings: trimmedRecordings });
            loadRecordings(); // Refresh the list
        }
    }


    // Helper functions for modal animation
    function openModal(modal) {
        modal.style.display = 'block';
        modal.style.opacity = '0';
        // Force reflow to ensure transition works
        void modal.offsetHeight;
        requestAnimationFrame(() => {
            modal.classList.remove('modal-closing');
            modal.classList.add('modal-opening');
            modal.style.opacity = '1';
        });
    }

    function closeModal(modal) {
        modal.classList.remove('modal-opening');
        modal.classList.add('modal-closing');
        modal.style.opacity = '0';
        setTimeout(() => {
            modal.style.display = 'none';
            modal.classList.remove('modal-closing');
        }, 300); // Match the longest animation duration (modalSlideOut is 0.3s)
    }

    if (settingsBtn) settingsBtn.onclick = async () => { await loadSettings(); openModal(modal); };
    if (cancelBtn) cancelBtn.onclick = () => { closeModal(modal); };
    if (saveBtn) saveBtn.onclick = async () => { await saveSettings(); closeModal(modal); };
    if (resetBtn) resetBtn.onclick = async () => {
        showConfirmModal('Reset all settings to defaults?', async () => {
            await chrome.storage.local.remove(['settings']);
            await loadSettings();
        });
    };

    // Clear all recordings button
    if (clearAllBtn) {
        clearAllBtn.onclick = () => {
            showConfirmModal('⚠️ Delete ALL recordings? This cannot be undone!', () => {
                // Second confirmation
                showConfirmModal('Are you absolutely sure? All recordings will be permanently deleted!', async () => {
                    await chrome.storage.local.set({ recordings: [] });
                    loadRecordings();
                    closeModal(modal);
                });
            });
        };
    }

    window.onclick = (e) => { if (e.target == modal) closeModal(modal); };
}


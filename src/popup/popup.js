import { StorageHelper } from '../content/storage.js';
import { AchievementSystem } from './achievements.js';

// Initial data fetch ASAP
const initialDataPromise = chrome.storage.local.get(['recordings', 'settings']);

// Track Shift key state globally for quick-delete feature
let isShiftPressed = false;

let allRecordings = [];         // All recordings from storage
let displayedCount = 0;          // Number of recordings currently displayed
const INITIAL_LOAD = 1;          // Initial Priority Batch (First card)
let loadMoreCount = 7;           // Subsequent batch size (calculated from settings)
let isLoading = false;           // Prevent multiple simultaneous loads
let hasMoreToLoad = false;       // Track if there are more recordings to load

// Intersection Observer for scroll-reveal animations - optimized with rAF
const revealObserver = new IntersectionObserver((entries) => {
    requestAnimationFrame(() => {
        entries.forEach((entry, index) => {
            if (entry.isIntersecting) {
                // Progressive reveal delay - optimized for a "waterfall" feel
                // index here is the element index in the current intersection batch
                setTimeout(() => {
                    entry.target.classList.add('revealed');
                }, index * 80);
                revealObserver.unobserve(entry.target);
            }
        });
    });
}, { threshold: 0.05, rootMargin: '0px 0px 50px 0px' });


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

// Custom Confirmation Modal System (Industrial Style)
function showConfirmModal(message, onConfirm, onCancel) {
    let modal = document.getElementById('confirm-modal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'confirm-modal';
        modal.className = 'modal-container';
        modal.innerHTML = `
            <div class="modal-box" style="max-width: 320px; top: 20%;">
                <div class="modal-hero" style="padding: 20px;">
                    <div class="confirm-icon" style="color: #ff6b00; margin-bottom: 10px;">
                        <svg width="40" height="40" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
                        </svg>
                    </div>
                    <h2 style="font-size: 14px; color: #eee; letter-spacing: 1px;">CONFIRM ACTION</h2>
                </div>
                <div class="modal-body" style="padding: 20px; text-align: center;">
                    <div class="confirm-message" style="color: #999; font-size: 11px; line-height: 1.6; margin-bottom: 20px;"></div>
                    <div style="display: flex; gap: 10px;">
                        <button class="retro-btn cancel" style="flex: 1; height: 36px;">NO, CANCEL</button>
                        <button class="retro-btn primary confirm" style="flex: 1; height: 36px;">YES, EJECT</button>
                    </div>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
    }

    const messageEl = modal.querySelector('.confirm-message');
    const confirmBtn = modal.querySelector('.confirm');
    const cancelBtn = modal.querySelector('.cancel');

    messageEl.textContent = message;

    // Show modal with animation
    modal.classList.add('active');
    modal.classList.remove('hiding');

    // Clean up previous listeners
    const newConfirmBtn = confirmBtn.cloneNode(true);
    const newCancelBtn = cancelBtn.cloneNode(true);
    confirmBtn.parentNode.replaceChild(newConfirmBtn, confirmBtn);
    cancelBtn.parentNode.replaceChild(newCancelBtn, cancelBtn);

    const closeModal = () => {
        modal.classList.add('hiding');
        setTimeout(() => {
            modal.classList.remove('active');
            modal.classList.remove('hiding');
        }, 300);
    };

    newConfirmBtn.addEventListener('click', () => {
        closeModal();
        if (onConfirm) onConfirm();
    });

    newCancelBtn.addEventListener('click', () => {
        closeModal();
        if (onCancel) onCancel();
    });

    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            closeModal();
            if (onCancel) onCancel();
        }
    });
}

async function loadRecordings() {
    // Stage 1: Absolute Priority - Data acquisition and first item
    const result = await initialDataPromise;
    const recordings = result.recordings || [];
    const settings = result.settings || {};

    recordings.sort((a, b) => b.timestamp - a.timestamp);
    allRecordings = recordings;
    displayedCount = 0;

    const list = document.getElementById('list');
    list.innerHTML = '';

    const priorityCount = Math.min(1, recordings.length);
    if (priorityCount > 0) {
        // Immediate render of the first item to fill the shell
        await renderBatch(0, priorityCount, 0);
    } else {
        list.innerHTML = getEmptyStateHTML();
        return;
    }

    // Stage 2: Background Tasks - Defer the rest to maintain high frame rate
    requestAnimationFrame(() => {
        const maxToKeep = settings.maxRecordings || 10;
        loadMoreCount = Math.max(1, maxToKeep - 5);

        const deferMethod = window.requestIdleCallback || ((cb) => setTimeout(cb, 150));
        deferMethod(() => {
            isLoading = true;
            const fillCount = Math.min(4, recordings.length - priorityCount);
            if (fillCount > 0) {
                renderBatch(priorityCount, fillCount, 120).then(() => {
                    isLoading = false;
                });
            } else {
                isLoading = false;
            }
        });

        setupScrollListener();
    });
}

async function renderBatch(startIndex, count, customDelay = 30) {
    const list = document.getElementById('list');
    const endIndex = Math.min(startIndex + count, allRecordings.length);

    for (let i = startIndex; i < endIndex; i++) {
        const item = allRecordings[i];
        const date = new Date(item.timestamp);
        const dateKey = date.toLocaleDateString();

        // Check if group container already exists
        let groupContainer = document.getElementById(`group-${dateKey.replace(/\//g, '-')}`);

        if (!groupContainer) {
            groupContainer = document.createElement('div');
            groupContainer.className = 'recording-group';
            groupContainer.id = `group-${dateKey.replace(/\//g, '-')}`;
            list.appendChild(groupContainer);
        }

        // 1. Render UI Shell (Instant, light-weight)
        const el = createRecordingElement(item, i, true); // lazyMedia = true
        groupContainer.appendChild(el);

        // 2. Immediate Reveal Logic
        if (startIndex === 0 && i === 0) {
            el.classList.add('revealed');
        } else {
            revealObserver.observe(el);
        }

        // 3. Hyper-Lazy Content Injection
        // We delay the heavy string manipulation until the user actually needs it
        const mediaElem = el.querySelector('audio, video');
        const downloadBtn = el.querySelector('a.retro-btn[download]');

        const injectData = () => {
            if (el.dataset.mediaLoaded === 'true') return;
            if (mediaElem) mediaElem.src = item.audioData;
            if (downloadBtn) downloadBtn.href = item.audioData;
            el.dataset.mediaLoaded = 'true';
        };

        // Trigger on hover OR automatically after a generous "settle" time
        el.addEventListener('mouseenter', injectData, { once: true });

        // Spread background loading to avoid CPU spikes (reduced delay by half)
        const backgroundLoadDelay = 500 + (i * 150);
        setTimeout(injectData, backgroundLoadDelay);

        // 4. Attach interaction listeners (including a safety trigger for play)
        attachListenersToElement(el, allRecordings, injectData);

        displayedCount = i + 1;
        hasMoreToLoad = displayedCount < allRecordings.length;

        if (i < endIndex - 1 && customDelay > 0) {
            await new Promise(resolve => setTimeout(resolve, customDelay));
        }
    }
}



function setupScrollListener() {
    const scrollContainer = document.querySelector('.content-scroll');
    if (!scrollContainer) return;

    // Remove existing listener if any
    scrollContainer.removeEventListener('scroll', handleScroll);

    // Add scroll listener
    scrollContainer.addEventListener('scroll', handleScroll);
}

function handleScroll(e) {
    checkAndLoadMore();
}

async function checkAndLoadMore() {
    const scrollContainer = document.querySelector('.content-scroll');
    if (!scrollContainer || isLoading || !hasMoreToLoad) return;

    // Calculate if user is near bottom (within 150px to be more proactive)
    const scrollTop = scrollContainer.scrollTop;
    const scrollHeight = scrollContainer.scrollHeight;
    const clientHeight = scrollContainer.clientHeight;

    // If distance to bottom is small OR if content is shorter than container
    const distanceToBottom = scrollHeight - scrollTop - clientHeight;

    if (distanceToBottom < 150 || scrollHeight <= clientHeight) {
        await loadMoreRecordings();
    }
}

async function loadMoreRecordings() {
    if (!hasMoreToLoad || isLoading) return;

    isLoading = true;

    // Render next batch sequentially with a clear 100ms waterfall effect
    const countToLoad = Math.min(loadMoreCount, allRecordings.length - displayedCount);
    await renderBatch(displayedCount, countToLoad, 100);

    isLoading = false;
}


function createRecordingElement(rec, index, lazyMedia = false) {
    const isVideo = rec.type === 'video';
    const date = new Date(rec.timestamp);
    const mediaSrc = lazyMedia ? '' : rec.audioData;

    // Unified date/time formatting
    const dateStr = date.toLocaleDateString('zh-CN', { month: '2-digit', day: '2-digit' });
    const timeStr = date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', hour12: false });

    const div = document.createElement('div');

    if (isVideo) {
        div.className = 'crt-card';
        div.dataset.id = rec.timestamp;
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
                <video controls src="${mediaSrc}" preload="metadata"></video>
            </div>
            <div class="crt-controls">
                <div class="time-info">
                    <span class="time-display">${timeStr}</span>
                    <span class="time-display duration">${rec.durationString || '00:00'}</span>
                </div>
                <div class="control-group">
                    <a class="retro-btn" href="${mediaSrc}" download="video_${dateStr.replace('/', '')}_${timeStr.replace(':', '')}.webm" title="Download">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M19 12v7H5v-7H3v7c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2v-7h-2zm-6 .67l2.59-2.58L17 11.5l-5 5-5-5 1.41-1.41L11 12.67V3h2z"/>
                        </svg>
                    </a>
                    <button class="retro-btn delete" data-id="${rec.timestamp}" title="Delete">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/>
                        </svg>
                    </button>
                </div>
            </div>
        `;
    } else {
        div.className = 'tape-card';
        div.dataset.id = rec.timestamp;
        const audioId = `audio-${index}`;
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
                <audio id="${audioId}" src="${mediaSrc}" style="display:none;"></audio>
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
                    <button class="retro-btn delete" data-id="${rec.timestamp}" title="Delete">
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

function attachListenersToElement(element, recordings, injectDataFallback) {
    // Delete Handler
    const deleteBtn = element.querySelector('.retro-btn.delete');
    if (deleteBtn) {
        deleteBtn.title = 'Delete (Hold Shift for quick delete)';
        deleteBtn.onclick = async (e) => {
            const timestamp = parseInt(deleteBtn.dataset.id);
            if (isNaN(timestamp)) return;

            const performDelete = async () => {
                const card = deleteBtn.closest('.tape-card, .crt-card');
                const isVideoCard = card?.classList.contains('crt-card');
                const group = card?.parentElement;

                // Check if this is the last card in the group
                const isLastInGroup = group && group.querySelectorAll('.tape-card, .crt-card').length === 1;

                if (card) {
                    // 1. Capture exact current height to prevent jump
                    const height = card.offsetHeight;
                    card.style.maxHeight = height + 'px';
                    card.style.transition = 'all 0.5s cubic-bezier(0.4, 0, 0.2, 1)';

                    if (isLastInGroup) {
                        group.style.transition = 'margin-bottom 0.5s cubic-bezier(0.4, 0, 0.2, 1)';
                    }

                    // Force reflow
                    void card.offsetHeight;

                    // 2. Trigger visual theme animation (Slide or CRT Off)
                    card.classList.add('recording-deleting');

                    // 3. Smoothly collapse the physical space
                    // We trigger this immediately so the cards below start moving up
                    // in sync with the vanishing effect for a more "liquid" feel.
                    card.style.maxHeight = '0px';
                    card.style.marginBottom = '0px';
                    card.style.marginTop = '0px';
                    card.style.paddingTop = '0px';
                    card.style.paddingBottom = '0px';
                    card.style.opacity = '0';

                    if (isLastInGroup) {
                        group.style.marginBottom = '0px';
                    }

                    // Wait for the animation to finish (matching the 0.6s CSS duration)
                    await new Promise(resolve => setTimeout(resolve, 650));
                }

                // Remove from local array and storage using timestamp
                if (timestamp) {
                    const foundIndex = allRecordings.findIndex(r => r.timestamp === timestamp);
                    if (foundIndex !== -1) {
                        allRecordings.splice(foundIndex, 1);
                        await chrome.storage.local.set({ recordings: allRecordings });
                    }
                }

                if (card) {
                    card.remove();

                    // Cleanup empty group
                    if (group && group.classList.contains('recording-group') && group.querySelectorAll('.tape-card, .crt-card').length === 0) {
                        group.remove();
                    }
                }

                // Update counts for pagination logic
                displayedCount = Math.max(0, displayedCount - 1);
                hasMoreToLoad = displayedCount < allRecordings.length;

                // Show empty message if nothing left
                const list = document.getElementById('list');
                if (allRecordings.length === 0 && list) {
                    list.innerHTML = getEmptyStateHTML();
                } else if (hasMoreToLoad) {
                    // Critical Bug Fix: After deletion, check if we need to load more 
                    // to fill the gap left by the deleted card
                    requestAnimationFrame(() => {
                        checkAndLoadMore();
                    });
                }
            };

            if (e.shiftKey) {
                await performDelete();
            } else {
                showConfirmModal('Eject and destroy this tape?', performDelete);
            }
        };
    }

    // Audio Play Handler
    const playBtn = element.querySelector('.play-btn');
    if (playBtn) {
        playBtn.onclick = (e) => {
            // Ensure data is loaded if user clicks before hover/timeout
            if (injectDataFallback) injectDataFallback();

            const audioId = playBtn.dataset.id;
            const winId = playBtn.dataset.win;
            const audio = document.getElementById(audioId);
            const tapeWindow = document.getElementById(winId);

            if (audio.paused) {
                // Stop all others
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
                playBtn.innerHTML = '<svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>';
            } else {
                audio.pause();
                tapeWindow.classList.remove('playing');
                playBtn.innerHTML = '<svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>';
            }

            audio.onended = () => {
                tapeWindow.classList.remove('playing');
                playBtn.innerHTML = '<svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>';
            };
        };
    }

    // Initial shift key check
    updateShiftKeyFeedback();
}

function attachListeners(recordings) {
    // Legacy support or fallback
    document.querySelectorAll('.tape-card, .crt-card').forEach(el => {
        attachListenersToElement(el, recordings);
    });
}

document.addEventListener('DOMContentLoaded', () => {
    // Stage 1: Absolute Priority - Load data and show first item
    loadRecordings().then(() => {
        // Initialize achievements
        const achievements = new AchievementSystem();

        // Stage 2: Secondary Priority - Init settings and listeners in next frame
        requestAnimationFrame(() => {
            setupSettings();
        });
    });
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

    // Real-time validation for max recordings (forced limit: 25)
    if (maxRecordingsInput) {
        maxRecordingsInput.oninput = () => {
            if (maxRecordingsInput.value > 25) {
                maxRecordingsInput.value = 25;
            } else if (maxRecordingsInput.value < 1 && maxRecordingsInput.value !== "") {
                maxRecordingsInput.value = 1;
            }
        };
    }

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
        // Enforce max 25 limit
        let maxVal = parseInt(maxRecordingsInput?.value) || 10;
        if (maxVal > 25) maxVal = 25;

        const settings = {
            promptText: promptInput.value,
            maxRecordings: maxVal,
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

        // Sync with UI scale
        loadMoreCount = Math.max(1, settings.maxRecordings - INITIAL_LOAD);

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

            // If we are currently viewing the list, update it gracefully
            allRecordings = trimmedRecordings;
            // To keep it simple but smooth, we only re-render if the popup is actually open 
            // and we need to show changes. Since this is in settings, we can just 
            // trigger a reload but after the modal closes or just refresh now.
            loadRecordings();
        }
    }


    // Helper functions for modal animation (Class-based for CSS Keyframes)
    function openModal(modal) {
        modal.classList.add('active');
        modal.classList.remove('hiding');
    }

    function closeModal(modal) {
        modal.classList.add('hiding');
        setTimeout(() => {
            modal.classList.remove('active');
            modal.classList.remove('hiding');
        }, 300); // Wait for contentPopOut and modalFadeOut
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
                    const list = document.getElementById('list');
                    if (list) {
                        list.style.transition = 'opacity 0.5s ease-out, transform 0.5s ease-out';
                        list.style.opacity = '0';
                        list.style.transform = 'translateY(20px)';
                        await new Promise(r => setTimeout(r, 500));
                    }
                    await chrome.storage.local.set({ recordings: [] });
                    allRecordings = [];
                    displayedCount = 0;
                    hasMoreToLoad = false;
                    if (list) {
                        list.innerHTML = getEmptyStateHTML();
                        list.style.opacity = '1';
                        list.style.transform = 'translateY(0)';
                    }
                    closeModal(modal);
                });
            });
        };
    }

    window.onclick = (e) => { if (e.target == modal) closeModal(modal); };
}

function getEmptyStateHTML() {
    return `
        <div class="empty-deck">
            <!-- Subtle Grid Background -->
            <div class="bg-grid"></div>

            <!-- Floating Particles -->
            <div class="particle-field">
                <div class="particle" style="top: 20%; left: 15%; animation-delay: 0s;"></div>
                <div class="particle" style="top: 60%; left: 75%; animation-delay: -4s;"></div>
                <div class="particle" style="top: 40%; left: 50%; animation-delay: -8s;"></div>
            </div>

            <!-- Floating TV (Upper Left) -->
            <div class="floating-tv">
                <div class="tv-antenna">
                    <div class="antenna-rod"></div>
                    <div class="antenna-rod"></div>
                </div>
                <div class="tv-screen">
                    <div class="tv-content">NO SIGNAL</div>
                    <div class="tv-scanlines"></div>
                </div>
                <div class="tv-knob-panel">
                    <div class="tv-knob"></div>
                    <div class="tv-knob"></div>
                </div>
            </div>

            <!-- Floating Camera (Upper Right) -->
            <div class="floating-camera">
                <div class="camera-body">
                    <div class="camera-flash"></div>
                    <div class="camera-viewfinder"></div>
                    <div class="lens-barrel">
                        <div class="lens-ring">
                            <div class="lens-glass"></div>
                        </div>
                    </div>
                    <div class="camera-grip"></div>
                    <div class="rec-indicator"></div>
                </div>
            </div>

            <!-- Central Master Deck -->
            <a href="https://github.com/NolanEYeee/Thoughtful-Voice" target="_blank" class="master-deck" style="text-decoration: none;">
                <div class="vu-strip">
                    <div class="vu-bar"></div>
                    <div class="vu-bar"></div>
                    <div class="vu-bar"></div>
                    <div class="vu-bar"></div>
                    <div class="vu-bar"></div>
                    <div class="vu-bar"></div>
                    <div class="vu-bar"></div>
                    <div class="vu-bar"></div>
                </div>
                <div class="tape-window">
                    <div class="reel-container">
                        <div class="reel"></div>
                        <div class="reel"></div>
                    </div>
                </div>
                <div class="deck-label">AUTO-REC</div>
            </a>

            <!-- Status -->
            <div class="status-block">
                <div class="status-main">[ DECK EMPTY ]</div>
                <div class="status-sub">Start recording to fill the archive</div>
                <div class="platform-pills">
                    <span class="platform-pill">Gemini</span>
                    <span class="platform-pill">ChatGPT</span>
                    <span class="platform-pill">Claude</span>
                    <span class="platform-pill">Perplexity</span>
                </div>
            </div>

        </div>
    `;
}


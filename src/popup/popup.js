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
let modalTimeout = null;         // Track confirmation modal close timeout to prevent flicker

// Storage Operation Queue - Prevents race conditions during rapid deletions/updates
let storageQueue = Promise.resolve();
async function queueStorageOperation(operation) {
    storageQueue = storageQueue.then(async () => {
        try {
            await operation();
        } catch (err) {
            console.error('Storage operation failed:', err);
        }
    });
    return storageQueue;
}

// --- STUNNING WATERFALL REVEAL SYSTEM (ULTIMATE STATE-BASED EDITION) ---
// This system replaces the fragile queue array with a "State Scan" model.
// It scans the DOM in real-time to find the rightful next element to reveal, 
// ensuring perfect order regardless of scroll speed or browser reporting delay.

let isProcessingReveal = false;

const processRevealTick = () => {
    // 1. Find ALL elements that are in view (data-ready) but not yet revealed
    const pending = Array.from(document.querySelectorAll('.tape-card[data-ready="true"]:not(.revealed), .crt-card[data-ready="true"]:not(.revealed)'));

    if (pending.length === 0) {
        isProcessingReveal = false;
        return;
    }

    isProcessingReveal = true;

    // 2. Sort by strict DOM position to find the ABSOLUTE top-most candidate
    pending.sort((a, b) => {
        const position = a.compareDocumentPosition(b);
        if (position & Node.DOCUMENT_POSITION_FOLLOWING) return -1;
        if (position & Node.DOCUMENT_POSITION_PRECEDING) return 1;
        return 0;
    });

    // 3. Reveal ONLY the single top-most candidate
    const nextToReveal = pending[0];

    requestAnimationFrame(() => {
        if (nextToReveal) {
            nextToReveal.classList.add('revealed');
        }

        // 4. Stagger: Continue the tick until everything is processed
        setTimeout(processRevealTick, 60); // Faster stagger (60ms) for smoother high-speed support
    });
};

const revealObserver = new IntersectionObserver((entries) => {
    let triggered = false;

    entries.forEach(entry => {
        if (entry.isIntersecting) {
            // Mark as ready, but don't force it to reveal yet
            entry.target.dataset.ready = "true";
            revealObserver.unobserve(entry.target);
            triggered = true;
        }
    });

    // If new items ready, wake up the processor
    if (triggered && !isProcessingReveal) {
        processRevealTick();
    }
}, {
    threshold: 0.01,
    rootMargin: '0px 0px 300px 0px' // Massive buffer to collect sorted items before they hit the eye
});


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
        if (modalTimeout) clearTimeout(modalTimeout);
        modal.classList.add('hiding');
        modalTimeout = setTimeout(() => {
            modal.classList.remove('active');
            modal.classList.remove('hiding');
            modalTimeout = null;
        }, 300);
    };

    // If modal is currently in a closing state (hiding), stop it immediately
    if (modalTimeout) {
        clearTimeout(modalTimeout);
        modalTimeout = null;
    }

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

async function loadRecordings(dataOverride = null) {
    // Stage 1: Absolute Priority - Data acquisition and first item
    let recordings, settings;

    if (dataOverride) {
        recordings = dataOverride.recordings || [];
        settings = dataOverride.settings || { uiStyle: 'aesthetic' };
    } else {
        const result = await chrome.storage.local.get(['recordings', 'settings']);
        recordings = result.recordings || [];
        settings = result.settings || { uiStyle: 'aesthetic' };
    }

    // Apply UI Style class to body for CSS targeting
    document.body.classList.remove('ui-style-simple', 'ui-style-aesthetic');
    document.body.classList.add(`ui-style-${settings.uiStyle || 'aesthetic'}`);

    recordings.sort((a, b) => b.timestamp - a.timestamp);
    allRecordings = recordings;
    displayedCount = 0;

    const list = document.getElementById('list');
    list.innerHTML = '';

    const priorityCount = Math.min(5, recordings.length);
    if (priorityCount > 0) {
        // Immediate render of the first few items to fill the view-port shell
        await renderBatch(0, priorityCount, 0);
    } else {
        list.innerHTML = getEmptyStateHTML();
    }

    // Stage 2: Background Tasks - Defer the rest to maintain high frame rate
    requestAnimationFrame(() => {
        const maxToKeep = settings.maxRecordings || 10;
        loadMoreCount = Math.max(1, maxToKeep - 5);

        // Defer Achievement System and Settings to keep main thread clear during first animation
        const deferMethod = window.requestIdleCallback || ((cb) => setTimeout(cb, 200));

        deferMethod(() => {
            // Background Migration Check (Convert old unified storage to new split storage)
            if (recordings.some(r => r.audioData)) {
                migrateToSplitStorage(recordings);
            }

            // Initialize secondary systems here
            if (typeof window.initSecondarySystems === 'function') {
                try {
                    window.initSecondarySystems();
                } catch (err) {
                    console.error('Failed to initialize secondary systems:', err);
                }
            }

            isLoading = true;
            const fillCount = Math.max(0, recordings.length - priorityCount);
            if (fillCount > 0) {
                // Reduced internal delay (30ms vs 120ms) to let the CSS/Observer drive the rhythm
                renderBatch(priorityCount, Math.min(fillCount, 10), 30).then(() => {
                    isLoading = false;
                }).catch(err => {
                    console.error('Batch render error:', err);
                    isLoading = false;
                });
            } else {
                isLoading = false;
            }
        });

        setupScrollListener();
    });
}

// Utility to convert Base64 to Blob
function base64ToBlob(base64, type) {
    const parts = base64.split(';base64,');
    const contentType = parts[0].split(':')[1];
    const raw = window.atob(parts[1]);
    const rawLength = raw.length;
    const uInt8Array = new Uint8Array(rawLength);
    for (let i = 0; i < rawLength; ++i) {
        uInt8Array[i] = raw.charCodeAt(i);
    }
    return new Blob([uInt8Array], { type: contentType || type });
}

// Global store for object URLs to revoke them later
const objectUrls = new Set();
function cleanupObjectUrls() {
    objectUrls.forEach(url => URL.revokeObjectURL(url));
    objectUrls.clear();
}
window.addEventListener('unload', cleanupObjectUrls);

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

        // 2. Immediate Reveal Logic - Unified
        revealObserver.observe(el);

        // 3. Hyper-Lazy Content Injection
        // We delay the heavy string manipulation until the user actually needs it
        const mediaElem = el.querySelector('audio, video');
        const downloadBtn = el.querySelector('a.retro-btn[download]');

        const injectData = async () => {
            if (el.dataset.mediaLoaded === 'true' || el.dataset.loading === 'true') return;
            el.dataset.loading = 'true';

            try {
                let finalData = item.audioData;

                // If audioData is missing (new split storage strategy), fetch it now
                if (!finalData) {
                    const dataResult = await chrome.storage.local.get(`rec_data_${item.timestamp}`);
                    finalData = dataResult[`rec_data_${item.timestamp}`];
                }

                if (finalData) {
                    // Optimized: Use ObjectURL instead of long Base64 string for better memory/perf
                    const blob = base64ToBlob(finalData, item.type === 'video' ? 'video/webm' : 'audio/wav');
                    const objectUrl = URL.createObjectURL(blob);
                    objectUrls.add(objectUrl);

                    if (mediaElem) {
                        mediaElem.src = objectUrl;
                        mediaElem.dataset.originalBase64 = 'true'; // mark as loaded
                    }
                    if (downloadBtn) {
                        downloadBtn.href = objectUrl;
                    }
                    el.dataset.mediaLoaded = 'true';

                    // Trigger metadata load immediately
                    if (mediaElem) mediaElem.load();
                }
            } catch (err) {
                console.error('Failed to inject media data:', err);
            } finally {
                el.dataset.loading = 'false';
            }
        };

        // Trigger on hover OR automatically after a generous "settle" time
        el.addEventListener('mouseenter', injectData, { once: true });

        // Spread background loading to avoid CPU spikes (longer delay for better waterfall)
        const backgroundLoadDelay = 800 + (i * 200);
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
                    <a class="retro-btn" href="${mediaSrc}" download="${rec.filename || `video_${Date.now()}.webm`}" title="Download">
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
                    <a class="retro-btn" href="${rec.audioData}" download="${rec.filename || `audio_${Date.now()}.wav`}" title="Download">
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

                // 1. Critical: Trigger storage deletion IMMEDIATELY
                // We don't await the queue here because we want the animation to start in parallel,
                // but by calling this now, we ensure the browser receives the storage command 
                // BEFORE the popup has a chance to close during the 650ms animation.
                const storagePromise = timestamp ? queueStorageOperation(async () => {
                    const result = await chrome.storage.local.get(['recordings', 'stats']);
                    const currentRecordings = result.recordings || [];
                    const foundIndex = currentRecordings.findIndex(r => r.timestamp === timestamp);

                    if (foundIndex !== -1) {
                        currentRecordings.splice(foundIndex, 1);
                        const stats = result.stats || {};
                        if (stats.totalRecordings > 0) stats.totalRecordings -= 1;

                        const removePayload = [`rec_data_${timestamp}`];
                        await chrome.storage.local.remove(removePayload);
                        await chrome.storage.local.set({ recordings: currentRecordings, stats });
                        allRecordings = currentRecordings;

                        // Sync display stats inside the queue to avoid race conditions
                        displayedCount = Math.max(0, displayedCount - 1);
                        hasMoreToLoad = displayedCount < allRecordings.length;
                    }
                }) : Promise.resolve();

                // Check if this is the last card in the group for transition purposes
                const isLastInGroup = group && group.querySelectorAll('.tape-card, .crt-card').length === 1;

                if (card) {
                    // 2. Capture exact current height to prevent jump
                    const height = card.offsetHeight;
                    card.style.maxHeight = height + 'px';
                    card.style.transition = 'all 0.5s cubic-bezier(0.4, 0, 0.2, 1)';

                    if (isLastInGroup) {
                        group.style.transition = 'margin-bottom 0.5s cubic-bezier(0.4, 0, 0.2, 1)';
                    }

                    // Force reflow
                    void card.offsetHeight;

                    // 3. Trigger visual theme animation (Slide or CRT Off)
                    card.classList.add('recording-deleting');

                    // 4. Smoothly collapse the physical space
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
                    // We also ensure storage is done just in case, though it's optional at this point
                    await Promise.all([
                        new Promise(resolve => setTimeout(resolve, 650)),
                        storagePromise
                    ]);
                } else {
                    await storagePromise;
                }

                if (card) {
                    card.remove();

                    // Cleanup empty group
                    if (group && group.classList.contains('recording-group') && group.querySelectorAll('.tape-card, .crt-card').length === 0) {
                        group.remove();
                    }
                }


                // Show empty message if nothing left
                const list = document.getElementById('list');
                if (allRecordings.length === 0 && list) {
                    // Soft transition to empty state
                    list.style.transition = 'opacity 0.3s ease-out';
                    list.style.opacity = '0';

                    setTimeout(() => {
                        list.innerHTML = getEmptyStateHTML();
                        requestAnimationFrame(() => {
                            list.style.opacity = '1';
                        });
                    }, 350);
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
        playBtn.onclick = async (e) => {
            // Ensure data is loaded if user clicks before hover/timeout
            if (injectDataFallback && element.dataset.mediaLoaded !== 'true') {
                await injectDataFallback();
            }

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

// Background storage migration helper
async function migrateToSplitStorage(recordings) {
    console.log('Initiating background migration to split storage...');
    const updatedRecordings = [...recordings];
    let migratedAny = false;

    // Migrate in small chunks to avoid blocking
    for (let i = 0; i < updatedRecordings.length; i++) {
        const rec = updatedRecordings[i];
        if (rec.audioData) {
            const dataKey = `rec_data_${rec.timestamp}`;
            const payload = { [dataKey]: rec.audioData };

            try {
                await chrome.storage.local.set(payload);
                delete rec.audioData;
                migratedAny = true;
                console.log(`Migrated recording ${rec.timestamp} to separate key.`);
            } catch (err) {
                console.error('Migration failed for item:', rec.timestamp, err);
            }
        }
    }

    if (migratedAny) {
        await chrome.storage.local.set({ recordings: updatedRecordings });
        allRecordings = updatedRecordings;
        console.log('Split storage migration complete.');
    }
}

function attachListeners(recordings) {
    // Legacy support or fallback
    document.querySelectorAll('.tape-card, .crt-card').forEach(el => {
        attachListenersToElement(el, recordings);
    });
}

document.addEventListener('DOMContentLoaded', () => {
    // Define secondary systems initialization BEFORE loadRecordings to be absolutely safe
    window.initSecondarySystems = () => {
        try {
            // Initialize achievements and store reference for updates
            window.achievementSystem = new AchievementSystem();
            setupSettings();
        } catch (err) {
            console.error('Secondary systems init error:', err);
        }
        delete window.initSecondarySystems;
    };

    // Stage 1: Absolute Priority - Load data and show first item
    loadRecordings();
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
    const uiStyleSelect = document.getElementById('ui-style');

    // Hidden inputs handling to match old logic without breaking
    const videoBitrate = document.getElementById('video-bitrate');
    const videoFps = document.getElementById('video-fps');
    const videoTimeslice = document.getElementById('video-timeslice');
    const audioBufferSize = document.getElementById('audio-buffer-size');
    const systemAudioEnabled = document.getElementById('system-audio-enabled');
    const autoUpdateCheck = document.getElementById('auto-update-check');

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
            uiStyle: 'aesthetic',
            autoUpdateCheck: false,
            video: { codec: 'vp9', resolution: '1080p', bitrate: 4000, fps: 60, timeslice: 1000 },
            audio: { sampleRate: 44100, bufferSize: 4096, systemAudioEnabled: true }
        };
        const merged = {
            promptText: settings.promptText || defaults.promptText,
            maxRecordings: settings.maxRecordings || defaults.maxRecordings,
            uiStyle: settings.uiStyle || defaults.uiStyle,
            autoUpdateCheck: settings.autoUpdateCheck !== undefined ? settings.autoUpdateCheck : defaults.autoUpdateCheck,
            video: { ...defaults.video, ...(settings.video || {}) },
            audio: { ...defaults.audio, ...(settings.audio || {}) }
        };

        if (promptInput) promptInput.value = merged.promptText;
        if (maxRecordingsInput) maxRecordingsInput.value = merged.maxRecordings;
        if (videoCodec) videoCodec.value = merged.video.codec;
        if (videoResolution) videoResolution.value = merged.video.resolution;
        if (audioSampleRate) audioSampleRate.value = merged.audio.sampleRate;
        if (uiStyleSelect) uiStyleSelect.value = merged.uiStyle;

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
        if (autoUpdateCheck) autoUpdateCheck.checked = merged.autoUpdateCheck === true;
    }

    async function saveSettings() {
        // Enforce max 25 limit
        let maxVal = parseInt(maxRecordingsInput?.value) || 10;
        if (maxVal > 25) maxVal = 25;

        const settings = {
            promptText: promptInput.value,
            maxRecordings: maxVal,
            uiStyle: uiStyleSelect?.value || 'aesthetic',
            autoUpdateCheck: !!autoUpdateCheck?.checked,
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
        loadMoreCount = Math.max(1, settings.maxRecordings - 1); // INITIAL_LOAD is 5 now, but loadMore needs room

        await queueStorageOperation(async () => {
            await chrome.storage.local.set({ settings });

            // Apply max recordings limit immediately within the queue
            const result = await chrome.storage.local.get(['recordings']);
            const recordings = result.recordings || [];

            if (recordings.length > maxVal) {
                const toRemove = recordings.slice(maxVal);
                const trimmedRecordings = recordings.slice(0, maxVal);

                // Cleanup associated data keys for removed recordings
                const removeKeys = toRemove.map(r => `rec_data_${r.timestamp}`);
                await chrome.storage.local.remove(removeKeys);

                await chrome.storage.local.set({ recordings: trimmedRecordings });
                allRecordings = trimmedRecordings;

                // Re-render can happen after the queue operation
                setTimeout(() => loadRecordings(true), 10);
            }
        });
    }

    // Removed standalone applyMaxRecordingsLimit as it is now inside saveSettings queue


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

    if (settingsBtn) {
        settingsBtn.addEventListener('click', async () => {
            await loadSettings();

            // Check if there are recordings to delete
            if (clearAllBtn) {
                if (allRecordings.length === 0) {
                    clearAllBtn.classList.add('disabled');
                    clearAllBtn.innerText = 'NO RECORDS TO PURGE';
                } else {
                    clearAllBtn.classList.remove('disabled');
                    clearAllBtn.innerText = 'PURGE ALL STORAGE';
                }
            }

            openModal(modal);
        });
    }
    if (cancelBtn) {
        cancelBtn.addEventListener('click', () => {
            closeModal(modal);
        });
    }
    if (saveBtn) {
        saveBtn.addEventListener('click', async () => {
            await saveSettings();
            closeModal(modal);
        });
    }
    if (resetBtn) {
        resetBtn.addEventListener('click', async () => {
            showConfirmModal('Reset all settings to defaults?', async () => {
                await chrome.storage.local.remove(['settings']);
                await loadSettings();
            });
        });
    }

    // Clear all recordings button
    if (clearAllBtn) {
        clearAllBtn.addEventListener('click', () => {
            showConfirmModal('⚠️ Delete ALL recordings? This cannot be undone!', () => {
                // Second confirmation
                showConfirmModal('Are you absolutely sure? All recordings will be permanently deleted!', async () => {
                    const list = document.getElementById('list');
                    if (list) {
                        list.style.transition = 'opacity 0.4s ease-out, transform 0.4s ease-out';
                        list.style.opacity = '0';
                        list.style.transform = 'translateY(15px)';
                    }

                    await queueStorageOperation(async () => {
                        // 1. Explicitly REMOVE the keys first to wipe data
                        // We also need to find and remove all rec_data_* keys
                        const allKeysResult = await chrome.storage.local.get(null);
                        const allKeys = Object.keys(allKeysResult);
                        const keysToRemove = allKeys.filter(k => k.startsWith('rec_data_') || k === 'recordings' || k === 'stats');

                        await chrome.storage.local.remove(keysToRemove);

                        // 2. Initialize with clean empty defaults
                        const emptyStats = { totalRecordings: 0, lifetimeAudioMs: 0, lifetimeVideoMs: 0 };
                        await chrome.storage.local.set({
                            recordings: [],
                            stats: emptyStats
                        });

                        // 3. Update memory state
                        allRecordings = [];
                        displayedCount = 0;
                        hasMoreToLoad = false;

                        console.log("Storage purged successfully - Absolute Wipe");

                        // 4. Force reload achievement system state if it exists
                        if (window.achievementSystem) {
                            await window.achievementSystem.loadStats();
                            window.achievementSystem.updateBadge();
                            window.achievementSystem.updateModalContent?.();
                        }
                    });

                    // Update UI after storage is cleared
                    if (list) {
                        setTimeout(() => {
                            list.innerHTML = getEmptyStateHTML();
                            list.style.opacity = '1';
                            list.style.transform = 'translateY(0)';
                        }, 400);
                    }

                    closeModal(modal);
                });
            });
        });
    }

    // Trigger update check if enabled
    const resultCheck = await chrome.storage.local.get(['settings']);
    if (resultCheck.settings?.autoUpdateCheck === true) {
        checkForUpdates();
    }

    modal.addEventListener('click', (e) => {
        if (e.target == modal) closeModal(modal);
    });
}

/**
 * Checks for updates from GitHub Releases
 */
async function checkForUpdates() {
    try {
        const response = await fetch('https://api.github.com/repos/NolanEYeee/Thoughtful-Voice/releases/latest');
        if (!response.ok) return;

        const data = await response.json();
        const latestVersion = data.tag_name.replace('v', '');
        const currentVersion = chrome.runtime.getManifest().version;

        if (compareVersions(latestVersion, currentVersion) > 0) {
            showUpdateBanner(data.tag_name, data.html_url);
        }
    } catch (err) {
        console.error('Update check failed:', err);
    }
}

/**
 * SemVer comparison
 */
function compareVersions(v1, v2) {
    const parts1 = v1.split('.').map(Number);
    const parts2 = v2.split('.').map(Number);
    for (let i = 0; i < Math.max(parts1.length, parts2.length); i++) {
        const p1 = parts1[i] || 0;
        const p2 = parts2[i] || 0;
        if (p1 > p2) return 1;
        if (p1 < p2) return -1;
    }
    return 0;
}

/**
 * Displays the update notification banner
 */
function showUpdateBanner(tagName, url) {
    const container = document.getElementById('update-notification');
    if (!container) return;

    container.innerHTML = `
        <div class="settings-card" style="border: 1px solid var(--walkman-accent); background: rgba(255,107,0,0.1); position: relative; overflow: hidden; animation: contentPopIn 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;">
            <div style="position: absolute; top: 0; left: 0; width: 3px; height: 100%; background: var(--walkman-accent);"></div>
            <div style="display: flex; justify-content: space-between; align-items: center; gap: 12px;">
                <div style="flex: 1;">
                    <div style="font-size: 11px; font-weight: bold; color: var(--walkman-accent); margin-bottom: 2px;">NEW RELEASE: ${tagName}</div>
                    <div style="font-size: 10px; color: #888; font-family: 'Arial Narrow', sans-serif;">A newer version of Thoughtful Voice is ready.</div>
                </div>
                <div style="display: flex; gap: 6px;">
                    <a href="${url}" target="_blank" class="retro-btn primary" style="height: 28px; min-width: 50px; font-size: 9px;">GET</a>
                    <button id="close-update-banner" class="retro-btn" style="height: 28px; width: 28px; padding: 0; font-size: 14px;">×</button>
                </div>
            </div>
        </div>
    `;
    container.style.display = 'block';

    const closeBtn = document.getElementById('close-update-banner');
    if (closeBtn) {
        closeBtn.onclick = () => {
            container.style.animation = 'contentPopOut 0.2s ease-in forwards';
            setTimeout(() => { container.style.display = 'none'; }, 200);
        };
    }
}

function getEmptyStateHTML() {
    return `
        <div class="empty-deck" style="opacity: 0; transform: scale(0.98); transition: all 0.6s cubic-bezier(0.2, 0, 0.2, 1); animation: emptyFadeIn 0.8s forwards;">
            <style>
                @keyframes emptyFadeIn {
                    to { opacity: 1; transform: scale(1); }
                }
            </style>
            <!-- Subtle Grid Background -->
            <div class="bg-grid"></div>

            <!-- Floating Particles -->
            <div class="particle-field">
                <div class="particle" style="top: 20%; left: 15%; animation-delay: 0s;"></div>
                <div class="particle" style="top: 60%; left: 75%; animation-delay: -4s;"></div>
                <div class="particle" style="top: 40%; left: 50%; animation-delay: -8s;"></div>
            </div>

            <!-- 1. RETRO TV -->
            <div class="floating-tv">
                <div class="tv-antenna">
                    <div class="antenna-rod"></div>
                    <div class="antenna-rod"></div>
                </div>
                <div class="tv-screen">
                    <div class="tv-static"></div>
                    <div class="tv-scanlines"></div>
                    <div class="tv-scan-beam"></div>
                    <div class="tv-content">NO SIGNAL</div>
                    <div class="tv-reflection"></div>
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
                <div class="void-window">
                    <div class="reel-container">
                        <div class="void-reel"></div>
                        <div class="void-reel"></div>
                    </div>
                </div>
                <div class="void-label">AUTO-REC</div>
            </a>

            <!-- Status -->
            <div class="status-block">
                <div class="status-main">[ DECK EMPTY ]</div>
                <div class="status-sub">Start recording to fill the archive</div>
                <div class="platform-pills">
                    <a href="https://gemini.google.com/" target="_blank" class="platform-pill">Gemini</a>
                    <a href="https://aistudio.google.com/" target="_blank" class="platform-pill">AI Studio</a>
                    <a href="https://chatgpt.com/" target="_blank" class="platform-pill">ChatGPT</a>
                    <a href="https://www.perplexity.ai/" target="_blank" class="platform-pill">Perplexity</a>
                </div>
            </div>

        </div>
    `;
}


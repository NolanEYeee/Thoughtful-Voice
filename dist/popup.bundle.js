(() => {
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __esm = (fn, res) => function __init() {
    return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
  };
  var __commonJS = (cb, mod) => function __require() {
    return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
  };

  // src/content/storage.js
  var init_storage = __esm({
    "src/content/storage.js"() {
    }
  });

  // src/popup/popup.js
  var require_popup = __commonJS({
    "src/popup/popup.js"() {
      init_storage();
      var initialDataPromise = chrome.storage.local.get(["recordings", "settings"]);
      var isShiftPressed = false;
      var allRecordings = [];
      var displayedCount = 0;
      var INITIAL_LOAD = 1;
      var loadMoreCount = 7;
      var isLoading = false;
      var hasMoreToLoad = false;
      var revealObserver = new IntersectionObserver((entries) => {
        requestAnimationFrame(() => {
          entries.forEach((entry, index) => {
            if (entry.isIntersecting) {
              setTimeout(() => {
                entry.target.classList.add("revealed");
              }, index * 60);
              revealObserver.unobserve(entry.target);
            }
          });
        });
      }, { threshold: 0.05, rootMargin: "0px 0px 50px 0px" });
      function updateShiftKeyFeedback() {
        const deleteButtons = document.querySelectorAll(".retro-btn.delete");
        deleteButtons.forEach((btn) => {
          if (isShiftPressed) {
            btn.classList.add("shift-ready");
            btn.title = "Click to delete immediately (Shift held)";
          } else {
            btn.classList.remove("shift-ready");
            btn.title = "Delete (Hold Shift for quick delete)";
          }
        });
      }
      document.addEventListener("keydown", (e) => {
        if (e.key === "Shift" && !isShiftPressed) {
          isShiftPressed = true;
          updateShiftKeyFeedback();
        }
      });
      document.addEventListener("keyup", (e) => {
        if (e.key === "Shift") {
          isShiftPressed = false;
          updateShiftKeyFeedback();
        }
      });
      window.addEventListener("blur", () => {
        isShiftPressed = false;
        updateShiftKeyFeedback();
      });
      function showConfirmModal(message, onConfirm, onCancel) {
        let modal = document.getElementById("confirm-modal");
        if (!modal) {
          modal = document.createElement("div");
          modal.id = "confirm-modal";
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
          void modal.offsetHeight;
        }
        const messageEl = modal.querySelector(".confirm-message");
        const confirmBtn = modal.querySelector(".confirm-btn.confirm");
        const cancelBtn = modal.querySelector(".confirm-btn.cancel");
        messageEl.textContent = message;
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            modal.classList.add("show");
          });
        });
        const newConfirmBtn = confirmBtn.cloneNode(true);
        const newCancelBtn = cancelBtn.cloneNode(true);
        confirmBtn.parentNode.replaceChild(newConfirmBtn, confirmBtn);
        cancelBtn.parentNode.replaceChild(newCancelBtn, cancelBtn);
        const closeModal = () => {
          modal.classList.remove("show");
        };
        newConfirmBtn.addEventListener("click", () => {
          closeModal();
          if (onConfirm) onConfirm();
        });
        newCancelBtn.addEventListener("click", () => {
          closeModal();
          if (onCancel) onCancel();
        });
        modal.querySelector(".confirm-backdrop").addEventListener("click", () => {
          closeModal();
          if (onCancel) onCancel();
        });
      }
      async function loadRecordings() {
        const result = await initialDataPromise;
        const recordings = result.recordings || [];
        const settings = result.settings || {};
        recordings.sort((a, b) => b.timestamp - a.timestamp);
        allRecordings = recordings;
        displayedCount = 0;
        const list = document.getElementById("list");
        list.innerHTML = "";
        const priorityCount = Math.min(1, recordings.length);
        if (priorityCount > 0) {
          await renderBatch(0, priorityCount, 0);
        } else {
          list.innerHTML = '<div style="text-align: center; color: #666; padding: 40px; font-family: monospace;">[NO TAPES FOUND]</div>';
          return;
        }
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
        const list = document.getElementById("list");
        const endIndex = Math.min(startIndex + count, allRecordings.length);
        for (let i = startIndex; i < endIndex; i++) {
          const item = allRecordings[i];
          const date = new Date(item.timestamp);
          const dateKey = date.toLocaleDateString();
          let groupContainer = document.getElementById(`group-${dateKey.replace(/\//g, "-")}`);
          if (!groupContainer) {
            groupContainer = document.createElement("div");
            groupContainer.className = "recording-group";
            groupContainer.id = `group-${dateKey.replace(/\//g, "-")}`;
            list.appendChild(groupContainer);
          }
          const el = createRecordingElement(item, i, true);
          groupContainer.appendChild(el);
          if (startIndex === 0 && i === 0) {
            el.classList.add("revealed");
          } else {
            revealObserver.observe(el);
          }
          const mediaElem = el.querySelector("audio, video");
          const downloadBtn = el.querySelector("a.retro-btn[download]");
          const injectData = () => {
            if (el.dataset.mediaLoaded === "true") return;
            if (mediaElem) mediaElem.src = item.audioData;
            if (downloadBtn) downloadBtn.href = item.audioData;
            el.dataset.mediaLoaded = "true";
          };
          el.addEventListener("mouseenter", injectData, { once: true });
          const backgroundLoadDelay = 500 + i * 150;
          setTimeout(injectData, backgroundLoadDelay);
          attachListenersToElement(el, allRecordings, injectData);
          displayedCount = i + 1;
          hasMoreToLoad = displayedCount < allRecordings.length;
          if (i < endIndex - 1 && customDelay > 0) {
            await new Promise((resolve) => setTimeout(resolve, customDelay));
          }
        }
      }
      function setupScrollListener() {
        const scrollContainer = document.querySelector(".content-scroll");
        if (!scrollContainer) return;
        scrollContainer.removeEventListener("scroll", handleScroll);
        scrollContainer.addEventListener("scroll", handleScroll);
      }
      function handleScroll(e) {
        const scrollContainer = e.target;
        const scrollTop = scrollContainer.scrollTop;
        const scrollHeight = scrollContainer.scrollHeight;
        const clientHeight = scrollContainer.clientHeight;
        const distanceToBottom = scrollHeight - scrollTop - clientHeight;
        if (distanceToBottom < 100 && hasMoreToLoad && !isLoading) {
          loadMoreRecordings();
        }
      }
      async function loadMoreRecordings() {
        if (!hasMoreToLoad || isLoading) return;
        isLoading = true;
        const countToLoad = Math.min(loadMoreCount, allRecordings.length - displayedCount);
        await renderBatch(displayedCount, countToLoad, 100);
        isLoading = false;
      }
      function createRecordingElement(rec, index, lazyMedia = false) {
        const isVideo = rec.type === "video";
        const date = new Date(rec.timestamp);
        const mediaSrc = lazyMedia ? "" : rec.audioData;
        const dateStr = date.toLocaleDateString("zh-CN", { month: "2-digit", day: "2-digit" });
        const timeStr = date.toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit", hour12: false });
        const div = document.createElement("div");
        if (isVideo) {
          div.className = "crt-card";
          div.dataset.id = rec.timestamp;
          const siteName = (rec.site || "VIDEO").toUpperCase();
          const siteLabel = rec.url ? `<a href="${rec.url}" target="_blank" class="site-link" title="Open ${siteName} chat">\u{1F4F9} ${siteName}</a>` : `<span>\u{1F4F9} ${siteName}</span>`;
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
                    <span class="time-display duration">${rec.durationString || "00:00"}</span>
                </div>
                <div class="control-group">
                    <a class="retro-btn" href="${mediaSrc}" download="video_${dateStr.replace("/", "")}_${timeStr.replace(":", "")}.webm" title="Download">
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
          div.className = "tape-card";
          div.dataset.id = rec.timestamp;
          const audioId = `audio-${index}`;
          const siteName = (rec.site || "AUDIO").toUpperCase();
          const siteLabel = rec.url ? `<a href="${rec.url}" target="_blank" class="site-link" title="Open ${siteName} chat">\u{1F399}\uFE0F ${siteName}</a>` : `\u{1F399}\uFE0F ${siteName}`;
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
                    <span class="time-display duration">${rec.durationString || "00:00"}</span>
                </div>
                <div class="control-group">
                    <button class="retro-btn primary play-btn" data-id="${audioId}" data-win="tape-win-${index}" title="Play">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M8 5v14l11-7z"/>
                        </svg>
                    </button>
                    <a class="retro-btn" href="${rec.audioData}" download="audio_${dateStr.replace("/", "")}_${timeStr.replace(":", "")}.wav" title="Download">
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
        const deleteBtn = element.querySelector(".retro-btn.delete");
        if (deleteBtn) {
          deleteBtn.title = "Delete (Hold Shift for quick delete)";
          deleteBtn.onclick = async (e) => {
            const timestamp = parseInt(deleteBtn.dataset.id);
            if (isNaN(timestamp)) return;
            const performDelete = async () => {
              const card = deleteBtn.closest(".tape-card, .crt-card");
              const isVideoCard = card?.classList.contains("crt-card");
              const group = card?.parentElement;
              const isLastInGroup = group && group.querySelectorAll(".tape-card, .crt-card").length === 1;
              if (card) {
                const height = card.offsetHeight;
                card.style.maxHeight = height + "px";
                card.style.transition = "all 0.5s cubic-bezier(0.4, 0, 0.2, 1)";
                if (isLastInGroup) {
                  group.style.transition = "margin-bottom 0.5s cubic-bezier(0.4, 0, 0.2, 1)";
                }
                void card.offsetHeight;
                card.classList.add("recording-deleting");
                const collapseDelay = isVideoCard ? 150 : 0;
                setTimeout(() => {
                  card.style.maxHeight = "0px";
                  card.style.marginBottom = "0px";
                  card.style.marginTop = "0px";
                  card.style.paddingTop = "0px";
                  card.style.paddingBottom = "0px";
                  card.style.opacity = "0";
                  if (isLastInGroup) {
                    group.style.marginBottom = "0px";
                  }
                }, collapseDelay);
                await new Promise((resolve) => setTimeout(resolve, 600));
              }
              if (timestamp) {
                const foundIndex = allRecordings.findIndex((r) => r.timestamp === timestamp);
                if (foundIndex !== -1) {
                  allRecordings.splice(foundIndex, 1);
                  await chrome.storage.local.set({ recordings: allRecordings });
                }
              }
              if (card) {
                card.remove();
                if (group && group.classList.contains("recording-group") && group.querySelectorAll(".tape-card, .crt-card").length === 0) {
                  group.remove();
                }
              }
              displayedCount = Math.max(0, displayedCount - 1);
              hasMoreToLoad = displayedCount < allRecordings.length;
              const list = document.getElementById("list");
              if (allRecordings.length === 0 && list) {
                list.innerHTML = '<div style="text-align: center; color: #666; padding: 40px; font-family: monospace;">[NO TAPES FOUND]</div>';
              }
            };
            if (e.shiftKey) {
              await performDelete();
            } else {
              showConfirmModal("Eject and destroy this tape?", performDelete);
            }
          };
        }
        const playBtn = element.querySelector(".play-btn");
        if (playBtn) {
          playBtn.onclick = (e) => {
            if (injectDataFallback) injectDataFallback();
            const audioId = playBtn.dataset.id;
            const winId = playBtn.dataset.win;
            const audio = document.getElementById(audioId);
            const tapeWindow = document.getElementById(winId);
            if (audio.paused) {
              document.querySelectorAll("audio").forEach((a) => {
                if (a !== audio) {
                  a.pause();
                  a.currentTime = 0;
                }
              });
              document.querySelectorAll(".tape-window").forEach((w) => w.classList.remove("playing"));
              document.querySelectorAll(".play-btn").forEach((b) => {
                b.innerHTML = '<svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>';
              });
              audio.play();
              tapeWindow.classList.add("playing");
              playBtn.innerHTML = '<svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>';
            } else {
              audio.pause();
              tapeWindow.classList.remove("playing");
              playBtn.innerHTML = '<svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>';
            }
            audio.onended = () => {
              tapeWindow.classList.remove("playing");
              playBtn.innerHTML = '<svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>';
            };
          };
        }
        updateShiftKeyFeedback();
      }
      document.addEventListener("DOMContentLoaded", () => {
        loadRecordings().then(() => {
          requestAnimationFrame(() => {
            setupSettings();
          });
        });
      });
      async function setupSettings() {
        const settingsBtn = document.getElementById("settings-btn");
        const modal = document.getElementById("settings-modal");
        const cancelBtn = document.getElementById("cancel-settings");
        const saveBtn = document.getElementById("save-settings");
        const resetBtn = document.getElementById("reset-settings");
        const clearAllBtn = document.getElementById("clear-all-recordings");
        const promptInput = document.getElementById("prompt-text");
        const videoCodec = document.getElementById("video-codec");
        const videoResolution = document.getElementById("video-resolution");
        const audioSampleRate = document.getElementById("audio-sample-rate");
        const maxRecordingsInput = document.getElementById("max-recordings");
        const videoBitrate = document.getElementById("video-bitrate");
        const videoFps = document.getElementById("video-fps");
        const videoTimeslice = document.getElementById("video-timeslice");
        const audioBufferSize = document.getElementById("audio-buffer-size");
        const systemAudioEnabled = document.getElementById("system-audio-enabled");
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
          const result = await chrome.storage.local.get(["settings"]);
          const settings = result.settings || {};
          const defaults = {
            promptText: "Please answer based on this audio",
            maxRecordings: 10,
            video: { codec: "vp9", resolution: "1080p", bitrate: 4e3, fps: 60, timeslice: 1e3 },
            audio: { sampleRate: 44100, bufferSize: 4096, systemAudioEnabled: true }
          };
          const merged = {
            promptText: settings.promptText || defaults.promptText,
            maxRecordings: settings.maxRecordings || defaults.maxRecordings,
            video: { ...defaults.video, ...settings.video || {} },
            audio: { ...defaults.audio, ...settings.audio || {} }
          };
          if (promptInput) promptInput.value = merged.promptText;
          if (maxRecordingsInput) maxRecordingsInput.value = merged.maxRecordings;
          if (videoCodec) videoCodec.value = merged.video.codec;
          if (videoResolution) videoResolution.value = merged.video.resolution;
          if (audioSampleRate) audioSampleRate.value = merged.audio.sampleRate;
          const bitrateValue = document.getElementById("bitrate-value");
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
          loadMoreCount = Math.max(1, settings.maxRecordings - INITIAL_LOAD);
          await chrome.storage.local.set({ settings });
          await applyMaxRecordingsLimit(settings.maxRecordings);
        }
        async function applyMaxRecordingsLimit(maxRecordings) {
          const result = await chrome.storage.local.get(["recordings"]);
          const recordings = result.recordings || [];
          if (recordings.length > maxRecordings) {
            const trimmedRecordings = recordings.slice(0, maxRecordings);
            await chrome.storage.local.set({ recordings: trimmedRecordings });
            allRecordings = trimmedRecordings;
            loadRecordings();
          }
        }
        function openModal(modal2) {
          modal2.style.display = "block";
          modal2.style.opacity = "0";
          void modal2.offsetHeight;
          requestAnimationFrame(() => {
            modal2.classList.remove("modal-closing");
            modal2.classList.add("modal-opening");
            modal2.style.opacity = "1";
          });
        }
        function closeModal(modal2) {
          modal2.classList.remove("modal-opening");
          modal2.classList.add("modal-closing");
          modal2.style.opacity = "0";
          setTimeout(() => {
            modal2.style.display = "none";
            modal2.classList.remove("modal-closing");
          }, 300);
        }
        if (settingsBtn) settingsBtn.onclick = async () => {
          await loadSettings();
          openModal(modal);
        };
        if (cancelBtn) cancelBtn.onclick = () => {
          closeModal(modal);
        };
        if (saveBtn) saveBtn.onclick = async () => {
          await saveSettings();
          closeModal(modal);
        };
        if (resetBtn) resetBtn.onclick = async () => {
          showConfirmModal("Reset all settings to defaults?", async () => {
            await chrome.storage.local.remove(["settings"]);
            await loadSettings();
          });
        };
        if (clearAllBtn) {
          clearAllBtn.onclick = () => {
            showConfirmModal("\u26A0\uFE0F Delete ALL recordings? This cannot be undone!", () => {
              showConfirmModal("Are you absolutely sure? All recordings will be permanently deleted!", async () => {
                const list = document.getElementById("list");
                if (list) {
                  list.style.transition = "opacity 0.5s ease-out, transform 0.5s ease-out";
                  list.style.opacity = "0";
                  list.style.transform = "translateY(20px)";
                  await new Promise((r) => setTimeout(r, 500));
                }
                await chrome.storage.local.set({ recordings: [] });
                allRecordings = [];
                displayedCount = 0;
                hasMoreToLoad = false;
                if (list) {
                  list.innerHTML = '<div style="text-align: center; color: #666; padding: 40px; font-family: monospace;">[NO TAPES FOUND]</div>';
                  list.style.opacity = "1";
                  list.style.transform = "translateY(0)";
                }
                closeModal(modal);
              });
            });
          };
        }
        window.onclick = (e) => {
          if (e.target == modal) closeModal(modal);
        };
      }
    }
  });
  require_popup();
})();

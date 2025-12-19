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

  // src/popup/achievements.js
  var AchievementSystem;
  var init_achievements = __esm({
    "src/popup/achievements.js"() {
      AchievementSystem = class {
        constructor() {
          this.modal = null;
          this.stats = {
            lifetimeAudioMs: 0,
            lifetimeVideoMs: 0,
            totalRecordings: 0
          };
          this.init();
        }
        async init() {
          await this.loadStats();
          this.createModal();
          this.attachTrigger();
          this.updateBadge();
        }
        async loadStats() {
          const result = await chrome.storage.local.get(["stats", "recordings"]);
          if (result.stats) {
            this.stats = result.stats;
          } else if (result.recordings && result.recordings.length > 0) {
            let audioMs = 0;
            let videoMs = 0;
            result.recordings.forEach((rec) => {
              if (rec.type === "audio") audioMs += rec.durationMs || 0;
              else if (rec.type === "video") videoMs += rec.durationMs || 0;
            });
            this.stats = {
              lifetimeAudioMs: audioMs,
              lifetimeVideoMs: videoMs,
              totalRecordings: result.recordings.length
            };
            await chrome.storage.local.set({ stats: this.stats });
          }
        }
        updateBadge() {
          const rankText = document.getElementById("badge-rank-text");
          if (rankText) {
            const rank = this.calculateRank();
            rankText.textContent = rank.name;
          }
        }
        calculateRank() {
          const totalMinutes = (this.stats.lifetimeAudioMs + this.stats.lifetimeVideoMs) / 6e4;
          if (totalMinutes > 60) return { name: "PRO-ENGINEER", level: 4 };
          if (totalMinutes > 15) return { name: "STUDIO-MASTER", level: 3 };
          if (totalMinutes > 5) return { name: "SOUND-ARTIST", level: 2 };
          return { name: "JUNIOR-OP", level: 1 };
        }
        createModal() {
          if (document.getElementById("achievement-modal")) return;
          this.modal = document.createElement("div");
          this.modal.id = "achievement-modal";
          this.modal.className = "modal-container";
          const rank = this.calculateRank();
          const audioTime = this.formatTime(this.stats.lifetimeAudioMs);
          const videoTime = this.formatTime(this.stats.lifetimeVideoMs);
          this.modal.innerHTML = `
            <div class="achievement-content-wrapper" style="margin: 0 auto; max-width: 360px; border-radius: 12px; overflow: hidden; position: relative;">
                <!-- Hero Section -->
                <div class="achievement-hero">
                    <!-- Premium Cyber-Knob Badge -->
                    <a href="https://github.com/NolanEYeee/Thoughtful-Voice" target="_blank" class="studio-badge-large" style="width: 100px; height: 100px; border-radius: 50%;">
                        <div class="lens-chamber"></div>
                        <div class="lens-reflection"></div>
                        
                        <!-- Center Icon -->
                        <div class="badge-icon-container">
                            <div class="badge-icon-glow"></div>
                            <img src="../../icons/Thoughtful_Voice_icon.png" class="app-icon-badge" />
                        </div>
                        
                        <!-- Studio Label -->
                        <div class="studio-tag">
                            STUDIO
                        </div>
                    </a>

                    <div class="achievement-rank-title" style="margin-top: 15px; color: #ff6b00; font-family: 'Arial Black', sans-serif; font-size: 18px; letter-spacing: 4px; text-shadow: 0 0 20px rgba(255,107,0,0.4);">
                        ${rank.name}
                    </div>
                </div>

                <!-- Content Area -->
                <div style="padding: 20px;">
                    <div class="stats-grid">
                        <div class="stat-item">
                            <div class="stat-label">
                                <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor" style="vertical-align: middle; margin-right: 4px;"><path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/></svg>
                                Audio Session
                            </div>
                            <div class="stat-value">${audioTime}</div>
                        </div>
                        <div class="stat-item">
                            <div class="stat-label">
                                <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor" style="vertical-align: middle; margin-right: 4px;"><path d="M17 10.5V7c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.55 0 1-.45 1-1v-3.5l4 4v-11l-4 4z"/></svg>
                                Video Session
                            </div>
                            <div class="stat-value">${videoTime}</div>
                        </div>
                    </div>

                    <div style="margin-top: 25px;">
                        <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 15px;">
                            <div style="height: 1px; flex: 1; background: #333;"></div>
                            <div style="font-size: 8px; color: #555; text-transform: uppercase; letter-spacing: 2px; font-weight: bold;">Milestones</div>
                            <div style="height: 1px; flex: 1; background: #333;"></div>
                        </div>
                        
                        <div class="achievement-list">
                            ${this.renderMilestone("First Session", "Initial recording saved", this.stats.totalRecordings >= 1)}
                            ${this.renderMilestone("Analog Lover", "10 min audio captured", this.stats.lifetimeAudioMs >= 6e5)}
                            ${this.renderMilestone("Cinematographer", "10 min video recorded", this.stats.lifetimeVideoMs >= 6e5)}
                            ${this.renderMilestone("Studio Veteran", "60 min total studio time", this.stats.lifetimeAudioMs + this.stats.lifetimeVideoMs >= 36e5)}
                        </div>
                    </div>

                    <button id="close-achievements" class="retro-btn primary" style="width: 100%; height: 40px; margin-top: 25px; font-size: 12px; letter-spacing: 2px;">EJECT STATION</button>
                </div>
            </div>
        `;
          document.body.appendChild(this.modal);
          this.modal.querySelector("#close-achievements").onclick = () => this.hide();
          this.modal.onclick = (e) => {
            if (e.target === this.modal) this.hide();
          };
        }
        renderMilestone(name, req, unlocked) {
          return `
            <div class="milestone-item ${unlocked ? "unlocked" : ""}">
                <div class="milestone-icon">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                        ${unlocked ? '<path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>' : '<path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zM9 6c0-1.66 1.34-3 3-3s3 1.34 3 3v2H9V6z"/>'}
                    </svg>
                </div>
                <div class="milestone-info">
                    <div class="milestone-name">${name}</div>
                    <div class="milestone-requirement">${req}</div>
                </div>
            </div>
        `;
        }
        formatTime(ms) {
          const totalSeconds = Math.floor(ms / 1e3);
          const h = Math.floor(totalSeconds / 3600);
          const m = Math.floor(totalSeconds % 3600 / 60);
          const s = totalSeconds % 60;
          if (h > 0) return `${h}h ${m}m ${s}s`;
          return `${m}m ${s}s`;
        }
        attachTrigger() {
          const trigger = document.getElementById("achievement-trigger");
          if (trigger) {
            trigger.onclick = () => this.show();
          }
        }
        async show() {
          await this.loadStats();
          this.updateModalContent();
          this.modal.classList.add("active");
          this.modal.classList.remove("hiding");
        }
        hide() {
          this.modal.classList.add("hiding");
          setTimeout(() => {
            this.modal.classList.remove("active");
            this.modal.classList.remove("hiding");
          }, 300);
        }
        updateModalContent() {
          const rank = this.calculateRank();
          const audioTime = this.formatTime(this.stats.lifetimeAudioMs);
          const videoTime = this.formatTime(this.stats.lifetimeVideoMs);
          const statValues = this.modal.querySelectorAll(".stat-value");
          if (statValues[0]) statValues[0].textContent = audioTime;
          if (statValues[1]) statValues[1].textContent = videoTime;
          const rankTitle = this.modal.querySelector(".achievement-rank-title");
          if (rankTitle) rankTitle.textContent = rank.name;
          const list = this.modal.querySelector(".achievement-list");
          if (list) {
            list.innerHTML = `
                ${this.renderMilestone("Sound Engineer", "1st Recording Uploaded", this.stats.totalRecordings >= 1)}
                ${this.renderMilestone("Analog Lover", "10 Minutes Audio Record", this.stats.lifetimeAudioMs >= 6e5)}
                ${this.renderMilestone("Cinematographer", "10 Minutes Video Record", this.stats.lifetimeVideoMs >= 6e5)}
                ${this.renderMilestone("Studio Veteran", "60 Minutes Total Usage", this.stats.lifetimeAudioMs + this.stats.lifetimeVideoMs >= 36e5)}
            `;
          }
          this.updateBadge();
        }
      };
    }
  });

  // src/popup/popup.js
  var require_popup = __commonJS({
    "src/popup/popup.js"() {
      init_storage();
      init_achievements();
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
              }, index * 80);
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
          modal.className = "modal-container";
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
        const messageEl = modal.querySelector(".confirm-message");
        const confirmBtn = modal.querySelector(".confirm");
        const cancelBtn = modal.querySelector(".cancel");
        messageEl.textContent = message;
        modal.classList.add("active");
        modal.classList.remove("hiding");
        const newConfirmBtn = confirmBtn.cloneNode(true);
        const newCancelBtn = cancelBtn.cloneNode(true);
        confirmBtn.parentNode.replaceChild(newConfirmBtn, confirmBtn);
        cancelBtn.parentNode.replaceChild(newCancelBtn, cancelBtn);
        const closeModal = () => {
          modal.classList.add("hiding");
          setTimeout(() => {
            modal.classList.remove("active");
            modal.classList.remove("hiding");
          }, 300);
        };
        newConfirmBtn.addEventListener("click", () => {
          closeModal();
          if (onConfirm) onConfirm();
        });
        newCancelBtn.addEventListener("click", () => {
          closeModal();
          if (onCancel) onCancel();
        });
        modal.addEventListener("click", (e) => {
          if (e.target === modal) {
            closeModal();
            if (onCancel) onCancel();
          }
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
          list.innerHTML = getEmptyStateHTML();
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
        checkAndLoadMore();
      }
      async function checkAndLoadMore() {
        const scrollContainer = document.querySelector(".content-scroll");
        if (!scrollContainer || isLoading || !hasMoreToLoad) return;
        const scrollTop = scrollContainer.scrollTop;
        const scrollHeight = scrollContainer.scrollHeight;
        const clientHeight = scrollContainer.clientHeight;
        const distanceToBottom = scrollHeight - scrollTop - clientHeight;
        if (distanceToBottom < 150 || scrollHeight <= clientHeight) {
          await loadMoreRecordings();
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
                card.style.maxHeight = "0px";
                card.style.marginBottom = "0px";
                card.style.marginTop = "0px";
                card.style.paddingTop = "0px";
                card.style.paddingBottom = "0px";
                card.style.opacity = "0";
                if (isLastInGroup) {
                  group.style.marginBottom = "0px";
                }
                await new Promise((resolve) => setTimeout(resolve, 650));
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
                list.innerHTML = getEmptyStateHTML();
              } else if (hasMoreToLoad) {
                requestAnimationFrame(() => {
                  checkAndLoadMore();
                });
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
          const achievements = new AchievementSystem();
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
          modal2.classList.add("active");
          modal2.classList.remove("hiding");
        }
        function closeModal(modal2) {
          modal2.classList.add("hiding");
          setTimeout(() => {
            modal2.classList.remove("active");
            modal2.classList.remove("hiding");
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
                  list.innerHTML = getEmptyStateHTML();
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
    }
  });
  require_popup();
})();

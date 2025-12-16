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
      async function loadRecordings() {
        const result = await chrome.storage.local.get(["recordings"]);
        const recordings = result.recordings || [];
        const list = document.getElementById("list");
        list.innerHTML = "";
        if (recordings.length === 0) {
          list.innerHTML = '<div style="text-align: center; color: #666; padding: 40px; font-family: monospace;">[NO TAPES FOUND]</div>';
          return;
        }
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
        Object.keys(groups).forEach((dateKey) => {
          const group = groups[dateKey];
          const groupContainer = document.createElement("div");
          groupContainer.className = "recording-group";
          groupContainer.id = `group-${dateKey.replace(/\//g, "-")}`;
          group.items.forEach((item) => {
            const el = createRecordingElement(item, item.originalIndex);
            groupContainer.appendChild(el);
          });
          list.appendChild(groupContainer);
        });
        attachListeners(recordings);
      }
      function createRecordingElement(rec, index) {
        const isVideo = rec.type === "video";
        const date = new Date(rec.timestamp);
        const dateStr = date.toLocaleDateString("zh-CN", { month: "2-digit", day: "2-digit" });
        const timeStr = date.toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit", hour12: false });
        const dateTimeStr = `${dateStr} ${timeStr}`;
        const div = document.createElement("div");
        if (isVideo) {
          div.className = "crt-card";
          const siteName = (rec.site || "VIDEO").toUpperCase();
          const siteLabel = rec.url ? `<a href="${rec.url}" target="_blank" class="site-link" title="Open ${siteName} chat">\u{1F4F9} ${siteName}</a>` : `<span>\u{1F4F9} ${siteName}</span>`;
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
                    <span class="time-display duration">${rec.durationString || "00:00"}</span>
                </div>
                <div class="control-group">
                    <a class="retro-btn" href="${rec.audioData}" download="video_${dateStr.replace("/", "")}_${timeStr.replace(":", "")}.webm" title="Download">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M19 12v7H5v-7H3v7c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2v-7h-2zm-6 .67l2.59-2.58L17 11.5l-5 5-5-5 1.41-1.41L11 12.67V3h2z"/>
                        </svg>
                    </a>
                    <button class="retro-btn copy" data-url="${rec.audioData}" data-type="video" title="Copy to Clipboard">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"/>
                        </svg>
                    </button>
                    <button class="retro-btn delete" data-index="${index}" title="Delete">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/>
                        </svg>
                    </button>
                </div>
            </div>
        `;
        } else {
          div.className = "tape-card";
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
                <audio id="${audioId}" src="${rec.audioData}" style="display:none;"></audio>
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
                    <button class="retro-btn copy" data-url="${rec.audioData}" data-type="audio" title="Copy to Clipboard">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"/>
                        </svg>
                    </button>
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
        document.querySelectorAll(".retro-btn.delete").forEach((btn) => {
          btn.onclick = async (e) => {
            if (!confirm("Eject and destroy tape?")) return;
            const idx = parseInt(e.target.dataset.index);
            recordings.splice(idx, 1);
            await chrome.storage.local.set({ recordings });
            loadRecordings();
          };
        });
        document.querySelectorAll(".play-btn").forEach((btn) => {
          btn.onclick = (e) => {
            const audioId = btn.dataset.id;
            const winId = btn.dataset.win;
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
              btn.innerHTML = '<svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>';
            } else {
              audio.pause();
              tapeWindow.classList.remove("playing");
              btn.innerHTML = '<svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>';
            }
            audio.onended = () => {
              tapeWindow.classList.remove("playing");
              btn.innerHTML = '<svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>';
            };
          };
        });
        document.querySelectorAll(".retro-btn.copy").forEach((btn) => {
          btn.onclick = async (e) => {
            const dataUrl = btn.dataset.url;
            const type = btn.dataset.type;
            const originalHTML = btn.innerHTML;
            try {
              const response = await fetch(dataUrl);
              const blob = await response.blob();
              console.log("Copying blob:", blob.type, blob.size, "bytes");
              await navigator.clipboard.write([
                new ClipboardItem({
                  [blob.type]: blob
                })
              ]);
              btn.classList.add("copied");
              btn.innerHTML = '<svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>';
              setTimeout(() => {
                btn.classList.remove("copied");
                btn.innerHTML = originalHTML;
              }, 1500);
            } catch (err) {
              console.error("Failed to copy:", err);
              btn.innerHTML = '<svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>';
              setTimeout(() => {
                btn.innerHTML = originalHTML;
              }, 1500);
            }
          };
        });
      }
      document.addEventListener("DOMContentLoaded", async () => {
        await loadRecordings();
        setupSettings();
      });
      async function setupSettings() {
        const settingsBtn = document.getElementById("settings-btn");
        const modal = document.getElementById("settings-modal");
        const cancelBtn = document.getElementById("cancel-settings");
        const saveBtn = document.getElementById("save-settings");
        const resetBtn = document.getElementById("reset-settings");
        const promptInput = document.getElementById("prompt-text");
        const videoCodec = document.getElementById("video-codec");
        const videoResolution = document.getElementById("video-resolution");
        const audioSampleRate = document.getElementById("audio-sample-rate");
        const videoBitrate = document.getElementById("video-bitrate");
        const videoFps = document.getElementById("video-fps");
        const videoTimeslice = document.getElementById("video-timeslice");
        const audioBufferSize = document.getElementById("audio-buffer-size");
        async function loadSettings() {
          const result = await chrome.storage.local.get(["settings"]);
          const settings = result.settings || {};
          const defaults = {
            promptText: "Please answer based on this audio",
            video: { codec: "vp9", resolution: "720p", bitrate: 2e3, fps: 30, timeslice: 1e3 },
            audio: { sampleRate: 44100, bufferSize: 4096 }
          };
          const merged = {
            promptText: settings.promptText || defaults.promptText,
            video: { ...defaults.video, ...settings.video || {} },
            audio: { ...defaults.audio, ...settings.audio || {} }
          };
          if (promptInput) promptInput.value = merged.promptText;
          if (videoCodec) videoCodec.value = merged.video.codec;
          if (videoResolution) videoResolution.value = merged.video.resolution;
          if (audioSampleRate) audioSampleRate.value = merged.audio.sampleRate;
        }
        async function saveSettings() {
          const settings = {
            promptText: promptInput.value,
            video: {
              codec: videoCodec.value,
              resolution: videoResolution.value,
              bitrate: parseInt(videoBitrate.value),
              fps: parseInt(videoFps.value),
              timeslice: parseInt(videoTimeslice.value)
            },
            audio: {
              sampleRate: parseInt(audioSampleRate.value),
              bufferSize: parseInt(audioBufferSize.value)
            }
          };
          await chrome.storage.local.set({ settings });
        }
        if (settingsBtn) settingsBtn.onclick = async () => {
          await loadSettings();
          modal.style.display = "block";
        };
        if (cancelBtn) cancelBtn.onclick = () => {
          modal.style.display = "none";
        };
        if (saveBtn) saveBtn.onclick = async () => {
          await saveSettings();
          modal.style.display = "none";
        };
        if (resetBtn) resetBtn.onclick = async () => {
          if (confirm("Reset system?")) {
            await chrome.storage.local.remove(["settings"]);
            await loadSettings();
          }
        };
        window.onclick = (e) => {
          if (e.target == modal) modal.style.display = "none";
        };
      }
    }
  });
  require_popup();
})();

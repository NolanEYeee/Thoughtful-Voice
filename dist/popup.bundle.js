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
          list.innerHTML = '<div class="empty-state">No recordings yet. Go to Gemini or ChatGPT to record.</div>';
          return;
        }
        recordings.forEach((rec, index) => {
          const item = document.createElement("div");
          item.className = "recording-item";
          const date = new Date(rec.timestamp).toLocaleString();
          item.innerHTML = `
            <div class="meta">
                <span class="site-name">${rec.site || "Unknown Site"}</span>
                <span>${date}</span>
                <span>${rec.durationString || ""}</span>
            </div>
            <div class="controls">
                <!-- Audio player will only work if we have the data -->
                ${rec.audioData ? `<audio controls src="${rec.audioData}"></audio>` : '<span style="color:red; font-size:10px;">Audio data missing</span>'}
                <button class="delete-btn" data-index="${index}">Delete</button>
            </div>
        `;
          list.appendChild(item);
        });
        document.querySelectorAll(".delete-btn").forEach((btn) => {
          btn.onclick = async (e) => {
            const idx = parseInt(e.target.dataset.index);
            recordings.splice(idx, 1);
            await chrome.storage.local.set({ recordings });
            loadRecordings();
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
        const videoBitrate = document.getElementById("video-bitrate");
        const bitrateValue = document.getElementById("bitrate-value");
        const videoFps = document.getElementById("video-fps");
        const videoTimeslice = document.getElementById("video-timeslice");
        const audioSampleRate = document.getElementById("audio-sample-rate");
        const audioBufferSize = document.getElementById("audio-buffer-size");
        async function loadSettings() {
          const result = await chrome.storage.local.get(["settings"]);
          const settings = result.settings || {};
          const defaults = {
            promptText: "Please answer based on this audio",
            video: {
              codec: "vp9",
              resolution: "720p",
              bitrate: 2e3,
              fps: 30,
              timeslice: 1e3
            },
            audio: {
              sampleRate: 44100,
              bufferSize: 4096
            }
          };
          const merged = {
            promptText: settings.promptText || defaults.promptText,
            video: { ...defaults.video, ...settings.video || {} },
            audio: { ...defaults.audio, ...settings.audio || {} }
          };
          promptInput.value = merged.promptText;
          videoCodec.value = merged.video.codec;
          videoResolution.value = merged.video.resolution;
          videoBitrate.value = merged.video.bitrate;
          bitrateValue.textContent = merged.video.bitrate;
          videoFps.value = merged.video.fps;
          videoTimeslice.value = merged.video.timeslice;
          audioSampleRate.value = merged.audio.sampleRate;
          audioBufferSize.value = merged.audio.bufferSize;
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
        async function resetSettings() {
          await chrome.storage.local.remove(["settings"]);
          await loadSettings();
        }
        videoBitrate.oninput = () => {
          bitrateValue.textContent = videoBitrate.value;
        };
        settingsBtn.onclick = async () => {
          await loadSettings();
          modal.style.display = "block";
        };
        cancelBtn.onclick = () => {
          modal.style.display = "none";
        };
        saveBtn.onclick = async () => {
          await saveSettings();
          modal.style.display = "none";
          console.log("Settings saved successfully");
        };
        resetBtn.onclick = async () => {
          if (confirm("Reset all settings to defaults?")) {
            await resetSettings();
            console.log("Settings reset to defaults");
          }
        };
        window.onclick = (event) => {
          if (event.target == modal) {
            modal.style.display = "none";
          }
        };
      }
    }
  });
  require_popup();
})();

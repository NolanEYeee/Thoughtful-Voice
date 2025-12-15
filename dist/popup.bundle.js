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
                <span>${rec.site || "Unknown Site"}</span>
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
      document.addEventListener("DOMContentLoaded", loadRecordings);
    }
  });
  require_popup();
})();

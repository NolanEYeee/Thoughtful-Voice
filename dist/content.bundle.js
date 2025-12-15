(() => {
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __esm = (fn, res) => function __init() {
    return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
  };
  var __commonJS = (cb, mod) => function __require() {
    return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
  };

  // src/content/recorder.js
  var Recorder;
  var init_recorder = __esm({
    "src/content/recorder.js"() {
      Recorder = class {
        constructor() {
          this.mediaRecorder = null;
          this.audioChunks = [];
          this.stream = null;
          this.startTime = 0;
          this.timerInterval = null;
          this.onTimerUpdate = null;
        }
        async start(onTimerUpdate) {
          this.onTimerUpdate = onTimerUpdate;
          this.audioChunks = [];
          try {
            this.stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            this.mediaRecorder = new MediaRecorder(this.stream);
            this.mediaRecorder.ondataavailable = (event) => {
              if (event.data.size > 0) {
                this.audioChunks.push(event.data);
              }
            };
            this.mediaRecorder.start();
            this.startTime = Date.now();
            this.startTimer();
            console.log("Recording started");
            return true;
          } catch (error) {
            console.error("Error starting recording:", error);
            alert("Could not access microphone. Please check permissions.");
            return false;
          }
        }
        stop() {
          return new Promise((resolve) => {
            if (!this.mediaRecorder) {
              resolve(null);
              return;
            }
            this.mediaRecorder.onstop = () => {
              const audioBlob = new Blob(this.audioChunks, { type: "audio/webm" });
              this.stopTimer();
              this.stream.getTracks().forEach((track) => track.stop());
              this.stream = null;
              this.mediaRecorder = null;
              console.log("Recording stopped, blob size:", audioBlob.size);
              resolve({
                blob: audioBlob,
                duration: Date.now() - this.startTime
              });
            };
            this.mediaRecorder.stop();
          });
        }
        startTimer() {
          this.stopTimer();
          this.timerInterval = setInterval(() => {
            const elapsed = Date.now() - this.startTime;
            const seconds = Math.floor(elapsed / 1e3);
            const m = Math.floor(seconds / 60).toString().padStart(2, "0");
            const s = (seconds % 60).toString().padStart(2, "0");
            if (this.onTimerUpdate) this.onTimerUpdate(`${m}:${s}`);
          }, 1e3);
        }
        stopTimer() {
          if (this.timerInterval) {
            clearInterval(this.timerInterval);
            this.timerInterval = null;
          }
        }
      };
    }
  });

  // src/content/injector.js
  var Injector;
  var init_injector = __esm({
    "src/content/injector.js"() {
      Injector = class {
        constructor(recorder, handleUpload) {
          this.recorder = recorder;
          this.handleUpload = handleUpload;
          this.button = null;
          this.isRecording = false;
        }
        createButton() {
          const btn = document.createElement("button");
          btn.id = "ai-voice-uploader-btn";
          btn.innerHTML = "\u{1F399}\uFE0F";
          btn.className = "ai-voice-btn";
          btn.title = "Hold to record (or click to toggle)";
          btn.onclick = async () => {
            if (this.isRecording) {
              await this.stopRecording();
            } else {
              await this.startRecording();
            }
          };
          this.button = btn;
          return btn;
        }
        async startRecording() {
          const started = await this.recorder.start((time) => {
            if (this.button) {
              this.button.innerHTML = `\u{1F534} ${time}`;
            }
          });
          if (started) {
            this.isRecording = true;
            this.button.classList.add("recording");
            this.button.innerHTML = "\u{1F534} 00:00";
          }
        }
        async stopRecording() {
          this.isRecording = false;
          this.button.classList.remove("recording");
          this.button.innerHTML = "\u23F3";
          const result = await this.recorder.stop();
          this.button.innerHTML = "\u{1F399}\uFE0F";
          if (result) {
            console.log("Audio recorded:", result);
            await this.handleUpload(result.blob, result.duration);
          }
        }
        inject(targetContainer) {
          if (!this.button) this.createButton();
          if (document.getElementById("ai-voice-uploader-btn")) return;
          if (targetContainer) {
            targetContainer.appendChild(this.button);
          } else {
            document.body.appendChild(this.button);
            this.button.style.position = "fixed";
            this.button.style.bottom = "100px";
            this.button.style.right = "20px";
            this.button.style.zIndex = "9999";
          }
          console.log("Button injected");
        }
      };
    }
  });

  // src/content/storage.js
  var StorageHelper;
  var init_storage = __esm({
    "src/content/storage.js"() {
      StorageHelper = class {
        static blobToBase64(blob) {
          return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsDataURL(blob);
          });
        }
        static async saveRecording(metadata, blob) {
          try {
            if (blob) {
              metadata.audioData = await this.blobToBase64(blob);
            }
            const result = await chrome.storage.local.get(["recordings"]);
            const recordings = result.recordings || [];
            if (recordings.length >= 20) {
              recordings.pop();
            }
            recordings.unshift(metadata);
            await chrome.storage.local.set({ recordings });
            console.log("Recording saved to storage");
          } catch (e) {
            console.error("Failed to save recording", e);
          }
        }
        static async getRecordings() {
          try {
            const result = await chrome.storage.local.get(["recordings"]);
            return result.recordings || [];
          } catch (e) {
            console.error("Failed to get recordings", e);
            return [];
          }
        }
        static async isExtensionRecording(filename) {
          return filename.startsWith("audio_recording_");
        }
      };
    }
  });

  // src/content/bubble.js
  var BubbleRenderer;
  var init_bubble = __esm({
    "src/content/bubble.js"() {
      init_storage();
      BubbleRenderer = class {
        constructor() {
          this.observer = null;
        }
        init() {
          this.observer = new MutationObserver((mutations) => {
            for (const mutation of mutations) {
              if (mutation.addedNodes.length) {
                this.scanAndEnhance(mutation.target);
              }
            }
          });
          this.observer.observe(document.body, {
            childList: true,
            subtree: true
          });
          this.scanAndEnhance(document.body);
        }
        async scanAndEnhance(root) {
          const potentialAudioElements = root.querySelectorAll('audio, .audio-player, [data-file-type="audio"]');
        }
        // Note: Writing a robust "replacer" without seeing the DOM is dangerous.
        // I will implement a "Highlighter" that finds our specific filenames
        // and adds a class we can style.
        checkForOurFiles() {
          const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
          let node;
          while (node = walker.nextNode()) {
            if (node.nodeValue.includes("audio_recording_") && node.nodeValue.includes(".wav")) {
              const container = node.parentElement;
              if (container.dataset.aiVoiceProcessed) return;
              container.dataset.aiVoiceProcessed = "true";
              container.classList.add("ai-voice-bubble-container");
              this.renderCustomBubble(container, node.nodeValue);
            }
          }
        }
        renderCustomBubble(container, filename) {
        }
      };
    }
  });

  // src/content/strategies/gemini.js
  var GeminiStrategy;
  var init_gemini = __esm({
    "src/content/strategies/gemini.js"() {
      GeminiStrategy = class {
        constructor() {
          this.name = "Gemini";
        }
        async waitForDOM() {
          return new Promise((resolve) => {
            const check = () => {
              if (document.querySelector(".upload-card-button") || document.querySelector('[role="textbox"]')) {
                resolve();
              } else {
                setTimeout(check, 500);
              }
            };
            check();
          });
        }
        getInjectionTarget() {
          const uploadButton = document.querySelector(".upload-card-button");
          if (uploadButton && uploadButton.parentElement) {
            return uploadButton.parentElement;
          }
          const micButton = document.querySelector(".speech_dictation_mic_button");
          if (micButton && micButton.parentElement) {
            return micButton.parentElement;
          }
          const inputArea = document.querySelector('[role="textbox"]');
          if (inputArea && inputArea.parentElement) {
            return inputArea.parentElement.parentElement || document.body;
          }
          return null;
        }
        async handleUpload(blob, durationString) {
          console.log("GeminiStrategy: Handling upload via Clipboard Paste (Alternative Method)");
          const file = new File([blob], `audio_recording_${Date.now()}.webm`, { type: "audio/webm" });
          const textBox = document.querySelector('[role="textbox"]');
          if (!textBox) {
            console.warn("Gemini Input (textbox) not found for paste. Falling back to Drag and Drop.");
            await this.performDragAndDrop(file);
            return;
          }
          try {
            const dataTransfer = new DataTransfer();
            dataTransfer.items.add(file);
            const pasteEvent = new ClipboardEvent("paste", {
              bubbles: true,
              cancelable: true,
              formattedInputValue: "",
              // Legacy/React stuff might check this
              clipboardData: dataTransfer
            });
            textBox.focus();
            textBox.dispatchEvent(pasteEvent);
            console.log("GeminiStrategy: Paste event dispatched");
            this.insertText();
          } catch (e) {
            console.error("Paste failed, falling back to Drag and Drop.", e);
            await this.performDragAndDrop(file);
          }
        }
        insertText() {
          const textBox = document.querySelector('[role="textbox"]');
          if (textBox) {
            textBox.focus();
            const textToInsert = "Please answer based on this audio";
            document.execCommand("insertText", false, textToInsert) || (textBox.innerText += textToInsert);
          }
        }
        async performDragAndDrop(file) {
          const dropZone = document.querySelector('[role="textbox"]');
          if (!dropZone) {
            console.warn("GeminiStrategy: No textbox found for Drag and Drop fallback. Attempting to drop on body.");
            const bodyDropZone = document.body;
            if (!bodyDropZone) return;
            const dataTransfer = new DataTransfer();
            dataTransfer.items.add(file);
            const createEvent = (type) => new DragEvent(type, {
              bubbles: true,
              cancelable: true,
              composed: true,
              view: window,
              dataTransfer
            });
            bodyDropZone.dispatchEvent(createEvent("dragenter"));
            await new Promise((r) => setTimeout(r, 50));
            bodyDropZone.dispatchEvent(createEvent("dragover"));
            await new Promise((r) => setTimeout(r, 50));
            bodyDropZone.dispatchEvent(createEvent("drop"));
            console.log("GeminiStrategy: Drag and Drop performed on body.");
          } else {
            const dataTransfer = new DataTransfer();
            dataTransfer.items.add(file);
            const createEvent = (type) => new DragEvent(type, {
              bubbles: true,
              cancelable: true,
              composed: true,
              view: window,
              dataTransfer
            });
            dropZone.dispatchEvent(createEvent("dragenter"));
            await new Promise((r) => setTimeout(r, 50));
            dropZone.dispatchEvent(createEvent("dragover"));
            await new Promise((r) => setTimeout(r, 50));
            dropZone.dispatchEvent(createEvent("drop"));
            console.log("GeminiStrategy: Drag and Drop performed on textbox.");
          }
          this.insertText();
        }
      };
    }
  });

  // src/content/main.js
  var require_main = __commonJS({
    "src/content/main.js"() {
      init_recorder();
      init_injector();
      init_bubble();
      init_storage();
      init_gemini();
      console.log("AI Voice Uploader: Content script loaded");
      async function init() {
        const host = window.location.hostname;
        let strategy = null;
        if (host.includes("gemini.google.com")) {
          strategy = new GeminiStrategy();
        } else if (host.includes("openai.com")) {
          console.log("ChatGPT support postponed");
          return;
        }
        if (!strategy) {
          console.log("AI Voice Uploader: Unknown platform");
          return;
        }
        console.log(`AI Voice Uploader: Using ${strategy.name}`);
        await strategy.waitForDOM();
        const bubbleRenderer = new BubbleRenderer();
        bubbleRenderer.init();
        const recorder = new Recorder();
        const injector = new Injector(recorder, async (blob, duration) => {
          await strategy.handleUpload(blob, duration);
          const seconds = Math.floor(duration / 1e3);
          const m = Math.floor(seconds / 60).toString().padStart(2, "0");
          const s = (seconds % 60).toString().padStart(2, "0");
          await StorageHelper.saveRecording({
            timestamp: Date.now(),
            site: "Gemini",
            durationString: `${m}:${s}`,
            filename: `audio_recording_${Date.now()}.webm`
          }, blob);
        });
        const target = strategy.getInjectionTarget();
        injector.inject(target);
        const observer = new MutationObserver(() => {
          const newTarget = strategy.getInjectionTarget();
          if (newTarget && !document.getElementById("ai-voice-uploader-btn")) {
            injector.inject(newTarget);
          }
        });
        observer.observe(document.body, { childList: true, subtree: true });
      }
      setTimeout(init, 2e3);
    }
  });
  require_main();
})();

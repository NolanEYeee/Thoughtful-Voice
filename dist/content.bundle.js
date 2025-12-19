(() => {
  var __create = Object.create;
  var __defProp = Object.defineProperty;
  var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __getProtoOf = Object.getPrototypeOf;
  var __hasOwnProp = Object.prototype.hasOwnProperty;
  var __esm = (fn, res) => function __init() {
    return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
  };
  var __commonJS = (cb, mod) => function __require() {
    return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
  };
  var __copyProps = (to, from, except, desc) => {
    if (from && typeof from === "object" || typeof from === "function") {
      for (let key of __getOwnPropNames(from))
        if (!__hasOwnProp.call(to, key) && key !== except)
          __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
    }
    return to;
  };
  var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
    // If the importer is in node compatibility mode or this is not an ESM
    // file that has been converted to a CommonJS file using a Babel-
    // compatible transform (i.e. "__esModule" has not been set), then set
    // "default" to the CommonJS "module.exports" for node compatibility.
    isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
    mod
  ));

  // src/content/recorder.js
  var Recorder;
  var init_recorder = __esm({
    "src/content/recorder.js"() {
      Recorder = class {
        constructor() {
          this.audioContext = null;
          this.mediaStreamSource = null;
          this.recorder = null;
          this.audioBuffers = [];
          this.stream = null;
          this.startTime = 0;
          this.pausedTime = 0;
          this.pauseStartTime = 0;
          this.timerInterval = null;
          this.onTimerUpdate = null;
          this.isPaused = false;
        }
        async start(onTimerUpdate) {
          this.onTimerUpdate = onTimerUpdate;
          this.audioBuffers = [];
          this.pausedTime = 0;
          this.isPaused = false;
          try {
            const result = await chrome.storage.local.get(["settings"]);
            const settings = result.settings || {};
            const audioSettings = {
              sampleRate: 44100,
              bufferSize: 4096,
              ...settings.audio || {}
            };
            console.log("Audio settings:", audioSettings);
            this.stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)({
              sampleRate: audioSettings.sampleRate
            });
            this.mediaStreamSource = this.audioContext.createMediaStreamSource(this.stream);
            this.recorder = this.audioContext.createScriptProcessor(
              audioSettings.bufferSize,
              1,
              // inputChannels
              1
              // outputChannels
            );
            this.recorder.onaudioprocess = (e) => {
              if (!this.isPaused) {
                const input = e.inputBuffer.getChannelData(0);
                this.audioBuffers.push(new Float32Array(input));
              }
            };
            this.mediaStreamSource.connect(this.recorder);
            this.recorder.connect(this.audioContext.destination);
            this.startTime = Date.now();
            this.startTimer();
            console.log(`WAV Recording started: ${audioSettings.sampleRate}Hz, buffer ${audioSettings.bufferSize}`);
            return true;
          } catch (error) {
            console.error("Error starting recording:", error);
            alert("Could not access microphone. Please check permissions.");
            return false;
          }
        }
        /**
         * Pause the recording
         */
        pause() {
          if (this.isPaused || !this.recorder) return false;
          this.isPaused = true;
          this.pauseStartTime = Date.now();
          console.log("Recording paused");
          return true;
        }
        /**
         * Resume the recording after pause
         */
        resume() {
          if (!this.isPaused || !this.recorder) return false;
          this.isPaused = false;
          this.pausedTime += Date.now() - this.pauseStartTime;
          console.log("Recording resumed");
          return true;
        }
        /**
         * Check if recording is currently paused
         */
        get paused() {
          return this.isPaused;
        }
        stop() {
          return new Promise(async (resolve) => {
            if (!this.recorder || !this.audioContext) {
              resolve(null);
              return;
            }
            if (this.isPaused) {
              this.pausedTime += Date.now() - this.pauseStartTime;
            }
            this.recorder.disconnect();
            this.mediaStreamSource.disconnect();
            this.stopTimer();
            this.stream.getTracks().forEach((track) => track.stop());
            this.stream = null;
            const blob = this.exportWAV(this.audioBuffers, this.audioContext.sampleRate);
            const totalElapsed = Date.now() - this.startTime;
            const actualDuration = totalElapsed - this.pausedTime;
            if (this.audioContext.state !== "closed") {
              await this.audioContext.close();
            }
            this.recorder = null;
            this.audioContext = null;
            this.isPaused = false;
            console.log("Recording stopped, WAV blob size:", blob.size);
            console.log(`Total time: ${totalElapsed}ms, Paused: ${this.pausedTime}ms, Actual: ${actualDuration}ms`);
            resolve({
              blob,
              duration: actualDuration
            });
          });
        }
        startTimer() {
          this.stopTimer();
          this.timerInterval = setInterval(() => {
            let elapsed;
            if (this.isPaused) {
              elapsed = this.pauseStartTime - this.startTime - this.pausedTime;
            } else {
              elapsed = Date.now() - this.startTime - this.pausedTime;
            }
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
        // --- WAV Encoding Helpers ---
        mergeBuffers(buffers, length) {
          const result = new Float32Array(length);
          let offset = 0;
          for (const buffer of buffers) {
            result.set(buffer, offset);
            offset += buffer.length;
          }
          return result;
        }
        exportWAV(buffers, sampleRate) {
          const totalLength = buffers.reduce((acc, b) => acc + b.length, 0);
          const mergedBuffers = this.mergeBuffers(buffers, totalLength);
          const buffer = new ArrayBuffer(44 + mergedBuffers.length * 2);
          const view = new DataView(buffer);
          this.writeString(view, 0, "RIFF");
          view.setUint32(4, 36 + mergedBuffers.length * 2, true);
          this.writeString(view, 8, "WAVE");
          this.writeString(view, 12, "fmt ");
          view.setUint32(16, 16, true);
          view.setUint16(20, 1, true);
          view.setUint16(22, 1, true);
          view.setUint32(24, sampleRate, true);
          view.setUint32(28, sampleRate * 2, true);
          view.setUint16(32, 2, true);
          view.setUint16(34, 16, true);
          this.writeString(view, 36, "data");
          view.setUint32(40, mergedBuffers.length * 2, true);
          this.floatTo16BitPCM(view, 44, mergedBuffers);
          return new Blob([view], { type: "audio/wav" });
        }
        writeString(view, offset, string) {
          for (let i = 0; i < string.length; i++) {
            view.setUint8(offset + i, string.charCodeAt(i));
          }
        }
        floatTo16BitPCM(output, offset, input) {
          for (let i = 0; i < input.length; i++, offset += 2) {
            let s = Math.max(-1, Math.min(1, input[i]));
            s = s < 0 ? s * 32768 : s * 32767;
            output.setInt16(offset, s, true);
          }
        }
      };
    }
  });

  // node_modules/fix-webm-duration/fix-webm-duration.js
  var require_fix_webm_duration = __commonJS({
    "node_modules/fix-webm-duration/fix-webm-duration.js"(exports, module) {
      (function(name, definition) {
        if (typeof define === "function" && define.amd) {
          define(definition);
        } else if (typeof module !== "undefined" && module.exports) {
          module.exports = definition();
        } else {
          window.ysFixWebmDuration = definition();
        }
      })("fix-webm-duration", function() {
        var sections = {
          172351395: { name: "EBML", type: "Container" },
          646: { name: "EBMLVersion", type: "Uint" },
          759: { name: "EBMLReadVersion", type: "Uint" },
          754: { name: "EBMLMaxIDLength", type: "Uint" },
          755: { name: "EBMLMaxSizeLength", type: "Uint" },
          642: { name: "DocType", type: "String" },
          647: { name: "DocTypeVersion", type: "Uint" },
          645: { name: "DocTypeReadVersion", type: "Uint" },
          108: { name: "Void", type: "Binary" },
          63: { name: "CRC-32", type: "Binary" },
          190023271: { name: "SignatureSlot", type: "Container" },
          16010: { name: "SignatureAlgo", type: "Uint" },
          16026: { name: "SignatureHash", type: "Uint" },
          16037: { name: "SignaturePublicKey", type: "Binary" },
          16053: { name: "Signature", type: "Binary" },
          15963: { name: "SignatureElements", type: "Container" },
          15995: { name: "SignatureElementList", type: "Container" },
          9522: { name: "SignedElement", type: "Binary" },
          139690087: { name: "Segment", type: "Container" },
          21863284: { name: "SeekHead", type: "Container" },
          3515: { name: "Seek", type: "Container" },
          5035: { name: "SeekID", type: "Binary" },
          5036: { name: "SeekPosition", type: "Uint" },
          88713574: { name: "Info", type: "Container" },
          13220: { name: "SegmentUID", type: "Binary" },
          13188: { name: "SegmentFilename", type: "String" },
          1882403: { name: "PrevUID", type: "Binary" },
          1868715: { name: "PrevFilename", type: "String" },
          2013475: { name: "NextUID", type: "Binary" },
          1999803: { name: "NextFilename", type: "String" },
          1092: { name: "SegmentFamily", type: "Binary" },
          10532: { name: "ChapterTranslate", type: "Container" },
          10748: { name: "ChapterTranslateEditionUID", type: "Uint" },
          10687: { name: "ChapterTranslateCodec", type: "Uint" },
          10661: { name: "ChapterTranslateID", type: "Binary" },
          710577: { name: "TimecodeScale", type: "Uint" },
          1161: { name: "Duration", type: "Float" },
          1121: { name: "DateUTC", type: "Date" },
          15273: { name: "Title", type: "String" },
          3456: { name: "MuxingApp", type: "String" },
          5953: { name: "WritingApp", type: "String" },
          // 0xf43b675: { name: 'Cluster', type: 'Container' },
          103: { name: "Timecode", type: "Uint" },
          6228: { name: "SilentTracks", type: "Container" },
          6359: { name: "SilentTrackNumber", type: "Uint" },
          39: { name: "Position", type: "Uint" },
          43: { name: "PrevSize", type: "Uint" },
          35: { name: "SimpleBlock", type: "Binary" },
          32: { name: "BlockGroup", type: "Container" },
          33: { name: "Block", type: "Binary" },
          34: { name: "BlockVirtual", type: "Binary" },
          13729: { name: "BlockAdditions", type: "Container" },
          38: { name: "BlockMore", type: "Container" },
          110: { name: "BlockAddID", type: "Uint" },
          37: { name: "BlockAdditional", type: "Binary" },
          27: { name: "BlockDuration", type: "Uint" },
          122: { name: "ReferencePriority", type: "Uint" },
          123: { name: "ReferenceBlock", type: "Int" },
          125: { name: "ReferenceVirtual", type: "Int" },
          36: { name: "CodecState", type: "Binary" },
          13730: { name: "DiscardPadding", type: "Int" },
          14: { name: "Slices", type: "Container" },
          104: { name: "TimeSlice", type: "Container" },
          76: { name: "LaceNumber", type: "Uint" },
          77: { name: "FrameNumber", type: "Uint" },
          75: { name: "BlockAdditionID", type: "Uint" },
          78: { name: "Delay", type: "Uint" },
          79: { name: "SliceDuration", type: "Uint" },
          72: { name: "ReferenceFrame", type: "Container" },
          73: { name: "ReferenceOffset", type: "Uint" },
          74: { name: "ReferenceTimeCode", type: "Uint" },
          47: { name: "EncryptedBlock", type: "Binary" },
          106212971: { name: "Tracks", type: "Container" },
          46: { name: "TrackEntry", type: "Container" },
          87: { name: "TrackNumber", type: "Uint" },
          13253: { name: "TrackUID", type: "Uint" },
          3: { name: "TrackType", type: "Uint" },
          57: { name: "FlagEnabled", type: "Uint" },
          8: { name: "FlagDefault", type: "Uint" },
          5546: { name: "FlagForced", type: "Uint" },
          28: { name: "FlagLacing", type: "Uint" },
          11751: { name: "MinCache", type: "Uint" },
          11768: { name: "MaxCache", type: "Uint" },
          254851: { name: "DefaultDuration", type: "Uint" },
          216698: { name: "DefaultDecodedFieldDuration", type: "Uint" },
          209231: { name: "TrackTimecodeScale", type: "Float" },
          4991: { name: "TrackOffset", type: "Int" },
          5614: { name: "MaxBlockAdditionID", type: "Uint" },
          4974: { name: "Name", type: "String" },
          177564: { name: "Language", type: "String" },
          6: { name: "CodecID", type: "String" },
          9122: { name: "CodecPrivate", type: "Binary" },
          362120: { name: "CodecName", type: "String" },
          13382: { name: "AttachmentLink", type: "Uint" },
          1742487: { name: "CodecSettings", type: "String" },
          1785920: { name: "CodecInfoURL", type: "String" },
          438848: { name: "CodecDownloadURL", type: "String" },
          42: { name: "CodecDecodeAll", type: "Uint" },
          12203: { name: "TrackOverlay", type: "Uint" },
          5802: { name: "CodecDelay", type: "Uint" },
          5819: { name: "SeekPreRoll", type: "Uint" },
          9764: { name: "TrackTranslate", type: "Container" },
          9980: { name: "TrackTranslateEditionUID", type: "Uint" },
          9919: { name: "TrackTranslateCodec", type: "Uint" },
          9893: { name: "TrackTranslateTrackID", type: "Binary" },
          96: { name: "Video", type: "Container" },
          26: { name: "FlagInterlaced", type: "Uint" },
          5048: { name: "StereoMode", type: "Uint" },
          5056: { name: "AlphaMode", type: "Uint" },
          5049: { name: "OldStereoMode", type: "Uint" },
          48: { name: "PixelWidth", type: "Uint" },
          58: { name: "PixelHeight", type: "Uint" },
          5290: { name: "PixelCropBottom", type: "Uint" },
          5307: { name: "PixelCropTop", type: "Uint" },
          5324: { name: "PixelCropLeft", type: "Uint" },
          5341: { name: "PixelCropRight", type: "Uint" },
          5296: { name: "DisplayWidth", type: "Uint" },
          5306: { name: "DisplayHeight", type: "Uint" },
          5298: { name: "DisplayUnit", type: "Uint" },
          5299: { name: "AspectRatioType", type: "Uint" },
          963876: { name: "ColourSpace", type: "Binary" },
          1029411: { name: "GammaValue", type: "Float" },
          230371: { name: "FrameRate", type: "Float" },
          97: { name: "Audio", type: "Container" },
          53: { name: "SamplingFrequency", type: "Float" },
          14517: { name: "OutputSamplingFrequency", type: "Float" },
          31: { name: "Channels", type: "Uint" },
          15739: { name: "ChannelPositions", type: "Binary" },
          8804: { name: "BitDepth", type: "Uint" },
          98: { name: "TrackOperation", type: "Container" },
          99: { name: "TrackCombinePlanes", type: "Container" },
          100: { name: "TrackPlane", type: "Container" },
          101: { name: "TrackPlaneUID", type: "Uint" },
          102: { name: "TrackPlaneType", type: "Uint" },
          105: { name: "TrackJoinBlocks", type: "Container" },
          109: { name: "TrackJoinUID", type: "Uint" },
          64: { name: "TrickTrackUID", type: "Uint" },
          65: { name: "TrickTrackSegmentUID", type: "Binary" },
          70: { name: "TrickTrackFlag", type: "Uint" },
          71: { name: "TrickMasterTrackUID", type: "Uint" },
          68: { name: "TrickMasterTrackSegmentUID", type: "Binary" },
          11648: { name: "ContentEncodings", type: "Container" },
          8768: { name: "ContentEncoding", type: "Container" },
          4145: { name: "ContentEncodingOrder", type: "Uint" },
          4146: { name: "ContentEncodingScope", type: "Uint" },
          4147: { name: "ContentEncodingType", type: "Uint" },
          4148: { name: "ContentCompression", type: "Container" },
          596: { name: "ContentCompAlgo", type: "Uint" },
          597: { name: "ContentCompSettings", type: "Binary" },
          4149: { name: "ContentEncryption", type: "Container" },
          2017: { name: "ContentEncAlgo", type: "Uint" },
          2018: { name: "ContentEncKeyID", type: "Binary" },
          2019: { name: "ContentSignature", type: "Binary" },
          2020: { name: "ContentSigKeyID", type: "Binary" },
          2021: { name: "ContentSigAlgo", type: "Uint" },
          2022: { name: "ContentSigHashAlgo", type: "Uint" },
          206814059: { name: "Cues", type: "Container" },
          59: { name: "CuePoint", type: "Container" },
          51: { name: "CueTime", type: "Uint" },
          55: { name: "CueTrackPositions", type: "Container" },
          119: { name: "CueTrack", type: "Uint" },
          113: { name: "CueClusterPosition", type: "Uint" },
          112: { name: "CueRelativePosition", type: "Uint" },
          50: { name: "CueDuration", type: "Uint" },
          4984: { name: "CueBlockNumber", type: "Uint" },
          106: { name: "CueCodecState", type: "Uint" },
          91: { name: "CueReference", type: "Container" },
          22: { name: "CueRefTime", type: "Uint" },
          23: { name: "CueRefCluster", type: "Uint" },
          4959: { name: "CueRefNumber", type: "Uint" },
          107: { name: "CueRefCodecState", type: "Uint" },
          155296873: { name: "Attachments", type: "Container" },
          8615: { name: "AttachedFile", type: "Container" },
          1662: { name: "FileDescription", type: "String" },
          1646: { name: "FileName", type: "String" },
          1632: { name: "FileMimeType", type: "String" },
          1628: { name: "FileData", type: "Binary" },
          1710: { name: "FileUID", type: "Uint" },
          1653: { name: "FileReferral", type: "Binary" },
          1633: { name: "FileUsedStartTime", type: "Uint" },
          1634: { name: "FileUsedEndTime", type: "Uint" },
          4433776: { name: "Chapters", type: "Container" },
          1465: { name: "EditionEntry", type: "Container" },
          1468: { name: "EditionUID", type: "Uint" },
          1469: { name: "EditionFlagHidden", type: "Uint" },
          1499: { name: "EditionFlagDefault", type: "Uint" },
          1501: { name: "EditionFlagOrdered", type: "Uint" },
          54: { name: "ChapterAtom", type: "Container" },
          13252: { name: "ChapterUID", type: "Uint" },
          5716: { name: "ChapterStringUID", type: "String" },
          17: { name: "ChapterTimeStart", type: "Uint" },
          18: { name: "ChapterTimeEnd", type: "Uint" },
          24: { name: "ChapterFlagHidden", type: "Uint" },
          1432: { name: "ChapterFlagEnabled", type: "Uint" },
          11879: { name: "ChapterSegmentUID", type: "Binary" },
          11964: { name: "ChapterSegmentEditionUID", type: "Uint" },
          9155: { name: "ChapterPhysicalEquiv", type: "Uint" },
          15: { name: "ChapterTrack", type: "Container" },
          9: { name: "ChapterTrackNumber", type: "Uint" },
          0: { name: "ChapterDisplay", type: "Container" },
          5: { name: "ChapString", type: "String" },
          892: { name: "ChapLanguage", type: "String" },
          894: { name: "ChapCountry", type: "String" },
          10564: { name: "ChapProcess", type: "Container" },
          10581: { name: "ChapProcessCodecID", type: "Uint" },
          1293: { name: "ChapProcessPrivate", type: "Binary" },
          10513: { name: "ChapProcessCommand", type: "Container" },
          10530: { name: "ChapProcessTime", type: "Uint" },
          10547: { name: "ChapProcessData", type: "Binary" },
          39109479: { name: "Tags", type: "Container" },
          13171: { name: "Tag", type: "Container" },
          9152: { name: "Targets", type: "Container" },
          10442: { name: "TargetTypeValue", type: "Uint" },
          9162: { name: "TargetType", type: "String" },
          9157: { name: "TagTrackUID", type: "Uint" },
          9161: { name: "TagEditionUID", type: "Uint" },
          9156: { name: "TagChapterUID", type: "Uint" },
          9158: { name: "TagAttachmentUID", type: "Uint" },
          10184: { name: "SimpleTag", type: "Container" },
          1443: { name: "TagName", type: "String" },
          1146: { name: "TagLanguage", type: "String" },
          1156: { name: "TagDefault", type: "Uint" },
          1159: { name: "TagString", type: "String" },
          1157: { name: "TagBinary", type: "Binary" }
        };
        function doInherit(newClass, baseClass) {
          newClass.prototype = Object.create(baseClass.prototype);
          newClass.prototype.constructor = newClass;
        }
        function WebmBase(name, type) {
          this.name = name || "Unknown";
          this.type = type || "Unknown";
        }
        WebmBase.prototype.updateBySource = function() {
        };
        WebmBase.prototype.setSource = function(source) {
          this.source = source;
          this.updateBySource();
        };
        WebmBase.prototype.updateByData = function() {
        };
        WebmBase.prototype.setData = function(data) {
          this.data = data;
          this.updateByData();
        };
        function WebmUint(name, type) {
          WebmBase.call(this, name, type || "Uint");
        }
        doInherit(WebmUint, WebmBase);
        function padHex(hex) {
          return hex.length % 2 === 1 ? "0" + hex : hex;
        }
        WebmUint.prototype.updateBySource = function() {
          this.data = "";
          for (var i = 0; i < this.source.length; i++) {
            var hex = this.source[i].toString(16);
            this.data += padHex(hex);
          }
        };
        WebmUint.prototype.updateByData = function() {
          var length = this.data.length / 2;
          this.source = new Uint8Array(length);
          for (var i = 0; i < length; i++) {
            var hex = this.data.substr(i * 2, 2);
            this.source[i] = parseInt(hex, 16);
          }
        };
        WebmUint.prototype.getValue = function() {
          return parseInt(this.data, 16);
        };
        WebmUint.prototype.setValue = function(value) {
          this.setData(padHex(value.toString(16)));
        };
        function WebmFloat(name, type) {
          WebmBase.call(this, name, type || "Float");
        }
        doInherit(WebmFloat, WebmBase);
        WebmFloat.prototype.getFloatArrayType = function() {
          return this.source && this.source.length === 4 ? Float32Array : Float64Array;
        };
        WebmFloat.prototype.updateBySource = function() {
          var byteArray = this.source.reverse();
          var floatArrayType = this.getFloatArrayType();
          var floatArray = new floatArrayType(byteArray.buffer);
          this.data = floatArray[0];
        };
        WebmFloat.prototype.updateByData = function() {
          var floatArrayType = this.getFloatArrayType();
          var floatArray = new floatArrayType([this.data]);
          var byteArray = new Uint8Array(floatArray.buffer);
          this.source = byteArray.reverse();
        };
        WebmFloat.prototype.getValue = function() {
          return this.data;
        };
        WebmFloat.prototype.setValue = function(value) {
          this.setData(value);
        };
        function WebmContainer(name, type) {
          WebmBase.call(this, name, type || "Container");
        }
        doInherit(WebmContainer, WebmBase);
        WebmContainer.prototype.readByte = function() {
          return this.source[this.offset++];
        };
        WebmContainer.prototype.readUint = function() {
          var firstByte = this.readByte();
          var bytes = 8 - firstByte.toString(2).length;
          var value = firstByte - (1 << 7 - bytes);
          for (var i = 0; i < bytes; i++) {
            value *= 256;
            value += this.readByte();
          }
          return value;
        };
        WebmContainer.prototype.updateBySource = function() {
          this.data = [];
          for (this.offset = 0; this.offset < this.source.length; this.offset = end) {
            var id = this.readUint();
            var len = this.readUint();
            var end = Math.min(this.offset + len, this.source.length);
            var data = this.source.slice(this.offset, end);
            var info = sections[id] || { name: "Unknown", type: "Unknown" };
            var ctr = WebmBase;
            switch (info.type) {
              case "Container":
                ctr = WebmContainer;
                break;
              case "Uint":
                ctr = WebmUint;
                break;
              case "Float":
                ctr = WebmFloat;
                break;
            }
            var section = new ctr(info.name, info.type);
            section.setSource(data);
            this.data.push({
              id,
              idHex: id.toString(16),
              data: section
            });
          }
        };
        WebmContainer.prototype.writeUint = function(x, draft) {
          for (var bytes = 1, flag = 128; x >= flag && bytes < 8; bytes++, flag *= 128) {
          }
          if (!draft) {
            var value = flag + x;
            for (var i = bytes - 1; i >= 0; i--) {
              var c = value % 256;
              this.source[this.offset + i] = c;
              value = (value - c) / 256;
            }
          }
          this.offset += bytes;
        };
        WebmContainer.prototype.writeSections = function(draft) {
          this.offset = 0;
          for (var i = 0; i < this.data.length; i++) {
            var section = this.data[i], content = section.data.source, contentLength = content.length;
            this.writeUint(section.id, draft);
            this.writeUint(contentLength, draft);
            if (!draft) {
              this.source.set(content, this.offset);
            }
            this.offset += contentLength;
          }
          return this.offset;
        };
        WebmContainer.prototype.updateByData = function() {
          var length = this.writeSections("draft");
          this.source = new Uint8Array(length);
          this.writeSections();
        };
        WebmContainer.prototype.getSectionById = function(id) {
          for (var i = 0; i < this.data.length; i++) {
            var section = this.data[i];
            if (section.id === id) {
              return section.data;
            }
          }
          return null;
        };
        function WebmFile(source) {
          WebmContainer.call(this, "File", "File");
          this.setSource(source);
        }
        doInherit(WebmFile, WebmContainer);
        WebmFile.prototype.fixDuration = function(duration, options) {
          var logger = options && options.logger;
          if (logger === void 0) {
            logger = function(message) {
              console.log(message);
            };
          } else if (!logger) {
            logger = function() {
            };
          }
          var segmentSection = this.getSectionById(139690087);
          if (!segmentSection) {
            logger("[fix-webm-duration] Segment section is missing");
            return false;
          }
          var infoSection = segmentSection.getSectionById(88713574);
          if (!infoSection) {
            logger("[fix-webm-duration] Info section is missing");
            return false;
          }
          var timeScaleSection = infoSection.getSectionById(710577);
          if (!timeScaleSection) {
            logger("[fix-webm-duration] TimecodeScale section is missing");
            return false;
          }
          var durationSection = infoSection.getSectionById(1161);
          if (durationSection) {
            if (durationSection.getValue() <= 0) {
              logger(`[fix-webm-duration] Duration section is present, but the value is ${durationSection.getValue()}`);
              durationSection.setValue(duration);
            } else {
              logger(`[fix-webm-duration] Duration section is present, and the value is ${durationSection.getValue()}`);
              return false;
            }
          } else {
            logger("[fix-webm-duration] Duration section is missing");
            durationSection = new WebmFloat("Duration", "Float");
            durationSection.setValue(duration);
            infoSection.data.push({
              id: 1161,
              data: durationSection
            });
          }
          timeScaleSection.setValue(1e6);
          infoSection.updateByData();
          segmentSection.updateByData();
          this.updateByData();
          return true;
        };
        WebmFile.prototype.toBlob = function(mimeType) {
          return new Blob([this.source.buffer], { type: mimeType || "video/webm" });
        };
        function fixWebmDuration2(blob, duration, callback, options) {
          if (typeof callback === "object") {
            options = callback;
            callback = void 0;
          }
          if (!callback) {
            return new Promise(function(resolve) {
              fixWebmDuration2(blob, duration, resolve, options);
            });
          }
          try {
            var reader = new FileReader();
            reader.onloadend = function() {
              try {
                var file = new WebmFile(new Uint8Array(reader.result));
                if (file.fixDuration(duration, options)) {
                  blob = file.toBlob(blob.type);
                }
              } catch (ex) {
              }
              callback(blob);
            };
            reader.readAsArrayBuffer(blob);
          } catch (ex) {
            callback(blob);
          }
        }
        fixWebmDuration2.default = fixWebmDuration2;
        return fixWebmDuration2;
      });
    }
  });

  // src/content/screen-recorder.js
  var import_fix_webm_duration, ScreenRecorder;
  var init_screen_recorder = __esm({
    "src/content/screen-recorder.js"() {
      import_fix_webm_duration = __toESM(require_fix_webm_duration());
      ScreenRecorder = class {
        constructor(platform = "chatgpt") {
          this.mediaRecorder = null;
          this.recordedChunks = [];
          this.stream = null;
          this.startTime = 0;
          this.timerInterval = null;
          this.onTimerUpdate = null;
          this.platform = platform;
          this.micStream = null;
          this.micGainNode = null;
          this.audioContext = null;
          this.isMicMuted = false;
          this.onMicStateChange = null;
          this.onExternalStop = null;
          this.isPaused = false;
        }
        async start(onTimerUpdate, onMicStateChange) {
          this.onTimerUpdate = onTimerUpdate;
          this.onMicStateChange = onMicStateChange;
          this.recordedChunks = [];
          this.isMicMuted = false;
          this.isPaused = false;
          try {
            const result = await chrome.storage.local.get(["settings"]);
            const settings = result.settings || {};
            const videoSettings = {
              codec: "vp9",
              resolution: "1080p",
              bitrate: 4e3,
              fps: 60,
              timeslice: 1e3,
              ...settings.video || {}
            };
            const audioSettings = {
              systemAudioEnabled: true,
              // Default: record system audio
              ...settings.audio || {}
            };
            console.log("Video settings:", videoSettings);
            console.log("Audio settings:", audioSettings);
            const resolutionPresets = {
              "2160p": { width: 3840, height: 2160 },
              // 4K Ultra HD
              "1440p": { width: 2560, height: 1440 },
              // 2K Quad HD
              "1080p": { width: 1920, height: 1080 },
              // Full HD
              "720p": { width: 1280, height: 720 },
              // HD
              "480p": { width: 854, height: 480 }
              // SD
            };
            const resolution = resolutionPresets[videoSettings.resolution] || resolutionPresets["1080p"];
            const displayMediaOptions = {
              video: {
                displaySurface: "monitor",
                logicalSurface: true,
                cursor: "always",
                width: { ideal: resolution.width },
                height: { ideal: resolution.height },
                frameRate: { ideal: videoSettings.fps, max: 120 }
              },
              audio: audioSettings.systemAudioEnabled ? {
                // Chrome 105+ supports systemAudio hint
                // This tells the browser to show the "Share system audio" option
                suppressLocalAudioPlayback: false
              } : false,
              // Chrome 105+: Hint to include system audio in the sharing dialog
              systemAudio: audioSettings.systemAudioEnabled ? "include" : "exclude",
              // Prefer current tab for easier audio capture
              preferCurrentTab: false,
              // Allow user to select any surface
              selfBrowserSurface: "include",
              surfaceSwitching: "include",
              monitorTypeSurfaces: "include"
            };
            console.log("getDisplayMedia options:", displayMediaOptions);
            this.stream = await navigator.mediaDevices.getDisplayMedia(displayMediaOptions);
            try {
              this.micStream = await navigator.mediaDevices.getUserMedia({
                audio: {
                  echoCancellation: true,
                  noiseSuppression: true,
                  sampleRate: 44100
                }
              });
            } catch (micError) {
              console.warn("Could not access microphone:", micError);
            }
            this.audioContext = new AudioContext();
            const audioDestination = this.audioContext.createMediaStreamDestination();
            const screenAudioTracks = this.stream.getAudioTracks();
            console.log(`Screen capture audio tracks: ${screenAudioTracks.length}`);
            if (audioSettings.systemAudioEnabled) {
              if (screenAudioTracks.length > 0) {
                const screenAudioTrack = screenAudioTracks[0];
                const screenSource = this.audioContext.createMediaStreamSource(
                  new MediaStream([screenAudioTrack])
                );
                screenSource.connect(audioDestination);
                console.log("\u2705 System audio: ENABLED and connected");
                console.log(`   Track label: ${screenAudioTrack.label}`);
              } else {
                console.warn("\u26A0\uFE0F System audio was requested but not available!");
                console.warn("   Make sure to check 'Share audio' in the screen sharing dialog");
                console.warn("   Note: Audio sharing only works when sharing a tab or entire screen, not a window");
              }
            } else {
              console.log("\u2139\uFE0F System audio: DISABLED by user setting");
            }
            if (this.micStream) {
              const micAudioTrack = this.micStream.getAudioTracks()[0];
              if (micAudioTrack) {
                const micSource = this.audioContext.createMediaStreamSource(
                  new MediaStream([micAudioTrack])
                );
                this.micGainNode = this.audioContext.createGain();
                this.micGainNode.gain.value = 1;
                micSource.connect(this.micGainNode);
                this.micGainNode.connect(audioDestination);
              }
            }
            const videoTrack = this.stream.getVideoTracks()[0];
            const finalStream = new MediaStream([
              videoTrack,
              ...audioDestination.stream.getAudioTracks()
            ]);
            const codecOptions = {
              "vp9": "video/webm;codecs=vp9,opus",
              "vp8": "video/webm;codecs=vp8,opus",
              "h264": "video/webm;codecs=h264,opus"
            };
            let mimeType = codecOptions[videoSettings.codec] || codecOptions["vp9"];
            if (!MediaRecorder.isTypeSupported(mimeType)) {
              if (MediaRecorder.isTypeSupported(codecOptions["vp9"])) {
                mimeType = codecOptions["vp9"];
              } else if (MediaRecorder.isTypeSupported(codecOptions["vp8"])) {
                mimeType = codecOptions["vp8"];
              } else {
                mimeType = "video/webm";
              }
              console.warn(`Codec ${videoSettings.codec} not supported, using fallback: ${mimeType}`);
            }
            const options = {
              mimeType,
              videoBitsPerSecond: videoSettings.bitrate * 1e3,
              audioBitsPerSecond: 128e3
            };
            console.log(`Using codec: ${mimeType}, bitrate: ${videoSettings.bitrate} kbps`);
            this.mediaRecorder = new MediaRecorder(finalStream, options);
            this.mediaRecorder.ondataavailable = (event) => {
              if (event.data && event.data.size > 0) {
                this.recordedChunks.push(event.data);
              }
            };
            this.mediaRecorder.start(videoSettings.timeslice);
            this.startTime = Date.now();
            this.pausedDuration = 0;
            this.pauseStartTime = 0;
            this.startTimer();
            this.stream.getVideoTracks()[0].onended = async () => {
              console.log("Screen sharing stopped by user via browser controls");
              if (this.mediaRecorder && (this.mediaRecorder.state === "recording" || this.mediaRecorder.state === "paused")) {
                const result2 = await this.stop();
                if (this.onExternalStop && result2) {
                  this.onExternalStop(result2);
                }
              }
            };
            console.log(`Screen recording started for ${this.platform}`);
            console.log(`Settings: ${videoSettings.resolution} @ ${videoSettings.fps}fps, timeslice: ${videoSettings.timeslice}ms`);
            console.log(`Microphone: ${this.micStream ? "enabled" : "disabled"}`);
            return true;
          } catch (error) {
            console.error("Error starting screen recording:", error);
            if (error.name !== "NotAllowedError") {
              alert("Could not start screen recording. Please check permissions.");
            }
            return false;
          }
        }
        /**
         * Pause the screen recording
         */
        pause() {
          console.log("ScreenRecorder.pause() called");
          if (!this.mediaRecorder) {
            console.log("  FAILED: mediaRecorder is null");
            return false;
          }
          if (this.mediaRecorder.state !== "recording") {
            console.log("  FAILED: mediaRecorder.state is not 'recording', it's:", this.mediaRecorder.state);
            return false;
          }
          this.mediaRecorder.pause();
          this.isPaused = true;
          this.pauseStartTime = Date.now();
          this.stopTimer();
          console.log("  SUCCESS: Screen recording paused");
          return true;
        }
        /**
         * Resume the screen recording
         */
        resume() {
          console.log("ScreenRecorder.resume() called");
          if (!this.mediaRecorder) {
            console.log("  FAILED: mediaRecorder is null");
            return false;
          }
          if (this.mediaRecorder.state !== "paused") {
            console.log("  FAILED: mediaRecorder.state is not 'paused', it's:", this.mediaRecorder.state);
            return false;
          }
          if (this.pauseStartTime > 0) {
            this.pausedDuration += Date.now() - this.pauseStartTime;
            console.log("  Total paused duration so far:", this.pausedDuration, "ms");
          }
          this.mediaRecorder.resume();
          this.isPaused = false;
          this.pauseStartTime = 0;
          this.startTimer();
          console.log("  SUCCESS: Screen recording resumed");
          return true;
        }
        /**
         * Check if recording is paused
         */
        get paused() {
          return this.isPaused || false;
        }
        /**
         * Mute the microphone (audio from screen will still be recorded)
         */
        muteMic() {
          if (!this.micGainNode || this.isMicMuted) return false;
          this.micGainNode.gain.value = 0;
          this.isMicMuted = true;
          if (this.onMicStateChange) {
            this.onMicStateChange(true);
          }
          console.log("Microphone muted");
          return true;
        }
        /**
         * Unmute the microphone
         */
        unmuteMic() {
          if (!this.micGainNode || !this.isMicMuted) return false;
          this.micGainNode.gain.value = 1;
          this.isMicMuted = false;
          if (this.onMicStateChange) {
            this.onMicStateChange(false);
          }
          console.log("Microphone unmuted");
          return true;
        }
        /**
         * Toggle microphone mute state
         * @returns {boolean} New mute state (true = muted, false = unmuted)
         */
        toggleMic() {
          if (this.isMicMuted) {
            this.unmuteMic();
            return false;
          } else {
            this.muteMic();
            return true;
          }
        }
        /**
         * Check if microphone is currently muted
         */
        get micMuted() {
          return this.isMicMuted;
        }
        /**
         * Check if microphone is available
         */
        get hasMic() {
          return this.micStream !== null && this.micGainNode !== null;
        }
        stop() {
          return new Promise((resolve) => {
            if (!this.mediaRecorder) {
              resolve(null);
              return;
            }
            this.stopTimer();
            if (this.isPaused && this.pauseStartTime > 0) {
              this.pausedDuration += Date.now() - this.pauseStartTime;
            }
            this.mediaRecorder.onstop = async () => {
              if (this.stream) {
                this.stream.getTracks().forEach((track) => track.stop());
                this.stream = null;
              }
              if (this.micStream) {
                this.micStream.getTracks().forEach((track) => track.stop());
                this.micStream = null;
              }
              if (this.audioContext) {
                this.audioContext.close();
                this.audioContext = null;
              }
              this.micGainNode = null;
              this.isMicMuted = false;
              this.isPaused = false;
              const rawBlob = new Blob(this.recordedChunks, { type: "video/webm" });
              const totalDuration = Date.now() - this.startTime;
              const actualDuration = totalDuration - (this.pausedDuration || 0);
              console.log(`Raw WebM size: ${(rawBlob.size / 1024 / 1024).toFixed(2)} MB`);
              console.log(`Total time: ${Math.floor(totalDuration / 1e3)}s, Paused: ${Math.floor((this.pausedDuration || 0) / 1e3)}s, Actual: ${Math.floor(actualDuration / 1e3)}s`);
              let fixedBlob;
              try {
                console.log("Fixing WebM duration metadata...");
                fixedBlob = await (0, import_fix_webm_duration.default)(rawBlob, actualDuration);
                console.log("WebM duration fixed successfully!");
              } catch (e) {
                console.warn("Could not fix WebM duration:", e);
                fixedBlob = rawBlob;
              }
              console.log(`Final WebM size: ${(fixedBlob.size / 1024 / 1024).toFixed(2)} MB`);
              this.mediaRecorder = null;
              this.recordedChunks = [];
              this.pausedDuration = 0;
              this.pauseStartTime = 0;
              resolve({
                blob: fixedBlob,
                duration: actualDuration,
                format: "webm"
              });
            };
            if (this.mediaRecorder.state === "recording" || this.mediaRecorder.state === "paused") {
              this.mediaRecorder.stop();
            } else {
              const blob = new Blob(this.recordedChunks, { type: "video/webm" });
              this.mediaRecorder = null;
              this.recordedChunks = [];
              this.isPaused = false;
              resolve({
                blob,
                duration: Date.now() - this.startTime,
                format: "webm"
              });
            }
          });
        }
        startTimer() {
          this.stopTimer();
          this.timerInterval = setInterval(() => {
            const elapsed = Date.now() - this.startTime - (this.pausedDuration || 0);
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
        constructor(recorder, screenRecorder, handleUpload, handleVideoUpload) {
          this.recorder = recorder;
          this.screenRecorder = screenRecorder;
          this.handleUpload = handleUpload;
          this.handleVideoUpload = handleVideoUpload;
          this.button = null;
          this.screenButton = null;
          this.pauseButton = null;
          this.isRecording = false;
          this.isRecordingPaused = false;
          this.isScreenRecording = false;
          this.isScreenPaused = false;
          this.isMicMuted = false;
          this.audioRecordingStartUrl = null;
          this.videoRecordingStartUrl = null;
          this.icons = {
            mic: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"></path><path d="M19 10v2a7 7 0 0 1-14 0v-2"></path><line x1="12" y1="19" x2="12" y2="23"></line><line x1="8" y1="23" x2="16" y2="23"></line></svg>`,
            micMuted: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="1" y1="1" x2="23" y2="23"></line><path d="M9 10v2a3 3 0 0 0 3 3v0"></path><path d="M15 10.34V4a3 3 0 0 0-5.94-.6"></path><path d="M17 10v2a7 7 0 0 1-14 0v-2"></path><line x1="12" y1="19" x2="12" y2="23"></line><line x1="8" y1="23" x2="16" y2="23"></line></svg>`,
            screen: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect><line x1="8" y1="21" x2="16" y2="21"></line><line x1="12" y1="17" x2="12" y2="21"></line></svg>`,
            pause: `<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16" rx="1"></rect><rect x="14" y="4" width="4" height="16" rx="1"></rect></svg>`,
            play: `<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"></path></svg>`,
            stop: `<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><rect x="4" y="4" width="16" height="16" rx="2"></rect></svg>`,
            loading: `<svg class="thoughtful-spin" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="2" x2="12" y2="6"></line><line x1="12" y1="18" x2="12" y2="22"></line><line x1="4.93" y1="4.93" x2="7.76" y2="7.76"></line><line x1="16.24" y1="16.24" x2="19.07" y2="19.07"></line><line x1="2" y1="12" x2="6" y2="12"></line><line x1="18" y1="12" x2="22" y2="12"></line><line x1="4.93" y1="19.07" x2="7.76" y2="16.24"></line><line x1="16.24" y1="7.76" x2="19.07" y2="4.93"></line></svg>`,
            dot: `<span class="record-dot"></span>`,
            none: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"></line></svg>`
          };
        }
        createButton() {
          const btn = document.createElement("button");
          btn.id = "thoughtful-voice-btn";
          btn.innerHTML = "\u{1F399}\uFE0F";
          btn.className = "ai-voice-btn";
          btn.title = "Record audio";
          btn.onclick = async () => {
            if (this.isScreenRecording) {
              this.toggleMicDuringScreenRecording();
              return;
            }
            if (this.isRecording) {
              await this.stopRecording();
            } else {
              const startUrl = await this.startRecording();
              this.audioRecordingStartUrl = startUrl;
            }
          };
          this.button = btn;
          return btn;
        }
        createScreenRecordButton() {
          const btn = document.createElement("button");
          btn.id = "ai-screen-recorder-btn";
          btn.innerHTML = "\u{1F4FA}";
          btn.className = "ai-voice-btn";
          btn.title = "Record screen";
          btn.onclick = async () => {
            if (this.isScreenRecording) {
              await this.stopScreenRecording();
            } else {
              const startUrl = await this.startScreenRecording();
              this.videoRecordingStartUrl = startUrl;
            }
          };
          this.screenButton = btn;
          return btn;
        }
        createPauseButton() {
          const btn = document.createElement("button");
          btn.id = "ai-pause-btn";
          btn.innerHTML = this.icons.pause;
          btn.className = "ai-voice-btn pause-btn";
          btn.title = "Pause";
          btn.classList.add("hidden");
          btn.onclick = () => {
            if (this.isRecording) {
              this.toggleRecordingPause();
            } else if (this.isScreenRecording) {
              this.toggleScreenPause();
            }
          };
          this.pauseButton = btn;
          return btn;
        }
        // ========== Audio Recording ==========
        async startRecording() {
          const startUrl = window.location.href;
          const started = await this.recorder.start((time) => {
            if (this.button) {
              this.button.innerHTML = `${this.icons.dot} ${time}`;
            }
          });
          if (started) {
            this.isRecording = true;
            this.isRecordingPaused = false;
            this.button.classList.add("recording");
            this.button.innerHTML = `${this.icons.dot} 00:00`;
            this.button.title = "Stop recording";
            this.showPauseButton();
            if (this.screenButton) this.screenButton.classList.add("hidden");
          }
          return startUrl;
        }
        toggleRecordingPause() {
          if (this.isRecordingPaused) {
            const resumed = this.recorder.resume();
            if (resumed) {
              this.isRecordingPaused = false;
              this.button.classList.remove("paused");
              this.pauseButton.innerHTML = this.icons.pause;
              this.pauseButton.title = "Pause";
            }
          } else {
            const paused = this.recorder.pause();
            if (paused) {
              this.isRecordingPaused = true;
              this.button.classList.add("paused");
              this.pauseButton.innerHTML = this.icons.play;
              this.pauseButton.title = "Resume";
            }
          }
        }
        async stopRecording() {
          this.isRecording = false;
          this.isRecordingPaused = false;
          this.button.classList.remove("recording", "paused");
          this.button.innerHTML = this.icons.loading;
          this.button.title = "Processing...";
          this.hidePauseButton();
          const result = await this.recorder.stop();
          this.button.innerHTML = "\u{1F399}\uFE0F";
          this.button.title = "Record audio";
          if (this.screenButton) this.screenButton.classList.remove("hidden");
          if (result) {
            console.log("Audio recorded:", result);
            await this.handleUpload(result.blob, result.duration);
          }
        }
        // ========== Screen Recording ==========
        async startScreenRecording() {
          const startUrl = window.location.href;
          this.screenRecorder.onExternalStop = async (result) => {
            console.log("External stop detected, processing recording...");
            this.isScreenRecording = false;
            this.isScreenPaused = false;
            this.isMicMuted = false;
            this.screenButton.classList.remove("screen-recording", "paused");
            this.screenButton.innerHTML = this.icons.loading;
            this.screenButton.title = "Processing...";
            this.hidePauseButton();
            this.updateMicButtonState();
            this.screenButton.innerHTML = "\u{1F4FA}";
            this.screenButton.title = "Record screen";
            if (result) {
              console.log("Screen recording completed via external stop:", result);
              await this.handleVideoUpload(result);
            }
          };
          const started = await this.screenRecorder.start(
            (time) => {
              if (this.screenButton) {
                this.screenButton.innerHTML = `${this.icons.dot} ${time}`;
              }
            },
            (isMuted) => {
              this.isMicMuted = isMuted;
              this.updateMicButtonState();
            }
          );
          if (started) {
            this.isScreenRecording = true;
            this.isScreenPaused = false;
            this.isMicMuted = false;
            this.screenButton.classList.add("screen-recording");
            this.screenButton.innerHTML = `${this.icons.dot} 00:00`;
            this.screenButton.title = "Stop recording";
            this.showPauseButton();
            this.updateMicButtonState();
          }
          return startUrl;
        }
        toggleScreenPause() {
          console.log("toggleScreenPause called, isScreenPaused:", this.isScreenPaused);
          if (this.isScreenPaused) {
            const resumed = this.screenRecorder.resume();
            console.log("Screen resume result:", resumed);
            if (resumed) {
              this.isScreenPaused = false;
              this.screenButton.classList.remove("paused");
              this.pauseButton.innerHTML = this.icons.pause;
              this.pauseButton.title = "Pause";
              this.updateMicButtonState();
            }
          } else {
            const paused = this.screenRecorder.pause();
            console.log("Screen pause result:", paused);
            if (paused) {
              this.isScreenPaused = true;
              this.screenButton.classList.add("paused");
              this.pauseButton.innerHTML = this.icons.play;
              this.pauseButton.title = "Resume";
              this.updateMicButtonState();
            }
          }
        }
        async stopScreenRecording() {
          this.isScreenRecording = false;
          this.isScreenPaused = false;
          this.isMicMuted = false;
          this.screenButton.classList.remove("screen-recording", "paused");
          this.screenButton.innerHTML = this.icons.loading;
          this.screenButton.title = "Processing...";
          this.hidePauseButton();
          this.updateMicButtonState();
          const result = await this.screenRecorder.stop();
          this.screenButton.innerHTML = "\u{1F4FA}";
          this.screenButton.title = "Record screen";
          if (result) {
            console.log("Screen recording completed:", result);
            await this.handleVideoUpload(result);
          }
        }
        // ========== Pause Button Control ==========
        showPauseButton() {
          if (this.pauseButton) {
            this.pauseButton.classList.remove("hidden");
            this.pauseButton.innerHTML = this.icons.pause;
            this.pauseButton.title = "Pause";
          }
        }
        hidePauseButton() {
          if (this.pauseButton) {
            this.pauseButton.classList.add("hidden");
          }
        }
        // ========== Mic Control ==========
        toggleMicDuringScreenRecording() {
          if (!this.isScreenRecording || !this.screenRecorder.hasMic || this.isScreenPaused) return;
          const newMuteState = this.screenRecorder.toggleMic();
          this.isMicMuted = newMuteState;
          this.updateMicButtonState();
        }
        updateMicButtonState() {
          if (!this.button) return;
          if (this.isScreenRecording) {
            this.button.classList.add("mic-control");
            if (this.isScreenPaused) {
              this.button.innerHTML = this.icons.pause;
              this.button.classList.remove("mic-muted", "mic-active", "mic-unavailable");
              this.button.classList.add("mic-paused");
              this.button.title = "Recording paused";
            } else if (this.screenRecorder.hasMic) {
              this.button.classList.remove("mic-paused");
              if (this.isMicMuted) {
                this.button.innerHTML = this.icons.micMuted;
                this.button.classList.add("mic-muted");
                this.button.classList.remove("mic-active");
                this.button.title = "Mic OFF - Click to unmute";
              } else {
                this.button.innerHTML = this.icons.mic;
                this.button.classList.add("mic-active");
                this.button.classList.remove("mic-muted");
                this.button.title = "Mic ON - Click to mute";
              }
            } else {
              this.button.classList.remove("mic-paused");
              this.button.innerHTML = this.icons.none;
              this.button.classList.add("mic-unavailable");
              this.button.title = "No microphone";
            }
          } else {
            this.button.classList.remove("mic-control", "mic-muted", "mic-active", "mic-unavailable", "mic-paused");
            this.button.innerHTML = "\u{1F399}\uFE0F";
            this.button.title = "Record audio";
          }
        }
        // ========== Injection ==========
        inject(targetSpec) {
          if (!this.button) this.createButton();
          if (!this.screenButton) this.createScreenRecordButton();
          if (!this.pauseButton) this.createPauseButton();
          if (document.getElementById("thoughtful-voice-btn")) return;
          let container = null;
          let insertBefore = null;
          if (targetSpec instanceof Element) {
            container = targetSpec;
          } else if (targetSpec && targetSpec.container) {
            container = targetSpec.container;
            insertBefore = targetSpec.insertBefore || null;
          }
          if (container) {
            if (insertBefore) {
              try {
                container.insertBefore(this.button, insertBefore);
                container.insertBefore(this.screenButton, insertBefore);
                container.insertBefore(this.pauseButton, insertBefore);
              } catch (e) {
                console.warn("Injection failed, falling back to append", e);
                container.appendChild(this.button);
                container.appendChild(this.screenButton);
                container.appendChild(this.pauseButton);
              }
            } else {
              container.appendChild(this.button);
              container.appendChild(this.screenButton);
              container.appendChild(this.pauseButton);
            }
          } else {
            document.body.appendChild(this.button);
            this.button.style.position = "fixed";
            this.button.style.bottom = "100px";
            this.button.style.right = "20px";
            this.button.style.zIndex = "9999";
            document.body.appendChild(this.screenButton);
            this.screenButton.style.position = "fixed";
            this.screenButton.style.bottom = "100px";
            this.screenButton.style.right = "80px";
            this.screenButton.style.zIndex = "9999";
            document.body.appendChild(this.pauseButton);
            this.pauseButton.style.position = "fixed";
            this.pauseButton.style.bottom = "100px";
            this.pauseButton.style.right = "140px";
            this.pauseButton.style.zIndex = "9999";
          }
          console.log("Buttons injected");
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
              console.log(`Converting blob to Base64... size: ${(blob.size / 1024 / 1024).toFixed(2)} MB`);
              metadata.audioData = await this.blobToBase64(blob);
              console.log(`Base64 string length: ${(metadata.audioData.length / 1024 / 1024).toFixed(2)} MB`);
            }
            const settingsResult = await chrome.storage.local.get(["settings"]);
            const settings = settingsResult.settings || {};
            const maxRecordings = settings.maxRecordings || 10;
            const result = await chrome.storage.local.get(["recordings", "stats"]);
            const recordings = result.recordings || [];
            const stats = result.stats || { lifetimeAudioMs: 0, lifetimeVideoMs: 0, totalRecordings: 0 };
            if (metadata.type === "audio") {
              stats.lifetimeAudioMs = (stats.lifetimeAudioMs || 0) + (metadata.durationMs || 0);
            } else if (metadata.type === "video") {
              stats.lifetimeVideoMs = (stats.lifetimeVideoMs || 0) + (metadata.durationMs || 0);
            }
            stats.totalRecordings = (stats.totalRecordings || 0) + 1;
            while (recordings.length >= maxRecordings) {
              recordings.pop();
            }
            recordings.unshift(metadata);
            try {
              await chrome.storage.local.set({ recordings, stats });
              console.log("Recording and stats saved to storage successfully");
              if (chrome.storage.local.getBytesInUse) {
                chrome.storage.local.getBytesInUse(null, (bytesInUse) => {
                  console.log(`Storage usage: ${(bytesInUse / 1024 / 1024).toFixed(2)} MB`);
                });
              }
            } catch (storageError) {
              console.error("Storage quota exceeded or save failed:", storageError);
              if (storageError.message && storageError.message.includes("QUOTA")) {
                console.warn("Attempting to save metadata only (without audio data)...");
                delete metadata.audioData;
                recordings[0] = metadata;
                await chrome.storage.local.set({ recordings });
                console.log("Saved metadata only (audio data was too large)");
                console.warn("Recording was too large to save audio data. Only metadata was saved.");
              } else {
                throw storageError;
              }
            }
          } catch (e) {
            console.error("Failed to save recording:", e);
            console.error("Error details:", e.message, e.stack);
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
        static async updateRecordingUrl(timestamp, newUrl) {
          try {
            const result = await chrome.storage.local.get(["recordings"]);
            const recordings = result.recordings || [];
            const recording = recordings.find((rec) => rec.timestamp === timestamp);
            if (recording) {
              recording.url = newUrl;
              await chrome.storage.local.set({ recordings });
              console.log(`Updated recording URL to: ${newUrl}`);
            }
          } catch (e) {
            console.error("Failed to update recording URL", e);
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

  // src/utils/config.js
  function generateAudioFilename() {
    const now = /* @__PURE__ */ new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");
    const hours = String(now.getHours()).padStart(2, "0");
    const minutes = String(now.getMinutes()).padStart(2, "0");
    const seconds = String(now.getSeconds()).padStart(2, "0");
    return `audio_${year}-${month}-${day}_${hours}-${minutes}-${seconds}.wav`;
  }
  var DEFAULT_PROMPT_TEXT;
  var init_config = __esm({
    "src/utils/config.js"() {
      DEFAULT_PROMPT_TEXT = "Please answer based on this audio";
    }
  });

  // src/content/strategies/base-strategy.js
  var BaseStrategy;
  var init_base_strategy = __esm({
    "src/content/strategies/base-strategy.js"() {
      init_config();
      BaseStrategy = class {
        constructor(name) {
          this.name = name;
        }
        // ========== Abstract Methods (MUST be implemented by subclasses) ==========
        /**
         * Wait for the DOM to be ready for button injection
         * @returns {Promise<void>}
         */
        async waitForDOM() {
          throw new Error(`${this.name}Strategy: waitForDOM() must be implemented`);
        }
        /**
         * Get the injection target for our buttons
         * @returns {{ container: HTMLElement, insertBefore: HTMLElement|null } | null}
         */
        getInjectionTarget() {
          throw new Error(`${this.name}Strategy: getInjectionTarget() must be implemented`);
        }
        /**
         * Get the main text input element for the platform
         * @returns {HTMLElement|null}
         */
        getInputElement() {
          throw new Error(`${this.name}Strategy: getInputElement() must be implemented`);
        }
        // ========== Optional Override Methods ==========
        /**
         * Get the priority order of upload strategies to try
         * Subclasses can override this to change the order or exclude certain methods
         * @returns {string[]} Array of strategy names: 'paste', 'fileInput', 'dragAndDrop'
         */
        getUploadStrategies() {
          return ["paste", "fileInput", "dragAndDrop"];
        }
        /**
         * Get file input element (some platforms may need custom selector)
         * @returns {HTMLElement|null}
         */
        getFileInputElement() {
          return document.querySelector('input[type="file"]');
        }
        /**
         * Get the drop zone for drag and drop uploads
         * Defaults to the input element, can be overridden
         * @returns {HTMLElement}
         */
        getDropZone() {
          return this.getInputElement() || document.body;
        }
        // ========== Common Upload Logic ==========
        /**
         * Handle audio file upload - tries multiple strategies in order
         * @param {Blob} blob - The audio blob to upload
         * @param {string} durationString - Duration string for logging
         */
        async handleUpload(blob, durationString) {
          console.log(`${this.name}Strategy: Handling audio upload`);
          const filename = generateAudioFilename();
          const file = new File([blob], filename, { type: "audio/wav" });
          const success = await this._executeUploadStrategies(file);
          if (success) {
            await this.insertText();
          } else {
            console.error(`${this.name}Strategy: All upload strategies failed`);
          }
        }
        /**
         * Handle video file upload - tries multiple strategies in order
         * @param {Object} result - Object containing blob, duration, and format
         */
        async handleVideoUpload(result) {
          console.log(`${this.name}Strategy: Handling video upload`);
          const blob = result.blob;
          const format = result.format || "webm";
          const filename = this._generateVideoFilename(format);
          const mimeType = format === "mp4" ? "video/mp4" : "video/webm";
          const file = new File([blob], filename, { type: mimeType });
          const success = await this._executeUploadStrategies(file);
          if (success) {
            console.log(`${this.name}Strategy: Video upload successful (${format.toUpperCase()})`);
            await this.insertText();
          } else {
            console.error(`${this.name}Strategy: All video upload strategies failed`);
          }
        }
        /**
         * Insert prompt text into the input element
         * Only inserts if the text doesn't already exist in the input
         */
        async insertText() {
          const inputEl = this.getInputElement();
          if (!inputEl) {
            console.warn(`${this.name}Strategy: No input element found for text insertion`);
            return;
          }
          const result = await chrome.storage.local.get(["settings"]);
          const textToInsert = result.settings?.promptText || DEFAULT_PROMPT_TEXT;
          const currentContent = this._getInputContent(inputEl);
          if (currentContent.includes(textToInsert)) {
            console.log(`${this.name}Strategy: Prompt text already exists, skipping insertion`);
            return;
          }
          inputEl.focus();
          const success = document.execCommand("insertText", false, textToInsert);
          if (!success) {
            if (inputEl.tagName === "TEXTAREA" || inputEl.tagName === "INPUT") {
              const currentValue = inputEl.value || "";
              inputEl.value = currentValue + (currentValue ? "\n" : "") + textToInsert;
              inputEl.dispatchEvent(new Event("input", { bubbles: true }));
            } else if (inputEl.getAttribute("contenteditable") || inputEl.getAttribute("role") === "textbox") {
              inputEl.innerText += textToInsert;
              inputEl.dispatchEvent(new Event("input", { bubbles: true }));
            }
          }
        }
        /**
         * Get the current text content of an input element
         * Works with textarea, input, and contenteditable elements
         * @param {HTMLElement} inputEl - The input element
         * @returns {string} - The current text content
         */
        _getInputContent(inputEl) {
          if (inputEl.tagName === "TEXTAREA" || inputEl.tagName === "INPUT") {
            return inputEl.value || "";
          } else {
            return inputEl.innerText || inputEl.textContent || "";
          }
        }
        // ========== Private Helper Methods ==========
        /**
         * Execute upload strategies in order until one succeeds
         * @param {File} file - The file to upload
         * @returns {Promise<boolean>} - Whether any strategy succeeded
         */
        async _executeUploadStrategies(file) {
          const strategies = this.getUploadStrategies();
          for (const strategyName of strategies) {
            try {
              console.log(`${this.name}Strategy: Trying ${strategyName} upload...`);
              const success = await this._tryUploadStrategy(strategyName, file);
              if (success) {
                console.log(`${this.name}Strategy: ${strategyName} upload succeeded`);
                return true;
              }
            } catch (e) {
              console.warn(`${this.name}Strategy: ${strategyName} failed, trying next...`, e);
            }
          }
          return false;
        }
        /**
         * Try a specific upload strategy
         * @param {string} strategyName - Name of the strategy to try
         * @param {File} file - The file to upload
         * @returns {Promise<boolean>} - Whether the strategy succeeded
         */
        async _tryUploadStrategy(strategyName, file) {
          switch (strategyName) {
            case "paste":
              return await this._pasteUpload(file);
            case "fileInput":
              return await this._fileInputUpload(file);
            case "dragAndDrop":
              return await this._dragAndDropUpload(file);
            default:
              console.warn(`${this.name}Strategy: Unknown upload strategy: ${strategyName}`);
              return false;
          }
        }
        /**
         * Upload file via clipboard paste event
         * @param {File} file - The file to upload
         * @returns {Promise<boolean>} - Whether the upload succeeded
         */
        async _pasteUpload(file) {
          const targetEl = this.getInputElement();
          if (!targetEl) {
            console.warn(`${this.name}Strategy: No input element for paste upload`);
            return false;
          }
          const dataTransfer = new DataTransfer();
          dataTransfer.items.add(file);
          const pasteEvent = new ClipboardEvent("paste", {
            bubbles: true,
            cancelable: true,
            clipboardData: dataTransfer
          });
          targetEl.focus();
          targetEl.dispatchEvent(pasteEvent);
          console.log(`${this.name}Strategy: Paste event dispatched`);
          return true;
        }
        /**
         * Upload file via hidden file input
         * @param {File} file - The file to upload
         * @returns {Promise<boolean>} - Whether the upload succeeded
         */
        async _fileInputUpload(file) {
          const fileInput = this.getFileInputElement();
          if (!fileInput) {
            console.warn(`${this.name}Strategy: No file input found`);
            return false;
          }
          const dataTransfer = new DataTransfer();
          dataTransfer.items.add(file);
          fileInput.files = dataTransfer.files;
          const changeEvent = new Event("change", { bubbles: true });
          fileInput.dispatchEvent(changeEvent);
          console.log(`${this.name}Strategy: File input upload completed`);
          return true;
        }
        /**
         * Upload file via drag and drop
         * @param {File} file - The file to upload
         * @returns {Promise<boolean>} - Whether the upload succeeded
         */
        async _dragAndDropUpload(file) {
          const dropZone = this.getDropZone();
          if (!dropZone) {
            console.warn(`${this.name}Strategy: No drop zone found`);
            return false;
          }
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
          await this._delay(50);
          dropZone.dispatchEvent(createEvent("dragover"));
          await this._delay(50);
          dropZone.dispatchEvent(createEvent("drop"));
          console.log(`${this.name}Strategy: Drag and drop completed`);
          return true;
        }
        /**
         * Generate a video filename with timestamp
         * @param {string} format - Video format (webm or mp4)
         * @returns {string} - Generated filename
         */
        _generateVideoFilename(format) {
          const now = /* @__PURE__ */ new Date();
          const dateStr = now.toLocaleDateString("zh-CN", {
            year: "numeric",
            month: "2-digit",
            day: "2-digit"
          }).replace(/\//g, "-");
          const timeStr = now.toLocaleTimeString("zh-CN", {
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
            hour12: false
          }).replace(/:/g, "-");
          return `Screen-${dateStr}_${timeStr}.${format}`;
        }
        /**
         * Utility delay function
         * @param {number} ms - Milliseconds to delay
         * @returns {Promise<void>}
         */
        _delay(ms) {
          return new Promise((resolve) => setTimeout(resolve, ms));
        }
        // ========== DOM Utility Methods ==========
        /**
         * Wait for an element to appear in the DOM
         * @param {string} selector - CSS selector
         * @param {number} timeout - Maximum wait time in ms (default: 10000)
         * @returns {Promise<HTMLElement|null>}
         */
        async _waitForElement(selector, timeout = 1e4) {
          const startTime = Date.now();
          return new Promise((resolve) => {
            const check = () => {
              const element = document.querySelector(selector);
              if (element) {
                resolve(element);
                return;
              }
              if (Date.now() - startTime > timeout) {
                resolve(null);
                return;
              }
              setTimeout(check, 100);
            };
            check();
          });
        }
        /**
         * Find parent element matching a condition
         * @param {HTMLElement} element - Starting element
         * @param {Function} condition - Function that returns true when parent is found
         * @param {number} maxDepth - Maximum depth to search (default: 10)
         * @returns {HTMLElement|null}
         */
        _findParent(element, condition, maxDepth = 10) {
          let current = element;
          let depth = 0;
          while (current && depth < maxDepth) {
            if (condition(current)) {
              return current;
            }
            current = current.parentElement;
            depth++;
          }
          return null;
        }
      };
    }
  });

  // src/content/strategies/gemini.js
  var GeminiStrategy;
  var init_gemini = __esm({
    "src/content/strategies/gemini.js"() {
      init_base_strategy();
      GeminiStrategy = class extends BaseStrategy {
        constructor() {
          super("Gemini");
        }
        // ========== Required Implementations ==========
        async waitForDOM() {
          return new Promise((resolve) => {
            const check = () => {
              const toolsContainer = document.querySelector(".toolbox-drawer-button-container");
              if (toolsContainer) {
                console.log("Thoughtful Voice: Tools button found, ready to inject");
                resolve();
                return;
              }
              if (document.querySelector(".upload-card-button") || document.querySelector('[role="textbox"]')) {
                console.log("Thoughtful Voice: Tools button not found, using fallback");
                setTimeout(() => {
                  if (document.querySelector(".toolbox-drawer-button-container")) {
                    console.log("Thoughtful Voice: Tools button appeared during wait");
                  }
                  resolve();
                }, 1e3);
              } else {
                setTimeout(check, 500);
              }
            };
            check();
          });
        }
        getInjectionTarget() {
          console.log("Thoughtful Voice: Looking for Gemini injection target...");
          const toolsContainer = document.querySelector(".toolbox-drawer-button-container");
          if (toolsContainer?.parentElement) {
            console.log("Thoughtful Voice: Found Tools button container");
            return {
              container: toolsContainer.parentElement,
              insertBefore: toolsContainer.nextSibling
            };
          }
          const actionButtonsRow = document.querySelector('[class*="action-button-row"], [class*="input-area-tools"]');
          if (actionButtonsRow) {
            console.log("Thoughtful Voice: Found action buttons row");
            return {
              container: actionButtonsRow,
              insertBefore: null
            };
          }
          const uploadButton = document.querySelector('.upload-card-button, [class*="upload-button"]');
          if (uploadButton) {
            const parent = this._findParent(uploadButton, (el) => {
              const buttonChildren = el.querySelectorAll('button, [role="button"]');
              return buttonChildren.length > 1;
            });
            if (parent) {
              console.log("Thoughtful Voice: Found common parent with multiple buttons");
              return { container: parent, insertBefore: null };
            }
            if (uploadButton.parentElement) {
              console.log("Thoughtful Voice: Using upload button parent as fallback");
              return { container: uploadButton.parentElement, insertBefore: null };
            }
          }
          const micButton = document.querySelector('.speech_dictation_mic_button, [class*="mic-button"]');
          if (micButton?.parentElement) {
            console.log("Thoughtful Voice: Found native mic button");
            return {
              container: micButton.parentElement,
              insertBefore: micButton.nextSibling
            };
          }
          const inputArea = document.querySelector('[role="textbox"]');
          if (inputArea?.parentElement) {
            console.log("Thoughtful Voice: Using textbox parent as last resort");
            const target = inputArea.parentElement.parentElement || document.body;
            return { container: target, insertBefore: null };
          }
          console.warn("Thoughtful Voice: No suitable injection target found for Gemini");
          return null;
        }
        getInputElement() {
          return document.querySelector('[role="textbox"]');
        }
        // ========== Optional Overrides ==========
        getUploadStrategies() {
          return ["paste", "dragAndDrop"];
        }
        getDropZone() {
          return this.getInputElement() || document.body;
        }
      };
    }
  });

  // src/content/strategies/chatgpt.js
  var ChatGPTStrategy;
  var init_chatgpt = __esm({
    "src/content/strategies/chatgpt.js"() {
      init_base_strategy();
      ChatGPTStrategy = class extends BaseStrategy {
        constructor() {
          super("ChatGPT");
        }
        // ========== Required Implementations ==========
        async waitForDOM() {
          return new Promise((resolve) => {
            const check = () => {
              if (document.getElementById("prompt-textarea")) {
                console.log("Thoughtful Voice: ChatGPT prompt textarea found");
                resolve();
              } else {
                setTimeout(check, 500);
              }
            };
            check();
          });
        }
        getInjectionTarget() {
          console.log("Thoughtful Voice: Looking for ChatGPT injection target...");
          const attachButton = document.querySelector('button[aria-label="Attach files"]');
          if (attachButton?.parentElement) {
            console.log("Thoughtful Voice: Found attach files button");
            return {
              container: attachButton.parentElement,
              insertBefore: attachButton
              // Insert before the + button
            };
          }
          const textarea = document.getElementById("prompt-textarea");
          if (textarea) {
            const inputWrapper = textarea.closest(".flex.items-end");
            if (inputWrapper) {
              const firstButton = inputWrapper.querySelector("button");
              if (firstButton) {
                console.log("Thoughtful Voice: Found input wrapper with buttons");
                return {
                  container: inputWrapper,
                  insertBefore: firstButton.nextSibling
                };
              }
            }
          }
          console.warn("Thoughtful Voice: No suitable injection target found for ChatGPT");
          return null;
        }
        getInputElement() {
          return document.getElementById("prompt-textarea");
        }
        // ========== Optional Overrides ==========
        getUploadStrategies() {
          return ["paste"];
        }
      };
    }
  });

  // src/content/strategies/ai-studio.js
  var AIStudioStrategy;
  var init_ai_studio = __esm({
    "src/content/strategies/ai-studio.js"() {
      init_base_strategy();
      AIStudioStrategy = class extends BaseStrategy {
        constructor() {
          super("AI Studio");
        }
        // ========== Required Implementations ==========
        async waitForDOM() {
          return new Promise((resolve) => {
            const check = () => {
              const insertButton = document.querySelector('button[aria-label="Insert images, videos, audio, or files"]');
              const textarea = document.querySelector("textarea");
              if (insertButton || textarea) {
                console.log("Thoughtful Voice: AI Studio page elements found, ready to inject");
                resolve();
              } else {
                setTimeout(check, 500);
              }
            };
            check();
          });
        }
        getInjectionTarget() {
          console.log("Thoughtful Voice: Looking for AI Studio injection target...");
          const insertButton = document.querySelector('button[aria-label="Insert images, videos, audio, or files"]');
          if (insertButton) {
            console.log("Thoughtful Voice: Found Insert button");
            const insertButtonWrapper = insertButton.parentElement;
            if (insertButtonWrapper?.parentElement) {
              console.log("Thoughtful Voice: Injecting at Insert button wrapper level");
              return {
                container: insertButtonWrapper.parentElement,
                insertBefore: insertButtonWrapper.nextElementSibling
              };
            }
          }
          const textarea = document.querySelector('textarea[aria-label="Enter a prompt"], textarea');
          if (textarea) {
            console.log("Thoughtful Voice: Fallback to textarea area");
            const container = this._findParent(textarea, (el) => {
              const buttons = el.querySelectorAll("button");
              return buttons.length > 1;
            });
            if (container) {
              const runButton = Array.from(container.querySelectorAll("button")).find(
                (btn) => btn.textContent?.includes("Run")
              );
              return {
                container,
                insertBefore: runButton || null
              };
            }
            return {
              container: textarea.parentElement,
              insertBefore: null
            };
          }
          console.warn("Thoughtful Voice: No suitable injection target found for AI Studio");
          return null;
        }
        getInputElement() {
          return document.querySelector('textarea[aria-label="Enter a prompt"], textarea[placeholder*="prompt" i], textarea');
        }
        // ========== Optional Overrides ==========
        getUploadStrategies() {
          return ["fileInput", "paste", "dragAndDrop"];
        }
        getDropZone() {
          return document.querySelector('textarea, [class*="prompt" i], .input-area') || document.body;
        }
      };
    }
  });

  // src/content/strategies/perplexity.js
  var PerplexityStrategy;
  var init_perplexity = __esm({
    "src/content/strategies/perplexity.js"() {
      init_base_strategy();
      PerplexityStrategy = class extends BaseStrategy {
        constructor() {
          super("Perplexity");
        }
        // ========== Required Implementations ==========
        async waitForDOM() {
          return new Promise((resolve) => {
            const check = () => {
              const input = document.getElementById("ask-input") || document.querySelector('[role="textbox"]');
              const attachButton = document.querySelector('button[aria-label*="Attach"]');
              if (input && attachButton) {
                console.log("Thoughtful Voice: Perplexity DOM ready (found input and attach button)");
                resolve();
              } else if (input && document.readyState === "complete") {
                console.log("Thoughtful Voice: Perplexity input found but toolbar search continuing...");
                resolve();
              } else {
                setTimeout(check, 500);
              }
            };
            check();
          });
        }
        getInjectionTarget() {
          console.log("Thoughtful Voice: Looking for Perplexity injection target...");
          const input = this.getInputElement();
          if (!input) return null;
          const container = input.closest('div.bg-raised, div.border, .rounded-2xl, [class*="SearchBox"]');
          const rightGroup = container?.querySelector(".justify-self-end.col-start-3, .col-start-3.justify-self-end") || document.querySelector(".justify-self-end.col-start-3, .col-start-3.justify-self-end") || document.querySelector('button[aria-label*="Attach"]')?.parentElement;
          if (rightGroup) {
            console.log("Thoughtful Voice: Found Perplexity right group, injecting at the start");
            let wrapper = rightGroup.querySelector("#thoughtful-voice-perplexity-wrapper");
            if (!wrapper) {
              wrapper = document.createElement("div");
              wrapper.id = "thoughtful-voice-perplexity-wrapper";
              wrapper.className = "flex items-center gap-1.5 mr-1";
              wrapper.style.display = "contents";
              rightGroup.prepend(wrapper);
            }
            return {
              container: wrapper,
              insertBefore: null
            };
          }
          console.warn("Thoughtful Voice: No injection target found for Perplexity");
          return null;
        }
        getInputElement() {
          return document.getElementById("ask-input") || document.querySelector('[role="textbox"]');
        }
        // ========== Optional Overrides ==========
        getUploadStrategies() {
          return ["paste", "dragAndDrop"];
        }
        getDropZone() {
          const inputEl = this.getInputElement();
          if (inputEl) {
            return inputEl.closest(".bg-raised, .border") || inputEl;
          }
          return document.body;
        }
      };
    }
  });

  // src/content/strategies/index.js
  function getStrategyForHost(hostname) {
    for (const { pattern, Strategy, name } of STRATEGIES) {
      if (pattern.test(hostname)) {
        console.log(`Thoughtful Voice: Matched ${name} strategy for ${hostname}`);
        return new Strategy();
      }
    }
    console.log(`Thoughtful Voice: No strategy found for ${hostname}`);
    return null;
  }
  var STRATEGIES;
  var init_strategies = __esm({
    "src/content/strategies/index.js"() {
      init_gemini();
      init_chatgpt();
      init_ai_studio();
      init_perplexity();
      STRATEGIES = [
        {
          pattern: /gemini\.google\.com/,
          Strategy: GeminiStrategy,
          name: "Gemini"
        },
        {
          pattern: /chatgpt\.com|chat\.openai\.com/,
          Strategy: ChatGPTStrategy,
          name: "ChatGPT"
        },
        {
          pattern: /aistudio\.google\.com/,
          Strategy: AIStudioStrategy,
          name: "AI Studio"
        },
        {
          pattern: /perplexity\.ai/,
          Strategy: PerplexityStrategy,
          name: "Perplexity"
        }
        // ========== Add new platforms below ==========
        // Example:
        // {
        //     pattern: /claude\.ai/,
        //     Strategy: ClaudeStrategy,
        //     name: 'Claude'
        // },
        // {
        //     pattern: /poe\.com/,
        //     Strategy: PoeStrategy,
        //     name: 'Poe'
        // },
        // {
        //     pattern: /grok\.x\.ai|x\.com/,
        //     Strategy: GrokStrategy,
        //     name: 'Grok'
        // },
      ];
    }
  });

  // src/content/main.js
  var require_main = __commonJS({
    "src/content/main.js"() {
      init_recorder();
      init_screen_recorder();
      init_injector();
      init_bubble();
      init_storage();
      init_strategies();
      init_config();
      console.log("Thoughtful Voice: Content script loaded");
      async function init() {
        const host = window.location.hostname;
        const strategy = getStrategyForHost(host);
        if (!strategy) {
          console.log("Thoughtful Voice: Unknown platform, extension inactive");
          return;
        }
        console.log(`Thoughtful Voice: Using ${strategy.name} strategy`);
        await strategy.waitForDOM();
        const bubbleRenderer = new BubbleRenderer();
        bubbleRenderer.init();
        const recorder = new Recorder();
        const screenRecorder = new ScreenRecorder(strategy.name.toLowerCase());
        let urlUpdateWatcher = null;
        const startUrlWatcher = (timestamp) => {
          const initialUrl = window.location.href;
          if (urlUpdateWatcher) {
            clearInterval(urlUpdateWatcher);
          }
          let watchDuration = 0;
          const maxWatchTime = 3e4;
          urlUpdateWatcher = setInterval(async () => {
            watchDuration += 500;
            const currentUrl = window.location.href;
            if (currentUrl !== initialUrl) {
              console.log(`Thoughtful Voice: URL changed to ${currentUrl}`);
              await StorageHelper.updateRecordingUrl(timestamp, currentUrl);
              clearInterval(urlUpdateWatcher);
              urlUpdateWatcher = null;
            }
            if (watchDuration >= maxWatchTime) {
              clearInterval(urlUpdateWatcher);
              urlUpdateWatcher = null;
            }
          }, 500);
        };
        let injector = null;
        const handleAudioUpload = async (blob, duration) => {
          const recordingUrl = injector.audioRecordingStartUrl || window.location.href;
          await strategy.handleUpload(blob, duration);
          const seconds = Math.floor(duration / 1e3);
          const m = Math.floor(seconds / 60).toString().padStart(2, "0");
          const s = (seconds % 60).toString().padStart(2, "0");
          const timestamp = Date.now();
          await StorageHelper.saveRecording({
            type: "audio",
            timestamp,
            site: strategy.name,
            url: recordingUrl,
            durationString: `${m}:${s}`,
            durationMs: duration,
            filename: generateAudioFilename()
          }, blob);
          startUrlWatcher(timestamp);
          injector.audioRecordingStartUrl = null;
        };
        const handleVideoUpload = async (result) => {
          const recordingUrl = injector.videoRecordingStartUrl || window.location.href;
          await strategy.handleVideoUpload(result);
          const seconds = Math.floor(result.duration / 1e3);
          const m = Math.floor(seconds / 60).toString().padStart(2, "0");
          const s = (seconds % 60).toString().padStart(2, "0");
          const timestamp = Date.now();
          await StorageHelper.saveRecording({
            type: "video",
            timestamp,
            site: strategy.name,
            url: recordingUrl,
            durationString: `${m}:${s}`,
            durationMs: result.duration,
            filename: `video_recording_${Date.now()}.webm`,
            format: result.format
          }, result.blob);
          console.log(`Screen recording uploaded: ${m}:${s} (${result.format.toUpperCase()})`);
          startUrlWatcher(timestamp);
          injector.videoRecordingStartUrl = null;
        };
        injector = new Injector(recorder, screenRecorder, handleAudioUpload, handleVideoUpload);
        const target = strategy.getInjectionTarget();
        injector.inject(target);
        const observer = new MutationObserver(() => {
          const newTarget = strategy.getInjectionTarget();
          const existingButton = document.getElementById("thoughtful-voice-btn");
          const existingScreenButton = document.getElementById("ai-screen-recorder-btn");
          if (!existingButton && newTarget) {
            injector.inject(newTarget);
          } else if (existingButton && newTarget) {
            const expectedParent = newTarget.container;
            const currentParent = existingButton.parentElement;
            if (currentParent !== expectedParent) {
              console.log("Thoughtful Voice: Button in wrong location, re-positioning...");
              existingButton.remove();
              if (existingScreenButton) existingScreenButton.remove();
              injector.inject(newTarget);
            }
          }
        });
        observer.observe(document.body, { childList: true, subtree: true });
      }
      setTimeout(init, 2e3);
    }
  });
  require_main();
})();

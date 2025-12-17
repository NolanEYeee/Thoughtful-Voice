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
          this.timerInterval = null;
          this.onTimerUpdate = null;
        }
        async start(onTimerUpdate) {
          this.onTimerUpdate = onTimerUpdate;
          this.audioBuffers = [];
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
              const input = e.inputBuffer.getChannelData(0);
              this.audioBuffers.push(new Float32Array(input));
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
        stop() {
          return new Promise(async (resolve) => {
            if (!this.recorder || !this.audioContext) {
              resolve(null);
              return;
            }
            this.recorder.disconnect();
            this.mediaStreamSource.disconnect();
            this.stopTimer();
            this.stream.getTracks().forEach((track) => track.stop());
            this.stream = null;
            const blob = this.exportWAV(this.audioBuffers, this.audioContext.sampleRate);
            if (this.audioContext.state !== "closed") {
              await this.audioContext.close();
            }
            this.recorder = null;
            this.audioContext = null;
            console.log("Recording stopped, WAV blob size:", blob.size);
            resolve({
              blob,
              duration: Date.now() - this.startTime
            });
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
        }
        async start(onTimerUpdate) {
          this.onTimerUpdate = onTimerUpdate;
          this.recordedChunks = [];
          try {
            const result = await chrome.storage.local.get(["settings"]);
            const settings = result.settings || {};
            const videoSettings = {
              codec: "vp9",
              resolution: "720p",
              bitrate: 2e3,
              fps: 30,
              timeslice: 1e3,
              ...settings.video || {}
            };
            console.log("Video settings:", videoSettings);
            const resolutionPresets = {
              "1080p": { width: 1920, height: 1080 },
              "720p": { width: 1280, height: 720 },
              "480p": { width: 854, height: 480 }
            };
            const resolution = resolutionPresets[videoSettings.resolution] || resolutionPresets["720p"];
            this.stream = await navigator.mediaDevices.getDisplayMedia({
              video: {
                displaySurface: "monitor",
                logicalSurface: true,
                cursor: "always",
                width: { ideal: resolution.width, max: 1920 },
                height: { ideal: resolution.height, max: 1080 },
                frameRate: { ideal: videoSettings.fps, max: 60 }
              },
              audio: true
            });
            let micStream = null;
            try {
              micStream = await navigator.mediaDevices.getUserMedia({
                audio: {
                  echoCancellation: true,
                  noiseSuppression: true,
                  sampleRate: 44100
                }
              });
            } catch (micError) {
              console.warn("Could not access microphone:", micError);
            }
            const audioTracks = [];
            const screenAudioTrack = this.stream.getAudioTracks()[0];
            if (screenAudioTrack) audioTracks.push(screenAudioTrack);
            if (micStream) {
              const micAudioTrack = micStream.getAudioTracks()[0];
              if (micAudioTrack) audioTracks.push(micAudioTrack);
            }
            let finalStream = this.stream;
            if (audioTracks.length > 1) {
              const audioContext = new AudioContext();
              const audioDestination = audioContext.createMediaStreamDestination();
              audioTracks.forEach((track) => {
                const source = audioContext.createMediaStreamSource(new MediaStream([track]));
                source.connect(audioDestination);
              });
              const videoTrack = this.stream.getVideoTracks()[0];
              finalStream = new MediaStream([
                videoTrack,
                ...audioDestination.stream.getAudioTracks()
              ]);
              this.micStream = micStream;
              this.audioContext = audioContext;
            } else if (micStream && audioTracks.length === 1) {
              const videoTrack = this.stream.getVideoTracks()[0];
              finalStream = new MediaStream([
                videoTrack,
                micStream.getAudioTracks()[0]
              ]);
              this.micStream = micStream;
            }
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
              // Convert kbps to bps
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
            this.startTimer();
            this.stream.getVideoTracks()[0].onended = () => {
              console.log("Screen sharing stopped by user");
              if (this.mediaRecorder && this.mediaRecorder.state === "recording") {
                this.stop();
              }
            };
            console.log(`Screen recording started for ${this.platform}`);
            console.log(`Settings: ${videoSettings.resolution} @ ${videoSettings.fps}fps, timeslice: ${videoSettings.timeslice}ms`);
            return true;
          } catch (error) {
            console.error("Error starting screen recording:", error);
            if (error.name !== "NotAllowedError") {
              alert("Could not start screen recording. Please check permissions.");
            }
            return false;
          }
        }
        stop() {
          return new Promise((resolve) => {
            if (!this.mediaRecorder) {
              resolve(null);
              return;
            }
            this.stopTimer();
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
              const rawBlob = new Blob(this.recordedChunks, { type: "video/webm" });
              const duration = Date.now() - this.startTime;
              console.log(`Raw WebM size: ${(rawBlob.size / 1024 / 1024).toFixed(2)} MB`);
              console.log(`Duration: ${Math.floor(duration / 1e3)} seconds`);
              let fixedBlob;
              try {
                console.log("Fixing WebM duration metadata...");
                fixedBlob = await (0, import_fix_webm_duration.default)(rawBlob, duration, { logger: false });
                console.log("WebM duration fixed successfully!");
              } catch (e) {
                console.warn("Could not fix WebM duration:", e);
                fixedBlob = rawBlob;
              }
              console.log(`Final WebM size: ${(fixedBlob.size / 1024 / 1024).toFixed(2)} MB`);
              this.mediaRecorder = null;
              this.recordedChunks = [];
              resolve({
                blob: fixedBlob,
                duration,
                format: "webm"
              });
            };
            if (this.mediaRecorder.state === "recording") {
              this.mediaRecorder.stop();
            } else {
              const blob = new Blob(this.recordedChunks, { type: "video/webm" });
              this.mediaRecorder = null;
              this.recordedChunks = [];
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
        constructor(recorder, screenRecorder, handleUpload, handleVideoUpload) {
          this.recorder = recorder;
          this.screenRecorder = screenRecorder;
          this.handleUpload = handleUpload;
          this.handleVideoUpload = handleVideoUpload;
          this.button = null;
          this.screenButton = null;
          this.isRecording = false;
          this.isScreenRecording = false;
          this.audioRecordingStartUrl = null;
          this.videoRecordingStartUrl = null;
        }
        createButton() {
          const btn = document.createElement("button");
          btn.id = "thoughtful-voice-btn";
          btn.innerHTML = "\u{1F399}\uFE0F";
          btn.className = "ai-voice-btn";
          btn.title = "Click to record audio";
          btn.onclick = async () => {
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
          btn.title = "Click to record screen + audio";
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
        async startRecording() {
          const startUrl = window.location.href;
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
          return startUrl;
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
        async startScreenRecording() {
          const startUrl = window.location.href;
          const started = await this.screenRecorder.start((time) => {
            if (this.screenButton) {
              this.screenButton.innerHTML = `\u{1F534} ${time}`;
            }
          });
          if (started) {
            this.isScreenRecording = true;
            this.screenButton.classList.add("screen-recording");
            this.screenButton.innerHTML = "\u{1F534} 00:00";
          }
          return startUrl;
        }
        async stopScreenRecording() {
          this.isScreenRecording = false;
          this.screenButton.classList.remove("screen-recording");
          this.screenButton.innerHTML = "\u23F3";
          const result = await this.screenRecorder.stop();
          this.screenButton.innerHTML = "\u{1F4FA}";
          if (result) {
            console.log("Screen recording completed:", result);
            await this.handleVideoUpload(result);
          }
        }
        inject(targetSpec) {
          if (!this.button) this.createButton();
          if (!this.screenButton) this.createScreenRecordButton();
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
              } catch (e) {
                console.warn("Injection failed with insertBefore, falling back to append", e);
                container.appendChild(this.button);
                container.appendChild(this.screenButton);
              }
            } else {
              container.appendChild(this.button);
              container.appendChild(this.screenButton);
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
          }
          console.log("Buttons injected (audio + screen)");
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

  // src/content/strategies/gemini.js
  var GeminiStrategy;
  var init_gemini = __esm({
    "src/content/strategies/gemini.js"() {
      init_config();
      GeminiStrategy = class {
        constructor() {
          this.name = "Gemini";
        }
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
          console.log("Thoughtful Voice: Looking for injection target...");
          const toolsContainer = document.querySelector(".toolbox-drawer-button-container");
          if (toolsContainer && toolsContainer.parentElement) {
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
              // Append to end of the row
            };
          }
          const uploadButton = document.querySelector('.upload-card-button, [class*="upload-button"]');
          if (uploadButton) {
            let parent = uploadButton.parentElement;
            while (parent && parent !== document.body) {
              const buttonChildren = parent.querySelectorAll('button, [role="button"]');
              if (buttonChildren.length > 1) {
                console.log("Thoughtful Voice: Found common parent with multiple buttons");
                return {
                  container: parent,
                  insertBefore: null
                };
              }
              parent = parent.parentElement;
            }
            if (uploadButton.parentElement) {
              console.log("Thoughtful Voice: Using upload button parent as fallback");
              return {
                container: uploadButton.parentElement,
                insertBefore: null
              };
            }
          }
          const micButton = document.querySelector('.speech_dictation_mic_button, [class*="mic-button"]');
          if (micButton && micButton.parentElement) {
            console.log("Thoughtful Voice: Found native mic button");
            return {
              container: micButton.parentElement,
              insertBefore: micButton.nextSibling
            };
          }
          const inputArea = document.querySelector('[role="textbox"]');
          if (inputArea && inputArea.parentElement) {
            console.log("Thoughtful Voice: Using textbox parent as last resort");
            const target = inputArea.parentElement.parentElement || document.body;
            return {
              container: target,
              insertBefore: null
            };
          }
          console.warn("Thoughtful Voice: No suitable injection target found");
          return null;
        }
        async handleUpload(blob, durationString) {
          console.log("GeminiStrategy: Handling upload via Clipboard Paste (Alternative Method)");
          const filename = generateAudioFilename();
          const file = new File([blob], filename, { type: "audio/wav" });
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
            await this.insertText();
          } catch (e) {
            console.error("Paste failed, falling back to Drag and Drop.", e);
            await this.performDragAndDrop(file);
          }
        }
        async insertText() {
          const textBox = document.querySelector('[role="textbox"]');
          if (textBox) {
            textBox.focus();
            const result = await chrome.storage.local.get(["promptText"]);
            const textToInsert = result.promptText || DEFAULT_PROMPT_TEXT;
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
        async handleVideoUpload(result) {
          console.log("GeminiStrategy: Handling video upload via Clipboard Paste");
          const blob = result.blob;
          const format = result.format || "webm";
          const now = /* @__PURE__ */ new Date();
          const dateStr = now.toLocaleDateString("zh-CN", { year: "numeric", month: "2-digit", day: "2-digit" }).replace(/\//g, "-");
          const timeStr = now.toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false }).replace(/:/g, "-");
          const filename = `Screen-${dateStr}_${timeStr}.${format}`;
          const mimeType = format === "mp4" ? "video/mp4" : "video/webm";
          const file = new File([blob], filename, { type: mimeType });
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
              clipboardData: dataTransfer
            });
            textBox.focus();
            textBox.dispatchEvent(pasteEvent);
            console.log(`GeminiStrategy: Video paste event dispatched (${format.toUpperCase()})`);
            await this.insertText();
          } catch (e) {
            console.error("Video paste failed, falling back to Drag and Drop.", e);
            await this.performDragAndDrop(file);
          }
        }
      };
    }
  });

  // src/content/strategies/chatgpt.js
  var ChatGPTStrategy;
  var init_chatgpt = __esm({
    "src/content/strategies/chatgpt.js"() {
      init_config();
      ChatGPTStrategy = class {
        constructor() {
          this.name = "ChatGPT";
        }
        async waitForDOM() {
          return new Promise((resolve) => {
            const check = () => {
              if (document.getElementById("prompt-textarea")) {
                resolve();
              } else {
                setTimeout(check, 500);
              }
            };
            check();
          });
        }
        getInjectionTarget() {
          const attachButton = document.querySelector('button[aria-label="Attach files"]');
          if (attachButton && attachButton.parentElement) {
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
                return {
                  container: inputWrapper,
                  insertBefore: firstButton.nextSibling
                };
              }
            }
          }
          return null;
        }
        async handleUpload(blob, durationString) {
          console.log("ChatGPTStrategy: Handling upload via Clipboard Paste");
          const filename = generateAudioFilename();
          const file = new File([blob], filename, { type: "audio/wav" });
          const textBox = document.getElementById("prompt-textarea");
          if (!textBox) {
            console.error("ChatGPT input not found");
            return;
          }
          try {
            const dataTransfer = new DataTransfer();
            dataTransfer.items.add(file);
            const pasteEvent = new ClipboardEvent("paste", {
              bubbles: true,
              cancelable: true,
              clipboardData: dataTransfer
            });
            textBox.focus();
            textBox.dispatchEvent(pasteEvent);
            console.log("ChatGPTStrategy: Paste event dispatched");
            await this.insertText(textBox);
          } catch (e) {
            console.error("ChatGPT Paste failed", e);
          }
        }
        async insertText(textBox) {
          if (textBox) {
            textBox.focus();
            const result = await chrome.storage.local.get(["promptText"]);
            const textToInsert = result.promptText || DEFAULT_PROMPT_TEXT;
            document.execCommand("insertText", false, textToInsert);
          }
        }
        async handleVideoUpload(result) {
          console.log("ChatGPTStrategy: Handling video upload via Clipboard Paste");
          const blob = result.blob;
          const format = result.format || "webm";
          const now = /* @__PURE__ */ new Date();
          const dateStr = now.toLocaleDateString("zh-CN", { year: "numeric", month: "2-digit", day: "2-digit" }).replace(/\//g, "-");
          const timeStr = now.toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false }).replace(/:/g, "-");
          const filename = `Screen-${dateStr}_${timeStr}.${format}`;
          const mimeType = format === "mp4" ? "video/mp4" : "video/webm";
          const file = new File([blob], filename, { type: mimeType });
          const textBox = document.getElementById("prompt-textarea");
          if (!textBox) {
            console.error("ChatGPT input not found");
            return;
          }
          try {
            const dataTransfer = new DataTransfer();
            dataTransfer.items.add(file);
            const pasteEvent = new ClipboardEvent("paste", {
              bubbles: true,
              cancelable: true,
              clipboardData: dataTransfer
            });
            textBox.focus();
            textBox.dispatchEvent(pasteEvent);
            console.log(`ChatGPTStrategy: Video paste event dispatched (${format.toUpperCase()})`);
            await this.insertText(textBox);
          } catch (e) {
            console.error("ChatGPT Video Paste failed", e);
          }
        }
      };
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
      init_gemini();
      init_chatgpt();
      init_config();
      console.log("Thoughtful Voice: Content script loaded");
      async function init() {
        const host = window.location.hostname;
        let strategy = null;
        if (host.includes("gemini.google.com")) {
          strategy = new GeminiStrategy();
        } else if (host.includes("chatgpt.com") || host.includes("openai.com")) {
          strategy = new ChatGPTStrategy();
        }
        if (!strategy) {
          console.log("Thoughtful Voice: Unknown platform");
          return;
        }
        console.log(`Thoughtful Voice: Using ${strategy.name}`);
        await strategy.waitForDOM();
        const bubbleRenderer = new BubbleRenderer();
        bubbleRenderer.init();
        const recorder = new Recorder();
        const screenRecorder = new ScreenRecorder(strategy.name.toLowerCase());
        let lastRecordingTimestamp = null;
        let urlUpdateWatcher = null;
        const startUrlWatcher = (timestamp, type) => {
          const initialUrl = window.location.href;
          lastRecordingTimestamp = timestamp;
          if (urlUpdateWatcher) {
            clearInterval(urlUpdateWatcher);
          }
          let watchDuration = 0;
          const maxWatchTime = 3e4;
          urlUpdateWatcher = setInterval(async () => {
            watchDuration += 500;
            const currentUrl = window.location.href;
            if (currentUrl !== initialUrl) {
              console.log(`Thoughtful Voice: URL changed from ${initialUrl} to ${currentUrl}`);
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
            // Use URL from when recording started
            durationString: `${m}:${s}`,
            filename: generateAudioFilename()
          }, blob);
          startUrlWatcher(timestamp, "audio");
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
            // Use URL from when recording started
            durationString: `${m}:${s}`,
            filename: `video_recording_${Date.now()}.webm`,
            format: result.format
          }, result.blob);
          console.log(`Screen recording uploaded: ${m}:${s} (${result.format.toUpperCase()})`);
          startUrlWatcher(timestamp, "video");
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
            const toolsContainer = document.querySelector(".toolbox-drawer-button-container");
            if (toolsContainer) {
              const expectedParent = toolsContainer.parentElement;
              const currentParent = existingButton.parentElement;
              if (currentParent !== expectedParent) {
                console.log("Thoughtful Voice: Button in wrong location, re-positioning...");
                existingButton.remove();
                if (existingScreenButton) existingScreenButton.remove();
                injector.inject(newTarget);
              }
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

# 🎙️ Thoughtful Voice

<div align="center">

![Thoughtful Voice](icons/icon128.png)

**Voice and screen recording for Gemini and ChatGPT**

Record your voice or screen and submit directly to AI - no transcription errors, no interruptions.

[![Chrome Extension](https://img.shields.io/badge/Chrome-Extension-4285F4?style=for-the-badge&logo=googlechrome&logoColor=white)](https://github.com/NolanEYeee/Thoughtful-Voice)
[![License](https://img.shields.io/badge/License-CC%20BY--NC--SA%204.0-lightgrey.svg?style=for-the-badge)](LICENSE)
[![Version](https://img.shields.io/badge/Version-1.0-blue.svg?style=for-the-badge)](https://github.com/NolanEYeee/Thoughtful-Voice/releases)

[Features](#-features) • [Installation](#-installation) • [Use Cases](#-use-cases) • [Development](#-development)

</div>

---

## 🎯 Why This Exists

AI voice typing and real-time screen sharing have limitations:
- Voice typing produces transcription errors that need manual correction
- Real-time screen sharing interrupts your explanation flow
- Complex tasks are hard to describe in text alone

This extension lets you record audio and screen content, then submit it as a complete package. The AI processes your actual voice and video, maintaining full context without interruptions.

---

## ✨ Features

### 🎤 Voice Recording
- Click to start/stop recording
- WAV format with adjustable bitrate
- Recordings automatically upload to Gemini or ChatGPT
- Optional custom prompts for AI context

### 📹 Screen Recording  
- Record your screen or specific windows
- Up to 1080p @ 60 FPS
- Adjustable bitrate (2.5-20 Mbps)
- Auto-fixes WebM duration metadata

### 🎨 Retro UI
- 1980s Walkman-inspired design
- Audio recordings displayed as cassette tapes
- Video recordings shown on CRT monitors
- Browse recording history organized by date and platform

### ⚙️ Customization
- Configure video/audio quality settings
- Set default prompts for uploaded media
- All preferences saved automatically

### 🌐 Platform Support
- ChatGPT (chatgpt.com, chat.openai.com)
- Gemini (gemini.google.com)

---

## 📸 Screenshots

### Main Interface - Retro Walkman Design
<div align="center">
  <img src="docs/screenshots/popup-interface.png" alt="Popup Interface" width="400"/>
  <p><i>Vintage cassette tape design for audio recordings and CRT monitor for videos</i></p>
</div>

### In-Action Recording
<div align="center">
  <img src="docs/screenshots/recording-demo.png" alt="Recording Demo" width="600"/>
  <p><i>Seamlessly integrated recording buttons in Gemini and ChatGPT</i></p>
</div>

---

## 🚀 Installation

### Option 1: Install from Chrome Web Store (Coming Soon)
*Extension is currently in review. Stay tuned!*

### Option 2: Manual Installation

1. **Download the Extension**
   ```bash
   git clone https://github.com/NolanEYeee/Thoughtful-Voice.git
   cd Thoughtful-Voice
   ```

2. **Install Dependencies**
   ```bash
   npm install
   ```

3. **Build the Extension**
   ```bash
   node build.js
   ```

4. **Load in Chrome**
   - Open Chrome and navigate to `chrome://extensions/`
   - Enable **Developer mode** (toggle in top-right corner)
   - Click **Load unpacked**
   - Select the `Thoughtful-Voice` folder
   - The extension icon should appear in your toolbar!

---

## 💼 Use Cases

### Complex Data Tasks
Upload an Excel file, show the data on screen, and explain what you need. The AI sees the actual structure and provides targeted solutions instead of generic formulas.

**Example:** "I need to calculate quarterly growth by region, but I'm not sure which columns to use or how to exclude outliers."

### Workflow Automation
Record yourself doing a multi-step process while narrating. Get automation scripts that match your actual workflow, not an idealized version.

**Example:** Screen record your daily copy-paste routine across different tools while explaining what you're doing and why.

### Code Debugging
Show your code, run it, let the error happen - all while explaining your thought process. The AI sees the full context and can spot issues you might not mention in text.

### Process Documentation
Explain a workflow by demonstrating it. Like explaining to a colleague, but the AI remembers everything perfectly.

**Example:** Show a messy downloads folder and explain how you want files auto-organized by type.

---

## 🛠️ Development

### Tech Stack

- **Frontend**: Vanilla JavaScript (ES6+), HTML5, CSS3
- **Build Tool**: esbuild
- **APIs**: MediaRecorder API, Chrome Extension API
- **Storage**: Chrome Storage API
- **Design**: Custom CSS with glassmorphism and retro aesthetics

### Project Structure

```
Thoughtful-Voice/
├── src/
│   ├── content/           # Content scripts injected into web pages
│   │   ├── strategies/    # Platform-specific injection strategies
│   │   ├── main.js        # Main content script
│   │   └── injector.js    # Button injection logic
│   ├── popup/             # Extension popup UI
│   │   └── popup.html     # Retro Walkman interface
│   ├── styles/            # CSS styles
│   └── utils/             # Helper utilities
├── dist/                  # Built files (generated)
├── icons/                 # Extension icons
├── manifest.json          # Chrome extension manifest
└── build.js               # Build configuration
```

### Building from Source

```bash
# Install dependencies
npm install

# Build the extension
node build.js

# The built files will be in the dist/ folder
```

### Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

## 🐛 Known Issues

- **WebM Duration**: Fixed automatically using `fix-webm-duration` library
- **Platform Changes**: AI platforms may update their UI; we'll keep the extension current

---

## 🗺️ Roadmap

- [ ] Chrome Web Store publication
- [ ] Support for more AI platforms (Claude, Poe, etc.)
- [ ] Keyboard shortcuts
- [ ] Multiple language support

---

## 📄 License

This project is licensed under the **Creative Commons Attribution-NonCommercial-ShareAlike 4.0 International License**. 

You are free to use, share, and modify this extension for **non-commercial purposes only**. See the [LICENSE](LICENSE) file for complete details.

---

## 📧 Contact

**Developer**: NolanEYeee

- GitHub: [@NolanEYeee](https://github.com/NolanEYeee)
- Project Link: [https://github.com/NolanEYeee/Thoughtful-Voice](https://github.com/NolanEYeee/Thoughtful-Voice)

---

<div align="center">

**⭐ If you find this extension helpful, please give it a star!**

Made with ❤️

</div>

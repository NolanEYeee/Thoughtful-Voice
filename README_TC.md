# 🎙️ Thoughtful Voice

<div align="center">

![Thoughtful Voice Banner](docs/screenshots/Thoughtful_Voice_promotional_banner_narrow.jpg)

**為 Gemini 和 ChatGPT 提供口述錄音和螢幕錄製功能**

錄製口述錄音或螢幕內容，直接提交給 AI - 不會識別錯誤，不會被打斷。

[![Chrome Web Store](https://img.shields.io/badge/Chrome-Web%20Store-4285F4?style=for-the-badge&logo=googlechrome&logoColor=white)](https://chromewebstore.google.com/detail/jpcnegghcigeekjdaiakedigfdhkmpdl)
[![License](https://img.shields.io/badge/License-CC%20BY--NC--SA%204.0-lightgrey.svg?style=for-the-badge)](LICENSE)
[![Version](https://img.shields.io/badge/Version-1.0-blue.svg?style=for-the-badge)](https://github.com/NolanEYeee/Thoughtful-Voice/releases)
[![Buy Me A Coffee](https://img.shields.io/badge/Buy%20Me%20A%20Coffee-Donate-FFDD00?style=for-the-badge&logo=buy-me-a-coffee&logoColor=black)](https://buymeacoffee.com/nolaneyeee)

[功能特性](#-功能特性) • [平台支持](#-平台支持) • [安裝指南](#-安裝指南) • [使用場景](#-使用場景) • [開發指南](#-開發指南)

[English](README.md) | [简体中文](README_CN.md) | 繁體中文

</div>


## 🎯 關於 Thoughtful Voice - 深思熟慮的語音模式

<img src="icons/icon128.png" align="right" width="120" style="margin-left: 20px;">

AI 語音輸入和實時螢幕共享都有局限性：
- 即便 AI 語音輸入也會識別錯誤，需要手動修正
- 實時螢幕共享會打斷你的講解思路
- 複雜任務用文字很難描述清楚

這個插件讓你先錄製口述錄音和螢幕內容，然後作為完整的包提交。AI 處理的是你的原始語音和影片，保持完整上下文，不會被打斷。

## 📸 截圖展示

### 主界面 - 復古隨身聽
<div align="center">
  <table>
    <tr>
      <td width="50%">
        <img src="docs/screenshots/empty_state_video.gif" alt="Empty State" width="100%">
      </td>
      <td width="50%">
        <img src="docs/screenshots/popup-interface.gif" alt="Main Interface" width="100%">
      </td>
    </tr>
  </table>
  <p><i>左：無記錄狀態 | 右：復古磁帶界面</i></p>
</div>

### 實時錄製

插件提供 **兩套 UI 風格**：

#### 🎨 預設風格
<div align="center">
  <img src="docs/screenshots/recording-demo-new-button.gif" alt="復古風格錄製" width="600"/>
  <p><i>更好看的風格 - 80年代隨身聽造型</i></p>
</div>

#### ⚡ 精簡風格
<div align="center">
  <img src="docs/screenshots/recording-demo.gif" alt="精簡風格錄製" width="600"/>
  <p><i>簡潔按鈕設計，輕量高效</i></p>
</div>

**共同功能**：兩種 UI 均支持錄製中隨時**暫停/恢復**，以及在錄製語音（或錄屏）過程中隨時**開啟/關閉靜音**

## ✨ 功能特性

| 功能 | 說明 |
|------|------|
| 🎤 口述錄音 | WAV 格式，可調位元率，支持本地下載保存，自動上傳 |
| 📹 螢幕錄製 | 最高 4K@120FPS，可調位元率，支持本地下載保存，自動修正時長元數據 |
| 🔄 歷史插入 | 從歷史記錄中重新上傳舊錄音/影片至當前 AI 頁面，無需重複錄製 |
| 🎨 復古界面 | 80 年代隨身聽風格，磁帶/CRT 設計，按日期平台瀏覽 |
| ⚙️ 自定義設置 | 影片/音訊質量參數，預設提示詞，自動保存偏好 |
| 🔍 智能溯源 | 自動追蹤錄製來源與對話 URL，點擊標識即可一鍵跳轉回 AI 聊天現場 |

## 🌐 平台支持

| 平台 | 域名 | 狀態 |
|------|------|------|
| Gemini ⭐ | gemini.google.com | ✅ 支持（推薦） |
| AI Studio ⭐ | aistudio.google.com | ✅ 支持（推薦） |
| Poe | poe.com | ✅ 支持 |
| ChatGPT | chatgpt.com, chat.openai.com | ✅ 支持 |
| Perplexity | perplexity.ai | ⚠️ 僅 UI (網站故障，不是我的鍋) |
| Perplexity Comet | - | ❌ 不支持 (首頁無法修改) |
| Claude | claude.ai | ❌ 不支持 (無法上傳音視頻) |
| Grok | x.com/i/grok grok.com | ❌ 不支持 (無法上傳音視頻) |

**⭐ 推薦 Gemini**：Gemini 原生支持超長上下文，多模態輸入（音訊+影片），且上下文非常大方，難以達到限制。

## 🚀 安裝指南

### 方式一：從 Chrome 應用商店安裝（推薦）🎯

[![Chrome Web Store](https://img.shields.io/badge/Chrome-Web%20Store-4285F4?style=for-the-badge&logo=googlechrome&logoColor=white)](https://chromewebstore.google.com/detail/jpcnegghcigeekjdaiakedigfdhkmpdl)

1. **訪問 Chrome 應用商店**
   - 點擊訪問 [Chrome 應用商店連結](https://chromewebstore.google.com/detail/jpcnegghcigeekjdaiakedigfdhkmpdl)
   - 點擊「添加至 Chrome」按鈕
   - 確認安裝，擴展圖示將出現在工具列中！

**優勢**：自動更新、安全可靠、一鍵安裝

### 方式二：從 Releases 下載

1. **下載最新版本**
   - 訪問 [Releases 頁面](https://github.com/NolanEYeee/Thoughtful-Voice/releases)
   - 下載最新版本的 `thoughtful-voice-v*.*.zip` 文件
   - 解壓 ZIP 文件到一個資料夾

2. **在 Chrome 中加載**
   - 打開 Chrome 並訪問 `chrome://extensions/`
   - 啟用右上角的**開發者模式**
   - 點擊**加載已解壓的擴展程序**
   - 選擇解壓後的資料夾
   - 擴展圖示應該會出現在工具列中！

### 方式三：從源碼構建

1. **克隆倉庫**
   ```bash
   git clone https://github.com/NolanEYeee/Thoughtful-Voice.git
   cd Thoughtful-Voice
   ```

2. **安裝依賴**
   ```bash
   npm install
   ```

3. **構建擴展**
   ```bash
   npm run build
   ```

4. **在 Chrome 中加載**
   - 打開 Chrome 並訪問 `chrome://extensions/`
   - 啟用右上角的**開發者模式**
   - 點擊**加載已解壓的擴展程序**
   - 選擇 `Thoughtful-Voice` 資料夾
   - 擴展圖示應該會出現在工具列中！


## 💼 使用場景

### 複雜數據任務
上傳 Excel 文件，展示數據，說明你需要什麼。AI 看到實際結構，給出針對性方案而非通用公式。

**示例：** "我需要算各地區季度增長率，但不確定用哪些列，也不知道怎麼排除異常值。"

### 工作流自動化
錄製你的多步驟操作過程並配上講解。得到匹配實際工作流的自動化腳本，不是理想化版本。

**示例：** 錄屏你日常在不同工具間複製粘貼的流程，邊做邊說明在做什麼、為什麼這麼做。

### 程式碼調試
展示程式碼、運行、讓錯誤出現 - 同時解釋你的思路。AI 看到完整上下文，能發現你可能不會在文字中提到的問題。

### 流程說明
通過演示來解釋工作流程。像跟同事解釋一樣，但 AI 會完美記住所有細節。

**示例：** 展示凌亂的下載資料夾，說明你希望按類型自動整理文件。


## 🛠️ 開發指南

### 技術棧

- **前端**：原生 JavaScript (ES6+)、HTML5、CSS3
- **構建工具**：esbuild
- **API**：MediaRecorder API、Chrome Extension API
- **儲存**：Chrome Storage API

### 從源碼構建

```bash
# 安裝依賴
npm install

# 構建擴展
node build.js

# 構建文件將在 dist/ 資料夾中
```

### 貢獻指南

歡迎貢獻！請隨時提交 Pull Request。

1. Fork 本倉庫
2. 創建你的功能分支 (`git checkout -b feature/AmazingFeature`)
3. 提交你的更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 開啟一個 Pull Request

## 🐛 已知問題

- **WebM 時長**：使用 `fix-webm-duration` 庫自動修復
- **平台變化**：AI 平台可能會更新其 UI；我們會儘量保持擴展同步更新
- **Perplexity 上傳問題**：截至 2025/12/19，Perplexity 官方站點存在無法上傳音訊和影片文件的故障（非插件問題）。插件已支持按鈕注入，但站點可能無法處理文件。
- **Grok / Claude 支持**：由於 Grok / Claude 官方網站目前完全不支持任何音訊或影片文件的上傳，因此該平台目前無法適配。

## 🗺️ 發展路線圖

- [x] 發佈到 Chrome 應用商店 ✅
- [x] 支持 Poe ✅
- [ ] 支持更多 AI 平台（Qwen 等）

## 📄 許可證

本項目採用 **知識共享署名-非商業性使用-相同方式共享 4.0 國際許可協議** (CC BY-NC-SA 4.0)。

你可以自由使用、分享和修改這個擴展，但**僅限於非商業用途**。詳見 [LICENSE](LICENSE) 文件（內含關於企業內部使用的商業使用補充說明）。

## 📧 聯繫方式

**開發者**：NolanEYeee

- GitHub: [@NolanEYeee](https://github.com/NolanEYeee)
- Twitter/X: [@owoNonlan](https://x.com/owoNonlan)
- 項目鏈結：[https://github.com/NolanEYeee/Thoughtful-Voice](https://github.com/NolanEYeee/Thoughtful-Voice)

<div align="center">

**⭐ 如果你覺得這個擴展有幫助，請給個Star！**

Made with ❤️

</div>

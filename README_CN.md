# 🎙️ Thoughtful Voice

<div align="center">

![Thoughtful Voice Banner](docs/screenshots/Thoughtful_Voice_promotional_banner_narrow.jpg)

**为 Gemini 和 ChatGPT 提供口述錄音和屏幕录制功能**

录制口述錄音或屏幕內容，直接提交给 AI - 不会识别错误，不会被打断。

[![Chrome Web Store](https://img.shields.io/badge/Chrome-Web%20Store-4285F4?style=for-the-badge&logo=googlechrome&logoColor=white)](https://chromewebstore.google.com/detail/jpcnegghcigeekjdaiakedigfdhkmpdl)
[![License](https://img.shields.io/badge/License-CC%20BY--NC--SA%204.0-lightgrey.svg?style=for-the-badge)](LICENSE)
[![Version](https://img.shields.io/badge/Version-1.0-blue.svg?style=for-the-badge)](https://github.com/NolanEYeee/Thoughtful-Voice/releases)
[![Buy Me A Coffee](https://img.shields.io/badge/Buy%20Me%20A%20Coffee-Donate-FFDD00?style=for-the-badge&logo=buy-me-a-coffee&logoColor=black)](https://buymeacoffee.com/nolaneyeee)

[功能特性](#-功能特性) • [平台支持](#-平台支持) • [安装指南](#-安装指南) • [使用场景](#-使用场景) • [开发指南](#-开发指南)

[English](README.md) | 简体中文

</div>


## 🎯 关于 Thoughtful Voice - 深思熟慮的語音模式

<img src="icons/icon128.png" align="right" width="120" style="margin-left: 20px;">

AI 語音輸入和實時屏幕共享都有局限性：
- 即便 AI 語音輸入也會識別錯誤，需要手動修正
- 實時屏幕共享會打斷你的講解思路
- 複雜任務用文字很難描述清楚

這個插件讓你先錄製口述錄音和屏幕內容，然後作為完整的包提交。AI 處理的是你的原始語音和視頻，保持完整上下文，不會被打斷。

## 📸 截图展示

### 主界面 - 复古随身听
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
  <p><i>左：无记录状态 | 右：复古磁带界面</i></p>
</div>

### 实时录制

插件提供 **两套 UI 风格**：

#### 🎨 默认风格
<div align="center">
  <img src="docs/screenshots/recording-demo-new-button.gif" alt="复古风格录制" width="600"/>
  <p><i>更好看的风格 - 80年代随身听造型</i></p>
</div>

#### ⚡ 精简风格
<div align="center">
  <img src="docs/screenshots/recording-demo.gif" alt="精简风格录制" width="600"/>
  <p><i>简洁按钮设计，轻量高效</i></p>
</div>

**共同功能**：两种 UI 均支持录制中随时**暂停/恢复**，以及在录制语音（或录屏）过程中随时**开启/关闭静音**

## ✨ 功能特性

| 功能 | 说明 |
|------|------|
| 🎤 口述錄音 | WAV 格式，可调比特率，支持本地下載保存，自动上传 |
| 📹 屏幕录制 | 最高 4K@120FPS，可调比特率，支持本地下載保存，自动修正时长元数据 |
| 🎨 复古界面 | 80 年代随身听风格，磁带/CRT 设计，按日期平台浏览 |
| ⚙️ 自定义设置 | 视频/音频质量参数，默认提示词，自动保存偏好 |
| 🔍 智能溯源 | 自动追踪录制来源与对话 URL，点击标识即可一键跳转回 AI 聊天现场 |

## 🌐 平台支持

| 平台 | 域名 | 状态 |
|------|------|------|
| Gemini ⭐ | gemini.google.com | ✅ 支持（推荐） |
| AI Studio ⭐ | aistudio.google.com | ✅ 支持（推荐） |
| ChatGPT | chatgpt.com, chat.openai.com | ✅ 支持 |
| Perplexity | perplexity.ai | ⚠️ 仅 UI (网站故障，不是我的锅) |
| Perplexity Comet | - | ❌ 不支持 (首页无法修改) |
| Claude | claude.ai | ❌ 不支持 (无法上传音视频) |
| Grok | x.com/i/grok grok.com | ❌ 不支持 (无法上传音视频) |

**⭐ 推荐 Gemini**：Gemini 原生支持超長上下文，多模态输入（音频+视频），且上下文非常大方，难以达到限制。

## 🚀 安装指南

### 方式一：从 Chrome 应用商店安装（推荐）🎯

[![Chrome Web Store](https://img.shields.io/badge/Chrome-Web%20Store-4285F4?style=for-the-badge&logo=googlechrome&logoColor=white)](https://chromewebstore.google.com/detail/jpcnegghcigeekjdaiakedigfdhkmpdl)

1. **访问 Chrome 应用商店**
   - 点击访问 [Chrome 应用商店链接](https://chromewebstore.google.com/detail/jpcnegghcigeekjdaiakedigfdhkmpdl)
   - 点击「添加至 Chrome」按钮
   - 确认安装，扩展图标将出现在工具栏中！

**优势**：自动更新、安全可靠、一键安装

### 方式二：从 Releases 下载

1. **下载最新版本**
   - 访问 [Releases 页面](https://github.com/NolanEYeee/Thoughtful-Voice/releases)
   - 下载最新版本的 `thoughtful-voice-v*.*.zip` 文件
   - 解压 ZIP 文件到一个文件夹

2. **在 Chrome 中加载**
   - 打开 Chrome 并访问 `chrome://extensions/`
   - 启用右上角的**开发者模式**
   - 点击**加载已解压的扩展程序**
   - 选择解压后的文件夹
   - 扩展图标应该会出现在工具栏中！

### 方式三：从源码构建

1. **克隆仓库**
   ```bash
   git clone https://github.com/NolanEYeee/Thoughtful-Voice.git
   cd Thoughtful-Voice
   ```

2. **安装依赖**
   ```bash
   npm install
   ```

3. **构建扩展**
   ```bash
   npm run build
   ```

4. **在 Chrome 中加载**
   - 打开 Chrome 并访问 `chrome://extensions/`
   - 启用右上角的**开发者模式**
   - 点击**加载已解压的扩展程序**
   - 选择 `Thoughtful-Voice` 文件夹
   - 扩展图标应该会出现在工具栏中！


## 💼 使用场景

### 复杂数据任务
上传 Excel 文件，展示数据，说明你需要什么。AI 看到实际结构，给出针对性方案而非通用公式。

**示例：** "我需要算各地区季度增长率，但不确定用哪些列，也不知道怎么排除异常值。"

### 工作流自动化
录制你的多步骤操作过程并配上讲解。得到匹配实际工作流的自动化脚本，不是理想化版本。

**示例：** 录屏你日常在不同工具间复制粘贴的流程，边做边说明在做什么、为什么这么做。

### 代码调试
展示代码、运行、让错误出现 - 同时解释你的思路。AI 看到完整上下文，能发现你可能不会在文字中提到的问题。

### 流程说明
通过演示来解释工作流程。像跟同事解释一样，但 AI 会完美记住所有细节。

**示例：** 展示凌乱的下载文件夹，说明你希望按类型自动整理文件。


## 🛠️ 开发指南

### 技术栈

- **前端**：原生 JavaScript (ES6+)、HTML5、CSS3
- **构建工具**：esbuild
- **API**：MediaRecorder API、Chrome Extension API
- **存储**：Chrome Storage API

### 从源码构建

```bash
# 安装依赖
npm install

# 构建扩展
node build.js

# 构建文件将在 dist/ 文件夹中
```

### 贡献指南

欢迎贡献！请随时提交 Pull Request。

1. Fork 本仓库
2. 创建你的功能分支 (`git checkout -b feature/AmazingFeature`)
3. 提交你的更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 开启一个 Pull Request

## 🐛 已知问题

- **WebM 时长**：使用 `fix-webm-duration` 库自动修复
- **平台变化**：AI 平台可能会更新其 UI；我們會尽量保持扩展同步更新
- **Perplexity 上传问题**：截至 2025/12/19，Perplexity 官方站点存在无法上传音频和视频文件的故障（非插件问题）。插件已支持按钮注入，但站点可能无法处理文件。
- **Grok / Claude 支持**：由于 Grok / Claude 官方网站目前完全不支持任何音频或视频文件的上传，因此该平台目前无法适配。

## 🗺️ 发展路线图

- [x] 发布到 Chrome 应用商店 ✅
- [ ] 支持更多 AI 平台（Poe、Qwen 等）

## 📄 许可证

本项目采用 **知识共享署名-非商业性使用-相同方式共享 4.0 国际许可协议** (CC BY-NC-SA 4.0)。

你可以自由使用、分享和修改这个扩展，但**仅限于非商业用途**。详见 [LICENSE](LICENSE) 文件（内含关于企业内部使用的商业使用补充说明）。

## 📧 联系方式

**开发者**：NolanEYeee

- GitHub: [@NolanEYeee](https://github.com/NolanEYeee)
- Twitter/X: [@owoNonlan](https://x.com/owoNonlan)
- 項目鏈結：[https://github.com/NolanEYeee/Thoughtful-Voice](https://github.com/NolanEYeee/Thoughtful-Voice)

<div align="center">

**⭐ 如果你觉得这个扩展有帮助，请给个Star！**

用 ❤️ 制作

</div>

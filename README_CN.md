# 🎙️ Thoughtful Voice

<div align="center">

![Thoughtful Voice](icons/icon128.png)

**为 Gemini 和 ChatGPT 提供口述錄音和屏幕录制功能**

录制口述錄音或屏幕內容，直接提交给 AI - 不会识别错误，不会被打断。

[![Chrome Extension](https://img.shields.io/badge/Chrome-Extension-4285F4?style=for-the-badge&logo=googlechrome&logoColor=white)](https://github.com/NolanEYeee/Thoughtful-Voice)
[![License](https://img.shields.io/badge/License-CC%20BY--NC--SA%204.0-lightgrey.svg?style=for-the-badge)](LICENSE)
[![Version](https://img.shields.io/badge/Version-1.0-blue.svg?style=for-the-badge)](https://github.com/NolanEYeee/Thoughtful-Voice/releases)

[功能特性](#-功能特性) • [平台支持](#-平台支持) • [安装指南](#-安装指南) • [使用场景](#-使用场景) • [开发指南](#-开发指南)

[English](README.md) | 简体中文

</div>


## 🎯 关于 Thoughtful Voice - 深思熟虑的语音模式

AI 语音输入和实时屏幕共享都有局限性：
- 即便 AI 语音输入也会识别错误，需要手动修正
- 实时屏幕共享会打断你的讲解思路
- 复杂任务用文字很难描述清楚

这个插件讓你先錄製口述錄音和屏幕內容，然後作為完整的包提交。AI 处理的是你的原始语音和视频，保持完整上下文，不会被打断。

## 📸 截图展示

### 主界面 - 复古随身听设计
<div align="center">
  <img src="docs/screenshots/popup-interface.png" alt="弹窗界面" width="400"/>
  <p><i>复古磁带，与 CRT 显示器</i></p>
</div>

### 实时录制
<div align="center">
  <img src="docs/screenshots/recording-demo.png" alt="录制演示" width="600"/>
  <p><i>在 AI Chat 中无缝集成的录制按钮</i></p>
</div>

## ✨ 功能特性

| 功能 | 说明 |
|------|------|
| 🎤 口述錄音 | WAV 格式，可调比特率，自动上传，支持自定义提示词 |
| 📹 屏幕录制 | 最高 4K@120FPS，可调比特率，自动修正时长元数据 |
| 🎨 复古界面 | 80 年代随身听风格，磁带/CRT 设计，按日期平台浏览 |
| ⚙️ 自定义设置 | 视频/音频质量参数，默认提示词，自动保存偏好 |

## 🌐 平台支持

| 平台 | 域名 | 状态 |
|------|------|------|
| Gemini ⭐ | gemini.google.com | ✅ 支持（推荐） |
| ChatGPT | chatgpt.com, chat.openai.com | ✅ 支持 |

**⭐ 推荐 Gemini**：Gemini 原生支持超長上下文，多模态输入（音频+视频），且上下文非常大方，难以达到限制。

## 🚀 安装指南

### 方式一：从 Releases 下载（推荐）🎯

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

### 方式二：Chrome 应用商店安装（即将推出）
*扩展目前正在申请中！*

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
- **设计**：自定义 CSS，含玻璃态和复古美学

### 项目结构

```
Thoughtful-Voice/
├── src/
│   ├── content/           # 注入到网页的内容脚本
│   │   ├── strategies/    # 平台特定注入策略
│   │   ├── main.js        # 主内容脚本
│   │   └── injector.js    # 按钮注入逻辑
│   ├── popup/             # 扩展弹窗 UI
│   │   └── popup.html     # 复古随身听界面
│   ├── styles/            # CSS 样式
│   └── utils/             # 辅助工具
├── dist/                  # 构建文件（自动生成）
├── icons/                 # 扩展图标
├── manifest.json          # Chrome 扩展清单
└── build.js               # 构建配置
```

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
- **平台变化**：AI 平台可能会更新其 UI；我们会保持扩展同步更新

## 🗺️ 发展路线图

- [ ] 发布到 Chrome 应用商店
- [ ] 支持更多 AI 平台（Claude、Poe 等）
- [ ] 键盘快捷键
- [ ] 多语言支持

## 📄 许可证

本项目采用 **知识共享署名-非商业性使用-相同方式共享 4.0 国际许可协议** (CC BY-NC-SA 4.0)。

你可以自由使用、分享和修改这个扩展，但**仅限于非商业用途**。详见 [LICENSE](LICENSE) 文件。

## 📧 联系方式

**开发者**：NolanEYeee

- GitHub: [@NolanEYeee](https://github.com/NolanEYeee)
- 项目链接：[https://github.com/NolanEYeee/Thoughtful-Voice](https://github.com/NolanEYeee/Thoughtful-Voice)

<div align="center">

**⭐ 如果你觉得这个扩展有帮助，请给个Star！**

用 ❤️ 制作

</div>

# Contributing to AI Voice Droper

First off, thank you for considering contributing to AI Voice Droper! 🎉

## 🤝 How Can I Contribute?

### Reporting Bugs

Before creating bug reports, please check the existing issues to avoid duplicates. When you create a bug report, include as many details as possible:

- **Use a clear and descriptive title**
- **Describe the exact steps to reproduce the problem**
- **Provide specific examples** (screenshots, code samples, etc.)
- **Describe the behavior you observed** and what you expected
- **Include details about your environment**:
  - OS version
  - Chrome version
  - Extension version
  - Which AI platform (ChatGPT/Gemini)

### Suggesting Features

Feature suggestions are welcome! Please:

- **Use a clear and descriptive title**
- **Provide a detailed description** of the suggested feature
- **Explain why this feature would be useful**
- **Include mockups or examples** if applicable

### Pull Requests

1. **Fork the repo** and create your branch from `main`
2. **Make your changes** following the code style guidelines below
3. **Test thoroughly** on both ChatGPT and Gemini
4. **Update documentation** if needed
5. **Write clear commit messages**
6. **Open a Pull Request** with a clear description

## 📝 Code Style Guidelines

### JavaScript

- Use ES6+ features (arrow functions, template literals, etc.)
- Use `const` and `let`, avoid `var`
- Use semicolons
- Use meaningful variable and function names
- Add comments for complex logic

```javascript
// Good
const recordingButton = document.createElement('button');
recordingButton.id = 'ai-voice-droper-btn';

// Bad
var btn = document.createElement('button');
btn.id = 'btn1';
```

### CSS

- Follow BEM naming convention where appropriate
- Use CSS custom properties for colors and common values
- Group related properties together
- Add comments for complex styles

```css
/* Good */
:root {
    --walkman-accent: #ff6b00;
}

.brand-logo {
    color: var(--walkman-accent);
}

/* Bad */
.logo {
    color: #ff6b00;
}
```

### HTML

- Use semantic HTML5 elements
- Include proper accessibility attributes (aria-labels, roles, etc.)
- Keep indentation consistent (4 spaces)

## 🏗️ Development Setup

1. **Clone your fork**
   ```bash
   git clone https://github.com/YOUR_USERNAME/AI-Voice-Droper.git
   cd AI-Voice-Droper
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Make your changes**
   - Source files are in `src/`
   - Main content scripts: `src/content/`
   - Popup UI: `src/popup/`
   - Utilities: `src/utils/`

4. **Build and test**
   ```bash
   node build.js
   ```

5. **Load extension in Chrome**
   - Go to `chrome://extensions/`
   - Enable Developer mode
   - Click "Load unpacked"
   - Select the project folder

6. **Test on both platforms**
   - Test on ChatGPT
   - Test on Gemini
   - Check recording, playback, and deletion features

## 🎯 What to Work On

Check out our [issues page](https://github.com/NolanEYeee/AI-Voice-Droper/issues) for:

- 🐛 **Bug fixes**: Issues labeled `bug`
- ✨ **New features**: Issues labeled `enhancement`
- 📚 **Documentation**: Issues labeled `documentation`
- 🎨 **UI improvements**: Issues labeled `design`

## 📋 Commit Message Guidelines

Use clear, descriptive commit messages:

```
✅ Good:
- "Add support for Poe.com platform"
- "Fix recording button position on Gemini"
- "Update settings modal animation timing"

❌ Bad:
- "fix bug"
- "update"
- "changes"
```

## 🧪 Testing Checklist

Before submitting a PR, ensure:

- [ ] Code builds without errors (`node build.js`)
- [ ] Extension loads in Chrome without errors
- [ ] Recording works on ChatGPT
- [ ] Recording works on Gemini
- [ ] Popup displays correctly
- [ ] Settings save properly
- [ ] No console errors
- [ ] UI looks good (check for visual glitches)

## 📄 License

By contributing, you agree that your contributions will be licensed under the CC BY-NC-SA 4.0 License (non-commercial use only).

## ❓ Questions?

Feel free to open an issue with the `question` label, or reach out to [@NolanEYeee](https://github.com/NolanEYeee).

---

Thank you for contributing! 🎙️

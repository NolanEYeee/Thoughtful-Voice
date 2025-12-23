---
description: 如何打包和发布扩展
---

# 发布扩展流程

## 步骤 1: 更新版本号

编辑 `manifest.json` 文件，更新版本号：

```json
{
  "version": "1.0"  // 改为新版本，如 "1.1" 或 "2.0"
}
```

## 步骤 2: 构建和打包

在项目根目录运行以下命令：

```bash
npm run package
```

这个命令会：
1. 自动运行构建脚本（`npm run build`）
2. 创建 `releases` 目录
3. 生成一个 ZIP 文件，命名格式为：`thoughtful-voice-v{版本号}.zip`

## 步骤 3: 验证打包文件

检查 `releases` 目录下生成的 ZIP 文件，确保包含了所有必要的文件：
- ✅ `manifest.json`
- ✅ `icons/` 目录
- ✅ `src/` 目录
- ✅ `dist/` 目录（构建后的文件）
- ✅ `LICENSE`
- ✅ `README.md`
- ✅ `README_CN.md`

## 步骤 4: 本地测试

在发布之前，建议先在本地测试打包后的扩展：

1. 在 Chrome 浏览器中打开 `chrome://extensions/`
2. 启用"开发者模式"
3. 点击"加载已解压的扩展程序"
4. 选择 ZIP 文件解压后的文件夹
5. 测试所有功能是否正常

## 步骤 5: 发布到 GitHub Releases

1. 提交所有更改并推送到 GitHub：
   ```bash
   git add .
   git commit -m "Release v{版本号}"
   git push
   ```

2. 在 GitHub 仓库页面：
   - 点击 "Releases" → "Create a new release"
   - Tag version: 输入 `v{版本号}`（如 `v1.0`）
   - Release title: `Thoughtful Voice v{版本号}`
   - 描述更新内容（中英文）
   - 上传 `releases/thoughtful-voice-v{版本号}.zip` 文件
   - 点击 "Publish release"

## 步骤 6: （可选）发布到 Chrome Web Store

如果你想在 Chrome Web Store 发布：

1. 访问 [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/devconsole/)
2. 登录你的 Google 开发者账号
3. 点击 "New Item" 或选择现有扩展
4. 上传 `releases/thoughtful-voice-v{版本号}.zip`
5. 填写扩展信息（描述、截图等）
6. 提交审核

## 注意事项

- ⚠️ 确保每次发布前都更新了版本号
- ⚠️ 检查所有功能在打包后是否正常工作
- ⚠️ 保持 README 文件更新，包含最新的功能说明
- ⚠️ 在 Release 说明中清晰列出变更内容

## 快速命令参考

```bash
# 仅构建（不打包）
npm run build

# 构建并打包
npm run package

# 查看打包结果
ls releases/
```
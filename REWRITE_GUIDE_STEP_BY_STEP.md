# 分步重写提交信息指南

## 准备工作
已完成：✅ 创建备份分支 `backup-before-rewrite`

## 方法：使用交互式 rebase

### 步骤 1：开始交互式 rebase
```bash
git rebase -i --root
```

### 步骤 2：编辑器会显示所有提交
将所有的 `pick` 改成 `reword` (简写 `r`)：

```
reword 3dc3a3a Initial commit: Add core extension structure
reword 2f5bda1 feat: Add Gemini integration and WAV audio recording
reword d14e1e5 feat: Reposition record button and finalize core functionality
reword 54c311b feat: Add vintage-styled popup UI for recording history
reword 49af180 feat: Add ChatGPT platform support
reword db956c3 feat: Add settings and GitHub buttons to UI
reword 8369200 feat: Add screen recording functionality
reword da4c674 fix: Resolve screen recording bugs
reword 418f751 feat: Add video recording storage support
reword 41d857c style: Enhance UI aesthetics
reword c973867 feat: Implement retro Walkman-style popup interface
reword 1f1d658 docs: Add README, license (CC BY-NC-SA 4.0), and contribution guidelines
```

### 步骤 3：保存并关闭编辑器

Git 会依次打开每个提交的编辑器让你修改。

### 步骤 4：按照下表修改每个提交信息

| 序号 | 旧提交信息 | 新提交信息 |
|------|-----------|-----------|
| 1 | first commit | `Initial commit: Add core extension structure` |
| 2 | feat: Add Gemini integration strategy and WAV audio recorder. | `feat: Add Gemini integration and WAV audio recording` |
| 3 | 將錄音按扭往右移，此插件已正式可用 | `feat: Reposition record button and finalize core functionality` |
| 4 | 實現瀏覽器擴展彈出窗口，用於使用復古牛皮紙樣式顯示和管理記錄歷史記錄。 | `feat: Add vintage-styled popup UI for recording history` |
| 5 | 支援ChatGPT | `feat: Add ChatGPT platform support` |
| 6 | 更新UI+設定按鈕+Github按鈕 | `feat: Add settings and GitHub buttons to UI` |
| 7 | 新增屏幕錄製功能 | `feat: Add screen recording functionality` |
| 8 | 屏幕錄製功能bug已修復 | `fix: Resolve screen recording bugs` |
| 9 | 支援儲存影片記錄 | `feat: Add video recording storage support` |
| 10 | 美觀UI | `style: Enhance UI aesthetics with retro Walkman design` |
| 11 | 彈出 UI 和內容腳本功能 | `feat: Implement retro Walkman-style popup interface` |
| 12 | Add initial project documentation, license, contribution guidelines, and screenshots. | `docs: Add README, license (CC BY-NC-SA 4.0), and contribution guidelines` |

### 步骤 5：完成后强制推送
```bash
git push -f origin main
```

## 如果出错
恢复到备份：
```bash
git reset --hard backup-before-rewrite
```

## 验证结果
```bash
git log --oneline
```

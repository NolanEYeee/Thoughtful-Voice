# 🔗 智能URL追蹤功能


## 問題描述

之前的來源追溯功能存在嚴重問題：

1. **錄音時** 📍 - 捕獲當前URL（例如：`chatgpt.com/c/conversation-123`）
2. **發送後** 🚀 - AI聊天室的URL會改變（`chatgpt.com/c/conversation-456`）
3. **結果** ❌ - 記錄的URL是舊的，用戶點擊後找不到原對話

### 視覺化流程：

```
舊系統（有問題）：                  新系統（智能追蹤）：
┌─────────────────┐                ┌─────────────────┐
│ 🎙️ 開始錄音     │                │ 🎙️ 開始錄音     │
│ URL: /c/old-123 │                │ URL: /c/old-123 │
└────────┬────────┘                └────────┬────────┘
         │                                  │
         ▼                                  ▼ 儲存URL
┌─────────────────┐                ┌─────────────────┐
│ 📤 發送音頻     │                │ 📤 發送音頻     │
│ URL: /c/new-456 │◄─ 已改變！     │ URL: /c/new-456 │
└────────┬────────┘                └────────┬────────┘
         │                                  │
         ▼                                  ▼ 啟動監聽
┌─────────────────┐                ┌─────────────────┐
│ 💾 保存記錄     │                │ ⏱️ URL監聽器   │
│ URL: /c/old-123 │◄─ 錯誤！       │ (每500ms檢查)   │
└─────────────────┘                └────────┬────────┘
         │                                  │ 偵測到變化
         ▼                                  ▼
┌─────────────────┐                ┌─────────────────┐
│ ❌ 點擊後找不到 │                │ 💾 自動更新URL  │
│ 原對話           │                │ URL: /c/new-456 │
└─────────────────┘                └────────┬────────┘
                                            │
                                            ▼
                                   ┌─────────────────┐
                                   │ ✅ 點擊正確跳轉 │
                                   │ 到新對話         │
                                   └─────────────────┘
```

### 實際案例：
- ChatGPT：發送訊息後會創建新對話，URL立即改變
- Gemini：URL可能延遲改變，需要等待一段時間

---

## 解決方案

### ✨ 智能URL追蹤系統

實現了一個**雙階段URL追蹤機制**：

#### 階段1：捕獲初始URL
- 當用戶**按下錄音按鈕**時，立即捕獲當前URL
- URL儲存在 `injector.audioRecordingStartUrl` 或 `injector.videoRecordingStartUrl`
- 這確保我們記錄的是**錄音開始時**的對話位置

#### 階段2：監聽URL變化
- 音頻上傳後，啟動**URL監聽器**
- 每500ms檢查一次URL是否改變
- 監聽持續30秒（足夠處理延遲更新的情況）
- 當檢測到URL改變時：
  - 📝 自動更新storage中的記錄
  - ✅ 停止監聽
  - 🔔 在console中記錄變化

---

## 技術實現

### 1. Injector.js
```javascript
// 添加URL追蹤欄位
constructor() {
    // ...
    this.audioRecordingStartUrl = null;
    this.videoRecordingStartUrl = null;
}

// 錄音開始時捕獲URL
async startRecording() {
    const startUrl = window.location.href;
    // ... 錄音邏輯
    return startUrl;
}

// 按鈕點擊時儲存URL
btn.onclick = async () => {
    if (this.isRecording) {
        await this.stopRecording();
    } else {
        const startUrl = await this.startRecording();
        this.audioRecordingStartUrl = startUrl;
    }
};
```

### 2. Main.js
```javascript
// URL變化監聽器
const startUrlWatcher = (timestamp, type) => {
    const initialUrl = window.location.href;
    
    urlUpdateWatcher = setInterval(async () => {
        const currentUrl = window.location.href;
        
        if (currentUrl !== initialUrl) {
            await StorageHelper.updateRecordingUrl(timestamp, currentUrl);
            clearInterval(urlUpdateWatcher);
        }
    }, 500);
};

// 音頻上傳處理器
const handleAudioUpload = async (blob, duration) => {
    const recordingUrl = injector.audioRecordingStartUrl || window.location.href;
    
    // 保存記錄
    await StorageHelper.saveRecording({
        url: recordingUrl,
        // ...
    }, blob);
    
    // 啟動URL監聽
    startUrlWatcher(timestamp, 'audio');
    
    // 重置URL
    injector.audioRecordingStartUrl = null;
};
```

### 3. Storage.js
```javascript
static async updateRecordingUrl(timestamp, newUrl) {
    const result = await chrome.storage.local.get(['recordings']);
    const recordings = result.recordings || [];
    
    const recording = recordings.find(rec => rec.timestamp === timestamp);
    if (recording) {
        recording.url = newUrl;
        await chrome.storage.local.set({ recordings });
        console.log(`Updated recording URL to: ${newUrl}`);
    }
}
```

---

## 工作流程

### 🎯 完整流程示例

```
1. 用戶在 chatgpt.com/c/old-conversation 開始錄音
   └─> 捕獲並儲存: injector.audioRecordingStartUrl = "chatgpt.com/c/old-conversation"

2. 用戶停止錄音並上傳
   └─> 使用儲存的URL保存記錄
   └─> URL: "chatgpt.com/c/old-conversation"

3. ChatGPT收到音頻，創建新對話
   └─> 瀏覽器URL改變: chatgpt.com/c/new-conversation

4. URL監聽器（每500ms）檢測到變化
   └─> 自動更新storage中的記錄
   └─> URL: "chatgpt.com/c/new-conversation" ✅

5. 用戶在popup中點擊記錄
   └─> 打開正確的對話！🎉
```

---

## 優點

✅ **自動追蹤** - 無需用戶手動操作  
✅ **兼容延遲** - 支持30秒內的URL變化  
✅ **性能優化** - 檢測到變化後立即停止監聽  
✅ **通用性強** - 支持音頻和視頻錄製  
✅ **可靠回退** - 如果URL不變，保持原始URL  

---

## 測試建議

### ChatGPT
1. 在現有對話中開始錄音
2. 發送音頻
3. 檢查URL是否立即改變
4. 確認popup中的記錄指向新對話

### Gemini
1. 在對話中開始錄音
2. 發送音頻
3. 等待幾秒
4. 確認URL更新被捕獲

---

## 配置參數

| 參數 | 值 | 說明 |
|------|-----|------|
| `檢查間隔` | 500ms | URL變化檢查頻率 |
| `最大監聽時間` | 30秒 | 超時後停止監聽 |
| `儲存方式` | timestamp | 使用時間戳匹配記錄 |

---

## 未來改進

- [ ] 添加手動刷新URL功能
- [ ] 支持用戶自定義監聽時長
- [ ] 添加URL變化通知
- [ ] 支持多次URL變化的情況

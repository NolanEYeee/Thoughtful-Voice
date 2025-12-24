# Privacy Policy for Thoughtful Voice

**Effective Date: December 24, 2024**

Thoughtful Voice ("we," "us," or "our") is committed to protecting your privacy. This Privacy Policy explains how we handle your information when you use the Thoughtful Voice Chrome Extension (the "Extension").

## 1. Information We Collect

### A. Media Content
The Extension allows you to record audio and screen content. 
*   **Audio Recording:** Captured via your microphone.
*   **Screen Recording:** Captured via the browser's display media API.
*   **Processing:** All recording processing happens **locally** on your device. We do not transmit your raw recordings to our own servers because we do not operate any servers for data storage.

### B. Usage Data & Metadata
We store certain metadata locally in your browser's storage to provide the "History" feature:
*   Timestamps of recordings.
*   The URL of the AI platform where the recording was made (e.g., chatgpt.com).
*   Recording duration and filenames.
*   User preferences (UI style, recording quality settings).

### C. No Personal Identification
We do not collect personal information such as your name, email address, IP address, or browsing history outside of the supported AI platforms.

## 2. How We Use Your Information

The information mentioned above is used solely for:
*   Providing the core functionality of recording and uploading media to AI platforms.
*   Displaying a local history of your recordings within the Extension popup.
*   Persistent storage of your personalized settings.

## 3. Data Storage and Security

*   **Local Storage:** All recordings and settings are stored in your browser's `chrome.storage.local`. 
*   **Media Persistence:** Recorded files are stored as Base64 encoded data in your browser's profile. They remain there until you manually delete them or uninstall the Extension.
*   **Security:** Since data is stored locally, its security depends on the security of your local device and browser profile.

## 4. Third-Party Services (AI Platforms)

When you use the Extension to upload a recording, the data is sent directly to the AI platform you are currently using (e.g., **OpenAI/ChatGPT**, **Google/Gemini**, or **Perplexity**). 
*   **Their Policies:** Once the data is uploaded to these platforms, it is subject to their respective privacy policies and terms of service. 
*   **No Interception:** We do not intercept, copy, or store your data on any mid-way servers during the upload process.

## 5. Permissions Justification

*   **`activeTab`:** Used to inject the recording UI and capture the current conversation URL for your history.
*   **`scripting`:** Used to facilitate the technical transfer of media to the AI chat interface.
*   **`storage` / `unlimitedStorage`:** Used to save your recording history and settings locally without size restrictions.
*   **`Host Permissions`:** Required to provide integrated recording buttons specifically on supported AI domains.

## 6. Your Rights and Choices

*   **Deletion:** You can delete individual recordings or clear your entire history at any time via the Extension settings/popup.
*   **Uninstallation:** Uninstalling the Extension will automatically remove all locally stored data associated with it.

## 7. Changes to This Policy

We may update this Privacy Policy from time to time. Any changes will be reflected by updating the "Effective Date" at the top of this page.

## 8. Contact Us

If you have any questions about this Privacy Policy, please contact us at:
[Insert Your Contact Email/Website Here]

---
*Note: This Extension is an independent tool and is not affiliated with, maintained, or endorsed by OpenAI, Google, or Perplexity.*

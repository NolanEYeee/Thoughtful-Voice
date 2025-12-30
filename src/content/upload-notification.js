/**
 * Upload Notification - CRT Retro Style
 * Industrial design matching plugin aesthetic
 */
export class UploadNotification {
    constructor() {
        this.notification = null;
        this.hideTimeout = null;
    }

    /**
     * Show upload notification
     */
    show(status = 'uploading') {
        this.hide(true);

        this.notification = document.createElement('div');
        this.notification.id = 'thoughtful-upload-notification';
        this.notification.className = status;

        this.notification.innerHTML = status === 'uploading'
            ? this._createUploadingContent()
            : this._createCompleteContent();

        document.body.appendChild(this.notification);
        this.notification.onclick = () => this.hide();

        // Trigger animation
        void this.notification.offsetHeight;
        this.notification.classList.add('visible');

        if (status === 'complete') {
            this.hideTimeout = setTimeout(() => this.hide(), 3000);
        }
    }

    /**
     * Transition to complete
     */
    showComplete() {
        if (this.hideTimeout) {
            clearTimeout(this.hideTimeout);
            this.hideTimeout = null;
        }

        if (this.notification) {
            this.notification.classList.remove('uploading');
            this.notification.classList.add('complete', 'pulse');
            this.notification.innerHTML = this._createCompleteContent();

            setTimeout(() => {
                if (this.notification) {
                    this.notification.classList.remove('pulse');
                }
            }, 200);

            this.hideTimeout = setTimeout(() => this.hide(), 3000);
        } else {
            this.show('complete');
        }
    }

    /**
     * Hide notification
     */
    hide(immediate = false) {
        if (this.hideTimeout) {
            clearTimeout(this.hideTimeout);
            this.hideTimeout = null;
        }

        if (this.notification) {
            if (immediate) {
                this.notification.remove();
                this.notification = null;
            } else {
                this.notification.classList.remove('visible');
                this.notification.classList.add('hiding');

                setTimeout(() => {
                    if (this.notification) {
                        this.notification.remove();
                        this.notification = null;
                    }
                }, 250);
            }
        }
    }

    _createUploadingContent() {
        return `
            <div class="notif-header">
                <div class="notif-led"></div>
                <span class="notif-label">SYS STATUS</span>
            </div>
            <div class="notif-content">
                <div class="notif-icon-wrap">
                    <div class="notif-spinner"></div>
                </div>
                <div class="notif-text">
                    <span class="notif-title">Uploading</span>
                    <span class="notif-desc">Processing file...</span>
                </div>
            </div>
        `;
    }

    _createCompleteContent() {
        return `
            <div class="notif-header">
                <div class="notif-led"></div>
                <span class="notif-label">SYS STATUS</span>
            </div>
            <div class="notif-content">
                <div class="notif-icon-wrap">
                    <div class="notif-check">
                        <svg viewBox="0 0 24 24">
                            <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
                        </svg>
                    </div>
                </div>
                <div class="notif-text">
                    <span class="notif-title">Complete</span>
                    <span class="notif-desc">File sent to chat</span>
                </div>
            </div>
        `;
    }
}

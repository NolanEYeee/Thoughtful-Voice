
export class AchievementSystem {
    constructor() {
        this.modal = null;
        this.stats = {
            lifetimeAudioMs: 0,
            lifetimeVideoMs: 0,
            totalRecordings: 0
        };
        this.init();
    }

    async init() {
        // Load initial stats
        await this.loadStats();
        this.createModal();
        this.attachTrigger();
        this.updateBadge();
    }

    async loadStats() {
        const result = await chrome.storage.local.get(['stats', 'recordings']);
        if (result.stats) {
            this.stats = result.stats;
        } else if (result.recordings && result.recordings.length > 0) {
            // Migration: calculate from existing recordings
            let audioMs = 0;
            let videoMs = 0;
            result.recordings.forEach(rec => {
                if (rec.type === 'audio') audioMs += (rec.durationMs || 0);
                else if (rec.type === 'video') videoMs += (rec.durationMs || 0);
            });
            this.stats = {
                lifetimeAudioMs: audioMs,
                lifetimeVideoMs: videoMs,
                totalRecordings: result.recordings.length
            };
            // Save migrated stats
            await chrome.storage.local.set({ stats: this.stats });
        }
    }

    updateBadge() {
        const rankText = document.getElementById('badge-rank-text');
        if (rankText) {
            const rank = this.calculateRank();
            rankText.textContent = rank.name;
        }
    }

    calculateRank() {
        const totalMinutes = (this.stats.lifetimeAudioMs + this.stats.lifetimeVideoMs) / 60000;
        if (totalMinutes > 60) return { name: 'PRO-ENGINEER', level: 4 };
        if (totalMinutes > 15) return { name: 'STUDIO-MASTER', level: 3 };
        if (totalMinutes > 5) return { name: 'SOUND-ARTIST', level: 2 };
        return { name: 'JUNIOR-OP', level: 1 };
    }

    createModal() {
        if (document.getElementById('achievement-modal')) return;

        this.modal = document.createElement('div');
        this.modal.id = 'achievement-modal';
        this.modal.className = 'modal-container'; // Styled in achievements.css

        const rank = this.calculateRank();
        const audioTime = this.formatTime(this.stats.lifetimeAudioMs);
        const videoTime = this.formatTime(this.stats.lifetimeVideoMs);

        this.modal.innerHTML = `
            <div class="achievement-content-wrapper" style="margin: 0 auto; max-width: 360px; border-radius: 12px; overflow: hidden; position: relative;">
                <!-- Hero Section -->
                <div class="achievement-hero">
                    <!-- Premium Cyber-Knob Badge -->
                    <a href="https://github.com/NolanEYeee/Thoughtful-Voice" target="_blank" class="studio-badge-large" style="width: 100px; height: 100px; border-radius: 50%;">
                        <div class="lens-chamber"></div>
                        <div class="lens-reflection"></div>
                        
                        <!-- Center Icon -->
                        <div class="badge-icon-container">
                            <div class="badge-icon-glow"></div>
                            <img src="../../icons/Thoughtful_Voice_icon.png" class="app-icon-badge" />
                        </div>
                        
                        <!-- Studio Label -->
                        <div class="studio-tag">
                            STUDIO
                        </div>
                    </a>

                    <div class="achievement-rank-title" style="margin-top: 15px; color: #ff6b00; font-family: 'Arial Black', sans-serif; font-size: 18px; letter-spacing: 4px; text-shadow: 0 0 20px rgba(255,107,0,0.4);">
                        ${rank.name}
                    </div>
                </div>

                <!-- Content Area -->
                <div style="padding: 20px;">
                    <div class="stats-grid">
                        <div class="stat-item">
                            <div class="stat-label">
                                <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor" style="vertical-align: middle; margin-right: 4px;"><path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/></svg>
                                Audio Session
                            </div>
                            <div class="stat-value">${audioTime}</div>
                        </div>
                        <div class="stat-item">
                            <div class="stat-label">
                                <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor" style="vertical-align: middle; margin-right: 4px;"><path d="M17 10.5V7c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.55 0 1-.45 1-1v-3.5l4 4v-11l-4 4z"/></svg>
                                Video Session
                            </div>
                            <div class="stat-value">${videoTime}</div>
                        </div>
                    </div>

                    <div style="margin-top: 25px;">
                        <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 15px;">
                            <div style="height: 1px; flex: 1; background: #333;"></div>
                            <div style="font-size: 8px; color: #555; text-transform: uppercase; letter-spacing: 2px; font-weight: bold;">Milestones</div>
                            <div style="height: 1px; flex: 1; background: #333;"></div>
                        </div>
                        
                        <div class="achievement-list">
                            ${this.renderMilestone('First Session', 'Initial recording saved', this.stats.totalRecordings >= 1)}
                            ${this.renderMilestone('Analog Lover', '10 min audio captured', this.stats.lifetimeAudioMs >= 600000)}
                            ${this.renderMilestone('Cinematographer', '10 min video recorded', this.stats.lifetimeVideoMs >= 600000)}
                            ${this.renderMilestone('Studio Veteran', '60 min total studio time', (this.stats.lifetimeAudioMs + this.stats.lifetimeVideoMs) >= 3600000)}
                        </div>
                    </div>

                    <button id="close-achievements" class="retro-btn primary" style="width: 100%; height: 40px; margin-top: 25px; font-size: 12px; letter-spacing: 2px;">EJECT STATION</button>
                </div>
            </div>
        `;

        document.body.appendChild(this.modal);

        this.modal.querySelector('#close-achievements').onclick = () => this.hide();
        this.modal.onclick = (e) => { if (e.target === this.modal) this.hide(); };
    }

    renderMilestone(name, req, unlocked) {
        return `
            <div class="milestone-item ${unlocked ? 'unlocked' : ''}">
                <div class="milestone-icon">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                        ${unlocked ? '<path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>' : '<path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zM9 6c0-1.66 1.34-3 3-3s3 1.34 3 3v2H9V6z"/>'}
                    </svg>
                </div>
                <div class="milestone-info">
                    <div class="milestone-name">${name}</div>
                    <div class="milestone-requirement">${req}</div>
                </div>
            </div>
        `;
    }

    formatTime(ms) {
        const totalSeconds = Math.floor(ms / 1000);
        const h = Math.floor(totalSeconds / 3600);
        const m = Math.floor((totalSeconds % 3600) / 60);
        const s = totalSeconds % 60;

        if (h > 0) return `${h}h ${m}m ${s}s`;
        return `${m}m ${s}s`;
    }

    attachTrigger() {
        const trigger = document.getElementById('achievement-trigger');
        if (trigger) {
            trigger.onclick = () => this.show();
        }
    }

    async show() {
        await this.loadStats(); // Refresh stats before showing
        this.updateModalContent();

        this.modal.classList.add('active');
        this.modal.classList.remove('hiding');
    }

    hide() {
        this.modal.classList.add('hiding');
        setTimeout(() => {
            this.modal.classList.remove('active');
            this.modal.classList.remove('hiding');
        }, 300);
    }

    updateModalContent() {
        // Just recreate the modal or update elements - for simplicity, we'll re-run createModal 
        // but a better way is to update specific elements. Let's just update the innerHTML for now.
        const rank = this.calculateRank();
        const audioTime = this.formatTime(this.stats.lifetimeAudioMs);
        const videoTime = this.formatTime(this.stats.lifetimeVideoMs);

        // Update values
        const statValues = this.modal.querySelectorAll('.stat-value');
        if (statValues[0]) statValues[0].textContent = audioTime;
        if (statValues[1]) statValues[1].textContent = videoTime;

        const rankTitle = this.modal.querySelector('.achievement-rank-title');
        if (rankTitle) rankTitle.textContent = rank.name;

        // Re-render milestones
        const list = this.modal.querySelector('.achievement-list');
        if (list) {
            list.innerHTML = `
                ${this.renderMilestone('Sound Engineer', '1st Recording Uploaded', this.stats.totalRecordings >= 1)}
                ${this.renderMilestone('Analog Lover', '10 Minutes Audio Record', this.stats.lifetimeAudioMs >= 600000)}
                ${this.renderMilestone('Cinematographer', '10 Minutes Video Record', this.stats.lifetimeVideoMs >= 600000)}
                ${this.renderMilestone('Studio Veteran', '60 Minutes Total Usage', (this.stats.lifetimeAudioMs + this.stats.lifetimeVideoMs) >= 3600000)}
            `;
        }

        this.updateBadge();
    }
}

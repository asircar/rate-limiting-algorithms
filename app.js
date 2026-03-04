/* =============================================
   Rate Limiting Algorithms — Interactive Engine
   ============================================= */

// ============================================
// Utility Functions
// ============================================
function formatTime(date) {
    return date.toLocaleTimeString('en-US', { 
        hour12: false, 
        hour: '2-digit', 
        minute: '2-digit', 
        second: '2-digit' 
    }) + '.' + String(date.getMilliseconds()).padStart(3, '0');
}

function addLogEntry(logId, status, detail, type = 'accepted') {
    const logEntries = document.getElementById(logId);
    const entry = document.createElement('div');
    entry.className = `log-entry ${type}`;
    entry.innerHTML = `
        <span class="log-time">${formatTime(new Date())}</span>
        <span class="log-status">${status}</span>
        <span class="log-detail">${detail}</span>
    `;
    logEntries.insertBefore(entry, logEntries.firstChild);

    // Keep only last 20 entries
    while (logEntries.children.length > 20) {
        logEntries.removeChild(logEntries.lastChild);
    }
}

// ============================================
// Floating Particles
// ============================================
function createParticles() {
    const container = document.getElementById('particles');
    const count = 30;
    for (let i = 0; i < count; i++) {
        const particle = document.createElement('div');
        particle.className = 'particle';
        particle.style.left = Math.random() * 100 + '%';
        particle.style.animationDuration = (15 + Math.random() * 20) + 's';
        particle.style.animationDelay = (Math.random() * 15) + 's';
        particle.style.width = (2 + Math.random() * 3) + 'px';
        particle.style.height = particle.style.width;
        container.appendChild(particle);
    }
}

// ============================================
// Intro Animation (Rain drops)
// ============================================
function createRainDrops() {
    const container = document.getElementById('requestRain');
    if (!container) return;
    
    setInterval(() => {
        const drop = document.createElement('div');
        drop.className = 'rain-drop';
        drop.style.left = (20 + Math.random() * 60) + '%';
        drop.style.animationDelay = '0s';
        container.appendChild(drop);
        setTimeout(() => drop.remove(), 2000);
    }, 400);
}

// ============================================
// 1. TOKEN BUCKET Algorithm
// ============================================
const tokenBucket = {
    tokens: 5,
    capacity: 5,
    refillRate: 1,
    refillInterval: null,

    init() {
        this.capacity = parseInt(document.getElementById('tb-capacity').value);
        this.tokens = this.capacity;
        this.refillRate = parseInt(document.getElementById('tb-refill').value);
        this.updateVisual();
        this.startRefill();

        // Parameter listeners
        document.getElementById('tb-capacity').addEventListener('input', (e) => {
            this.capacity = parseInt(e.target.value);
            document.getElementById('tb-capacity-val').textContent = this.capacity;
            this.tokens = Math.min(this.tokens, this.capacity);
            this.updateVisual();
        });

        document.getElementById('tb-refill').addEventListener('input', (e) => {
            this.refillRate = parseInt(e.target.value);
            document.getElementById('tb-refill-val').textContent = this.refillRate;
            this.startRefill();
        });

        // Action listeners
        document.getElementById('tb-send').addEventListener('click', () => this.handleRequest());
        document.getElementById('tb-burst').addEventListener('click', () => this.handleBurst());
        document.getElementById('tb-reset').addEventListener('click', () => this.reset());
    },

    startRefill() {
        if (this.refillInterval) clearInterval(this.refillInterval);
        this.refillInterval = setInterval(() => {
            if (this.tokens < this.capacity) {
                this.tokens = Math.min(this.tokens + 1, this.capacity);
                this.updateVisual();
                const indicator = document.getElementById('tb-refill-indicator');
                indicator.classList.add('active');
                setTimeout(() => indicator.classList.remove('active'), 800);
            }
        }, 1000 / this.refillRate);
    },

    handleRequest() {
        if (this.tokens > 0) {
            this.tokens--;
            this.updateVisual();
            addLogEntry('tb-log-entries', '✅ ALLOWED', `Token consumed (${this.tokens} remaining)`, 'accepted');
            this.animateTokenConsume();
        } else {
            addLogEntry('tb-log-entries', '❌ REJECTED', 'No tokens available', 'rejected');
            this.shakeEffect();
        }
    },

    handleBurst() {
        for (let i = 0; i < 5; i++) {
            setTimeout(() => this.handleRequest(), i * 100);
        }
    },

    animateTokenConsume() {
        const container = document.getElementById('tb-tokens-container');
        const tokens = container.querySelectorAll('.token:not(.consumed)');
        if (tokens.length > 0) {
            const lastToken = tokens[tokens.length - 1];
            lastToken.classList.add('consumed');
            setTimeout(() => lastToken.remove(), 400);
        }
    },

    shakeEffect() {
        const bucket = document.querySelector('.bucket-body');
        bucket.style.animation = 'none';
        bucket.offsetHeight; // trigger reflow
        bucket.style.animation = 'shake 0.3s ease';
    },

    updateVisual() {
        // Update fill level
        const fillPercent = (this.tokens / this.capacity) * 100;
        document.getElementById('tb-fill').style.height = fillPercent + '%';
        document.getElementById('tb-cap-label').textContent = `${this.tokens} / ${this.capacity}`;

        // Update tokens display
        const container = document.getElementById('tb-tokens-container');
        container.innerHTML = '';
        for (let i = 0; i < this.tokens; i++) {
            const token = document.createElement('div');
            token.className = 'token';
            token.textContent = '🪙';
            container.appendChild(token);
        }
    },

    reset() {
        this.tokens = this.capacity;
        this.updateVisual();
        document.getElementById('tb-log-entries').innerHTML = '';
        addLogEntry('tb-log-entries', '🔄 RESET', 'Bucket refilled to capacity', 'processed');
    }
};

// ============================================
// 2. LEAKING BUCKET Algorithm
// ============================================
const leakingBucket = {
    queue: [],
    queueSize: 5,
    leakRate: 1,
    processedCount: 0,
    leakInterval: null,

    init() {
        this.queueSize = parseInt(document.getElementById('lb-queue-size').value);
        this.leakRate = parseInt(document.getElementById('lb-leak-rate').value);
        this.startLeaking();
        this.updateVisual();

        document.getElementById('lb-queue-size').addEventListener('input', (e) => {
            this.queueSize = parseInt(e.target.value);
            document.getElementById('lb-queue-size-val').textContent = this.queueSize;
        });

        document.getElementById('lb-leak-rate').addEventListener('input', (e) => {
            this.leakRate = parseInt(e.target.value);
            document.getElementById('lb-leak-rate-val').textContent = this.leakRate;
            this.startLeaking();
        });

        document.getElementById('lb-send').addEventListener('click', () => this.handleRequest());
        document.getElementById('lb-burst').addEventListener('click', () => this.handleBurst());
        document.getElementById('lb-reset').addEventListener('click', () => this.reset());
    },

    startLeaking() {
        if (this.leakInterval) clearInterval(this.leakInterval);
        this.leakInterval = setInterval(() => {
            if (this.queue.length > 0) {
                this.queue.shift();
                this.processedCount++;
                this.updateVisual();
                addLogEntry('lb-log-entries', '🚰 PROCESSED', `Request leaked out (queue: ${this.queue.length}/${this.queueSize})`, 'processed');
            }
        }, 1000 / this.leakRate);
    },

    handleRequest() {
        if (this.queue.length < this.queueSize) {
            this.queue.push({ time: Date.now() });
            this.updateVisual();
            addLogEntry('lb-log-entries', '✅ QUEUED', `Added to queue (${this.queue.length}/${this.queueSize})`, 'accepted');
        } else {
            addLogEntry('lb-log-entries', '❌ DROPPED', 'Queue is full!', 'rejected');
        }
    },

    handleBurst() {
        for (let i = 0; i < 5; i++) {
            setTimeout(() => this.handleRequest(), i * 100);
        }
    },

    updateVisual() {
        const queueEl = document.getElementById('lb-queue');
        queueEl.innerHTML = '';
        
        if (this.queue.length === 0) {
            queueEl.innerHTML = '<span style="color: var(--text-muted); font-size: 13px;">Queue empty</span>';
        } else {
            this.queue.forEach((_, i) => {
                const item = document.createElement('div');
                item.className = 'lb-queue-item';
                item.textContent = '📨';
                queueEl.appendChild(item);
            });
        }

        queueEl.classList.toggle('full', this.queue.length >= this.queueSize);
        document.getElementById('lb-queue-cap').textContent = `${this.queue.length} / ${this.queueSize}`;
        document.getElementById('lb-processed-count').textContent = this.processedCount;
    },

    reset() {
        this.queue = [];
        this.processedCount = 0;
        this.updateVisual();
        document.getElementById('lb-log-entries').innerHTML = '';
        addLogEntry('lb-log-entries', '🔄 RESET', 'Queue cleared', 'processed');
    }
};

// ============================================
// 3. FIXED WINDOW COUNTER Algorithm
// ============================================
const fixedWindow = {
    count: 0,
    maxRequests: 5,
    windowSize: 10,
    windowStart: null,
    timerInterval: null,
    windowHistory: [],

    init() {
        this.maxRequests = parseInt(document.getElementById('fw-max-requests').value);
        this.windowSize = parseInt(document.getElementById('fw-window-size').value);
        this.startWindow();

        document.getElementById('fw-window-size').addEventListener('input', (e) => {
            this.windowSize = parseInt(e.target.value);
            document.getElementById('fw-window-size-val').textContent = this.windowSize;
            this.startWindow();
        });

        document.getElementById('fw-max-requests').addEventListener('input', (e) => {
            this.maxRequests = parseInt(e.target.value);
            document.getElementById('fw-max-requests-val').textContent = this.maxRequests;
            document.getElementById('fw-limit').textContent = this.maxRequests;
            this.updateVisual();
        });

        document.getElementById('fw-send').addEventListener('click', () => this.handleRequest());
        document.getElementById('fw-burst').addEventListener('click', () => this.handleBurst());
        document.getElementById('fw-reset').addEventListener('click', () => this.reset());
    },

    startWindow() {
        if (this.timerInterval) clearInterval(this.timerInterval);
        this.windowStart = Date.now();
        this.count = 0;
        this.updateVisual();

        this.timerInterval = setInterval(() => {
            const elapsed = (Date.now() - this.windowStart) / 1000;
            const remaining = Math.max(0, this.windowSize - elapsed);

            document.getElementById('fw-timer').textContent = remaining.toFixed(1) + 's';
            const progress = (elapsed / this.windowSize) * 100;
            document.getElementById('fw-progress-fill').style.width = Math.min(progress, 100) + '%';

            if (remaining <= 0) {
                // Window expired — save to history and reset
                this.windowHistory.push({
                    count: this.count,
                    max: this.maxRequests,
                    time: new Date(this.windowStart).toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })
                });
                this.updateHistory();
                addLogEntry('fw-log-entries', '🔄 WINDOW', `Window reset (was ${this.count}/${this.maxRequests})`, 'processed');
                this.windowStart = Date.now();
                this.count = 0;
                this.updateVisual();
            }
        }, 100);
    },

    handleRequest() {
        if (this.count < this.maxRequests) {
            this.count++;
            this.updateVisual();
            addLogEntry('fw-log-entries', '✅ ALLOWED', `Counter: ${this.count}/${this.maxRequests}`, 'accepted');
        } else {
            addLogEntry('fw-log-entries', '❌ REJECTED', `Window limit reached (${this.count}/${this.maxRequests})`, 'rejected');
        }
    },

    handleBurst() {
        for (let i = 0; i < 5; i++) {
            setTimeout(() => this.handleRequest(), i * 100);
        }
    },

    updateVisual() {
        const countEl = document.getElementById('fw-count');
        countEl.textContent = this.count;
        
        // Color coding
        const ratio = this.count / this.maxRequests;
        countEl.classList.remove('warning', 'danger');
        if (ratio >= 1) countEl.classList.add('danger');
        else if (ratio >= 0.7) countEl.classList.add('warning');

        // Bar fill
        const barFill = document.getElementById('fw-bar-fill');
        barFill.style.width = Math.min(ratio * 100, 100) + '%';
        barFill.classList.remove('warning', 'full');
        if (ratio >= 1) barFill.classList.add('full');
        else if (ratio >= 0.7) barFill.classList.add('warning');
    },

    updateHistory() {
        const container = document.getElementById('fw-history-entries');
        container.innerHTML = '';
        this.windowHistory.slice(-8).forEach(w => {
            const entry = document.createElement('div');
            entry.className = 'fw-history-entry';
            entry.textContent = `${w.time}: ${w.count}/${w.max}`;
            container.appendChild(entry);
        });
    },

    reset() {
        this.count = 0;
        this.windowHistory = [];
        this.windowStart = Date.now();
        this.updateVisual();
        document.getElementById('fw-history-entries').innerHTML = '';
        document.getElementById('fw-log-entries').innerHTML = '';
        addLogEntry('fw-log-entries', '🔄 RESET', 'Counter reset', 'processed');
    }
};

// ============================================
// 4. SLIDING WINDOW LOG Algorithm
// ============================================
const slidingLog = {
    timestamps: [],
    maxRequests: 5,
    windowSize: 10,
    canvas: null,
    ctx: null,
    animationFrame: null,

    init() {
        this.maxRequests = parseInt(document.getElementById('sl-max-requests').value);
        this.windowSize = parseInt(document.getElementById('sl-window-size').value);
        this.canvas = document.getElementById('sl-canvas');
        this.ctx = this.canvas.getContext('2d');
        this.resizeCanvas();
        this.startAnimation();

        window.addEventListener('resize', () => this.resizeCanvas());

        document.getElementById('sl-window-size').addEventListener('input', (e) => {
            this.windowSize = parseInt(e.target.value);
            document.getElementById('sl-window-size-val').textContent = this.windowSize;
        });

        document.getElementById('sl-max-requests').addEventListener('input', (e) => {
            this.maxRequests = parseInt(e.target.value);
            document.getElementById('sl-max-requests-val').textContent = this.maxRequests;
        });

        document.getElementById('sl-send').addEventListener('click', () => this.handleRequest());
        document.getElementById('sl-burst').addEventListener('click', () => this.handleBurst());
        document.getElementById('sl-reset').addEventListener('click', () => this.reset());
    },

    resizeCanvas() {
        if (!this.canvas) return;
        const rect = this.canvas.parentElement.getBoundingClientRect();
        this.canvas.width = rect.width;
        this.canvas.height = 120;
    },

    cleanupOld() {
        const now = Date.now();
        const cutoff = now - this.windowSize * 1000;
        this.timestamps = this.timestamps.filter(t => t.time >= cutoff);
    },

    getActiveCount() {
        this.cleanupOld();
        return this.timestamps.filter(t => t.active).length;
    },

    handleRequest() {
        this.cleanupOld();
        const activeCount = this.getActiveCount();

        if (activeCount < this.maxRequests) {
            this.timestamps.push({ time: Date.now(), active: true });
            addLogEntry('sl-log-entries', '✅ ALLOWED', `In window: ${activeCount + 1}/${this.maxRequests}`, 'accepted');
        } else {
            this.timestamps.push({ time: Date.now(), active: false });
            addLogEntry('sl-log-entries', '❌ REJECTED', `Window full: ${activeCount}/${this.maxRequests}`, 'rejected');
        }
        this.updateInfo();
        this.updateEntries();
    },

    handleBurst() {
        for (let i = 0; i < 5; i++) {
            setTimeout(() => this.handleRequest(), i * 100);
        }
    },

    updateInfo() {
        const active = this.getActiveCount();
        document.getElementById('sl-count').textContent = `${active} / ${this.maxRequests}`;
        document.getElementById('sl-timestamps').textContent = this.timestamps.length;
    },

    updateEntries() {
        const container = document.getElementById('sl-entries');
        container.innerHTML = '';
        const now = Date.now();
        const cutoff = now - this.windowSize * 1000;

        // Show last 20 timestamps
        const recent = this.timestamps.slice(-20);
        recent.forEach(t => {
            const entry = document.createElement('span');
            const isExpired = t.time < cutoff;
            entry.className = `sl-entry${isExpired ? ' expired' : ''}`;
            const age = ((now - t.time) / 1000).toFixed(1);
            entry.textContent = `${age}s ago`;
            container.appendChild(entry);
        });
    },

    startAnimation() {
        const draw = () => {
            if (!this.ctx || !this.canvas) return;
            const width = this.canvas.width;
            const height = this.canvas.height;
            const now = Date.now();

            this.ctx.clearRect(0, 0, width, height);

            // Background
            this.ctx.fillStyle = 'rgba(26, 26, 40, 0.5)';
            this.ctx.fillRect(0, 0, width, height);

            // Draw window overlay
            const windowWidth = width * 0.7;
            const windowX = width - windowWidth - 20;
            this.ctx.fillStyle = 'rgba(108, 92, 231, 0.08)';
            this.ctx.fillRect(windowX, 0, windowWidth, height);

            // Window border
            this.ctx.strokeStyle = 'rgba(108, 92, 231, 0.3)';
            this.ctx.lineWidth = 2;
            this.ctx.setLineDash([5, 5]);
            this.ctx.strokeRect(windowX, 0, windowWidth, height);
            this.ctx.setLineDash([]);

            // Window label
            this.ctx.fillStyle = 'rgba(162, 155, 254, 0.6)';
            this.ctx.font = '11px Inter';
            this.ctx.fillText(`Sliding Window (${this.windowSize}s)`, windowX + 8, 16);

            // Draw timeline
            const totalTimespan = this.windowSize * 1.5;
            const pixelsPerMs = width / (totalTimespan * 1000);

            // Time markers
            this.ctx.fillStyle = 'rgba(106, 106, 130, 0.4)';
            this.ctx.font = '10px JetBrains Mono';
            for (let s = 0; s <= totalTimespan; s += 2) {
                const x = width - (s * 1000 * pixelsPerMs);
                if (x < 0) break;
                this.ctx.fillText(`-${s}s`, x, height - 5);
                this.ctx.strokeStyle = 'rgba(106, 106, 130, 0.1)';
                this.ctx.lineWidth = 1;
                this.ctx.beginPath();
                this.ctx.moveTo(x, 25);
                this.ctx.lineTo(x, height - 15);
                this.ctx.stroke();
            }

            // Draw requests
            this.timestamps.forEach(t => {
                const age = now - t.time;
                const x = width - (age * pixelsPerMs);
                if (x < -10 || x > width + 10) return;

                const inWindow = age <= this.windowSize * 1000;
                const y = 30 + Math.random() * (height - 60);

                // Draw dot
                this.ctx.beginPath();
                this.ctx.arc(x, height / 2, 6, 0, Math.PI * 2);
                
                if (!t.active) {
                    this.ctx.fillStyle = 'rgba(225, 112, 85, 0.8)';
                } else if (inWindow) {
                    this.ctx.fillStyle = 'rgba(0, 184, 148, 0.8)';
                } else {
                    this.ctx.fillStyle = 'rgba(106, 106, 130, 0.3)';
                }
                this.ctx.fill();

                // Glow
                if (inWindow && t.active) {
                    this.ctx.beginPath();
                    this.ctx.arc(x, height / 2, 10, 0, Math.PI * 2);
                    this.ctx.fillStyle = 'rgba(0, 184, 148, 0.15)';
                    this.ctx.fill();
                }
            });

            // Update info
            this.updateInfo();
            this.updateEntries();

            this.animationFrame = requestAnimationFrame(draw);
        };
        draw();
    },

    reset() {
        this.timestamps = [];
        this.updateInfo();
        document.getElementById('sl-entries').innerHTML = '';
        document.getElementById('sl-log-entries').innerHTML = '';
        addLogEntry('sl-log-entries', '🔄 RESET', 'Log cleared', 'processed');
    }
};

// ============================================
// 5. SLIDING WINDOW COUNTER Algorithm
// ============================================
const slidingCounter = {
    prevCount: 0,
    currentCount: 0,
    maxRequests: 5,
    windowSize: 10,
    windowStart: null,
    timerInterval: null,

    init() {
        this.maxRequests = parseInt(document.getElementById('sc-max-requests').value);
        this.windowSize = parseInt(document.getElementById('sc-window-size').value);
        this.startWindow();

        document.getElementById('sc-window-size').addEventListener('input', (e) => {
            this.windowSize = parseInt(e.target.value);
            document.getElementById('sc-window-size-val').textContent = this.windowSize;
            this.startWindow();
        });

        document.getElementById('sc-max-requests').addEventListener('input', (e) => {
            this.maxRequests = parseInt(e.target.value);
            document.getElementById('sc-max-requests-val').textContent = this.maxRequests;
            this.updateVisual();
        });

        document.getElementById('sc-send').addEventListener('click', () => this.handleRequest());
        document.getElementById('sc-burst').addEventListener('click', () => this.handleBurst());
        document.getElementById('sc-reset').addEventListener('click', () => this.reset());
    },

    startWindow() {
        if (this.timerInterval) clearInterval(this.timerInterval);
        this.windowStart = Date.now();
        this.updateVisual();

        this.timerInterval = setInterval(() => {
            const elapsed = (Date.now() - this.windowStart) / 1000;
            const remaining = Math.max(0, this.windowSize - elapsed);

            document.getElementById('sc-timer').textContent = remaining.toFixed(1) + 's';

            // Update weight
            const overlapPercent = Math.max(0, (1 - elapsed / this.windowSize)) * 100;
            document.getElementById('sc-prev-weight').textContent = `Weight: ${overlapPercent.toFixed(0)}%`;

            this.updateFormula(overlapPercent);

            if (remaining <= 0) {
                // Rotate windows
                this.prevCount = this.currentCount;
                this.currentCount = 0;
                this.windowStart = Date.now();
                addLogEntry('sc-log-entries', '🔄 WINDOW', `Window rotated (prev: ${this.prevCount})`, 'processed');
                this.updateVisual();
            }
        }, 100);
    },

    getWeightedCount() {
        const elapsed = (Date.now() - this.windowStart) / 1000;
        const overlapPercent = Math.max(0, 1 - elapsed / this.windowSize);
        return this.prevCount * overlapPercent + this.currentCount;
    },

    handleRequest() {
        const weighted = this.getWeightedCount();

        if (weighted < this.maxRequests) {
            this.currentCount++;
            this.updateVisual();
            addLogEntry('sc-log-entries', '✅ ALLOWED', `Weighted: ${weighted.toFixed(1)}/${this.maxRequests}`, 'accepted');
        } else {
            addLogEntry('sc-log-entries', '❌ REJECTED', `Weighted limit reached (${weighted.toFixed(1)}/${this.maxRequests})`, 'rejected');
        }
    },

    handleBurst() {
        for (let i = 0; i < 5; i++) {
            setTimeout(() => this.handleRequest(), i * 100);
        }
    },

    updateVisual() {
        document.getElementById('sc-prev-count').textContent = this.prevCount;
        document.getElementById('sc-current-count').textContent = this.currentCount;
    },

    updateFormula(overlapPercent) {
        const weighted = this.prevCount * (overlapPercent / 100) + this.currentCount;
        const formulaDetail = `${this.prevCount} × ${overlapPercent.toFixed(0)}% + ${this.currentCount} = <strong>${weighted.toFixed(1)}</strong>`;
        document.getElementById('sc-formula-detail').innerHTML = formulaDetail;

        const statusEl = document.getElementById('sc-status');
        if (weighted >= this.maxRequests) {
            statusEl.textContent = `❌ Over limit (${weighted.toFixed(1)} / ${this.maxRequests})`;
            statusEl.className = 'sc-status over';
        } else {
            statusEl.textContent = `✅ Under limit (${weighted.toFixed(1)} / ${this.maxRequests})`;
            statusEl.className = 'sc-status under';
        }
    },

    reset() {
        this.prevCount = 0;
        this.currentCount = 0;
        this.windowStart = Date.now();
        this.updateVisual();
        document.getElementById('sc-log-entries').innerHTML = '';
        addLogEntry('sc-log-entries', '🔄 RESET', 'Counters reset', 'processed');
    }
};

// ============================================
// Smooth Scroll & Intersection Observer
// ============================================
function initScrollAnimations() {
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
            }
        });
    }, { 
        threshold: 0.1,
        rootMargin: '-50px'
    });

    document.querySelectorAll('.algo-section, .intro-section, .comparison-section').forEach(section => {
        section.style.opacity = '0';
        section.style.transform = 'translateY(30px)';
        section.style.transition = 'opacity 0.8s ease, transform 0.8s ease';
        observer.observe(section);
    });
}

// Add visible class styles
const style = document.createElement('style');
style.textContent = `
    .visible {
        opacity: 1 !important;
        transform: translateY(0) !important;
    }
    @keyframes shake {
        0%, 100% { transform: translateX(0); }
        20% { transform: translateX(-5px); }
        40% { transform: translateX(5px); }
        60% { transform: translateX(-3px); }
        80% { transform: translateX(3px); }
    }
`;
document.head.appendChild(style);

// ============================================
// Active Nav Link Highlighting
// ============================================
function initNavHighlighting() {
    const sections = document.querySelectorAll('.algo-section, .comparison-section');
    const navLinks = document.querySelectorAll('.nav-links a');

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const id = entry.target.id;
                navLinks.forEach(link => {
                    link.style.color = link.getAttribute('href') === `#${id}` 
                        ? 'var(--accent-secondary)' 
                        : '';
                });
            }
        });
    }, { threshold: 0.3 });

    sections.forEach(section => observer.observe(section));
}

// ============================================
// Initialize Everything
// ============================================
document.addEventListener('DOMContentLoaded', () => {
    createParticles();
    createRainDrops();
    
    tokenBucket.init();
    leakingBucket.init();
    fixedWindow.init();
    slidingLog.init();
    slidingCounter.init();

    initScrollAnimations();
    initNavHighlighting();
});

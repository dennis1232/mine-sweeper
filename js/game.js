'use strict';

/* ============================================================
   MINES 2026 — Minesweeper
   Class-based, modern JS. No frameworks required.
   ============================================================ */

const LEVELS = {
    beginner:     { rows: 6,  cols: 6,  mines: 6,  lives: 2, label: 'Beginner'     },
    intermediate: { rows: 16, cols: 16, mines: 40, lives: 3, label: 'Intermediate' },
    expert:       { rows: 16, cols: 30, mines: 99, lives: 3, label: 'Expert'       },
};

const NUM_CLASS = ['', 'n1', 'n2', 'n3', 'n4', 'n5', 'n6', 'n7', 'n8'];
const HINTS_PER_GAME = 3;

// Maximum cell size per level — will be shrunk if viewport is too narrow
const MAX_CELL = { beginner: 52, intermediate: 40, expert: 28 };

class MinesweeperGame {
    constructor() {
        this._level      = 'beginner';
        this._board      = [];
        this._running    = false;
        this._firstClick = true;
        this._minesLeft  = 0;
        this._lives      = 0;
        this._maxLives   = 0;
        this._hints      = HINTS_PER_GAME;
        this._revealed   = 0;
        this._elapsed    = 0;
        this._timerID    = null;
        this._muted      = false;

        this._stats = this._loadStats();
        this._bindElements();
        this._bindEvents();
        this.init();
    }

    /* ---- DOM refs ---- */
    _bindElements() {
        this._boardEl      = document.getElementById('board');
        this._mineCountEl  = document.getElementById('mine-count');
        this._timerEl      = document.getElementById('timer');
        this._resetBtn     = document.getElementById('reset-btn');
        this._resetIcon    = document.getElementById('reset-icon');
        this._livesEl      = document.getElementById('lives-display');
        this._hintBtn      = document.getElementById('hint-btn');
        this._hintCountEl  = document.getElementById('hint-count');
        this._overlay      = document.getElementById('overlay');
        this._overlayIcon  = document.getElementById('overlay-icon');
        this._overlayTitle = document.getElementById('overlay-title');
        this._overlaySub   = document.getElementById('overlay-subtitle');
        this._overlayStats = document.getElementById('overlay-stats');
        this._playAgainBtn = document.getElementById('play-again-btn');
        this._changeLvlBtn = document.getElementById('change-level-btn');
        this._statsModal   = document.getElementById('stats-modal');
        this._statsContent = document.getElementById('stats-content');
        this._statsBtn     = document.getElementById('stats-btn');
        this._closeStats   = document.getElementById('close-stats');
        this._resetStats   = document.getElementById('reset-stats-btn');
        this._muteBtn      = document.getElementById('mute-btn');
        this._sndWin       = document.getElementById('snd-win');
        this._sndLose      = document.getElementById('snd-lose');
    }

    /* ---- Event listeners ---- */
    _bindEvents() {
        // Difficulty tabs
        document.querySelectorAll('.diff-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                if (btn.dataset.level === this._level && !this._firstClick) return;
                document.querySelectorAll('.diff-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this._level = btn.dataset.level;
                this.init();
            });
        });

        this._resetBtn.addEventListener('click', () => this.init());

        this._hintBtn.addEventListener('click', () => this._useHint());

        this._playAgainBtn.addEventListener('click', () => {
            this._overlay.classList.add('hidden');
            this.init();
        });
        this._changeLvlBtn.addEventListener('click', () => {
            this._overlay.classList.add('hidden');
        });

        this._statsBtn.addEventListener('click', () => this._showStats());
        this._closeStats.addEventListener('click', () => this._statsModal.classList.add('hidden'));
        this._resetStats.addEventListener('click', () => this._doResetStats());
        this._statsModal.addEventListener('click', e => {
            if (e.target === this._statsModal) this._statsModal.classList.add('hidden');
        });

        this._muteBtn.addEventListener('click', () => this._toggleMute());

        // Block browser context menu on the board
        this._boardEl.addEventListener('contextmenu', e => e.preventDefault());

        // Recalculate cell size on resize (e.g. device rotate)
        window.addEventListener('resize', () => this._applyCellSize(), { passive: true });

        // Keyboard shortcuts
        document.addEventListener('keydown', e => {
            if (e.key === 'r' || e.key === 'R') this.init();
            if (e.key === 'h' || e.key === 'H') this._useHint();
            if (e.key === 'Escape') {
                this._overlay.classList.add('hidden');
                this._statsModal.classList.add('hidden');
            }
        });
    }

    /* ====================================================
       INIT
       ==================================================== */
    init() {
        const lvl = LEVELS[this._level];

        clearInterval(this._timerID);

        this._board      = [];
        this._running    = false;
        this._firstClick = true;
        this._minesLeft  = lvl.mines;
        this._lives      = lvl.lives;
        this._maxLives   = lvl.lives;
        this._hints      = HINTS_PER_GAME;
        this._revealed   = 0;
        this._elapsed    = 0;

        // Update UI counters / icons
        this._mineCountEl.textContent = this._minesLeft;
        this._timerEl.textContent     = '0:00';
        this._resetIcon.textContent   = '🙂';
        this._hintCountEl.textContent = this._hints;
        this._hintBtn.disabled        = false;

        this._applyCellSize();

        this._renderLives();
        this._buildAndRenderBoard();
    }

    /* Compute the right cell size so the board always fits the screen */
    _applyCellSize() {
        const { cols } = LEVELS[this._level];
        const max = MAX_CELL[this._level];

        // Available board width = viewport minus wrapper padding (40px) and board padding (36px)
        const gap       = 3; // px between cells
        const available = window.innerWidth - 40 - 36 - (cols - 1) * gap;
        const fromVW    = Math.floor(available / cols);
        const size      = Math.max(24, Math.min(max, fromVW));

        document.documentElement.style.setProperty('--cell-size', size + 'px');
    }

    /* ====================================================
       BOARD BUILD
       ==================================================== */
    _buildAndRenderBoard() {
        const { rows, cols } = LEVELS[this._level];

        // Build 2-D data array
        this._board = Array.from({ length: rows }, (_, r) =>
            Array.from({ length: cols }, (_, c) => ({
                r, c,
                mine: false, revealed: false, flagged: false, count: 0,
            }))
        );

        // Build DOM grid
        this._boardEl.style.gridTemplateColumns = `repeat(${cols}, var(--cell-size))`;
        this._boardEl.innerHTML = '';

        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                const el = document.createElement('div');
                el.className = 'cell';
                el.dataset.r = r;
                el.dataset.c = c;
                this._addCellListeners(el, r, c);
                this._boardEl.appendChild(el);
            }
        }
    }

    /* Touch-aware event listeners per cell */
    _addCellListeners(el, r, c) {
        // Desktop right-click → flag
        el.addEventListener('contextmenu', e => { e.preventDefault(); this._onFlag(r, c); });

        // Mobile long-press → flag; short tap → reveal
        let timer      = null;
        let longFired  = false;

        el.addEventListener('touchstart', () => {
            longFired = false;
            timer = setTimeout(() => {
                longFired = true;
                this._onFlag(r, c);
                if (navigator.vibrate) navigator.vibrate(40);
            }, 450);
        }, { passive: true });

        el.addEventListener('touchmove',  () => { clearTimeout(timer); }, { passive: true });
        el.addEventListener('touchend',   () => { clearTimeout(timer); });

        // Click fires on both desktop and mobile tap; suppress after long-press
        el.addEventListener('click', () => {
            if (longFired) { longFired = false; return; }
            this._onCellClick(r, c);
        });
    }

    /* ---- Place mines after first click (guarantees safe start area) ---- */
    _placeMines(safeR, safeC) {
        const { rows, cols, mines } = LEVELS[this._level];

        // Collect candidate cells (exclude 3×3 around first click)
        const candidates = [];
        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                if (Math.abs(r - safeR) > 1 || Math.abs(c - safeC) > 1) {
                    candidates.push([r, c]);
                }
            }
        }

        // Fisher-Yates shuffle, take first `mines` entries
        for (let i = candidates.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [candidates[i], candidates[j]] = [candidates[j], candidates[i]];
        }
        candidates.slice(0, mines).forEach(([r, c]) => {
            this._board[r][c].mine = true;
        });

        // Compute neighbour counts for all cells
        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                if (!this._board[r][c].mine) {
                    this._board[r][c].count = this._countNeighbourMines(r, c);
                }
            }
        }
    }

    /* ---- Neighbour helpers ---- */
    _neighbours(r, c) {
        const { rows, cols } = LEVELS[this._level];
        const result = [];
        for (let dr = -1; dr <= 1; dr++) {
            for (let dc = -1; dc <= 1; dc++) {
                if (dr === 0 && dc === 0) continue;
                const nr = r + dr, nc = c + dc;
                if (nr >= 0 && nr < rows && nc >= 0 && nc < cols) result.push([nr, nc]);
            }
        }
        return result;
    }

    _countNeighbourMines(r, c) {
        return this._neighbours(r, c).filter(([nr, nc]) => this._board[nr][nc].mine).length;
    }

    /* ====================================================
       CLICK HANDLERS
       ==================================================== */
    _onCellClick(r, c) {
        const cell = this._board[r][c];

        if (cell.flagged) return;

        // Chord: clicking a revealed number with enough flags around it
        if (cell.revealed && cell.count > 0) {
            this._chord(r, c);
            return;
        }

        if (cell.revealed) return;
        if (!this._firstClick && !this._running) return;

        // First click — place mines now so first click is always safe
        if (this._firstClick) {
            this._firstClick = false;
            this._running    = true;
            this._placeMines(r, c);
            this._startTimer();
        }

        if (cell.mine) {
            this._hitMine(r, c);
        } else {
            this._reveal(r, c);
            this._checkWin();
        }
    }

    _onFlag(r, c) {
        const cell = this._board[r][c];
        if (cell.revealed || (!this._running && this._firstClick)) return;

        cell.flagged = !cell.flagged;
        this._minesLeft += cell.flagged ? -1 : 1;
        this._mineCountEl.textContent = this._minesLeft;

        const el = this._cellEl(r, c);
        if (cell.flagged) {
            el.classList.add('flagged');
        } else {
            el.classList.remove('flagged');
        }
    }

    /* ---- Reveal a cell (recursive flood-fill for zeros) ---- */
    _reveal(r, c, delay = 0) {
        const cell = this._board[r][c];
        if (cell.revealed || cell.flagged) return;

        cell.revealed = true;
        this._revealed++;

        const el = this._cellEl(r, c);
        el.classList.remove('flagged');

        setTimeout(() => {
            el.classList.add('revealed');
            if (cell.count > 0) {
                el.textContent = cell.count;
                el.classList.add(NUM_CLASS[cell.count]);
            }
        }, delay);

        // Flood-fill empty cells with staggered animation
        if (cell.count === 0) {
            this._neighbours(r, c).forEach(([nr, nc], i) => {
                this._reveal(nr, nc, delay + (i + 1) * 14);
            });
        }
    }

    /* ---- Chord click ---- */
    _chord(r, c) {
        const cell = this._board[r][c];
        const nbrs = this._neighbours(r, c);
        const flagCount = nbrs.filter(([nr, nc]) => this._board[nr][nc].flagged).length;

        if (flagCount !== cell.count) return;

        let hitMine = false;
        nbrs.forEach(([nr, nc]) => {
            const nb = this._board[nr][nc];
            if (!nb.revealed && !nb.flagged) {
                if (nb.mine) {
                    this._hitMine(nr, nc);
                    hitMine = true;
                } else {
                    this._reveal(nr, nc);
                }
            }
        });

        if (!hitMine) this._checkWin();
    }

    /* ---- Hit a mine ---- */
    _hitMine(r, c) {
        const el = this._cellEl(r, c);
        el.classList.add('mine-hit', 'revealed');
        el.textContent = '💥';

        this._lives--;
        this._renderLives();
        this._resetIcon.textContent = '😱';

        if (this._lives <= 0) {
            setTimeout(() => this._gameOver(false), 350);
        } else {
            // Quick recover face
            setTimeout(() => {
                if (this._running) this._resetIcon.textContent = '😬';
            }, 900);
        }
    }

    /* ====================================================
       WIN / LOSE
       ==================================================== */
    _checkWin() {
        const { rows, cols, mines } = LEVELS[this._level];
        if (this._revealed >= rows * cols - mines) {
            this._gameOver(true);
        }
    }

    _gameOver(won) {
        this._running = false;
        clearInterval(this._timerID);

        this._revealAllMines(won);

        if (won) {
            this._resetIcon.textContent = '🎉';
            this._saveStats(true, this._elapsed);
            this._animateWin();
            setTimeout(() => this._showOverlay(true), 600);
        } else {
            this._resetIcon.textContent = '😵';
            this._saveStats(false, this._elapsed);
            setTimeout(() => this._showOverlay(false), 800);
        }
    }

    _revealAllMines(won) {
        const { rows, cols } = LEVELS[this._level];
        let delay = 0;
        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                const cell = this._board[r][c];
                const el   = this._cellEl(r, c);
                if (cell.mine && !el.classList.contains('mine-hit')) {
                    const d = delay;
                    delay += 18;
                    setTimeout(() => {
                        el.classList.add('mine-shown', 'revealed');
                        el.textContent = '💣';
                    }, d);
                } else if (!cell.mine && cell.flagged) {
                    // Wrong flag
                    el.classList.remove('flagged');
                    el.classList.add('wrong-flag', 'revealed');
                    el.textContent = '';
                }
            }
        }

        // Play sound
        if (!this._muted) {
            const snd = won ? this._sndWin : this._sndLose;
            snd.currentTime = 0;
            snd.play().catch(() => {});
        }
    }

    _animateWin() {
        const cells = Array.from(this._boardEl.querySelectorAll('.cell.revealed'));
        cells.forEach((el, i) => {
            setTimeout(() => el.classList.add('won-wave'), i * 8);
        });
    }

    _showOverlay(won) {
        const lvl   = LEVELS[this._level];
        const stats = this._stats[this._level];

        this._overlayIcon.textContent  = won ? '🏆' : '💥';
        this._overlayTitle.textContent = won ? 'You Won!' : 'Game Over';
        this._overlayTitle.style.color = won ? 'var(--green)' : 'var(--red)';
        this._overlaySub.textContent   = `${lvl.label} — ${won ? 'all mines cleared' : 'better luck next time'}`;

        const fmtTime = s => `${Math.floor(s/60)}:${String(s%60).padStart(2,'0')}`;
        const bestStr = stats.best ? fmtTime(stats.best) : '—';

        this._overlayStats.innerHTML = `
            <div class="stat-item">
                <span class="stat-value">${fmtTime(this._elapsed)}</span>
                <span class="stat-label">Time</span>
            </div>
            <div class="stat-item">
                <span class="stat-value">${stats.wins}</span>
                <span class="stat-label">Wins</span>
            </div>
            <div class="stat-item">
                <span class="stat-value">${bestStr}</span>
                <span class="stat-label">Best</span>
            </div>
        `;

        this._overlay.classList.remove('hidden');
    }

    /* ====================================================
       HINT
       ==================================================== */
    _useHint() {
        if (!this._running || this._hints <= 0) return;

        // Find a random safe, unrevealed, unflagged cell
        const safe = [];
        for (const row of this._board) {
            for (const cell of row) {
                if (!cell.mine && !cell.revealed && !cell.flagged) safe.push(cell);
            }
        }

        if (safe.length === 0) return;

        this._hints--;
        this._hintCountEl.textContent = this._hints;
        if (this._hints === 0) this._hintBtn.disabled = true;

        const pick = safe[Math.floor(Math.random() * safe.length)];
        const el   = this._cellEl(pick.r, pick.c);

        el.classList.add('hint-glow');
        this._resetIcon.textContent = '🔍';

        setTimeout(() => {
            el.classList.remove('hint-glow');
            if (this._running) this._resetIcon.textContent = '🙂';
        }, 3000);
    }

    /* ====================================================
       TIMER
       ==================================================== */
    _startTimer() {
        this._timerID = setInterval(() => {
            this._elapsed++;
            const m = Math.floor(this._elapsed / 60);
            const s = this._elapsed % 60;
            this._timerEl.textContent = `${m}:${String(s).padStart(2, '0')}`;
        }, 1000);
    }

    /* ====================================================
       LIVES UI
       ==================================================== */
    _renderLives() {
        this._livesEl.innerHTML = '';
        for (let i = 0; i < this._maxLives; i++) {
            const span = document.createElement('span');
            span.className = 'life' + (i >= this._lives ? ' lost' : '');
            span.textContent = '❤️';
            this._livesEl.appendChild(span);
        }
    }

    /* ====================================================
       SOUND
       ==================================================== */
    _toggleMute() {
        this._muted = !this._muted;
        this._muteBtn.textContent = this._muted ? '🔇' : '🔊';
    }

    /* ====================================================
       STATS (localStorage)
       ==================================================== */
    _defaultStats() {
        return {
            beginner:     { wins: 0, losses: 0, best: null, played: 0 },
            intermediate: { wins: 0, losses: 0, best: null, played: 0 },
            expert:       { wins: 0, losses: 0, best: null, played: 0 },
        };
    }

    _loadStats() {
        try {
            return JSON.parse(localStorage.getItem('mines2026-stats')) || this._defaultStats();
        } catch {
            return this._defaultStats();
        }
    }

    _saveStats(won, time) {
        const s = this._stats[this._level];
        s.played++;
        if (won) {
            s.wins++;
            if (!s.best || time < s.best) s.best = time;
        } else {
            s.losses++;
        }
        localStorage.setItem('mines2026-stats', JSON.stringify(this._stats));
    }

    _doResetStats() {
        if (!confirm('Reset all statistics?')) return;
        this._stats = this._defaultStats();
        localStorage.removeItem('mines2026-stats');
        this._showStats(); // refresh
    }

    _showStats() {
        const fmtTime = s => s ? `${Math.floor(s/60)}:${String(s%60).padStart(2,'0')}` : '—';
        const pct     = s => s.played > 0 ? Math.round(s.wins / s.played * 100) + '%' : '—';

        let html = '';
        for (const key of ['beginner', 'intermediate', 'expert']) {
            const s   = this._stats[key];
            const lvl = LEVELS[key];
            html += `
                <div class="stats-section">
                    <div class="stats-section-title">${lvl.label} — ${lvl.rows}×${lvl.cols} · ${lvl.mines} mines</div>
                    <div class="stats-row">
                        <span class="stats-row-label">Games Played</span>
                        <span class="stats-row-val">${s.played}</span>
                    </div>
                    <div class="stats-row">
                        <span class="stats-row-label">Win Rate</span>
                        <span class="stats-row-val">${pct(s)}</span>
                    </div>
                    <div class="stats-row">
                        <span class="stats-row-label">Wins / Losses</span>
                        <span class="stats-row-val">${s.wins} / ${s.losses}</span>
                    </div>
                    <div class="stats-row">
                        <span class="stats-row-label">Best Time</span>
                        <span class="stats-row-val">${fmtTime(s.best)}</span>
                    </div>
                </div>
            `;
        }

        this._statsContent.innerHTML = html;
        this._statsModal.classList.remove('hidden');
    }

    /* ====================================================
       UTIL
       ==================================================== */
    _cellEl(r, c) {
        return this._boardEl.querySelector(`[data-r="${r}"][data-c="${c}"]`);
    }
}

// Boot
const game = new MinesweeperGame();

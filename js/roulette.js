'use strict';

/* ====================================================================
   ROULETTE 2026
   European roulette (single zero). Canvas wheel, rAF spin animation.
   ==================================================================== */

// Authentic European wheel order (clockwise from 0)
const WHEEL_ORDER = [0,32,15,19,4,21,2,25,17,34,6,27,13,36,11,30,8,23,10,5,24,16,33,1,20,14,31,9,22,18,29,7,28,12,35,3,26];

const RED_SET = new Set([1,3,5,7,9,12,14,16,18,19,21,23,25,27,30,32,34,36]);
const BLK_SET = new Set([2,4,6,8,10,11,13,15,17,20,22,24,26,28,29,31,33,35]);

const SECTOR_COLOR = n => n === 0 ? '#15803d' : RED_SET.has(n) ? '#991b1b' : '#0e0e1a';

function rng(a, b)      { const r=[]; for(let i=a;i<=b;i++) r.push(i); return r; }
function rngs(a, b, s)  { const r=[]; for(let i=a;i<=b;i+=s) r.push(i); return r; }

// Bet definitions: payout multiplier = returns this × stake (plus stake back)
const BETS = {
    low:     { label:'1–18',   pay:1, nums:rng(1,18)         },
    even:    { label:'Even',   pay:1, nums:rngs(2,36,2)      },
    red:     { label:'Red',    pay:1, nums:[...RED_SET]      },
    black:   { label:'Black',  pay:1, nums:[...BLK_SET]      },
    odd:     { label:'Odd',    pay:1, nums:rngs(1,35,2)      },
    high:    { label:'19–36',  pay:1, nums:rng(19,36)        },
    dozen1:  { label:'1st 12', pay:2, nums:rng(1,12)         },
    dozen2:  { label:'2nd 12', pay:2, nums:rng(13,24)        },
    dozen3:  { label:'3rd 12', pay:2, nums:rng(25,36)        },
    col1:    { label:'2:1',    pay:2, nums:[1,4,7,10,13,16,19,22,25,28,31,34] },
    col2:    { label:'2:1',    pay:2, nums:[2,5,8,11,14,17,20,23,26,29,32,35] },
    col3:    { label:'2:1',    pay:2, nums:[3,6,9,12,15,18,21,24,27,30,33,36] },
};
for (let n = 0; n <= 36; n++) BETS[`n${n}`] = { label: String(n), pay: 35, nums: [n] };

// ─────────────────────────────────────────────
class RouletteGame {
    constructor() {
        this._balance   = 1000;
        this._chip      = 5;
        this._bets      = {};       // id → amount (already deducted from balance)
        this._lastBets  = null;
        this._spinning  = false;
        this._rotation  = 0;       // radians, cumulative
        this._history   = [];

        this._canvas = document.getElementById('wheel-canvas');
        this._ctx    = this._canvas.getContext('2d');
        this._setCanvasSize();

        this._els();
        this._events();
        this._buildTable();
        this._drawWheel(0);
        this._refresh();
    }

    /* ── DOM refs ─────────────────────────────── */
    _els() {
        this._balEl      = document.getElementById('balance');
        this._betTotEl   = document.getElementById('total-bet');
        this._spinBtn    = document.getElementById('spin-btn');
        this._clearBtn   = document.getElementById('clear-btn');
        this._rebetBtn   = document.getElementById('rebet-btn');
        this._resultEl   = document.getElementById('last-result');
        this._histEl     = document.getElementById('history-track');
        this._tableEl    = document.getElementById('bet-table');
        this._chipRow    = document.getElementById('chip-row');
        this._brokeEl    = document.getElementById('broke-overlay');
        this._topupBtn   = document.getElementById('topup-btn');
    }

    /* ── Events ──────────────────────────────── */
    _events() {
        this._spinBtn.addEventListener('click',  () => this._spin());
        this._clearBtn.addEventListener('click', () => this._clearBets());
        this._rebetBtn.addEventListener('click', () => this._rebet());
        this._topupBtn.addEventListener('click', () => {
            this._balance = 1000;
            this._brokeEl.classList.add('hidden');
            this._refresh();
        });

        this._chipRow.addEventListener('click', e => {
            const c = e.target.closest('.chip');
            if (!c) return;
            this._chipRow.querySelectorAll('.chip').forEach(x => x.classList.remove('active'));
            c.classList.add('active');
            this._chip = Number(c.dataset.value);
        });

        window.addEventListener('resize', () => {
            this._setCanvasSize();
            this._drawWheel(this._rotation);
        }, { passive: true });

        document.addEventListener('keydown', e => {
            if (e.key === 'Enter' || e.key === ' ') this._spin();
            if (e.key === 'Escape') this._clearBets();
        });
    }

    _setCanvasSize() {
        const sz = Math.min(260, window.innerWidth - 90);
        this._canvas.width  = sz;
        this._canvas.height = sz;
    }

    /* ── Betting table ──────────────────────── */
    _buildTable() {
        // Top 3 rows of the board (European layout)
        const rows = [
            [3,6,9,12,15,18,21,24,27,30,33,36],   // top  → col3 pays 2:1
            [2,5,8,11,14,17,20,23,26,29,32,35],   // mid  → col2
            [1,4,7,10,13,16,19,22,25,28,31,34],   // bot  → col1
        ];
        const colIds = ['col3','col2','col1'];

        let h = '<div class="table-top">';

        // Zero (spans all 3 rows via flex-column sibling height)
        h += `<div class="bet-cell zero-cell" data-b="n0">0</div>`;

        // Number grid
        h += '<div class="number-grid">';
        rows.forEach(row => {
            h += '<div class="num-row">';
            row.forEach(n => {
                const cls = RED_SET.has(n) ? 'rc' : 'bc';
                h += `<div class="bet-cell num-cell ${cls}" data-b="n${n}">${n}</div>`;
            });
            h += '</div>';
        });
        h += '</div>';

        // Column bets
        h += '<div class="col-bets-col">';
        colIds.forEach(id => {
            h += `<div class="bet-cell col-cell" data-b="${id}">2:1</div>`;
        });
        h += '</div>';

        h += '</div>'; // .table-top

        // Dozens
        h += '<div class="dozen-row">';
        h += `<div class="bet-cell" data-b="dozen1">1st 12</div>`;
        h += `<div class="bet-cell" data-b="dozen2">2nd 12</div>`;
        h += `<div class="bet-cell" data-b="dozen3">3rd 12</div>`;
        h += '</div>';

        // Outside bets
        h += '<div class="outside-row">';
        h += `<div class="bet-cell" data-b="low">1–18</div>`;
        h += `<div class="bet-cell" data-b="even">Even</div>`;
        h += `<div class="bet-cell red-bet" data-b="red">Red</div>`;
        h += `<div class="bet-cell black-bet" data-b="black">Black</div>`;
        h += `<div class="bet-cell" data-b="odd">Odd</div>`;
        h += `<div class="bet-cell" data-b="high">19–36</div>`;
        h += '</div>';

        this._tableEl.innerHTML = h;

        this._tableEl.querySelectorAll('.bet-cell').forEach(el => {
            el.addEventListener('click', () => this._placeBet(el.dataset.b));
        });
    }

    /* ── Bet management ──────────────────────── */
    _placeBet(id) {
        if (this._spinning) return;
        if (this._chip > this._balance) { this._flashBal(); return; }

        this._balance -= this._chip;
        this._bets[id] = (this._bets[id] || 0) + this._chip;

        this._renderChip(id);
        this._refresh();
    }

    _renderChip(id) {
        const el = this._tableEl.querySelector(`[data-b="${id}"]`);
        if (!el) return;
        let chip = el.querySelector('.placed-chip');
        if (!chip) {
            chip = document.createElement('div');
            chip.className = 'placed-chip';
            el.appendChild(chip);
        }
        chip.textContent = this._fmt(this._bets[id]);
        // Re-trigger animation
        chip.style.animation = 'none';
        chip.offsetHeight; // reflow
        chip.style.animation = '';
    }

    _clearBets() {
        if (this._spinning) return;
        const refund = Object.values(this._bets).reduce((s, a) => s + a, 0);
        this._balance += refund;
        this._bets = {};
        this._tableEl.querySelectorAll('.placed-chip').forEach(c => c.remove());
        this._refresh();
    }

    _rebet() {
        if (!this._lastBets || this._spinning) return;
        const total = Object.values(this._lastBets).reduce((s, a) => s + a, 0);
        if (total > this._balance) { this._flashBal(); return; }
        this._balance -= total;
        this._bets = { ...this._lastBets };
        Object.keys(this._bets).forEach(id => this._renderChip(id));
        this._refresh();
    }

    /* ── Spin ─────────────────────────────────── */
    _spin() {
        if (this._spinning || !Object.keys(this._bets).length) return;

        this._spinning = true;
        this._spinBtn.classList.add('spinning');
        this._spinBtn.disabled = this._clearBtn.disabled = this._rebetBtn.disabled = true;

        // Pick a winner
        const winIdx = Math.floor(Math.random() * 37);
        const winNum = WHEEL_ORDER[winIdx];

        // Calculate rotation so winIdx sector aligns with the top marker
        const arc = (2 * Math.PI) / 37;
        const targetAngle   = -(winIdx + 0.5) * arc;          // sector center at 12 o'clock
        const currentNorm   = ((this._rotation % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
        const targetNorm    = ((targetAngle   % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
        let   delta         = targetNorm - currentNorm;
        if (delta <= 0) delta += 2 * Math.PI;

        const extraSpins  = (6 + Math.floor(Math.random() * 4)) * 2 * Math.PI;
        const finalRot    = this._rotation + extraSpins + delta;
        const startRot    = this._rotation;
        const duration    = 4800;
        const startTime   = performance.now();
        const easeOut     = t => 1 - Math.pow(1 - t, 4);

        const tick = now => {
            const t   = Math.min((now - startTime) / duration, 1);
            const rot = startRot + (finalRot - startRot) * easeOut(t);
            this._rotation = rot;
            this._drawWheel(rot);
            if (t < 1) {
                requestAnimationFrame(tick);
            } else {
                this._rotation = finalRot;
                this._resolve(winNum);
            }
        };
        requestAnimationFrame(tick);
    }

    _resolve(winNum) {
        this._spinning = false;
        this._spinBtn.classList.remove('spinning');

        // Calculate payout
        let returned = 0;
        Object.entries(this._bets).forEach(([id, amt]) => {
            const def = BETS[id];
            if (def && def.nums.includes(winNum)) {
                returned += amt * (def.pay + 1); // original stake + winnings
            }
        });

        const totalBet = Object.values(this._bets).reduce((s, a) => s + a, 0);
        const net      = returned - totalBet;

        this._balance += returned;
        this._lastBets = { ...this._bets };
        this._bets = {};
        this._tableEl.querySelectorAll('.placed-chip').forEach(c => c.remove());

        // History
        this._history.unshift(winNum);
        if (this._history.length > 18) this._history.pop();

        this._highlightWinners(winNum);
        this._showResult(winNum, net);
        this._renderHistory();
        this._refresh();

        if (this._balance <= 0) {
            setTimeout(() => this._brokeEl.classList.remove('hidden'), 1200);
        }
    }

    _highlightWinners(winNum) {
        this._tableEl.querySelectorAll('.bet-cell').forEach(el => {
            const def = BETS[el.dataset.b];
            if (def && def.nums.includes(winNum)) {
                el.classList.add('cell-win');
                setTimeout(() => el.classList.remove('cell-win'), 2800);
            }
        });
    }

    _showResult(winNum, net) {
        const cls  = winNum === 0 ? 'num-green' : RED_SET.has(winNum) ? 'num-red' : 'num-black';
        const sign = net > 0 ? '+' : '';
        const netCls = net > 0 ? 'net-win' : net < 0 ? 'net-loss' : 'net-push';

        this._resultEl.innerHTML = `
            <div class="result-num ${cls}">${winNum}</div>
            <div class="result-net ${netCls}">${sign}${this._fmt(net)}</div>
        `;
    }

    _renderHistory() {
        this._histEl.innerHTML = this._history.map(n => {
            const cls = n === 0 ? 'h-green' : RED_SET.has(n) ? 'h-red' : 'h-black';
            return `<span class="h-dot ${cls}">${n}</span>`;
        }).join('');
    }

    /* ── Wheel drawing ─────────────────────────── */
    _drawWheel(rot) {
        const canvas = this._canvas;
        const ctx    = this._ctx;
        const cx     = canvas.width  / 2;
        const cy     = canvas.height / 2;
        const outerR = cx - 5;
        const innerR = outerR * 0.30;
        const arc    = (2 * Math.PI) / 37;

        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Gold rim
        ctx.beginPath();
        ctx.arc(cx, cy, outerR + 1, 0, 2 * Math.PI);
        ctx.fillStyle = '#fbbf24';
        ctx.fill();

        // Sectors
        WHEEL_ORDER.forEach((num, i) => {
            const a0 = rot + i * arc - Math.PI / 2;
            const a1 = rot + (i + 1) * arc - Math.PI / 2;

            // Sector fill
            ctx.beginPath();
            ctx.moveTo(cx, cy);
            ctx.arc(cx, cy, outerR, a0, a1);
            ctx.fillStyle = SECTOR_COLOR(num);
            ctx.fill();

            // Divider
            ctx.beginPath();
            ctx.moveTo(cx, cy);
            ctx.lineTo(cx + outerR * Math.cos(a0), cy + outerR * Math.sin(a0));
            ctx.strokeStyle = 'rgba(251,191,36,0.4)';
            ctx.lineWidth   = 0.5;
            ctx.stroke();

            // Number label
            const mid  = rot + (i + 0.5) * arc - Math.PI / 2;
            const textR = (outerR + innerR) / 2;
            const tx = cx + textR * Math.cos(mid);
            const ty = cy + textR * Math.sin(mid);

            ctx.save();
            ctx.translate(tx, ty);
            ctx.rotate(mid + Math.PI / 2);
            ctx.fillStyle = '#fff';
            ctx.font = `bold ${Math.max(7, Math.floor(outerR / 11))}px Inter, sans-serif`;
            ctx.textAlign    = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(String(num), 0, 0);
            ctx.restore();
        });

        // Hub (decorative inner circle)
        const hubGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, innerR);
        hubGrad.addColorStop(0, '#1e1e30');
        hubGrad.addColorStop(1, '#0d0d1a');

        ctx.beginPath();
        ctx.arc(cx, cy, innerR, 0, 2 * Math.PI);
        ctx.fillStyle = hubGrad;
        ctx.fill();
        ctx.strokeStyle = '#fbbf24';
        ctx.lineWidth   = 2;
        ctx.stroke();

        // Center pin
        ctx.beginPath();
        ctx.arc(cx, cy, innerR * 0.22, 0, 2 * Math.PI);
        ctx.fillStyle = '#fbbf24';
        ctx.fill();
    }

    /* ── UI refresh ──────────────────────────── */
    _refresh() {
        this._balEl.textContent = this._fmt(this._balance);
        const tot = Object.values(this._bets).reduce((s, a) => s + a, 0);
        this._betTotEl.textContent = this._fmt(tot);

        const hasBets = tot > 0;
        this._spinBtn.disabled  = !hasBets || this._spinning;
        this._clearBtn.disabled = !hasBets || this._spinning;
        this._rebetBtn.disabled = !this._lastBets || this._spinning || hasBets;
    }

    _fmt(n) { return Math.round(n).toLocaleString(); }

    _flashBal() {
        this._balEl.classList.remove('flash');
        this._balEl.offsetHeight;
        this._balEl.classList.add('flash');
        setTimeout(() => this._balEl.classList.remove('flash'), 500);
    }
}

new RouletteGame();

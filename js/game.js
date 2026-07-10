(function () {
    'use strict';

    const canvas = document.getElementById('game-canvas');
    const ctx = canvas.getContext('2d');

    const scoreEl = document.getElementById('score');
    const levelBadgeEl = document.getElementById('level-badge');
    const powerupBadgesEl = document.getElementById('powerup-badges');
    const startScreen = document.getElementById('start-screen');
    const gameoverScreen = document.getElementById('gameover-screen');
    const startBtn = document.getElementById('start-btn');
    const restartBtn = document.getElementById('restart-btn');
    const finalScoreEl = document.getElementById('final-score');
    const finalLevelEl = document.getElementById('final-level');
    const scoreSubmitHint = document.getElementById('score-submit-hint');
    const loginRequiredHint = document.getElementById('login-required-hint');
    const unlockBanner = document.getElementById('unlock-banner');
    const comboMeterEl = document.getElementById('combo-meter');
    const comboMultEl = document.getElementById('combo-mult');
    const comboBarFillEl = document.getElementById('combo-bar-fill');

    const POINTS_PER_LEVEL = 400;
    const WARMUP_FRAMES = 30;
    const BASE_PLAYER_SIZE = 26;
    const SHIELD_DURATION = 180;
    const SHRINK_DURATION = 300;
    const GODMODE_DURATION = 240;
    const WALL_CAMP_THRESHOLD = 75;
    const POWERUP_WARN_START = 90;
    const POWERUP_WARN_CRITICAL = 45;
    const GRAZE_MARGIN = 18;
    const COMBO_DURATION = 180;
    const COMBO_MULT_STEP = 0.1;
    const COMBO_MULT_CAP = 5;
    const SLOWMO_SCALE = 0.45;

    const LEVEL_THEMES = [
        { name: 'Level 1 – By', bg: ['#0f172a', '#1e293b'], grid: '#334155', accent: '#22d3ee', obstacle: '#f43f5e' },
        { name: 'Level 2 – Skog', bg: ['#052e16', '#14532d'], grid: '#166534', accent: '#4ade80', obstacle: '#fbbf24' },
        { name: 'Level 3 – Lava', bg: ['#450a0a', '#7f1d1d'], grid: '#991b1b', accent: '#fb923c', obstacle: '#fde047' },
        { name: 'Level 4 – Rom', bg: ['#1e1b4b', '#312e81'], grid: '#4338ca', accent: '#a78bfa', obstacle: '#f472b6' },
        { name: 'Level 5 – Neon', bg: ['#0c0a1d', '#1a0a2e'], grid: '#581c87', accent: '#e879f9', obstacle: '#22d3ee' },
        { name: 'Level 6 – Solar Flare', bg: ['#1c0a00', '#451a03'], grid: '#b45309', accent: '#fcd34d', obstacle: '#dc2626' },
        { name: 'Level 7 – Asteroid Belt', bg: ['#0f1419', '#1a2332'], grid: '#475569', accent: '#94a3b8', obstacle: '#f97316' },
        { name: 'Level 8 – Nebula', bg: ['#1a0b2e', '#3b0764'], grid: '#6b21a8', accent: '#e879f9', obstacle: '#38bdf8' },
        { name: 'Level 9 – Deep Space', bg: ['#020617', '#0f172a'], grid: '#1e293b', accent: '#67e8f9', obstacle: '#a855f7' },
        { name: 'Level 10 – Supernova', bg: ['#0a0014', '#1e0533'], grid: '#4c1d95', accent: '#fde047', obstacle: '#ef4444' },
    ];

    const POWERUP_INFO = {
        shield: { label: 'Skjold', color: '#38bdf8', duration: SHIELD_DURATION },
        shrink: { label: 'Mini', color: '#c084fc', duration: SHRINK_DURATION },
        godmode: { label: 'God Mode', color: '#fcd34d', duration: GODMODE_DURATION },
    };

    const JOKER_EFFECTS = [
        { id: 'goldRush', name: 'Gullrush', good: true, color: '#fcd34d', duration: 720 },
        { id: 'jackpot', name: 'Jackpot', good: true, color: '#fde047', instant: true },
        { id: 'slowMo', name: 'Bullet Time', good: true, color: '#67e8f9', duration: 240 },
        { id: 'bulk', name: 'Bulk', good: false, color: '#f97316', duration: 600 },
        { id: 'flipFlop', name: 'Flip Flop', good: false, color: '#c084fc', duration: 360 },
        { id: 'underSiege', name: 'Under Siege', good: false, color: '#ef4444', duration: 600 },
    ];
    const JOKER_SLOWMO_SCALE = 0.55;

    const keys = { up: false, down: false, left: false, right: false };

    let state = 'menu';
    let roundStartedAt = 0;
    let score = 0;
    let level = 1;
    let frame = 0;
    let lastTime = 0;
    let spawnTimer = 0;
    let starSpawnTimer = 0;
    let jokerSpawnTimer = 0;
    let underSiegeSpawnTimer = 0;
    let wallCampFrames = 0;
    let player = null;
    let obstacles = [];
    let powerups = [];
    let particles = [];
    let shake = 0;
    let powerupTimers = { shield: 0, shrink: 0, godmode: 0 };
    let screenFlash = 0;
    let screenFlashColor = '#fcd34d';
    let crushRings = [];
    let floatTexts = [];
    let combo = 0;
    let comboTimer = 0;
    let bestComboThisRun = 0;
    let timeScale = 1;
    let jokerTimers = { goldRush: 0, slowMo: 0, bulk: 0, flipFlop: 0, underSiege: 0 };

    function getTheme() {
        return LEVEL_THEMES[Math.min(level - 1, LEVEL_THEMES.length - 1)];
    }

    function getSpeedMultiplier() {
        if (level <= 6) return 1 + (level - 1) * 0.32;
        return 2.6 + (level - 6) * 0.1;
    }

    function getSpawnInterval() {
        return Math.max(36, 76 - level * 16);
    }

    function getShieldBreakBonus() {
        return Math.min(level, 10) * 10;
    }

    function getPlayerSpeed() {
        const base = 5.2;
        if (level <= 5) return base;
        return base + (level - 5) * 0.45;
    }

    function getExtraSpawnChance() {
        if (level < 2) return 0.12;
        return 0.28 + level * 0.07;
    }

    function pickObstacleType() {
        const r = Math.random();
        if (level >= 4) {
            if (r < 0.55) return 'fast';
            if (r < 0.85) return 'wide';
            return 'block';
        }
        if (level >= 2) {
            if (r < 0.42) return 'fast';
            if (r < 0.72) return 'wide';
            return 'block';
        }
        if (r < 0.3) return 'fast';
        if (r < 0.52) return 'wide';
        return 'block';
    }

    function pickPowerupType() {
        const r = Math.random();
        if (r < 0.4) return 'shield';
        if (r < 0.8) return 'shrink';
        return 'godmode';
    }

    function hasShield() {
        return powerupTimers.shield > 0;
    }

    function hasGodMode() {
        return powerupTimers.godmode > 0;
    }

    function hasShrink() {
        return powerupTimers.shrink > 0;
    }

    function isInvincible() {
        return hasShield() || hasGodMode();
    }

    function getPlayerSize() {
        if (hasShrink()) return BASE_PLAYER_SIZE * 0.62;
        if (jokerTimers.bulk > 0) return BASE_PLAYER_SIZE * 1.35;
        return BASE_PLAYER_SIZE;
    }

    function getActiveJokerEffects() {
        return JOKER_EFFECTS.filter((e) => !e.instant && jokerTimers[e.id] > 0);
    }

    function updateJokerTimers(dt) {
        for (const effect of JOKER_EFFECTS) {
            if (effect.instant) continue;
            if (jokerTimers[effect.id] > 0) {
                jokerTimers[effect.id] -= dt;
                if (jokerTimers[effect.id] <= 0) {
                    jokerTimers[effect.id] = 0;
                    if (effect.id === 'underSiege') underSiegeSpawnTimer = 0;
                    if (effect.id === 'bulk') player.size = getPlayerSize();
                }
            }
        }
    }

    function getActivePowerupTypes() {
        return ['godmode', 'shield', 'shrink'].filter((t) => powerupTimers[t] > 0);
    }

    function isPowerupWarning(type) {
        const t = powerupTimers[type];
        return t > 0 && t <= POWERUP_WARN_START;
    }

    function isPowerupCritical(type) {
        const t = powerupTimers[type];
        return t > 0 && t <= POWERUP_WARN_CRITICAL;
    }

    function getBlinkAlpha(baseAlpha) {
        const types = getActivePowerupTypes();
        const critical = types.some(isPowerupCritical);
        const warning = types.some(isPowerupWarning);
        if (critical) return baseAlpha * (0.25 + Math.abs(Math.sin(frame * 0.28)) * 0.75);
        if (warning) return baseAlpha * (0.5 + Math.abs(Math.sin(frame * 0.14)) * 0.5);
        return baseAlpha;
    }

    function clearPowerups() {
        powerupTimers = { shield: 0, shrink: 0, godmode: 0 };
        updatePowerupHud();
    }

    function resetPlayer() {
        player = {
            x: canvas.width / 2,
            y: canvas.height - 100,
            size: BASE_PLAYER_SIZE,
            speed: getPlayerSpeed(),
            trail: [],
        };
        clearPowerups();
    }

    function resetGame() {
        score = 0;
        level = 1;
        frame = 0;
        spawnTimer = 0;
        starSpawnTimer = 0;
        wallCampFrames = 0;
        obstacles = [];
        powerups = [];
        particles = [];
        shake = 0;
        screenFlash = 0;
        crushRings = [];
        floatTexts = [];
        combo = 0;
        comboTimer = 0;
        bestComboThisRun = 0;
        timeScale = 1;
        jokerTimers = { goldRush: 0, slowMo: 0, bulk: 0, flipFlop: 0, underSiege: 0 };
        jokerSpawnTimer = 0;
        underSiegeSpawnTimer = 0;
        resetPlayer();
        updateHud();
        updateComboHud();
    }

    function getComboMultiplier() {
        return Math.min(COMBO_MULT_CAP, 1 + combo * COMBO_MULT_STEP);
    }

    function updatePowerupHud() {
        if (!powerupBadgesEl) return;
        const active = getActivePowerupTypes();
        const jokerActive = getActiveJokerEffects();

        if (active.length === 0 && jokerActive.length === 0) {
            powerupBadgesEl.innerHTML = '';
            return;
        }

        const powerupHtml = active.map((type) => {
            const info = POWERUP_INFO[type];
            const secs = Math.max(1, Math.ceil(powerupTimers[type] / 60));
            const warnClass = isPowerupCritical(type)
                ? ' powerup-critical'
                : isPowerupWarning(type)
                    ? ' powerup-warning'
                    : '';

            return `<span class="powerup-badge${warnClass}" style="background:${info.color}22;color:${info.color};border-color:${info.color}55">${info.label} ${secs}s</span>`;
        }).join('');

        const jokerHtml = jokerActive.map((effect) => {
            const secs = Math.max(1, Math.ceil(jokerTimers[effect.id] / 60));
            const cls = effect.good ? ' joker-badge-good' : ' joker-badge-bad';
            return `<span class="powerup-badge${cls}" style="background:${effect.color}22;color:${effect.color};border-color:${effect.color}55">${effect.name} ${secs}s</span>`;
        }).join('');

        powerupBadgesEl.innerHTML = powerupHtml + jokerHtml;
    }

    function showFloatText(text, color) {
        floatTexts.push({
            text,
            x: player.x,
            y: player.y - 28,
            life: 1,
            color,
        });
    }

    function updateHud() {
        scoreEl.textContent = Math.floor(score);
        const theme = getTheme();
        levelBadgeEl.textContent = theme.name;
        levelBadgeEl.style.background = `${theme.accent}22`;
        levelBadgeEl.style.color = theme.accent;
        levelBadgeEl.style.borderColor = `${theme.accent}55`;
        updatePowerupHud();
    }

    function flashScreen(color, intensity) {
        screenFlashColor = color;
        screenFlash = Math.min(0.4, Math.max(screenFlash, intensity));
    }

    function comboColor() {
        if (combo >= 30) return '#f43f5e';
        if (combo >= 20) return '#fb923c';
        if (combo >= 10) return '#fcd34d';
        return '#22d3ee';
    }

    function updateComboHud() {
        if (!comboMeterEl) return;
        if (combo <= 0) {
            comboMeterEl.classList.add('hidden');
            return;
        }
        const mult = getComboMultiplier();
        const color = comboColor();
        comboMeterEl.classList.remove('hidden');
        if (comboMultEl) {
            comboMultEl.textContent = 'x' + mult.toFixed(1);
            comboMultEl.style.color = color;
        }
        if (comboBarFillEl) {
            comboBarFillEl.style.width = Math.max(0, Math.min(1, comboTimer / COMBO_DURATION)) * 100 + '%';
            comboBarFillEl.style.background = color;
        }
        comboMeterEl.style.setProperty('--combo-glow', color);
        comboMeterEl.classList.toggle('combo-hot', combo >= 20);
    }

    function registerNearMiss(o) {
        const prevMult = getComboMultiplier();
        combo++;
        comboTimer = COMBO_DURATION;
        bestComboThisRun = Math.max(bestComboThisRun, combo);

        const mult = getComboMultiplier();
        const color = comboColor();
        const mx = (player.x + o.x + o.w / 2) / 2;
        const my = (player.y + o.y + o.h / 2) / 2;

        timeScale = SLOWMO_SCALE;
        spawnParticles(mx, my, color, 8);
        showFloatText('NÆR! x' + mult.toFixed(1), color);

        if (comboMeterEl) {
            comboMeterEl.classList.remove('combo-bump');
            void comboMeterEl.offsetWidth;
            comboMeterEl.classList.add('combo-bump');
        }

        const milestone = Math.floor(mult) > Math.floor(prevMult) && mult > 1;
        if (milestone) {
            flashScreen(color, 0.18);
            shake = Math.min(8, shake + 3);
            window.Sfx?.comboMilestone?.(Math.floor(mult));
        } else {
            flashScreen(color, 0.08);
            window.Sfx?.nearMiss?.(combo);
        }

        updateComboHud();
    }

    function breakCombo() {
        if (combo <= 0) return;
        combo = 0;
        comboTimer = 0;
        window.Sfx?.comboLost?.();
        updateComboHud();
    }

    function breakShield(x, y) {
        powerupTimers.shield = 0;
        flashScreen('#38bdf8', 0.28);
        shake = Math.min(6, shake + 3);
        spawnParticles(x, y, '#38bdf8', 20);
        spawnParticles(x, y, '#bae6fd', 14);
        crushRings.push({ x, y, radius: 8, life: 1, color: '#38bdf8' });
        crushRings.push({ x: player.x, y: player.y, radius: player.size * 1.4, life: 0.9, color: '#7dd3fc' });
        updatePowerupHud();
    }

    function activatePowerup(type) {
        const info = POWERUP_INFO[type];
        const duration = info.duration;
        const maxTime = duration * 2;
        const wasActive = powerupTimers[type] > 0;

        if (wasActive) {
            powerupTimers[type] = Math.min(maxTime, powerupTimers[type] + duration);
            showFloatText(`+${info.label}`, info.color);
        } else {
            powerupTimers[type] = duration;
            showFloatText(info.label, info.color);
        }

        player.size = getPlayerSize();
        spawnParticles(player.x, player.y, info.color, 30);
        shake = 4;

        if (type === 'godmode') {
            flashScreen('#fcd34d', 0.22);
            crushRings.push({ x: player.x, y: player.y, radius: 20, life: 1, color: '#fcd34d' });
        }
        if (type === 'shield') {
            flashScreen('#38bdf8', 0.15);
            crushRings.push({ x: player.x, y: player.y, radius: player.size * 1.2, life: 0.8, color: '#38bdf8' });
        }
        if (type === 'shrink') {
            flashScreen('#c084fc', 0.12);
        }

        updatePowerupHud();
    }

    function activateJoker() {
        const effect = JOKER_EFFECTS[Math.floor(Math.random() * JOKER_EFFECTS.length)];

        if (effect.instant) {
            score += 400;
            showFloatText('+400', effect.color);
        } else {
            jokerTimers[effect.id] = effect.duration;
            if (effect.id === 'underSiege') underSiegeSpawnTimer = 0;
        }

        showFloatText('JOKER: ' + effect.name, effect.color);
        player.size = getPlayerSize();
        spawnParticles(player.x, player.y, effect.color, 30);
        shake = 5;

        if (effect.good) {
            flashScreen('#4ade80', 0.2);
            crushRings.push({ x: player.x, y: player.y, radius: 18, life: 1, color: effect.color });
            window.Sfx?.jokerGood?.();
        } else {
            flashScreen('#ef4444', 0.22);
            crushRings.push({ x: player.x, y: player.y, radius: 22, life: 0.9, color: '#ef4444' });
            window.Sfx?.jokerBad?.();
        }

        updatePowerupHud();
    }

    function canPlay() {
        return window.Auth?.isLoggedIn() ?? false;
    }

    function updateLoginHint() {
        if (!loginRequiredHint) return;
        loginRequiredHint.classList.toggle('hidden', canPlay());
    }

    function startGame() {
        if (!canPlay()) {
            updateLoginHint();
            return;
        }

        resetGame();
        state = 'playing';
        roundStartedAt = Date.now();
        window.Community?.setPlaying(true);
        hideUnlockBanner();
        startScreen.classList.add('hidden');
        gameoverScreen.classList.add('hidden');
        lastTime = 0;
        requestAnimationFrame(gameLoop);
    }

    function hideUnlockBanner() {
        if (!unlockBanner) return;
        unlockBanner.classList.add('hidden');
        unlockBanner.textContent = '';
    }

    async function endGame() {
        state = 'gameover';
        window.Community?.setPlaying(false);
        combo = 0;
        comboTimer = 0;
        updateComboHud();
        const finalScore = Math.floor(score);
        finalScoreEl.textContent = finalScore;
        finalLevelEl.textContent = level;
        hideUnlockBanner();
        gameoverScreen.classList.remove('hidden');
        shake = 12;

        if (scoreSubmitHint) {
            if (window.Stats?.recordGameRun && window.Auth?.isLoggedIn()) {
                scoreSubmitHint.textContent = 'Lagrer score og statistikk...';
                const durationSec = Math.max(1, Math.round((Date.now() - roundStartedAt) / 1000));
                const result = await window.Stats.recordGameRun(finalScore, level, durationSec, bestComboThisRun);
                if (result.ok && result.warning) {
                    scoreSubmitHint.textContent = result.warning;
                } else {
                    scoreSubmitHint.textContent = result.ok
                        ? 'Score og statistikk lagret!'
                        : 'Kunne ikke lagre score. Prøv igjen.';
                }
            } else if (window.Leaderboard?.isLoggedIn()) {
                scoreSubmitHint.textContent = 'Lagrer score på leaderboard...';
                const result = await window.Leaderboard.submitScore(finalScore, level);
                scoreSubmitHint.textContent = result.ok
                    ? 'Score lagret på leaderboard!'
                    : 'Kunne ikke lagre score. Prøv igjen.';
            } else {
                scoreSubmitHint.textContent = 'Logg inn for å lagre score på leaderboard.';
            }
        }
    }

    function getSpawnX(w, forceSide) {
        const margin = 6;
        const maxX = canvas.width - w - margin;

        if (forceSide === 'left') {
            return margin + Math.random() * Math.min(60, maxX * 0.25);
        }
        if (forceSide === 'right') {
            return maxX - Math.random() * Math.min(60, maxX * 0.25);
        }

        const roll = Math.random();
        if (roll < 0.24) {
            return margin + Math.random() * Math.min(80, maxX * 0.3);
        }
        if (roll < 0.48) {
            return maxX - Math.random() * Math.min(80, maxX * 0.3);
        }
        if (roll < 0.68) {
            return (canvas.width - w) / 2 + (Math.random() - 0.5) * 100;
        }
        return margin + Math.random() * Math.max(0, maxX - margin);
    }

    function buildObstacle(forceSide, fromBottom) {
        const theme = getTheme();
        const type = pickObstacleType();
        const mult = getSpeedMultiplier();
        const sizeMult = 1 + (level - 1) * 0.08;

        let w, h, speed;

        if (type === 'wide') {
            w = (85 + Math.random() * 75) * sizeMult;
            h = (34 + Math.random() * 22) * sizeMult;
            speed = (3.1 + Math.random() * 1.3) * mult;
            if (Math.random() < 0.35) {
                w = Math.min(canvas.width * 0.45, w * 1.2);
            }
        } else if (type === 'fast') {
            w = (30 + Math.random() * 24) * sizeMult;
            h = (30 + Math.random() * 24) * sizeMult;
            speed = (4.2 + Math.random() * 1.5) * mult;
        } else {
            w = (42 + Math.random() * 40) * sizeMult;
            h = (42 + Math.random() * 40) * sizeMult;
            speed = (3.3 + Math.random() * 1.3) * mult;
        }

        w = Math.min(w, canvas.width - 40);

        return {
            x: getSpawnX(w, forceSide),
            y: fromBottom ? canvas.height + h + 10 : -h - 10,
            w,
            h,
            speed,
            color: fromBottom ? '#ef4444' : theme.obstacle,
            rot: Math.random() * Math.PI * 2,
            rotSpeed: (Math.random() - 0.5) * 0.06,
            direction: fromBottom ? -1 : 1,
        };
    }

    function spawnObstacle(forceSide) {
        obstacles.push(buildObstacle(forceSide, false));
    }

    function spawnObstacleFromBottom() {
        obstacles.push(buildObstacle(null, true));
    }

    function spawnPowerupStar() {
        const type = pickPowerupType();
        const size = 22;
        powerups.push({
            x: 40 + Math.random() * (canvas.width - 80),
            y: -size - 10,
            size,
            speed: 2.0 + Math.random() * 0.8,
            type,
            rot: 0,
            pulse: Math.random() * Math.PI * 2,
        });
    }

    function spawnJokerStar() {
        const size = 24;
        powerups.push({
            x: 40 + Math.random() * (canvas.width - 80),
            y: -size - 10,
            size,
            speed: 2.0 + Math.random() * 0.8,
            type: 'joker',
            rot: 0,
            pulse: Math.random() * Math.PI * 2,
        });
    }

    function spawnParticles(x, y, color, count) {
        for (let i = 0; i < count; i++) {
            const angle = Math.random() * Math.PI * 2;
            const spd = 1 + Math.random() * 4;
            particles.push({
                x,
                y,
                vx: Math.cos(angle) * spd,
                vy: Math.sin(angle) * spd,
                life: 1,
                color,
                size: 2 + Math.random() * 3,
            });
        }
    }

    function triggerGodModeCrush(x, y, obstacleColor) {
        flashScreen('#fcd34d', 0.14);
        shake = Math.min(7, shake + 3);

        crushRings.push({ x, y, radius: 10, life: 1, color: '#fef3c7' });
        crushRings.push({ x, y, radius: 6, life: 1, color: '#fcd34d' });
        crushRings.push({ x, y, radius: 4, life: 0.8, color: obstacleColor });

        spawnParticles(x, y, '#fcd34d', 14);
        spawnParticles(x, y, '#fef08a', 10);
        spawnParticles(x, y, obstacleColor, 8);

        for (let i = 0; i < 8; i++) {
            const angle = (i / 8) * Math.PI * 2 + Math.random() * 0.3;
            const spd = 3 + Math.random() * 3;
            particles.push({
                x,
                y,
                vx: Math.cos(angle) * spd,
                vy: Math.sin(angle) * spd,
                life: 0.7,
                color: '#fff7ed',
                size: 1.5 + Math.random() * 2,
            });
        }
    }

    function circleRotatedRectOverlap(cx, cy, radius, rect) {
        const pad = 2;
        const cos = Math.cos(-rect.rot);
        const sin = Math.sin(-rect.rot);
        const centerX = rect.x + rect.w / 2;
        const centerY = rect.y + rect.h / 2;

        const dx = cx - centerX;
        const dy = cy - centerY;
        const localX = dx * cos - dy * sin;
        const localY = dx * sin + dy * cos;

        const halfW = rect.w / 2;
        const halfH = rect.h / 2;
        const closestX = Math.max(-halfW + pad, Math.min(localX, halfW - pad));
        const closestY = Math.max(-halfH + pad, Math.min(localY, halfH - pad));
        const distX = localX - closestX;
        const distY = localY - closestY;
        const effectiveRadius = Math.max(0, radius - pad);
        return distX * distX + distY * distY < effectiveRadius * effectiveRadius;
    }

    function circleCircleOverlap(cx1, cy1, r1, cx2, cy2, r2) {
        const dx = cx1 - cx2;
        const dy = cy1 - cy2;
        const reach = r1 + r2;
        return dx * dx + dy * dy <= reach * reach;
    }

    function isWallCamping() {
        const edge = 55;
        return player.x < edge || player.x > canvas.width - edge;
    }

    function update(dt) {
        if (state !== 'playing') return;

        frame++;
        player.size = getPlayerSize();

        const camping = isWallCamping();
        const scoreRate = 0.45;
        const goldMult = jokerTimers.goldRush > 0 ? 2 : 1;
        score += dt * scoreRate * getComboMultiplier() * goldMult;

        updateJokerTimers(dt);

        if (comboTimer > 0) {
            comboTimer -= dt;
            if (comboTimer <= 0) breakCombo();
            else updateComboHud();
        }

        if (camping) {
            wallCampFrames += dt;
            if (wallCampFrames > WALL_CAMP_THRESHOLD) {
                const side = player.x < canvas.width / 2 ? 'left' : 'right';
                spawnObstacle(side);
                wallCampFrames = 0;
            }
        } else {
            wallCampFrames = Math.max(0, wallCampFrames - dt * 2);
        }

        const newLevel = Math.floor(score / POINTS_PER_LEVEL) + 1;
        if (newLevel > level && newLevel <= LEVEL_THEMES.length) {
            level = newLevel;
            player.speed = getPlayerSpeed();
            spawnParticles(player.x, player.y, getTheme().accent, 20);
            updateHud();
        }

        if (hasGodMode()) {
            powerupTimers.godmode -= dt;
            if (powerupTimers.godmode <= 0) {
                powerupTimers.godmode = 0;
                flashScreen('#fcd34d', 0.12);
            }
        }
        if (hasShield()) {
            powerupTimers.shield -= dt;
            if (powerupTimers.shield <= 0) {
                powerupTimers.shield = 0;
                flashScreen('#38bdf8', 0.1);
            }
        }
        if (hasShrink()) {
            powerupTimers.shrink -= dt;
            if (powerupTimers.shrink <= 0) {
                powerupTimers.shrink = 0;
                player.size = BASE_PLAYER_SIZE;
                flashScreen('#c084fc', 0.1);
            }
        }

        player.size = getPlayerSize();

        let dx = 0;
        let dy = 0;
        if (keys.left) dx -= 1;
        if (keys.right) dx += 1;
        if (jokerTimers.flipFlop > 0) dx *= -1;
        if (keys.up) dy -= 1;
        if (keys.down) dy += 1;

        if (dx !== 0 || dy !== 0) {
            const len = Math.hypot(dx, dy);
            dx /= len;
            dy /= len;
        }

        player.x = Math.max(
            player.size,
            Math.min(canvas.width - player.size, player.x + dx * player.speed * dt)
        );
        player.y = Math.max(
            player.size,
            Math.min(canvas.height - player.size, player.y + dy * player.speed * dt)
        );

        player.trail.unshift({ x: player.x, y: player.y });
        if (player.trail.length > 12) player.trail.pop();

        if (frame > WARMUP_FRAMES) {
            spawnTimer++;
            if (spawnTimer >= getSpawnInterval()) {
                spawnObstacle();
                spawnTimer = 0;

                const extraChance = getExtraSpawnChance();
                if (Math.random() < extraChance) spawnObstacle();
                if (level >= 3 && Math.random() < 0.18) spawnObstacle();
                if (level >= 4 && Math.random() < 0.32) spawnObstacle();
            }

            starSpawnTimer++;
            const starInterval = Math.max(200, 360 - level * 30);
            if (starSpawnTimer >= starInterval) {
                spawnPowerupStar();
                starSpawnTimer = 0;
            }

            jokerSpawnTimer++;
            if (jokerSpawnTimer >= starInterval * 2) {
                spawnJokerStar();
                jokerSpawnTimer = 0;
            }

            if (jokerTimers.underSiege > 0) {
                underSiegeSpawnTimer += dt;
                if (underSiegeSpawnTimer >= 55) {
                    spawnObstacleFromBottom();
                    underSiegeSpawnTimer = 0;
                }
            }
        }

        for (let i = obstacles.length - 1; i >= 0; i--) {
            const o = obstacles[i];
            const dir = o.direction ?? 1;
            o.y += dir * o.speed * dt;
            o.rot += o.rotSpeed * dt;

            const passedTop = dir === 1 && o.y > canvas.height + 50;
            const passedBottom = dir === -1 && o.y + o.h < -50;

            if (passedTop || passedBottom) {
                obstacles.splice(i, 1);
                score += getComboMultiplier();
            } else if (circleRotatedRectOverlap(player.x, player.y, player.size * 0.85, o)) {
                const ox = o.x + o.w / 2;
                const oy = o.y + o.h / 2;

                if (hasGodMode()) {
                    const bonus = getShieldBreakBonus();
                    score += bonus;
                    triggerGodModeCrush(ox, oy, o.color);
                    showFloatText('+' + bonus, '#fcd34d');
                    obstacles.splice(i, 1);
                } else if (hasShield()) {
                    const bonus = getShieldBreakBonus();
                    score += bonus;
                    breakShield(ox, oy);
                    showFloatText('+' + bonus, '#38bdf8');
                    obstacles.splice(i, 1);
                } else {
                    spawnParticles(player.x, player.y, getTheme().obstacle, 30);
                    endGame();
                    return;
                }
            } else if (
                !o.grazed
                && !isInvincible()
                && circleRotatedRectOverlap(player.x, player.y, player.size * 0.85 + GRAZE_MARGIN, o)
            ) {
                o.grazed = true;
                registerNearMiss(o);
            }
        }

        for (let i = powerups.length - 1; i >= 0; i--) {
            const s = powerups[i];
            s.y += s.speed * dt;
            s.rot += 0.04 * dt;
            s.pulse += 0.08 * dt;

            if (s.y > canvas.height + 40) {
                powerups.splice(i, 1);
            } else if (circleCircleOverlap(
                player.x, player.y, player.size * 1.1,
                s.x, s.y, s.size * 1.3
            )            ) {
                if (s.type === 'joker') {
                    activateJoker();
                } else {
                    activatePowerup(s.type);
                }
                powerups.splice(i, 1);
            }
        }

        for (let i = particles.length - 1; i >= 0; i--) {
            const p = particles[i];
            p.x += p.vx * dt;
            p.y += p.vy * dt;
            p.vx *= 0.96;
            p.vy *= 0.96;
            p.life -= 0.03 * dt;
            if (p.life <= 0) particles.splice(i, 1);
        }

        for (let i = crushRings.length - 1; i >= 0; i--) {
            const ring = crushRings[i];
            ring.radius += 4.5 * dt;
            ring.life -= 0.045 * dt;
            if (ring.life <= 0) crushRings.splice(i, 1);
        }

        for (let i = floatTexts.length - 1; i >= 0; i--) {
            const ft = floatTexts[i];
            ft.y -= 1.2 * dt;
            ft.life -= 0.025 * dt;
            if (ft.life <= 0) floatTexts.splice(i, 1);
        }

        if (screenFlash > 0) {
            screenFlash = Math.max(0, screenFlash - 0.06 * dt);
        }

        if (shake > 0) shake *= 0.85;
        updatePowerupHud();
        updateHud();
    }

    function drawBackground() {
        const theme = getTheme();
        const grad = ctx.createLinearGradient(0, 0, 0, canvas.height);
        grad.addColorStop(0, theme.bg[0]);
        grad.addColorStop(1, theme.bg[1]);
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        ctx.strokeStyle = theme.grid;
        ctx.globalAlpha = 0.15;
        ctx.lineWidth = 1;
        const gridSize = 50;
        const offset = (frame * getSpeedMultiplier() * 0.5) % gridSize;

        for (let y = -gridSize + offset; y < canvas.height + gridSize; y += gridSize) {
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(canvas.width, y);
            ctx.stroke();
        }
        for (let x = 0; x < canvas.width; x += gridSize) {
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, canvas.height);
            ctx.stroke();
        }
        ctx.globalAlpha = 1;

        if (level >= 4) {
            ctx.fillStyle = 'rgba(255,255,255,0.6)';
            const starCount = level >= 9 ? 55 : level >= 7 ? 42 : 30;
            for (let i = 0; i < starCount; i++) {
                const sx = (i * 137 + frame * 0.2) % canvas.width;
                const sy = (i * 89 + frame * 0.05 * (i % 3)) % canvas.height;
                ctx.globalAlpha = 0.3 + (i % 5) * 0.1;
                ctx.fillRect(sx, sy, 1.5, 1.5);
            }
            ctx.globalAlpha = 1;
        }

        if (level >= 6) {
            ctx.save();
            const glow = ctx.createRadialGradient(
                canvas.width / 2, canvas.height / 2, 50,
                canvas.width / 2, canvas.height / 2, 500
            );
            const glowColor = level >= 10 ? '#fde047' : level >= 8 ? '#c084fc' : '#fcd34d';
            const glowAlpha = level >= 10 ? 0.14 : level >= 8 ? 0.1 : 0.08;
            ctx.globalAlpha = glowAlpha + Math.sin(frame * 0.04) * 0.04;
            glow.addColorStop(0, glowColor);
            glow.addColorStop(1, 'transparent');
            ctx.fillStyle = glow;
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.restore();
        }

        if (level >= 7) {
            ctx.save();
            ctx.globalAlpha = 0.06;
            ctx.fillStyle = '#64748b';
            for (let i = 0; i < 8 + level; i++) {
                const ax = (i * 211 + frame * 0.15) % canvas.width;
                const ay = (i * 157 + frame * 0.35) % canvas.height;
                ctx.beginPath();
                ctx.arc(ax, ay, 2 + (i % 3), 0, Math.PI * 2);
                ctx.fill();
            }
            ctx.restore();
        }
    }

    function drawPowerups() {
        for (const s of powerups) {
            const pulse = 1 + Math.sin(s.pulse) * 0.15;
            const r = s.size * pulse;

            ctx.save();
            ctx.translate(s.x, s.y);
            ctx.rotate(s.rot);

            if (s.type === 'joker') {
                const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, r);
                grad.addColorStop(0, '#fde047');
                grad.addColorStop(0.55, '#c084fc');
                grad.addColorStop(1, '#7c3aed');
                ctx.shadowColor = '#c084fc';
                ctx.shadowBlur = 20;
                ctx.fillStyle = grad;
            } else {
                const info = POWERUP_INFO[s.type];
                ctx.shadowColor = info.color;
                ctx.shadowBlur = 16;
                ctx.fillStyle = info.color;
            }

            ctx.beginPath();
            for (let i = 0; i < 5; i++) {
                const angle = (i * Math.PI * 2) / 5 - Math.PI / 2;
                const outerX = Math.cos(angle) * r;
                const outerY = Math.sin(angle) * r;
                if (i === 0) ctx.moveTo(outerX, outerY);
                else ctx.lineTo(outerX, outerY);
                const innerAngle = angle + Math.PI / 5;
                ctx.lineTo(Math.cos(innerAngle) * r * 0.45, Math.sin(innerAngle) * r * 0.45);
            }
            ctx.closePath();
            ctx.fill();

            ctx.fillStyle = 'rgba(255,255,255,0.85)';
            ctx.font = 'bold 10px sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            const icon = s.type === 'joker'
                ? '?'
                : s.type === 'shield'
                    ? '🛡'
                    : s.type === 'shrink'
                        ? '◆'
                        : '★';
            ctx.fillText(icon, 0, 1);

            ctx.restore();
        }
    }

    function drawPlayer() {
        const theme = getTheme();
        const skin = window.Profile?.getEquippedSkinColors?.();

        if (hasShield()) {
            const warn = isPowerupWarning('shield');
            const crit = isPowerupCritical('shield');
            ctx.save();
            ctx.strokeStyle = crit ? '#f0f9ff' : '#38bdf8';
            ctx.lineWidth = crit ? 4 : 3;
            ctx.globalAlpha = getBlinkAlpha(crit ? 0.9 : warn ? 0.65 : 0.55);
            ctx.shadowColor = '#38bdf8';
            ctx.shadowBlur = crit ? 18 : 12;
            ctx.beginPath();
            ctx.arc(player.x, player.y, player.size * 1.35, 0, Math.PI * 2);
            ctx.stroke();
            if (warn) {
                ctx.setLineDash([6, 6]);
                ctx.lineWidth = 2;
                ctx.globalAlpha = getBlinkAlpha(0.4);
                ctx.beginPath();
                ctx.arc(player.x, player.y, player.size * 1.55, 0, Math.PI * 2);
                ctx.stroke();
            }
            ctx.restore();
        }

        if (hasGodMode()) {
            const warn = isPowerupWarning('godmode');
            const crit = isPowerupCritical('godmode');
            ctx.save();
            const hue = (frame * 3) % 360;
            ctx.strokeStyle = crit ? '#fff7ed' : `hsl(${hue}, 90%, 60%)`;
            ctx.lineWidth = crit ? 5 : 4;
            ctx.globalAlpha = getBlinkAlpha(crit ? 0.95 : warn ? 0.75 : 0.7);
            ctx.shadowColor = '#fcd34d';
            ctx.shadowBlur = crit ? 26 : 20;
            ctx.beginPath();
            ctx.arc(player.x, player.y, player.size * 1.5, 0, Math.PI * 2);
            ctx.stroke();
            if (warn) {
                ctx.strokeStyle = '#fef3c7';
                ctx.setLineDash([8, 5]);
                ctx.lineWidth = 2;
                ctx.globalAlpha = getBlinkAlpha(0.45);
                ctx.beginPath();
                ctx.arc(player.x, player.y, player.size * 1.7, 0, Math.PI * 2);
                ctx.stroke();
            }
            ctx.restore();
        }

        if (hasShrink()) {
            const warn = isPowerupWarning('shrink');
            const crit = isPowerupCritical('shrink');
            const s = player.size;
            const bracket = s * 0.95;
            const len = s * 0.35;
            ctx.save();
            ctx.strokeStyle = crit ? '#f5d0fe' : '#c084fc';
            ctx.lineWidth = crit ? 3 : 2;
            ctx.globalAlpha = getBlinkAlpha(warn ? 0.85 : 0.6);
            ctx.lineCap = 'round';

            const corners = [
                [-bracket, -bracket, 1, 1],
                [bracket, -bracket, -1, 1],
                [-bracket, bracket, 1, -1],
                [bracket, bracket, -1, -1],
            ];
            for (const [cx, cy, dx, dy] of corners) {
                ctx.beginPath();
                ctx.moveTo(player.x + cx, player.y + cy);
                ctx.lineTo(player.x + cx + dx * len, player.y + cy);
                ctx.moveTo(player.x + cx, player.y + cy);
                ctx.lineTo(player.x + cx, player.y + cy + dy * len);
                ctx.stroke();
            }

            ctx.fillStyle = '#c084fc';
            ctx.globalAlpha = getBlinkAlpha(0.9);
            ctx.font = 'bold 10px "JetBrains Mono", monospace';
            ctx.textAlign = 'center';
            ctx.fillText('MINI', player.x, player.y - s - 10);
            ctx.restore();
        }

        const now = performance.now();
        let skinBody = null;
        let skinGlow = null;
        let skinTrail = null;
        let skinBlur = 16;
        let skinFlatOutline = false;
        if (skin) {
            if (skin.effect === 'rainbow') {
                const hue = (now * 0.06) % 360;
                skinBody = `hsl(${hue}, 90%, 65%)`;
                skinGlow = skinBody;
                skinTrail = `hsl(${hue}, 90%, 75%)`;
                skinBlur = 20;
            } else if (skin.effect === 'pulse') {
                skinBody = skin.body;
                skinGlow = skin.glow;
                skinTrail = skin.trail;
                skinBlur = 14 + Math.sin(now * 0.006) * 10;
            } else if (skin.tier === 'flat') {
                skinBody = skin.body;
                skinTrail = skin.body;
                skinBlur = 0;
                skinFlatOutline = true;
            } else {
                skinBody = skin.body;
                skinGlow = skin.glow;
                skinTrail = skin.trail;
            }
        }

        for (let i = player.trail.length - 1; i >= 0; i--) {
            const t = player.trail[i];
            const alpha = (1 - i / player.trail.length) * 0.35;
            let trailColor = skinTrail ?? theme.accent;
            if (hasGodMode()) trailColor = '#fcd34d';
            else if (hasShield()) trailColor = '#38bdf8';
            else if (hasShrink()) trailColor = '#c084fc';
            ctx.fillStyle = trailColor;
            ctx.globalAlpha = alpha;
            ctx.beginPath();
            ctx.arc(t.x, t.y, player.size * 0.5 * (1 - i / player.trail.length), 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.globalAlpha = 1;

        ctx.save();
        ctx.translate(player.x, player.y);

        let bodyColor = skinBody ?? theme.accent;
        let glowColor = skinGlow ?? bodyColor;
        let glowBlur = skin ? skinBlur : 16;
        if (hasGodMode()) {
            bodyColor = '#fcd34d';
            glowColor = '#fcd34d';
            glowBlur = 24;
            skinFlatOutline = false;
        } else if (hasShield()) {
            bodyColor = '#7dd3fc';
            glowColor = '#38bdf8';
            glowBlur = 18;
            skinFlatOutline = false;
        } else if (hasShrink()) {
            bodyColor = '#c084fc';
            glowColor = '#a855f7';
            glowBlur = 14;
            skinFlatOutline = false;
        }

        ctx.shadowColor = glowColor;
        ctx.shadowBlur = glowBlur;
        ctx.fillStyle = bodyColor;
        ctx.beginPath();
        ctx.moveTo(0, -player.size * 0.9);
        ctx.lineTo(player.size * 0.75, player.size * 0.6);
        ctx.lineTo(0, player.size * 0.35);
        ctx.lineTo(-player.size * 0.75, player.size * 0.6);
        ctx.closePath();
        ctx.fill();

        if (skinFlatOutline) {
            ctx.shadowBlur = 0;
            ctx.lineWidth = 2;
            ctx.strokeStyle = 'rgba(255,255,255,0.6)';
            ctx.stroke();
        }

        ctx.fillStyle = 'rgba(255,255,255,0.5)';
        ctx.beginPath();
        ctx.arc(0, -player.size * 0.2, 4, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
    }

    function drawObstacles() {
        for (const o of obstacles) {
            ctx.save();
            ctx.translate(o.x + o.w / 2, o.y + o.h / 2);
            ctx.rotate(o.rot);

            ctx.fillStyle = o.color;
            ctx.shadowColor = o.color;
            ctx.shadowBlur = 8;
            ctx.fillRect(-o.w / 2, -o.h / 2, o.w, o.h);

            ctx.strokeStyle = 'rgba(255,255,255,0.25)';
            ctx.lineWidth = 2;
            ctx.strokeRect(-o.w / 2, -o.h / 2, o.w, o.h);

            ctx.restore();
        }
    }

    function drawParticles() {
        for (const p of particles) {
            ctx.globalAlpha = p.life;
            ctx.fillStyle = p.color;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.globalAlpha = 1;
    }

    function drawLevelBanner() {
        if (frame % 180 > 90) return;
        const theme = getTheme();
        ctx.save();
        ctx.globalAlpha = 0.15 + Math.sin(frame * 0.05) * 0.05;
        ctx.fillStyle = theme.accent;
        ctx.font = 'bold 14px "JetBrains Mono", monospace';
        ctx.textAlign = 'center';
        ctx.fillText(theme.name, canvas.width / 2, 36);
        ctx.restore();
    }

    function drawWallWarning() {
        if (!isWallCamping() || wallCampFrames < 30) return;
        ctx.save();
        ctx.globalAlpha = Math.min(0.6, (wallCampFrames - 30) / 60);
        ctx.fillStyle = '#ef4444';
        ctx.font = 'bold 12px "JetBrains Mono", monospace';
        ctx.textAlign = 'center';
        ctx.fillText('Kom deg vekk fra veggen!', canvas.width / 2, canvas.height - 30);
        ctx.restore();
    }

    function drawCrushRings() {
        for (const ring of crushRings) {
            ctx.save();
            ctx.globalAlpha = ring.life * 0.7;
            ctx.strokeStyle = ring.color;
            ctx.lineWidth = 3;
            ctx.shadowColor = ring.color;
            ctx.shadowBlur = 12;
            ctx.beginPath();
            ctx.arc(ring.x, ring.y, ring.radius, 0, Math.PI * 2);
            ctx.stroke();
            ctx.restore();
        }
    }

    function drawGodModeAmbient() {
        if (!hasGodMode()) return;

        const pulse = 0.05 + Math.sin(frame * 0.07) * 0.025;
        const cx = canvas.width / 2;
        const cy = canvas.height / 2;

        ctx.save();
        const vignette = ctx.createRadialGradient(cx, cy, canvas.height * 0.15, cx, cy, canvas.height * 0.72);
        vignette.addColorStop(0, 'transparent');
        vignette.addColorStop(1, `rgba(252, 211, 77, ${pulse})`);
        ctx.fillStyle = vignette;
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        ctx.globalAlpha = 0.12 + Math.sin(frame * 0.07) * 0.06;
        ctx.strokeStyle = '#fcd34d';
        ctx.lineWidth = 3;
        ctx.strokeRect(6, 6, canvas.width - 12, canvas.height - 12);
        ctx.restore();
    }

    function drawScreenFlash() {
        if (screenFlash <= 0) return;

        const cx = player ? player.x : canvas.width / 2;
        const cy = player ? player.y : canvas.height / 2;
        const flashMap = {
            '#fcd34d': (a) => `rgba(252, 211, 77, ${a})`,
            '#38bdf8': (a) => `rgba(56, 189, 248, ${a})`,
            '#c084fc': (a) => `rgba(192, 132, 252, ${a})`,
        };
        const toRgba = flashMap[screenFlashColor] || flashMap['#fcd34d'];

        ctx.save();
        const burst = ctx.createRadialGradient(cx, cy, 0, cx, cy, canvas.width * 0.55);
        burst.addColorStop(0, toRgba(screenFlash * 0.45));
        burst.addColorStop(0.35, toRgba(screenFlash * 0.28));
        burst.addColorStop(1, 'transparent');
        ctx.fillStyle = burst;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.restore();
    }

    function drawFloatTexts() {
        for (const ft of floatTexts) {
            ctx.save();
            ctx.globalAlpha = ft.life;
            ctx.fillStyle = ft.color;
            ctx.font = 'bold 13px "JetBrains Mono", monospace';
            ctx.textAlign = 'center';
            ctx.shadowColor = ft.color;
            ctx.shadowBlur = 8;
            ctx.fillText(ft.text, ft.x, ft.y);
            ctx.restore();
        }
    }

    function drawPowerupExpireHint() {
        const active = getActivePowerupTypes().filter(isPowerupWarning);
        if (active.length === 0) return;

        const critical = active.some(isPowerupCritical);
        const labels = active.map((t) => {
            const secs = Math.max(1, Math.ceil(powerupTimers[t] / 60));
            return `${POWERUP_INFO[t].label} ${secs}s`;
        });

        ctx.save();
        ctx.globalAlpha = getBlinkAlpha(critical ? 0.9 : 0.65);
        ctx.fillStyle = critical ? '#fef3c7' : '#94a3b8';
        ctx.font = `bold ${critical ? 13 : 11}px "JetBrains Mono", monospace`;
        ctx.textAlign = 'center';
        ctx.fillText(
            critical ? `⚠ ${labels.join(' · ')} utløper!` : `${labels.join(' · ')} snart ute`,
            canvas.width / 2,
            canvas.height - 52
        );
        ctx.restore();
    }

    function draw() {
        ctx.save();
        if (shake > 0.5) {
            ctx.translate(
                (Math.random() - 0.5) * shake,
                (Math.random() - 0.5) * shake
            );
        }

        drawBackground();
        drawObstacles();
        drawPowerups();
        drawPlayer();
        drawParticles();
        drawCrushRings();
        drawLevelBanner();
        drawWallWarning();
        drawFloatTexts();
        drawGodModeAmbient();
        drawScreenFlash();
        drawPowerupExpireHint();

        ctx.restore();
    }

    function gameLoop(timestamp) {
        if (state !== 'playing') return;

        if (!lastTime) {
            lastTime = timestamp;
            requestAnimationFrame(gameLoop);
            return;
        }

        const rawDt = (timestamp - lastTime) / 16.67;
        const clampedDt = Math.min(Math.max(rawDt, 0), 2);
        lastTime = timestamp;

        if (jokerTimers.slowMo > 0) {
            timeScale = JOKER_SLOWMO_SCALE;
        } else {
            timeScale += (1 - timeScale) * 0.08;
            if (timeScale > 0.995) timeScale = 1;
        }

        update(clampedDt * timeScale);
        draw();

        requestAnimationFrame(gameLoop);
    }

    function isTypingInForm() {
        const el = document.activeElement;
        if (!el) return false;
        const tag = el.tagName;
        return tag === 'INPUT' || tag === 'TEXTAREA' || el.isContentEditable;
    }

    document.addEventListener('keydown', (e) => {
        if (isTypingInForm()) return;

        if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(e.key)) {
            e.preventDefault();
        }

        if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') keys.up = true;
        if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') keys.down = true;
        if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') keys.left = true;
        if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') keys.right = true;

        if (e.key === ' ' && state === 'menu') startGame();
        if (e.key === ' ' && state === 'gameover') startGame();
    });

    document.addEventListener('keyup', (e) => {
        if (isTypingInForm()) return;

        if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') keys.up = false;
        if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') keys.down = false;
        if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') keys.left = false;
        if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') keys.right = false;
    });

    startBtn.addEventListener('click', startGame);
    restartBtn.addEventListener('click', startGame);

    document.addEventListener('auth:changed', updateLoginHint);

    document.addEventListener('badge:unlocked', (e) => {
        const skins = e.detail?.skins;
        if (!unlockBanner || !skins?.length || state !== 'gameover') return;

        const parts = skins.map((s) => s.badge + ' – «' + s.name + '»');
        const prefix = skins.length > 1 ? 'Nye badges låst opp: ' : 'Ny badge låst opp: ';
        unlockBanner.textContent = prefix + parts.join(', ') + '!';
        unlockBanner.classList.remove('hidden');
    });

    resetPlayer();
    drawBackground();
    drawPlayer();
    updateLoginHint();
})();

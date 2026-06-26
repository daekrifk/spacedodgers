(function () {
    'use strict';

    const canvas = document.getElementById('game-canvas');
    const ctx = canvas.getContext('2d');

    const scoreEl = document.getElementById('score');
    const levelBadgeEl = document.getElementById('level-badge');
    const powerupBadgeEl = document.getElementById('powerup-badge');
    const startScreen = document.getElementById('start-screen');
    const gameoverScreen = document.getElementById('gameover-screen');
    const startBtn = document.getElementById('start-btn');
    const restartBtn = document.getElementById('restart-btn');
    const finalScoreEl = document.getElementById('final-score');
    const finalLevelEl = document.getElementById('final-level');

    const POINTS_PER_LEVEL = 400;
    const WARMUP_FRAMES = 30;
    const BASE_PLAYER_SIZE = 26;
    const SHIELD_DURATION = 180;
    const SHRINK_DURATION = 300;
    const GODMODE_DURATION = 240;
    const WALL_CAMP_THRESHOLD = 75;

    const LEVEL_THEMES = [
        { name: 'Level 1 – By', bg: ['#0f172a', '#1e293b'], grid: '#334155', accent: '#22d3ee', obstacle: '#f43f5e' },
        { name: 'Level 2 – Skog', bg: ['#052e16', '#14532d'], grid: '#166534', accent: '#4ade80', obstacle: '#fbbf24' },
        { name: 'Level 3 – Lava', bg: ['#450a0a', '#7f1d1d'], grid: '#991b1b', accent: '#fb923c', obstacle: '#fde047' },
        { name: 'Level 4 – Rom', bg: ['#1e1b4b', '#312e81'], grid: '#4338ca', accent: '#a78bfa', obstacle: '#f472b6' },
        { name: 'Level 5 – Neon', bg: ['#0c0a1d', '#1a0a2e'], grid: '#581c87', accent: '#e879f9', obstacle: '#22d3ee' },
        { name: 'Level 6 – God Mode', bg: ['#1c0a00', '#451a03'], grid: '#b45309', accent: '#fcd34d', obstacle: '#dc2626' },
    ];

    const POWERUP_INFO = {
        shield: { label: 'Skjold', color: '#38bdf8', duration: SHIELD_DURATION },
        shrink: { label: 'Mini', color: '#c084fc', duration: SHRINK_DURATION },
        godmode: { label: 'God Mode', color: '#fcd34d', duration: GODMODE_DURATION },
    };

    const keys = { up: false, down: false, left: false, right: false };

    let state = 'menu';
    let score = 0;
    let level = 1;
    let frame = 0;
    let lastTime = 0;
    let spawnTimer = 0;
    let starSpawnTimer = 0;
    let wallCampFrames = 0;
    let player = null;
    let obstacles = [];
    let powerups = [];
    let particles = [];
    let shake = 0;
    let activePowerup = null;
    let powerupTimer = 0;
    let screenFlash = 0;
    let crushRings = [];

    function getTheme() {
        return LEVEL_THEMES[Math.min(level - 1, LEVEL_THEMES.length - 1)];
    }

    function getSpeedMultiplier() {
        return 1 + (level - 1) * 0.32;
    }

    function getSpawnInterval() {
        return Math.max(36, 76 - level * 16);
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

    function isInvincible() {
        return activePowerup === 'shield' || activePowerup === 'godmode';
    }

    function getPlayerSize() {
        if (activePowerup === 'shrink') return BASE_PLAYER_SIZE * 0.62;
        return BASE_PLAYER_SIZE;
    }

    function resetPlayer() {
        player = {
            x: canvas.width / 2,
            y: canvas.height - 100,
            size: BASE_PLAYER_SIZE,
            speed: 5.2,
            trail: [],
        };
        activePowerup = null;
        powerupTimer = 0;
        updatePowerupHud();
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
        resetPlayer();
        updateHud();
    }

    function updatePowerupHud() {
        if (!powerupBadgeEl) return;
        if (!activePowerup) {
            powerupBadgeEl.classList.add('hidden');
            powerupBadgeEl.textContent = '';
            return;
        }
        const info = POWERUP_INFO[activePowerup];
        const secs = Math.ceil(powerupTimer / 60);
        powerupBadgeEl.classList.remove('hidden');
        powerupBadgeEl.textContent = `${info.label} ${secs}s`;
        powerupBadgeEl.style.background = `${info.color}22`;
        powerupBadgeEl.style.color = info.color;
        powerupBadgeEl.style.borderColor = `${info.color}55`;
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

    function activatePowerup(type) {
        activePowerup = type;
        powerupTimer = POWERUP_INFO[type].duration;
        player.size = getPlayerSize();
        spawnParticles(player.x, player.y, POWERUP_INFO[type].color, 30);
        shake = 4;
        if (type === 'godmode') {
            screenFlash = 0.22;
            crushRings.push({ x: player.x, y: player.y, radius: 20, life: 1, color: '#fcd34d' });
        }
        updatePowerupHud();
    }

    function startGame() {
        resetGame();
        state = 'playing';
        startScreen.classList.add('hidden');
        gameoverScreen.classList.add('hidden');
        lastTime = 0;
        requestAnimationFrame(gameLoop);
    }

    function endGame() {
        state = 'gameover';
        finalScoreEl.textContent = Math.floor(score);
        finalLevelEl.textContent = level;
        gameoverScreen.classList.remove('hidden');
        shake = 12;
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

    function spawnObstacle(forceSide) {
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

        obstacles.push({
            x: getSpawnX(w, forceSide),
            y: -h - 10,
            w,
            h,
            speed,
            color: theme.obstacle,
            rot: Math.random() * Math.PI * 2,
            rotSpeed: (Math.random() - 0.5) * 0.06,
        });
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
        screenFlash = Math.min(0.38, screenFlash + 0.14);
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

    function circleRectOverlap(cx, cy, radius, rect) {
        const pad = 2;
        const closestX = Math.max(rect.x + pad, Math.min(cx, rect.x + rect.w - pad));
        const closestY = Math.max(rect.y + pad, Math.min(cy, rect.y + rect.h - pad));
        const dx = cx - closestX;
        const dy = cy - closestY;
        return dx * dx + dy * dy < (radius - pad) * (radius - pad);
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
        const scoreRate = camping ? 0.12 : 0.45;
        score += dt * scoreRate;

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
            spawnParticles(player.x, player.y, getTheme().accent, 20);
            updateHud();
        }

        if (activePowerup) {
            powerupTimer -= dt;
            if (powerupTimer <= 0) {
                activePowerup = null;
                powerupTimer = 0;
                player.size = BASE_PLAYER_SIZE;
            }
            updatePowerupHud();
        }

        let dx = 0;
        let dy = 0;
        if (keys.left) dx -= 1;
        if (keys.right) dx += 1;
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
        }

        for (let i = obstacles.length - 1; i >= 0; i--) {
            const o = obstacles[i];
            o.y += o.speed * dt;
            o.rot += o.rotSpeed * dt;

            if (o.y > canvas.height + 50) {
                obstacles.splice(i, 1);
                score += camping ? 0 : 1;
            } else if (circleRectOverlap(player.x, player.y, player.size * 0.85, o)) {
                if (isInvincible()) {
                    const ox = o.x + o.w / 2;
                    const oy = o.y + o.h / 2;
                    if (activePowerup === 'godmode') {
                        triggerGodModeCrush(ox, oy, o.color);
                    } else {
                        spawnParticles(ox, oy, POWERUP_INFO.shield.color, 12);
                        shake = Math.min(4, shake + 1.5);
                    }
                    obstacles.splice(i, 1);
                } else {
                    spawnParticles(player.x, player.y, getTheme().obstacle, 30);
                    endGame();
                    return;
                }
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
            )) {
                activatePowerup(s.type);
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

        if (screenFlash > 0) {
            screenFlash = Math.max(0, screenFlash - 0.06 * dt);
        }

        if (shake > 0) shake *= 0.85;
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
            for (let i = 0; i < 30; i++) {
                const sx = (i * 137 + frame * 0.2) % canvas.width;
                const sy = (i * 89 + frame * 0.05 * (i % 3)) % canvas.height;
                ctx.globalAlpha = 0.3 + (i % 5) * 0.1;
                ctx.fillRect(sx, sy, 1.5, 1.5);
            }
            ctx.globalAlpha = 1;
        }

        if (level >= 6) {
            ctx.save();
            ctx.globalAlpha = 0.08 + Math.sin(frame * 0.04) * 0.04;
            const glow = ctx.createRadialGradient(
                canvas.width / 2, canvas.height / 2, 50,
                canvas.width / 2, canvas.height / 2, 500
            );
            glow.addColorStop(0, '#fcd34d');
            glow.addColorStop(1, 'transparent');
            ctx.fillStyle = glow;
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.restore();
        }
    }

    function drawPowerups() {
        for (const s of powerups) {
            const info = POWERUP_INFO[s.type];
            const pulse = 1 + Math.sin(s.pulse) * 0.15;
            const r = s.size * pulse;

            ctx.save();
            ctx.translate(s.x, s.y);
            ctx.rotate(s.rot);

            ctx.shadowColor = info.color;
            ctx.shadowBlur = 16;
            ctx.fillStyle = info.color;
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

            ctx.fillStyle = 'rgba(255,255,255,0.7)';
            ctx.font = 'bold 9px sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            const icon = s.type === 'shield' ? '🛡' : s.type === 'shrink' ? '◆' : '★';
            ctx.fillText(icon, 0, 1);

            ctx.restore();
        }
    }

    function drawPlayer() {
        const theme = getTheme();

        if (activePowerup === 'shield') {
            ctx.save();
            ctx.strokeStyle = '#38bdf8';
            ctx.lineWidth = 3;
            ctx.globalAlpha = 0.5 + Math.sin(frame * 0.15) * 0.3;
            ctx.beginPath();
            ctx.arc(player.x, player.y, player.size * 1.35, 0, Math.PI * 2);
            ctx.stroke();
            ctx.restore();
        }

        if (activePowerup === 'godmode') {
            ctx.save();
            const hue = (frame * 3) % 360;
            ctx.strokeStyle = `hsl(${hue}, 90%, 60%)`;
            ctx.lineWidth = 4;
            ctx.globalAlpha = 0.7;
            ctx.shadowColor = '#fcd34d';
            ctx.shadowBlur = 20;
            ctx.beginPath();
            ctx.arc(player.x, player.y, player.size * 1.5, 0, Math.PI * 2);
            ctx.stroke();
            ctx.restore();
        }

        for (let i = player.trail.length - 1; i >= 0; i--) {
            const t = player.trail[i];
            const alpha = (1 - i / player.trail.length) * 0.35;
            ctx.fillStyle = activePowerup === 'godmode' ? '#fcd34d' : theme.accent;
            ctx.globalAlpha = alpha;
            ctx.beginPath();
            ctx.arc(t.x, t.y, player.size * 0.5 * (1 - i / player.trail.length), 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.globalAlpha = 1;

        ctx.save();
        ctx.translate(player.x, player.y);
        ctx.shadowColor = activePowerup === 'godmode' ? '#fcd34d' : theme.accent;
        ctx.shadowBlur = activePowerup === 'godmode' ? 24 : 16;

        ctx.fillStyle = activePowerup === 'godmode' ? '#fcd34d' : theme.accent;
        ctx.beginPath();
        ctx.moveTo(0, -player.size * 0.9);
        ctx.lineTo(player.size * 0.75, player.size * 0.6);
        ctx.lineTo(0, player.size * 0.35);
        ctx.lineTo(-player.size * 0.75, player.size * 0.6);
        ctx.closePath();
        ctx.fill();

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
        if (activePowerup !== 'godmode') return;

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

        ctx.save();
        const burst = ctx.createRadialGradient(cx, cy, 0, cx, cy, canvas.width * 0.55);
        burst.addColorStop(0, `rgba(255, 251, 235, ${screenFlash * 0.45})`);
        burst.addColorStop(0.35, `rgba(252, 211, 77, ${screenFlash * 0.28})`);
        burst.addColorStop(1, 'transparent');
        ctx.fillStyle = burst;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
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
        drawGodModeAmbient();
        drawScreenFlash();

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
        const dt = Math.min(Math.max(rawDt, 0), 2);
        lastTime = timestamp;

        update(dt);
        draw();

        requestAnimationFrame(gameLoop);
    }

    document.addEventListener('keydown', (e) => {
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
        if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') keys.up = false;
        if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') keys.down = false;
        if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') keys.left = false;
        if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') keys.right = false;
    });

    startBtn.addEventListener('click', startGame);
    restartBtn.addEventListener('click', startGame);

    resetPlayer();
    drawBackground();
    drawPlayer();
})();

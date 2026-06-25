(function () {
    'use strict';

    const canvas = document.getElementById('game-canvas');
    const ctx = canvas.getContext('2d');

    const scoreEl = document.getElementById('score');
    const levelBadgeEl = document.getElementById('level-badge');
    const startScreen = document.getElementById('start-screen');
    const gameoverScreen = document.getElementById('gameover-screen');
    const startBtn = document.getElementById('start-btn');
    const restartBtn = document.getElementById('restart-btn');
    const finalScoreEl = document.getElementById('final-score');
    const finalLevelEl = document.getElementById('final-level');

    const POINTS_PER_LEVEL = 400;
    const WARMUP_FRAMES = 30;

    const LEVEL_THEMES = [
        { name: 'Level 1 – By', bg: ['#0f172a', '#1e293b'], grid: '#334155', accent: '#22d3ee', obstacle: '#f43f5e' },
        { name: 'Level 2 – Skog', bg: ['#052e16', '#14532d'], grid: '#166534', accent: '#4ade80', obstacle: '#fbbf24' },
        { name: 'Level 3 – Lava', bg: ['#450a0a', '#7f1d1d'], grid: '#991b1b', accent: '#fb923c', obstacle: '#fde047' },
        { name: 'Level 4 – Rom', bg: ['#1e1b4b', '#312e81'], grid: '#4338ca', accent: '#a78bfa', obstacle: '#f472b6' },
        { name: 'Level 5 – Neon', bg: ['#0c0a1d', '#1a0a2e'], grid: '#581c87', accent: '#e879f9', obstacle: '#22d3ee' },
    ];

    const keys = { up: false, down: false, left: false, right: false };

    let state = 'menu';
    let score = 0;
    let level = 1;
    let frame = 0;
    let lastTime = 0;
    let spawnTimer = 0;
    let player = null;
    let obstacles = [];
    let particles = [];
    let shake = 0;

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

    function resetPlayer() {
        player = {
            x: canvas.width / 2,
            y: canvas.height - 100,
            size: 26,
            speed: 5.2,
            trail: [],
        };
    }

    function resetGame() {
        score = 0;
        level = 1;
        frame = 0;
        spawnTimer = 0;
        obstacles = [];
        particles = [];
        shake = 0;
        resetPlayer();
        updateHud();
    }

    function updateHud() {
        scoreEl.textContent = Math.floor(score);
        const theme = getTheme();
        levelBadgeEl.textContent = theme.name;
        levelBadgeEl.style.background = `${theme.accent}22`;
        levelBadgeEl.style.color = theme.accent;
        levelBadgeEl.style.borderColor = `${theme.accent}55`;
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

    function spawnObstacle() {
        const theme = getTheme();
        const type = pickObstacleType();
        const mult = getSpeedMultiplier();
        const sizeMult = 1 + (level - 1) * 0.08;

        let w, h, speed;

        if (type === 'wide') {
            w = (85 + Math.random() * 75) * sizeMult;
            h = (34 + Math.random() * 22) * sizeMult;
            speed = (3.1 + Math.random() * 1.3) * mult;
        } else if (type === 'fast') {
            w = (30 + Math.random() * 24) * sizeMult;
            h = (30 + Math.random() * 24) * sizeMult;
            speed = (4.2 + Math.random() * 1.5) * mult;
        } else {
            w = (42 + Math.random() * 40) * sizeMult;
            h = (42 + Math.random() * 40) * sizeMult;
            speed = (3.3 + Math.random() * 1.3) * mult;
        }

        w = Math.min(w, canvas.width - 80);

        obstacles.push({
            x: 30 + Math.random() * (canvas.width - 60 - w),
            y: -h - 10,
            w,
            h,
            speed,
            color: theme.obstacle,
            rot: Math.random() * Math.PI * 2,
            rotSpeed: (Math.random() - 0.5) * 0.06,
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

    function rectsOverlap(a, b) {
        const pad = 1;
        return (
            a.x - a.size / 2 + pad < b.x + b.w - pad &&
            a.x + a.size / 2 - pad > b.x + pad &&
            a.y - a.size / 2 + pad < b.y + b.h - pad &&
            a.y + a.size / 2 - pad > b.y + pad
        );
    }

    function update(dt) {
        if (state !== 'playing') return;

        frame++;
        score += dt * 0.45;

        const newLevel = Math.floor(score / POINTS_PER_LEVEL) + 1;
        if (newLevel > level && newLevel <= LEVEL_THEMES.length) {
            level = newLevel;
            spawnParticles(player.x, player.y, getTheme().accent, 20);
            updateHud();
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
        }

        for (let i = obstacles.length - 1; i >= 0; i--) {
            const o = obstacles[i];
            o.y += o.speed * dt;
            o.rot += o.rotSpeed * dt;

            if (o.y > canvas.height + 50) {
                obstacles.splice(i, 1);
                score += 1;
            } else if (rectsOverlap(player, o)) {
                spawnParticles(player.x, player.y, getTheme().obstacle, 30);
                endGame();
                return;
            }
        }

        for (let i = particles.length - 1; i >= 0; i--) {
            const p = particles[i];
            p.x += p.vx;
            p.y += p.vy;
            p.life -= 0.03;
            if (p.life <= 0) particles.splice(i, 1);
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
    }

    function drawPlayer() {
        const theme = getTheme();

        for (let i = player.trail.length - 1; i >= 0; i--) {
            const t = player.trail[i];
            const alpha = (1 - i / player.trail.length) * 0.35;
            ctx.fillStyle = theme.accent;
            ctx.globalAlpha = alpha;
            ctx.beginPath();
            ctx.arc(t.x, t.y, player.size * 0.5 * (1 - i / player.trail.length), 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.globalAlpha = 1;

        ctx.save();
        ctx.translate(player.x, player.y);
        ctx.shadowColor = theme.accent;
        ctx.shadowBlur = 16;

        ctx.fillStyle = theme.accent;
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
        drawPlayer();
        drawParticles();
        drawLevelBanner();

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

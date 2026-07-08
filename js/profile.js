(function () {
    'use strict';

    const profileBtn = document.getElementById('profile-btn');
    const overlay = document.getElementById('profile-overlay');
    const closeBtn = document.getElementById('profile-close-btn');
    const statusEl = document.getElementById('profile-status');
    const badgeGrid = document.getElementById('badge-grid');
    const skinGrid = document.getElementById('skin-grid');

    // Standard-skinet er alltid ulåst og bruker level-temaets accent-farge (body/glow/trail = null).
    const DEFAULT_SKIN = { id: 'default', name: 'Standard', body: null, glow: null, trail: null };

    // Hvert skin låses opp av en badge. Kravene er bevisst grindy.
    const SKINS = [
        {
            id: 'ember', name: 'Ember', badge: 'Rookie',
            body: '#fb923c', glow: '#f97316', trail: '#fdba74',
            req: { stat: 'bestLevel', value: 5 },
        },
        {
            id: 'aqua', name: 'Aqua', badge: 'Highscore I',
            body: '#38bdf8', glow: '#0ea5e9', trail: '#7dd3fc',
            req: { stat: 'personalBest', value: 2000 },
        },
        {
            id: 'violet', name: 'Violet', badge: 'Highscore II',
            body: '#c084fc', glow: '#a855f7', trail: '#d8b4fe',
            req: { stat: 'personalBest', value: 4000 },
        },
        {
            id: 'gold', name: 'Gull', badge: 'Supernova',
            body: '#fcd34d', glow: '#f59e0b', trail: '#fde68a',
            req: { stat: 'bestLevel', value: 10 },
        },
        {
            id: 'emerald', name: 'Smaragd', badge: 'Maraton',
            body: '#34d399', glow: '#10b981', trail: '#6ee7b7',
            req: { stat: 'totalPlaySeconds', value: 3600 },
        },
        {
            id: 'crimson', name: 'Crimson', badge: 'Veteran',
            body: '#f43f5e', glow: '#e11d48', trail: '#fb7185',
            req: { stat: 'gamesPlayed', value: 100 },
        },
        {
            id: 'plasma', name: 'Plasma', badge: 'Legende',
            body: '#f472b6', glow: '#db2777', trail: '#f9a8d4',
            req: { stat: 'personalBest', value: 8000 },
        },
        {
            id: 'chrome', name: 'Chrome', badge: 'Poengjeger',
            body: '#e2e8f0', glow: '#94a3b8', trail: '#f1f5f9',
            req: { stat: 'totalScore', value: 100000 },
        },
        {
            id: 'frost', name: 'Frost', badge: 'Utholdenhet',
            body: '#5eead4', glow: '#14b8a6', trail: '#99f6e4',
            req: { stat: 'totalPlaySeconds', value: 18000 },
        },
        {
            id: 'void', name: 'Void', badge: 'Fanatiker',
            body: '#818cf8', glow: '#4f46e5', trail: '#c7d2fe',
            req: { stat: 'gamesPlayed', value: 500 },
        },
        {
            id: 'toxic', name: 'Toksisk', badge: 'Rikdom',
            body: '#bef264', glow: '#84cc16', trail: '#d9f99d',
            req: { stat: 'totalScore', value: 250000 },
        },
    ];

    let stats = { personalBest: 0, bestLevel: 1, totalPlaySeconds: 0, gamesPlayed: 0, totalScore: 0 };
    let equippedSkinId = 'default';
    let unlockedIds = new Set();
    let baselineLoaded = false;
    let saving = false;

    function getClient() {
        return window.Auth?.getClient() ?? null;
    }

    function getUserId() {
        return window.Auth?.getUser()?.id ?? null;
    }

    function getSkinById(id) {
        if (id === 'default') return DEFAULT_SKIN;
        return SKINS.find((s) => s.id === id) ?? null;
    }

    function statValue(stat) {
        return stats[stat] ?? 0;
    }

    function isUnlocked(skin) {
        if (skin.id === 'default') return true;
        return statValue(skin.req.stat) >= skin.req.value;
    }

    function formatReqValue(stat, value) {
        if (stat === 'totalPlaySeconds') {
            return window.Stats?.formatPlayTime?.(value) ?? value + ' sek';
        }
        if (stat === 'bestLevel') return 'Level ' + value;
        if (stat === 'personalBest') return value.toLocaleString('nb-NO') + ' poeng';
        if (stat === 'gamesPlayed') return value + ' runder';
        if (stat === 'totalScore') return value.toLocaleString('nb-NO') + ' poeng totalt';
        return String(value);
    }

    function formatProgress(stat, value) {
        if (stat === 'totalPlaySeconds') {
            return window.Stats?.formatPlayTime?.(value) ?? value + ' sek';
        }
        if (stat === 'personalBest' || stat === 'totalScore') {
            return value.toLocaleString('nb-NO');
        }
        return String(value);
    }

    function computeUnlocked() {
        const set = new Set(['default']);
        for (const skin of SKINS) {
            if (isUnlocked(skin)) set.add(skin.id);
        }
        return set;
    }

    // Fargene game.js skal bruke for det utstyrte skinet, eller null for standard.
    function getEquippedSkinColors() {
        const skin = getSkinById(equippedSkinId);
        if (!skin || skin.id === 'default') return null;
        if (!unlockedIds.has(skin.id)) return null;
        return { body: skin.body, glow: skin.glow, trail: skin.trail };
    }

    function showToast(message) {
        const toast = document.createElement('div');
        toast.className = 'badge-toast';
        toast.textContent = message;
        document.body.appendChild(toast);
        requestAnimationFrame(() => toast.classList.add('badge-toast-show'));
        setTimeout(() => {
            toast.classList.remove('badge-toast-show');
            setTimeout(() => toast.remove(), 400);
        }, 3600);
    }

    function announceNewUnlocks(previous, current) {
        for (const skin of SKINS) {
            if (current.has(skin.id) && !previous.has(skin.id)) {
                showToast('Badge låst opp: ' + skin.badge + ' – ny farge «' + skin.name + '»!');
            }
        }
    }

    function renderBadges() {
        if (!badgeGrid) return;
        badgeGrid.replaceChildren();

        for (const skin of SKINS) {
            const unlocked = unlockedIds.has(skin.id);
            const current = statValue(skin.req.stat);
            const target = skin.req.value;
            const pct = Math.max(0, Math.min(100, Math.round((current / target) * 100)));

            const card = document.createElement('div');
            card.className = 'badge-card' + (unlocked ? ' badge-unlocked' : ' badge-locked');

            const dot = document.createElement('span');
            dot.className = 'badge-dot';
            dot.style.background = unlocked ? skin.body : 'transparent';
            dot.style.borderColor = skin.body;
            dot.textContent = unlocked ? '✓' : '🔒';

            const info = document.createElement('div');
            info.className = 'badge-info';

            const name = document.createElement('span');
            name.className = 'badge-name';
            name.textContent = skin.badge;

            const req = document.createElement('span');
            req.className = 'badge-req';
            req.textContent = unlocked
                ? 'Låst opp'
                : formatReqValue(skin.req.stat, skin.req.value);

            info.append(name, req);

            const bar = document.createElement('div');
            bar.className = 'badge-bar';
            const fill = document.createElement('div');
            fill.className = 'badge-bar-fill';
            fill.style.width = pct + '%';
            fill.style.background = skin.body;
            bar.appendChild(fill);

            const progress = document.createElement('span');
            progress.className = 'badge-progress';
            progress.textContent = formatProgress(skin.req.stat, current) + ' / '
                + formatProgress(skin.req.stat, target);

            info.append(bar, progress);
            card.append(dot, info);
            badgeGrid.appendChild(card);
        }
    }

    function renderSkins() {
        if (!skinGrid) return;
        skinGrid.replaceChildren();

        const all = [DEFAULT_SKIN, ...SKINS];
        for (const skin of all) {
            const unlocked = unlockedIds.has(skin.id);
            const selected = skin.id === equippedSkinId;

            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'skin-swatch'
                + (unlocked ? '' : ' skin-locked')
                + (selected ? ' skin-selected' : '');
            btn.disabled = !unlocked;
            btn.title = unlocked
                ? skin.name
                : skin.name + ' – ' + formatReqValue(skin.req.stat, skin.req.value);

            const chip = document.createElement('span');
            chip.className = 'skin-chip';
            if (skin.id === 'default') {
                chip.style.background = 'conic-gradient(#22d3ee, #a78bfa, #4ade80, #fcd34d, #22d3ee)';
            } else {
                chip.style.background = skin.body;
                chip.style.boxShadow = '0 0 10px ' + skin.glow;
            }
            if (!unlocked) chip.textContent = '🔒';

            const label = document.createElement('span');
            label.className = 'skin-label';
            label.textContent = skin.name;

            btn.append(chip, label);
            btn.addEventListener('click', () => equipSkin(skin.id));
            skinGrid.appendChild(btn);
        }
    }

    function render() {
        renderBadges();
        renderSkins();
    }

    async function equipSkin(id) {
        if (saving) return;
        if (!unlockedIds.has(id)) return;
        if (id === equippedSkinId) return;

        const previous = equippedSkinId;
        equippedSkinId = id;
        renderSkins();

        const client = getClient();
        const userId = getUserId();
        if (!client || !userId) return;

        saving = true;
        const { error } = await client
            .from('profiles')
            .update({ equipped_skin: id === 'default' ? null : id })
            .eq('id', userId);
        saving = false;

        if (error) {
            console.error('equipSkin failed:', error);
            equippedSkinId = previous;
            renderSkins();
            if (statusEl) statusEl.textContent = 'Kunne ikke lagre farge: ' + error.message;
        } else if (statusEl) {
            statusEl.textContent = '';
        }
    }

    async function refresh() {
        const client = getClient();
        const userId = getUserId();
        if (!client || !userId) return;

        const [statsResult, scoreResult, profileResult] = await Promise.all([
            client
                .from('player_stats')
                .select('best_level, total_play_seconds, games_played, total_score')
                .eq('user_id', userId)
                .maybeSingle(),
            client
                .from('scores')
                .select('score')
                .eq('user_id', userId)
                .maybeSingle(),
            client
                .from('profiles')
                .select('equipped_skin')
                .eq('id', userId)
                .maybeSingle(),
        ]);

        if (statsResult.error || scoreResult.error || profileResult.error) {
            const err = statsResult.error || scoreResult.error || profileResult.error;
            if (statusEl) statusEl.textContent = err.message;
            return;
        }

        stats = {
            personalBest: scoreResult.data?.score ?? 0,
            bestLevel: statsResult.data?.best_level ?? 1,
            totalPlaySeconds: statsResult.data?.total_play_seconds ?? 0,
            gamesPlayed: statsResult.data?.games_played ?? 0,
            totalScore: statsResult.data?.total_score ?? 0,
        };

        equippedSkinId = profileResult.data?.equipped_skin || 'default';

        const previousUnlocked = unlockedIds;
        unlockedIds = computeUnlocked();

        if (baselineLoaded) {
            announceNewUnlocks(previousUnlocked, unlockedIds);
        }
        baselineLoaded = true;

        if (statusEl) statusEl.textContent = '';
        render();
    }

    function openProfile() {
        if (!overlay) return;
        overlay.classList.remove('hidden');
        refresh();
    }

    function closeProfile() {
        if (overlay) overlay.classList.add('hidden');
    }

    function reset() {
        stats = { personalBest: 0, bestLevel: 1, totalPlaySeconds: 0, gamesPlayed: 0, totalScore: 0 };
        equippedSkinId = 'default';
        unlockedIds = new Set(['default']);
        baselineLoaded = false;
        closeProfile();
    }

    if (profileBtn) profileBtn.addEventListener('click', openProfile);
    if (closeBtn) closeBtn.addEventListener('click', closeProfile);
    if (overlay) {
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) closeProfile();
        });
    }
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && overlay && !overlay.classList.contains('hidden')) {
            closeProfile();
        }
    });

    document.addEventListener('auth:changed', (e) => {
        if (e.detail?.user) refresh();
        else reset();
    });

    document.addEventListener('stats:updated', () => refresh());

    window.Auth?.whenReady?.().then(() => {
        if (window.Auth?.isLoggedIn()) refresh();
    });

    window.Profile = {
        getEquippedSkinColors,
        refresh,
        open: openProfile,
    };
})();

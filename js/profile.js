(function () {
    'use strict';

    const profileBtn = document.getElementById('profile-btn');
    const overlay = document.getElementById('profile-overlay');
    const closeBtn = document.getElementById('profile-close-btn');
    const profileTitleEl = document.getElementById('profile-title');
    const statusEl = document.getElementById('profile-status');
    const profileStatsGrid = document.getElementById('profile-stats-grid');
    const badgeGrid = document.getElementById('badge-grid');
    const skinsSection = document.getElementById('profile-skins-section');
    const skinsHint = document.getElementById('profile-skins-hint');
    const skinGrid = document.getElementById('skin-grid');
    const equippedSection = document.getElementById('profile-equipped-section');
    const equippedChipEl = document.getElementById('profile-equipped-chip');

    // Standard-skinet er alltid ulåst og bruker level-temaets accent-farge.
    const DEFAULT_SKIN = { id: 'default', name: 'Standard', tier: 'default', body: null, glow: null, trail: null };

    // Hvert skin låses opp av en badge. Belønningene trappes opp:
    //   flat    -> gråtone, ingen glow (letteste badges)
    //   glow    -> farge med glow + trail (middels)
    //   pattern -> animert effekt (hardeste grind)
    const SKINS = [
        // --- Flat gråtone, ingen glow (5 letteste) ---
        {
            id: 'white', name: 'Hvit', badge: 'Rookie', tier: 'flat',
            body: '#f8fafc', glow: null, trail: null,
            req: { stat: 'bestLevel', value: 5 },
        },
        {
            id: 'silver', name: 'Sølv', badge: 'Highscore I', tier: 'flat',
            body: '#cbd5e1', glow: null, trail: null,
            req: { stat: 'personalBest', value: 2000 },
        },
        {
            id: 'gray', name: 'Grå', badge: 'Maraton', tier: 'flat',
            body: '#94a3b8', glow: null, trail: null,
            req: { stat: 'totalPlaySeconds', value: 3600 },
        },
        {
            id: 'graphite', name: 'Grafitt', badge: 'Highscore II', tier: 'flat',
            body: '#64748b', glow: null, trail: null,
            req: { stat: 'personalBest', value: 4000 },
        },
        {
            id: 'onyx', name: 'Onyx', badge: 'Veteran', tier: 'flat',
            body: '#334155', glow: null, trail: null,
            req: { stat: 'gamesPlayed', value: 100 },
        },
        // --- Farge med glow + trail (middels) ---
        {
            id: 'gold', name: 'Gull', badge: 'Supernova', tier: 'glow',
            body: '#fcd34d', glow: '#f59e0b', trail: '#fde68a',
            req: { stat: 'bestLevel', value: 10 },
        },
        {
            id: 'plasma', name: 'Plasma', badge: 'Legende', tier: 'glow',
            body: '#f472b6', glow: '#db2777', trail: '#f9a8d4',
            req: { stat: 'personalBest', value: 8000 },
        },
        {
            id: 'frost', name: 'Frost', badge: 'Utholdenhet', tier: 'glow',
            body: '#5eead4', glow: '#14b8a6', trail: '#99f6e4',
            req: { stat: 'totalPlaySeconds', value: 18000 },
        },
        {
            id: 'violet', name: 'Violet', badge: 'Poengjeger', tier: 'glow',
            body: '#c084fc', glow: '#a855f7', trail: '#d8b4fe',
            req: { stat: 'totalScore', value: 100000 },
        },
        {
            id: 'inferno', name: 'Inferno', badge: 'Kombomester', tier: 'glow',
            body: '#fb7185', glow: '#e11d48', trail: '#fda4af',
            req: { stat: 'bestCombo', value: 30 },
        },
        // --- Animert mønster (hardeste grind) ---
        {
            id: 'nova', name: 'Nova', badge: 'Fanatiker', tier: 'pattern', effect: 'pulse',
            body: '#818cf8', glow: '#4f46e5', trail: '#c7d2fe',
            req: { stat: 'gamesPlayed', value: 500 },
        },
        {
            id: 'rainbow', name: 'Regnbue', badge: 'Rikdom', tier: 'pattern', effect: 'rainbow',
            body: '#f472b6', glow: '#a855f7', trail: '#fca5a5',
            req: { stat: 'totalScore', value: 250000 },
        },
    ];

    let stats = { personalBest: 0, bestLevel: 1, totalPlaySeconds: 0, gamesPlayed: 0, totalScore: 0, bestCombo: 0 };
    let equippedSkinId = 'default';
    let unlockedIds = new Set();
    let ownStats = { personalBest: 0, bestLevel: 1, totalPlaySeconds: 0, gamesPlayed: 0, totalScore: 0, bestCombo: 0 };
    let ownEquippedSkinId = 'default';
    let ownUnlockedIds = new Set(['default']);
    let baselineLoaded = false;
    let saving = false;
    let viewingUserId = null;
    let viewingDisplayName = '';

    function getClient() {
        return window.Auth?.getClient() ?? null;
    }

    function getUserId() {
        return window.Auth?.getUser()?.id ?? null;
    }

    function isViewingOther() {
        const ownId = getUserId();
        return Boolean(viewingUserId && ownId && viewingUserId !== ownId);
    }

    function isViewingSelf() {
        if (!viewingUserId) return true;
        return viewingUserId === getUserId();
    }

    function updateViewMode() {
        const other = isViewingOther();
        if (profileTitleEl) {
            if (other && viewingDisplayName) {
                profileTitleEl.textContent = viewingDisplayName + 's profil';
            } else {
                profileTitleEl.textContent = 'Min profil';
            }
        }
        if (skinsSection) skinsSection.classList.toggle('hidden', other);
        if (equippedSection) equippedSection.classList.toggle('hidden', !other);
    }

    function buildSkinChipElement(skin, unlocked) {
        const chip = document.createElement('span');
        chip.className = 'skin-chip';
        if (skin.id === 'default') {
            chip.style.background = 'conic-gradient(#22d3ee, #a78bfa, #4ade80, #fcd34d, #22d3ee)';
        } else if (skin.effect === 'rainbow') {
            chip.classList.add('skin-chip-rainbow');
        } else if (skin.effect === 'pulse') {
            chip.classList.add('skin-chip-pulse');
            chip.style.background = skin.body;
            chip.style.setProperty('--pulse-glow', skin.glow);
        } else if (skin.tier === 'flat') {
            chip.style.background = skin.body;
        } else {
            chip.style.background = skin.body;
            if (skin.glow) chip.style.boxShadow = '0 0 10px ' + skin.glow;
        }
        if (!unlocked && skin.id !== 'default') chip.textContent = '🔒';
        return chip;
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
        if (stat === 'bestCombo') return value + ' combo';
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

    function computeUnlockedFromStats(data) {
        const set = new Set(['default']);
        for (const skin of SKINS) {
            const val = data[skin.req.stat] ?? 0;
            if (skin.id !== 'default' && val >= skin.req.value) set.add(skin.id);
        }
        return set;
    }

    function computeUnlocked() {
        return computeUnlockedFromStats(stats);
    }

    // Full skin-deskriptor game.js skal tegne, eller null for standard.
    function getEquippedSkinColors() {
        const skin = getSkinById(ownEquippedSkinId);
        if (!skin || skin.id === 'default') return null;
        if (!ownUnlockedIds.has(skin.id)) return null;
        return {
            tier: skin.tier,
            effect: skin.effect ?? null,
            body: skin.body,
            glow: skin.glow,
            trail: skin.trail,
        };
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
        const newly = SKINS.filter((skin) => current.has(skin.id) && !previous.has(skin.id));
        if (!newly.length) return;

        for (const skin of newly) {
            showToast('Badge låst opp: ' + skin.badge + ' – ny farge «' + skin.name + '»!');
        }

        document.dispatchEvent(new CustomEvent('badge:unlocked', {
            detail: {
                skins: newly.map((skin) => ({
                    badge: skin.badge,
                    name: skin.name,
                    tier: skin.tier,
                    effect: skin.effect ?? null,
                    body: skin.body,
                })),
            },
        }));
    }

    function renderStatsSummary() {
        if (!profileStatsGrid) return;
        profileStatsGrid.replaceChildren();

        const fields = [
            { label: 'Personlig rekord', value: stats.personalBest.toLocaleString('nb-NO') },
            { label: 'Høyeste level', value: String(stats.bestLevel) },
            { label: 'Beste combo', value: String(stats.bestCombo) },
            { label: 'Runder spilt', value: String(stats.gamesPlayed) },
            { label: 'Total tid', value: window.Stats?.formatPlayTime?.(stats.totalPlaySeconds) ?? stats.totalPlaySeconds + ' sek' },
        ];

        for (const field of fields) {
            const row = document.createElement('div');
            row.className = 'profile-stats-row';

            const label = document.createElement('span');
            label.className = 'profile-stats-label';
            label.textContent = field.label;

            const value = document.createElement('span');
            value.className = 'profile-stats-value';
            value.textContent = field.value;

            row.append(label, value);
            profileStatsGrid.appendChild(row);
        }
    }

    function renderEquippedChip() {
        if (!equippedChipEl) return;
        equippedChipEl.replaceChildren();

        const skin = getSkinById(equippedSkinId) ?? DEFAULT_SKIN;
        const unlocked = unlockedIds.has(skin.id);

        const chip = buildSkinChipElement(skin, unlocked);
        const label = document.createElement('span');
        label.className = 'profile-equipped-name';
        label.textContent = skin.name;

        equippedChipEl.append(chip, label);
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

            const chip = buildSkinChipElement(skin, unlocked);

            const label = document.createElement('span');
            label.className = 'skin-label';
            label.textContent = skin.name;

            btn.append(chip, label);
            btn.addEventListener('click', () => equipSkin(skin.id));
            skinGrid.appendChild(btn);
        }
    }

    function render() {
        updateViewMode();
        renderStatsSummary();
        renderBadges();
        if (isViewingOther()) {
            renderEquippedChip();
        } else {
            renderSkins();
        }
    }

    async function equipSkin(id) {
        if (saving || isViewingOther()) return;
        if (!unlockedIds.has(id)) return;
        if (id === equippedSkinId) return;

        const previous = equippedSkinId;
        equippedSkinId = id;
        ownEquippedSkinId = id;
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
            ownEquippedSkinId = previous;
            renderSkins();
            if (statusEl) statusEl.textContent = 'Kunne ikke lagre farge: ' + error.message;
        } else if (statusEl) {
            statusEl.textContent = '';
        }
    }

    async function fetchUserData(userId) {
        const client = getClient();
        if (!client || !userId) return { ok: false, reason: 'no_client' };

        const [statsResult, scoreResult, profileResult] = await Promise.all([
            client
                .from('player_stats')
                .select('best_level, total_play_seconds, games_played, total_score, best_combo')
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
            return {
                ok: false,
                error: statsResult.error || scoreResult.error || profileResult.error,
            };
        }

        return {
            ok: true,
            stats: {
                personalBest: scoreResult.data?.score ?? 0,
                bestLevel: statsResult.data?.best_level ?? 1,
                totalPlaySeconds: statsResult.data?.total_play_seconds ?? 0,
                gamesPlayed: statsResult.data?.games_played ?? 0,
                totalScore: statsResult.data?.total_score ?? 0,
                bestCombo: statsResult.data?.best_combo ?? 0,
            },
            equippedSkinId: profileResult.data?.equipped_skin || 'default',
        };
    }

    async function refresh() {
        const client = getClient();
        const targetUserId = viewingUserId || getUserId();
        if (!client || !targetUserId) return;

        if (statusEl) statusEl.textContent = 'Laster...';

        const result = await fetchUserData(targetUserId);
        if (!result.ok) {
            if (statusEl) statusEl.textContent = result.error?.message || 'Kunne ikke laste profil.';
            return;
        }

        stats = result.stats;
        equippedSkinId = result.equippedSkinId;
        unlockedIds = computeUnlockedFromStats(stats);

        if (isViewingSelf()) {
            const previousUnlocked = new Set(ownUnlockedIds);
            ownStats = { ...stats };
            ownEquippedSkinId = equippedSkinId;
            ownUnlockedIds = new Set(unlockedIds);

            if (baselineLoaded) {
                announceNewUnlocks(previousUnlocked, ownUnlockedIds);
            }
            baselineLoaded = true;
        }

        if (statusEl) statusEl.textContent = '';
        render();
    }

    function openProfile() {
        if (!overlay) return;
        viewingUserId = null;
        viewingDisplayName = '';
        overlay.classList.remove('hidden');
        refresh();
    }

    function openUserProfile(userId, displayName) {
        if (!overlay || !userId) return;
        viewingUserId = userId;
        viewingDisplayName = displayName || 'Spiller';
        overlay.classList.remove('hidden');
        refresh();
    }

    function closeProfile() {
        if (overlay) overlay.classList.add('hidden');
        viewingUserId = null;
        viewingDisplayName = '';
    }

    function reset() {
        stats = { personalBest: 0, bestLevel: 1, totalPlaySeconds: 0, gamesPlayed: 0, totalScore: 0, bestCombo: 0 };
        equippedSkinId = 'default';
        unlockedIds = new Set(['default']);
        ownStats = { personalBest: 0, bestLevel: 1, totalPlaySeconds: 0, gamesPlayed: 0, totalScore: 0, bestCombo: 0 };
        ownEquippedSkinId = 'default';
        ownUnlockedIds = new Set(['default']);
        baselineLoaded = false;
        viewingUserId = null;
        viewingDisplayName = '';
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
        if (e.detail?.user) {
            if (!viewingUserId || isViewingSelf()) refresh();
        } else {
            reset();
        }
    });

    document.addEventListener('stats:updated', () => {
        if (!viewingUserId || isViewingSelf()) refresh();
    });

    window.Auth?.whenReady?.().then(() => {
        if (window.Auth?.isLoggedIn() && !viewingUserId) refresh();
    });

    window.Profile = {
        getEquippedSkinColors,
        refresh,
        open: openProfile,
        openUser: openUserProfile,
    };
})();

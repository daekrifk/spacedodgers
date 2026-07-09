(function () {
    'use strict';

    const statsPanel = document.getElementById('stats-panel');
    const statsGrid = document.getElementById('stats-grid');
    const statsStatus = document.getElementById('stats-status');

    const STAT_FIELDS = [
        { key: 'games_played', label: 'Runder spilt' },
        { key: 'personal_best', label: 'Personlig rekord' },
        { key: 'average_score', label: 'Snitt-score' },
        { key: 'best_level', label: 'Høyeste level' },
        { key: 'best_combo', label: 'Beste combo' },
        { key: 'total_play_time', label: 'Total tid' },
        { key: 'last_played', label: 'Sist spilt' },
    ];

    function getClient() {
        return window.Auth?.getClient() ?? null;
    }

    function formatPlayTime(seconds) {
        const total = Math.max(0, Number(seconds) || 0);
        if (total < 60) return total + ' sek';
        const minutes = Math.floor(total / 60);
        if (minutes < 60) return minutes + ' min';
        const hours = Math.floor(minutes / 60);
        const rem = minutes % 60;
        return rem > 0 ? hours + 't ' + rem + ' min' : hours + 't';
    }

    function formatLastPlayed(iso) {
        if (!iso) return '–';
        const date = new Date(iso);
        if (Number.isNaN(date.getTime())) return '–';

        const now = new Date();
        const time = date.toLocaleTimeString('nb-NO', { hour: '2-digit', minute: '2-digit' });

        if (date.toDateString() === now.toDateString()) {
            return 'I dag ' + time;
        }

        const yesterday = new Date(now);
        yesterday.setDate(yesterday.getDate() - 1);
        if (date.toDateString() === yesterday.toDateString()) {
            return 'I går ' + time;
        }

        return date.toLocaleDateString('nb-NO', { day: 'numeric', month: 'short' }) + ' ' + time;
    }

    function buildDisplayData(statsRow, personalBest) {
        const gamesPlayed = statsRow?.games_played ?? 0;
        const totalScore = statsRow?.total_score ?? 0;
        const averageScore = gamesPlayed > 0 ? Math.round(totalScore / gamesPlayed) : 0;

        return {
            games_played: String(gamesPlayed),
            personal_best: String(personalBest ?? 0),
            average_score: String(averageScore),
            best_level: String(statsRow?.best_level ?? 1),
            best_combo: String(statsRow?.best_combo ?? 0),
            total_play_time: formatPlayTime(statsRow?.total_play_seconds ?? 0),
            last_played: formatLastPlayed(statsRow?.last_played_at),
        };
    }

    function setStatus(message, isError) {
        if (!statsStatus) return;
        statsStatus.textContent = message;
        statsStatus.classList.toggle('stats-status-error', Boolean(isError));
    }

    function renderStats(displayData) {
        if (!statsGrid) return;

        statsGrid.replaceChildren();

        for (const field of STAT_FIELDS) {
            const row = document.createElement('div');
            row.className = 'stats-row';

            const label = document.createElement('span');
            label.className = 'stats-label';
            label.textContent = field.label;

            const value = document.createElement('span');
            value.className = 'stats-value';
            value.textContent = displayData[field.key] ?? '–';

            row.append(label, value);
            statsGrid.appendChild(row);
        }
    }

    function showPanel() {
        if (statsPanel) statsPanel.classList.remove('hidden');
    }

    function hidePanel() {
        if (statsPanel) statsPanel.classList.add('hidden');
        renderStats(buildDisplayData(null, 0));
        setStatus('');
    }

    async function ensurePlayerStatsRow() {
        const client = getClient();
        if (!client || !window.Auth?.isLoggedIn()) return;
        const { error } = await client.rpc('ensure_player_stats');
        if (error) {
            console.warn('ensure_player_stats failed:', error.message);
        }
    }

    async function fetchStats() {
        const client = getClient();
        if (!client || !window.Auth?.isLoggedIn()) {
            hidePanel();
            return null;
        }

        const userId = window.Auth.getUser()?.id;
        if (!userId) {
            hidePanel();
            return null;
        }

        await ensurePlayerStatsRow();

        setStatus('Laster...');

        const [statsResult, scoreResult] = await Promise.all([
            client
                .from('player_stats')
                .select('games_played, total_score, best_level, total_play_seconds, best_combo, last_played_at')
                .eq('user_id', userId)
                .maybeSingle(),
            client
                .from('scores')
                .select('score')
                .eq('user_id', userId)
                .maybeSingle(),
        ]);

        if (statsResult.error) {
            setStatus(statsResult.error.message, true);
            return null;
        }

        if (scoreResult.error) {
            setStatus(scoreResult.error.message, true);
            return null;
        }

        const displayData = buildDisplayData(statsResult.data, scoreResult.data?.score ?? 0);
        renderStats(displayData);
        setStatus('');
        showPanel();
        return displayData;
    }

    async function recordGameRun(score, level, durationSec, bestCombo) {
        const client = getClient();
        if (!client || !window.Auth?.isLoggedIn()) {
            return { ok: false, reason: 'not_logged_in' };
        }

        await ensurePlayerStatsRow();

        const safeDuration = Math.max(1, Math.min(86400, Math.round(durationSec)));
        const safeCombo = Math.max(0, Math.round(bestCombo || 0));

        const { error } = await client.rpc('finish_game_run', {
            p_score: score,
            p_level: level,
            p_duration_sec: safeDuration,
            p_best_combo: safeCombo,
        });

        if (error) {
            console.error('finish_game_run failed:', error);

            if (window.Leaderboard?.submitScore) {
                const fallback = await window.Leaderboard.submitScore(score, level);
                if (fallback.ok) {
                    await window.Leaderboard.fetchLeaderboard();
                    await fetchStats();
                    return {
                        ok: true,
                        warning: 'Leaderboard lagret, men statistikk-DB mangler. Kjør stats.sql i Supabase.',
                    };
                }
            }

            return { ok: false, reason: error.message };
        }

        await fetchStats();

        if (window.Leaderboard?.fetchLeaderboard) {
            await window.Leaderboard.fetchLeaderboard();
        }

        document.dispatchEvent(new CustomEvent('stats:updated'));
        return { ok: true };
    }

    function syncWithAuth() {
        if (window.Auth?.isLoggedIn()) {
            fetchStats();
        } else {
            hidePanel();
        }
    }

    document.addEventListener('auth:changed', (e) => {
        if (e.detail?.user) fetchStats();
        else hidePanel();
    });

    window.Auth?.whenReady?.().then(syncWithAuth);

    window.Stats = {
        fetchStats,
        recordGameRun,
        formatPlayTime,
        formatLastPlayed,
    };
})();

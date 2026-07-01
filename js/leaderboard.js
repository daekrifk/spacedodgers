(function () {
    'use strict';

    const leaderboardList = document.getElementById('leaderboard-list');
    const leaderboardStatus = document.getElementById('leaderboard-status');
    const refreshBtn = document.getElementById('refresh-leaderboard-btn');

    function isLoggedIn() {
        return window.Auth?.isLoggedIn() ?? false;
    }

    function setStatus(message, isError) {
        if (!leaderboardStatus) return;
        leaderboardStatus.textContent = message;
        leaderboardStatus.classList.toggle('leaderboard-status-error', Boolean(isError));
    }

    function renderRows(rows) {
        if (!leaderboardList) return;

        if (!rows.length) {
            leaderboardList.innerHTML = '<li class="leaderboard-empty">Ingen scores ennå – vær først!</li>';
            return;
        }

        leaderboardList.innerHTML = rows.map((row, index) => {
            const rank = index + 1;
            const medal = rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : `${rank}.`;
            return `
                <li class="leaderboard-row">
                    <span class="leaderboard-rank">${medal}</span>
                    <span class="leaderboard-name">${escapeHtml(row.display_name)}</span>
                    <span class="leaderboard-score">${row.score}</span>
                    <span class="leaderboard-level">Lv ${row.level}</span>
                </li>
            `;
        }).join('');
    }

    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    async function fetchLeaderboard() {
        const client = window.Auth?.getClient();
        if (!client) {
            setStatus('Konfigurer Supabase for å se leaderboard.', true);
            renderRows([]);
            return [];
        }

        if (!isLoggedIn()) {
            setStatus('Logg inn for å se leaderboard.');
            renderRows([]);
            return [];
        }

        setStatus('Laster...');

        const { data, error } = await client
            .from('scores')
            .select('score, level, updated_at, profiles(display_name)')
            .order('score', { ascending: false })
            .limit(20);

        if (error) {
            setStatus(error.message, true);
            return [];
        }

        const rows = (data || []).map((entry) => ({
            display_name: entry.profiles?.display_name || 'Ukjent',
            score: entry.score,
            level: entry.level
        }));

        renderRows(rows);
        setStatus(`Topp ${rows.length} spillere`);
        return rows;
    }

    async function submitScore(score, level) {
        const client = window.Auth?.getClient();
        if (!client || !isLoggedIn()) return { ok: false, reason: 'not_logged_in' };

        const { error } = await client.rpc('submit_score', {
            p_score: score,
            p_level: level
        });

        if (error) {
            console.error('submit_score failed:', error);
            return { ok: false, reason: error.message };
        }

        await fetchLeaderboard();
        return { ok: true };
    }

    if (refreshBtn) {
        refreshBtn.addEventListener('click', fetchLeaderboard);
    }

    document.addEventListener('auth:changed', (e) => {
        if (e.detail?.user) {
            fetchLeaderboard();
        } else {
            renderRows([]);
            setStatus('Logg inn for å se leaderboard.');
        }
    });

    window.Leaderboard = {
        isLoggedIn,
        fetchLeaderboard,
        submitScore,
        renderRows
    };
})();

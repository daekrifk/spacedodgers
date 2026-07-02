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

        leaderboardList.replaceChildren();

        if (!rows.length) {
            const li = document.createElement('li');
            li.className = 'leaderboard-empty';
            li.textContent = 'Ingen scores ennå – vær først!';
            leaderboardList.appendChild(li);
            return;
        }

        rows.forEach((row, index) => {
            const rank = index + 1;
            const medal = rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : rank + '.';

            const li = document.createElement('li');
            li.className = 'leaderboard-row';

            const rankEl = document.createElement('span');
            rankEl.className = 'leaderboard-rank';
            rankEl.textContent = medal;

            const nameEl = document.createElement('span');
            nameEl.className = 'leaderboard-name';
            window.Sanitize.setTextContent(nameEl, row.display_name);

            const scoreEl = document.createElement('span');
            scoreEl.className = 'leaderboard-score';
            scoreEl.textContent = String(row.score);

            const levelEl = document.createElement('span');
            levelEl.className = 'leaderboard-level';
            levelEl.textContent = 'Lv ' + row.level;

            li.append(rankEl, nameEl, scoreEl, levelEl);
            leaderboardList.appendChild(li);
        });
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

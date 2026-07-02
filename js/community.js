(function () {
    'use strict';

    const communityPanel = document.getElementById('community-panel');
    const communityTotal = document.getElementById('community-total');
    const communityOnline = document.getElementById('community-online');
    const communityPlaying = document.getElementById('community-playing');
    const communityStatus = document.getElementById('community-status');

    const HEARTBEAT_MS = 45000;
    const STATS_REFRESH_MS = 30000;

    let heartbeatTimer = null;
    let statsTimer = null;
    let isPlaying = false;

    function getClient() {
        return window.Auth?.getClient() ?? null;
    }

    function setStatus(message) {
        if (!communityStatus) return;
        communityStatus.textContent = message || '';
    }

    function setValue(el, value) {
        if (!el) return;
        el.textContent = String(value ?? '–');
    }

    function showPanel() {
        if (communityPanel) communityPanel.classList.remove('hidden');
    }

    function hidePanel() {
        if (communityPanel) communityPanel.classList.add('hidden');
        setValue(communityTotal, '–');
        setValue(communityOnline, '–');
        setValue(communityPlaying, '–');
        setStatus('');
    }

    async function sendHeartbeat() {
        const client = getClient();
        if (!client || !window.Auth?.isLoggedIn()) return;

        const { error } = await client.rpc('heartbeat', { p_is_playing: isPlaying });
        if (error) {
            console.warn('heartbeat failed:', error.message);
        }
    }

    async function fetchCommunityStats() {
        const client = getClient();
        if (!client || !window.Auth?.isLoggedIn()) {
            hidePanel();
            return;
        }

        const { data, error } = await client.rpc('get_community_stats');

        if (error) {
            setStatus('Aktivitet utilgjengelig');
            console.warn('get_community_stats failed:', error.message);
            showPanel();
            return;
        }

        setValue(communityTotal, data?.total_users ?? 0);
        setValue(communityOnline, data?.online_now ?? 0);
        setValue(communityPlaying, data?.playing_now ?? 0);
        setStatus('');
        showPanel();
    }

    function stopPresence() {
        if (heartbeatTimer) {
            clearInterval(heartbeatTimer);
            heartbeatTimer = null;
        }
        if (statsTimer) {
            clearInterval(statsTimer);
            statsTimer = null;
        }
        isPlaying = false;
        hidePanel();
    }

    async function startPresence() {
        stopPresence();
        if (!window.Auth?.isLoggedIn()) return;

        showPanel();
        await sendHeartbeat();
        await fetchCommunityStats();

        const client = getClient();
        if (client) {
            client.rpc('purge_stale_presence').catch(() => {});
        }

        heartbeatTimer = setInterval(sendHeartbeat, HEARTBEAT_MS);
        statsTimer = setInterval(fetchCommunityStats, STATS_REFRESH_MS);
    }

    function setPlaying(playing) {
        isPlaying = Boolean(playing);
        if (window.Auth?.isLoggedIn()) {
            sendHeartbeat();
            fetchCommunityStats();
        }
    }

    function syncWithAuth() {
        if (window.Auth?.isLoggedIn()) {
            startPresence();
        } else {
            stopPresence();
        }
    }

    document.addEventListener('auth:changed', (e) => {
        if (e.detail?.user) startPresence();
        else stopPresence();
    });

    window.Auth?.whenReady?.().then(syncWithAuth);

    window.Community = {
        setPlaying,
        fetchCommunityStats,
        startPresence,
        stopPresence,
    };
})();

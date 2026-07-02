(function () {
    'use strict';

    const chatSidebar = document.getElementById('chat-sidebar');
    const chatPanel = document.getElementById('chat-panel');
    const chatMessages = document.getElementById('chat-messages');
    const chatInput = document.getElementById('chat-input');
    const chatSendBtn = document.getElementById('chat-send-btn');
    const chatFlameBtn = document.getElementById('chat-flame-btn');
    const chatError = document.getElementById('chat-error');

    const MIN_SEND_INTERVAL_MS = 2000;
    let sessionStartedAt = null;
    let lastSentAt = 0;
    let realtimeChannel = null;
    let currentUserId = null;
    const seenMessageIds = new Set();

    function getClient() {
        return window.Auth?.getClient() ?? null;
    }

    function showChatError(message) {
        if (!chatError) return;
        window.Sanitize.setTextContent(chatError, message);
        chatError.classList.toggle('hidden', !message);
    }

    function clearChatError() {
        showChatError('');
    }

    function isMessageVisible(createdAt) {
        if (!sessionStartedAt) return false;
        return new Date(createdAt).getTime() >= sessionStartedAt;
    }

    function appendMessage(msg, isOwn) {
        if (!chatMessages || !msg?.id || seenMessageIds.has(msg.id)) return;
        if (!isMessageVisible(msg.created_at)) return;

        seenMessageIds.add(msg.id);

        const empty = chatMessages.querySelector('.chat-empty');
        if (empty) empty.remove();

        const row = document.createElement('div');
        row.className = 'chat-row ' + (isOwn ? 'chat-row-own' : 'chat-row-other');

        const bubble = document.createElement('div');
        bubble.className = 'chat-bubble'
            + (isOwn ? ' chat-bubble-own' : ' chat-bubble-other')
            + (msg.is_flame ? ' chat-bubble-flame' : '');

        const nameEl = document.createElement('span');
        nameEl.className = 'chat-message-name' + (isOwn ? ' chat-message-name-own' : '');
        window.Sanitize.setTextContent(nameEl, msg.display_name);
        bubble.appendChild(nameEl);

        const bodyEl = document.createElement('span');
        bodyEl.className = 'chat-message-body';
        window.Sanitize.setTextContent(bodyEl, msg.body);
        bubble.appendChild(bodyEl);

        row.appendChild(bubble);
        chatMessages.appendChild(row);
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }

    function clearMessages() {
        if (!chatMessages) return;
        chatMessages.replaceChildren();
        const empty = document.createElement('p');
        empty.className = 'chat-empty';
        empty.textContent = 'Ingen meldinger enn\u00e5. Si hei!';
        chatMessages.appendChild(empty);
        seenMessageIds.clear();
    }

    async function purgeAndFetch() {
        const client = getClient();
        if (!client || !sessionStartedAt) return;

        await client.rpc('purge_expired_chat');

        const since = new Date(sessionStartedAt).toISOString();
        const { data, error } = await client
            .from('chat_messages')
            .select('id, user_id, display_name, body, is_flame, created_at')
            .gte('created_at', since)
            .order('created_at', { ascending: true })
            .limit(100);

        if (error) {
            showChatError(error.message);
            return;
        }

        clearMessages();
        for (const msg of data || []) {
            appendMessage(msg, msg.user_id === currentUserId);
        }
    }

    function subscribeRealtime() {
        const client = getClient();
        if (!client || realtimeChannel) return;

        realtimeChannel = client
            .channel('chat-messages')
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'chat_messages' }, (payload) => {
                const msg = payload.new;
                if (!msg) return;
                appendMessage(msg, msg.user_id === currentUserId);
            })
            .subscribe();
    }

    function unsubscribeRealtime() {
        const client = getClient();
        if (client && realtimeChannel) client.removeChannel(realtimeChannel);
        realtimeChannel = null;
    }

    function canSendNow() {
        const now = Date.now();
        if (now - lastSentAt < MIN_SEND_INTERVAL_MS) {
            showChatError('Vent litt f\u00f8r du sender igjen.');
            return false;
        }
        return true;
    }

    async function sendMessage(body, isFlame) {
        clearChatError();
        const client = getClient();
        if (!client || !window.Auth?.isLoggedIn()) return;

        if (!canSendNow()) return;

        let messageBody = '';
        if (!isFlame) {
            const validation = window.Sanitize.validateChatBody(body);
            if (!validation.ok) {
                showChatError(validation.error);
                return;
            }
            messageBody = validation.value;
        }

        chatSendBtn.disabled = true;
        chatFlameBtn.disabled = true;

        const { error } = await client.rpc('send_chat_message', {
            p_body: messageBody,
            p_is_flame: isFlame
        });

        chatSendBtn.disabled = false;
        chatFlameBtn.disabled = false;

        if (error) {
            showChatError(error.message);
            return;
        }

        lastSentAt = Date.now();
        if (!isFlame && chatInput) chatInput.value = '';
    }

    function startChat(user) {
        sessionStartedAt = Date.now();
        currentUserId = user?.id ?? null;
        if (chatSidebar) chatSidebar.classList.remove('hidden');
        if (chatPanel) chatPanel.classList.remove('hidden');
        clearMessages();
        purgeAndFetch();
        subscribeRealtime();
    }

    function stopChat() {
        unsubscribeRealtime();
        sessionStartedAt = null;
        currentUserId = null;
        lastSentAt = 0;
        if (chatSidebar) chatSidebar.classList.add('hidden');
        if (chatPanel) chatPanel.classList.add('hidden');
        clearMessages();
        clearChatError();
        if (chatInput) chatInput.value = '';
    }

    if (chatSendBtn) chatSendBtn.addEventListener('click', () => sendMessage(chatInput?.value ?? '', false));
    if (chatFlameBtn) chatFlameBtn.addEventListener('click', () => sendMessage('', true));
    if (chatInput) chatInput.addEventListener('keydown', (e) => {
        e.stopPropagation();
        if (e.key === 'Enter') { e.preventDefault(); sendMessage(chatInput.value, false); }
    });

    function syncWithAuth() {
        if (window.Auth?.isLoggedIn()) {
            startChat(window.Auth.getUser());
        } else {
            stopChat();
        }
    }

    document.addEventListener('auth:changed', (e) => {
        if (e.detail?.user) startChat(e.detail.user);
        else stopChat();
    });

    window.Auth?.whenReady?.().then(syncWithAuth);

    window.Chat = { startChat, stopChat, sendMessage };
})();

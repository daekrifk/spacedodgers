(function () {
    'use strict';

    const DISPLAY_NAME_RE = /^[a-zA-Z\u00e6\u00f8\u00e5\u00c6\u00d8\u00c50-9 _-]{2,24}$/;

    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = String(text ?? '');
        return div.innerHTML;
    }

    function setTextContent(element, text) {
        if (element) element.textContent = String(text ?? '');
    }

    function validateDisplayName(name) {
        const trimmed = String(name ?? '').trim();
        if (!DISPLAY_NAME_RE.test(trimmed)) {
            return { ok: false, error: 'Visningsnavn: 2\u201324 tegn, kun bokstaver, tall, mellomrom, - og _.' };
        }
        return { ok: true, value: trimmed };
    }

    function validateChatBody(body) {
        const trimmed = String(body ?? '').trim();
        if (trimmed.length < 1 || trimmed.length > 200) {
            return { ok: false, error: 'Meldingen m\u00e5 v\u00e6re 1\u2013200 tegn.' };
        }
        if (/[<>]/.test(trimmed)) {
            return { ok: false, error: 'Meldingen kan ikke inneholde < eller >.' };
        }
        return { ok: true, value: trimmed };
    }

    window.Sanitize = { escapeHtml, setTextContent, validateDisplayName, validateChatBody };
})();

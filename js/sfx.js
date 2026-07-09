(function () {
    'use strict';

    const STORAGE_KEY = 'dodgerun_muted';
    const toggleBtn = document.getElementById('sound-toggle-btn');

    let ctx = null;
    let muted = localStorage.getItem(STORAGE_KEY) === '1';

    function ensureCtx() {
        if (muted) return null;
        if (!ctx) {
            const AudioCtx = window.AudioContext || window.webkitAudioContext;
            if (!AudioCtx) return null;
            ctx = new AudioCtx();
        }
        if (ctx.state === 'suspended') ctx.resume();
        return ctx;
    }

    // Kort syntetisk tone – ingen lydfiler.
    function blip(freq, duration, type, gainPeak) {
        const audio = ensureCtx();
        if (!audio) return;

        const now = audio.currentTime;
        const osc = audio.createOscillator();
        const gain = audio.createGain();

        osc.type = type || 'square';
        osc.frequency.setValueAtTime(freq, now);

        const peak = gainPeak ?? 0.08;
        gain.gain.setValueAtTime(0.0001, now);
        gain.gain.exponentialRampToValueAtTime(peak, now + 0.01);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

        osc.connect(gain);
        gain.connect(audio.destination);
        osc.start(now);
        osc.stop(now + duration + 0.02);
    }

    function nearMiss(combo) {
        // Stigende tonehøyde jo lengre comboen er.
        const step = Math.min(24, combo);
        const freq = 440 * Math.pow(2, step / 24);
        blip(freq, 0.09, 'triangle', 0.06);
    }

    function comboMilestone(multFloor) {
        const audio = ensureCtx();
        if (!audio) return;
        const base = 523.25;
        const notes = [0, 4, 7];
        notes.forEach((semi, i) => {
            setTimeout(() => blip(base * Math.pow(2, (semi + multFloor) / 12), 0.16, 'sawtooth', 0.07), i * 55);
        });
    }

    function comboLost() {
        const audio = ensureCtx();
        if (!audio) return;
        const now = audio.currentTime;
        const osc = audio.createOscillator();
        const gain = audio.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(320, now);
        osc.frequency.exponentialRampToValueAtTime(110, now + 0.28);
        gain.gain.setValueAtTime(0.07, now);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.3);
        osc.connect(gain);
        gain.connect(audio.destination);
        osc.start(now);
        osc.stop(now + 0.32);
    }

    function renderToggle() {
        if (!toggleBtn) return;
        toggleBtn.textContent = muted ? '🔇' : '🔊';
        toggleBtn.classList.toggle('sound-off', muted);
    }

    function toggleMute() {
        muted = !muted;
        localStorage.setItem(STORAGE_KEY, muted ? '1' : '0');
        renderToggle();
        if (!muted) ensureCtx();
    }

    if (toggleBtn) {
        toggleBtn.addEventListener('click', toggleMute);
        renderToggle();
    }

    window.Sfx = {
        nearMiss,
        comboMilestone,
        comboLost,
        isMuted: () => muted,
    };
})();

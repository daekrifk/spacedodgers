(function () {
    'use strict';

    const config = window.SUPABASE_CONFIG;
    let supabase = null;
    let currentUser = null;
    let authMode = 'register';

    const authLoggedOut = document.getElementById('auth-logged-out');
    const authLoggedIn = document.getElementById('auth-logged-in');
    const authModeTitle = document.getElementById('auth-mode-title');
    const authEmail = document.getElementById('auth-email');
    const authPassword = document.getElementById('auth-password');
    const authDisplayName = document.getElementById('auth-display-name');
    const authDisplayNameRow = document.getElementById('auth-display-name-row');
    const authRegisterActions = document.getElementById('auth-register-actions');
    const authLoginActions = document.getElementById('auth-login-actions');
    const authError = document.getElementById('auth-error');
    const authSuccess = document.getElementById('auth-success');
    const authUserName = document.getElementById('auth-user-name');
    const loginBtn = document.getElementById('login-btn');
    const registerBtn = document.getElementById('register-btn');
    const showLoginBtn = document.getElementById('show-login-btn');
    const showRegisterBtn = document.getElementById('show-register-btn');
    const logoutBtn = document.getElementById('logout-btn');
    const configWarning = document.getElementById('config-warning');

    function getPublishableKey() {
        return config?.publishableKey || config?.anonKey;
    }

    function isConfigured() {
        const key = getPublishableKey();
        return config
            && config.url
            && key
            && !config.url.includes('DITT-PROSJEKT')
            && !config.url.includes('YOUR_SUPABASE')
            && !key.includes('DIN_PUBLISHABLE')
            && !key.includes('YOUR_SUPABASE');
    }

    function getClient() {
        if (!isConfigured()) return null;
        if (!supabase && window.supabase) {
            supabase = window.supabase.createClient(config.url, getPublishableKey(), {
                auth: {
                    detectSessionInUrl: true
                }
            });
        }
        return supabase;
    }

    function setAuthMode(mode) {
        authMode = mode;
        const isRegister = mode === 'register';

        if (authModeTitle) {
            authModeTitle.textContent = isRegister ? 'Registrer' : 'Logg inn';
        }
        if (authDisplayNameRow) {
            authDisplayNameRow.classList.toggle('hidden', !isRegister);
        }
        if (authRegisterActions) {
            authRegisterActions.classList.toggle('hidden', !isRegister);
        }
        if (authLoginActions) {
            authLoginActions.classList.toggle('hidden', isRegister);
        }
        if (authPassword) {
            authPassword.autocomplete = isRegister ? 'new-password' : 'current-password';
        }
        clearMessages();
    }

    function showError(message) {
        if (!authError) return;
        authError.textContent = message;
        authError.classList.remove('hidden');
        if (authSuccess) authSuccess.classList.add('hidden');
    }

    function showSuccess(message) {
        if (!authSuccess) return;
        authSuccess.textContent = message;
        authSuccess.classList.remove('hidden');
        if (authError) authError.classList.add('hidden');
    }

    function clearMessages() {
        if (authError) {
            authError.textContent = '';
            authError.classList.add('hidden');
        }
        if (authSuccess) {
            authSuccess.textContent = '';
            authSuccess.classList.add('hidden');
        }
    }

    function getDisplayName(user) {
        return user?.user_metadata?.display_name
            || user?.email?.split('@')[0]
            || 'Spiller';
    }

    function updateUI(user) {
        currentUser = user || null;

        if (configWarning) {
            configWarning.classList.toggle('hidden', isConfigured());
        }

        if (!authLoggedOut || !authLoggedIn) return;

        if (user) {
            authLoggedOut.classList.add('hidden');
            authLoggedIn.classList.remove('hidden');
            if (authUserName) authUserName.textContent = getDisplayName(user);
        } else {
            authLoggedOut.classList.remove('hidden');
            authLoggedIn.classList.add('hidden');
            setAuthMode('register');
        }

        document.dispatchEvent(new CustomEvent('auth:changed', {
            detail: { user: currentUser }
        }));
    }

    function isLoggedIn() {
        return Boolean(currentUser);
    }

    function getUser() {
        return currentUser;
    }

    async function init() {
        const client = getClient();
        if (!client) {
            updateUI(null);
            setAuthMode('register');
            return;
        }

        const { data: { session } } = await client.auth.getSession();
        updateUI(session?.user ?? null);

        client.auth.onAuthStateChange((_event, session) => {
            updateUI(session?.user ?? null);
        });

        setAuthMode('register');
    }

    async function signIn() {
        clearMessages();
        const client = getClient();
        if (!client) {
            showError('Supabase er ikke konfigurert. Se SUPABASE-SETUP.md');
            return;
        }

        const email = authEmail?.value.trim();
        const password = authPassword?.value;

        if (!email || !password) {
            showError('Fyll inn e-post og passord.');
            return;
        }

        loginBtn.disabled = true;
        const { error } = await client.auth.signInWithPassword({ email, password });
        loginBtn.disabled = false;

        if (error) {
            showError(error.message);
            return;
        }

        showSuccess('Innlogget!');
        if (authPassword) authPassword.value = '';
    }

    async function signUp() {
        clearMessages();
        const client = getClient();
        if (!client) {
            showError('Supabase er ikke konfigurert. Se SUPABASE-SETUP.md');
            return;
        }

        const email = authEmail?.value.trim();
        const password = authPassword?.value;
        const displayName = authDisplayName?.value.trim();

        if (!email || !password) {
            showError('Fyll inn e-post og passord.');
            return;
        }

        if (!displayName) {
            showError('Fyll inn visningsnavn.');
            return;
        }

        if (password.length < 6) {
            showError('Passord må være minst 6 tegn.');
            return;
        }

        registerBtn.disabled = true;
        const { data, error } = await client.auth.signUp({
            email,
            password,
            options: {
                data: { display_name: displayName }
            }
        });
        registerBtn.disabled = false;

        if (error) {
            showError(error.message);
            return;
        }

        if (data.user && !data.session) {
            setAuthMode('login');
            showSuccess('Konto opprettet! Sjekk e-posten for bekreftelse, deretter logg inn.');
            return;
        }

        showSuccess('Konto opprettet – du er innlogget!');
        if (authPassword) authPassword.value = '';
    }

    async function signOut() {
        clearMessages();
        const client = getClient();
        if (!client) return;

        logoutBtn.disabled = true;
        await client.auth.signOut();
        logoutBtn.disabled = false;
    }

    if (loginBtn) loginBtn.addEventListener('click', signIn);
    if (registerBtn) registerBtn.addEventListener('click', signUp);
    if (showLoginBtn) showLoginBtn.addEventListener('click', () => setAuthMode('login'));
    if (showRegisterBtn) showRegisterBtn.addEventListener('click', () => setAuthMode('register'));
    if (logoutBtn) logoutBtn.addEventListener('click', signOut);

    if (authPassword) {
        authPassword.addEventListener('keydown', (e) => {
            if (e.key !== 'Enter') return;
            if (authMode === 'register') signUp();
            else signIn();
        });
    }

    window.Auth = {
        init,
        isLoggedIn,
        getUser,
        getDisplayName,
        isConfigured,
        getClient
    };

    init();
})();

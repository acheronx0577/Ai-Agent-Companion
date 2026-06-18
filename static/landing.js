(function () {
    const signInButtons = Array.from(document.querySelectorAll('.landing-sign-in'));
    const authStatus = document.getElementById('landing-auth-status');
    const bridgeHost = document.getElementById('convex-bridge-root');
    const convexEnabled = bridgeHost?.dataset.convexEnabled === 'true';
    let unsubscribe = null;
    let syncStarted = false;

    function setStatus(message, isError = false) {
        if (!authStatus) {
            return;
        }
        authStatus.textContent = message;
        authStatus.classList.toggle('is-error', isError);
    }

    function setBusy(busy) {
        for (const button of signInButtons) {
            button.disabled = busy;
            button.setAttribute('aria-busy', busy ? 'true' : 'false');
        }
    }

    function waitForConvexBridge(timeoutMs = 6000) {
        if (window.WakuConvex?.isReady()) {
            return Promise.resolve(true);
        }
        return new Promise((resolve) => {
            const timeout = window.setTimeout(() => {
                window.removeEventListener('waku-convex-ready', onReady);
                resolve(false);
            }, timeoutMs);
            function onReady() {
                window.clearTimeout(timeout);
                resolve(Boolean(window.WakuConvex?.isReady()));
            }
            window.addEventListener('waku-convex-ready', onReady, { once: true });
        });
    }

    async function syncServerSession(attempt = 1) {
        if (!window.WakuConvex?.isReady()) {
            return;
        }
        try {
            await window.WakuConvex.syncFlaskSession();
            setStatus('Signed in. Opening your companion…');
            window.location.replace('/');
        } catch (_error) {
            if (attempt < 4) {
                window.setTimeout(() => {
                    void syncServerSession(attempt + 1);
                }, attempt * 700);
                return;
            }
            syncStarted = false;
            setBusy(false);
            setStatus('Your Google sign-in completed, but the app session could not be opened. Please try again.', true);
        }
    }

    function watchConvexSession() {
        if (!window.WakuConvex?.isReady() || unsubscribe) {
            return;
        }
        unsubscribe = window.WakuConvex.subscribe((snapshot) => {
            if (snapshot.loading) {
                return;
            }
            if (snapshot.authenticated && !syncStarted) {
                syncStarted = true;
                setBusy(true);
                setStatus('Finishing sign-in…');
                void syncServerSession();
            }
        });
    }

    async function signIn() {
        setBusy(true);
        setStatus('Opening Google sign-in…');

        if (convexEnabled) {
            const ready = await waitForConvexBridge();
            if (!ready) {
                setBusy(false);
                setStatus('The sign-in service is still loading. Please try again in a moment.', true);
                return;
            }
            try {
                await window.WakuConvex.signInGoogle();
                return;
            } catch (_error) {
                setBusy(false);
                setStatus('Google sign-in could not start. Please try again.', true);
                return;
            }
        }

        window.location.assign('/auth/google');
    }

    for (const button of signInButtons) {
        button.addEventListener('click', () => {
            void signIn();
        });
    }

    if (convexEnabled) {
        if (window.WakuConvex?.isReady()) {
            watchConvexSession();
        } else {
            window.addEventListener('waku-convex-ready', watchConvexSession, { once: true });
        }
    }
})();

import Lenis from 'lenis';

(function () {
    const signInButtons = Array.from(document.querySelectorAll('.landing-sign-in'));
    const authStatus = document.getElementById('landing-auth-status');
    const bridgeHost = document.getElementById('convex-bridge-root');
    const convexEnabled = bridgeHost?.dataset.convexEnabled === 'true';
    const signInIntentKey = 'waku-sign-in-intent';
    let unsubscribe = null;
    let syncStarted = false;

    function setSignInIntent() {
        try {
            window.sessionStorage.setItem(signInIntentKey, '1');
        } catch (_error) {
            // Continue without persistence when session storage is unavailable.
        }
    }

    function clearSignInIntent() {
        try {
            window.sessionStorage.removeItem(signInIntentKey);
        } catch (_error) {
            // Nothing to clear when session storage is unavailable.
        }
    }

    function hasRecentSignInIntent() {
        try {
            return window.sessionStorage.getItem(signInIntentKey) === '1';
        } catch (_error) {
            return false;
        }
    }

    function isAuthenticatedSnapshot(snapshot) {
        return !snapshot.loading && snapshot.authenticated;
    }

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
            clearSignInIntent();
            setStatus('Signed in. Opening your companion…');
            window.location.replace('/dashboard');
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
            if (!isAuthenticatedSnapshot(snapshot)) {
                return;
            }
            if (syncStarted) {
                return;
            }
            if (!hasRecentSignInIntent()) {
                return;
            }
            syncStarted = true;
            setBusy(true);
            setStatus('Finishing sign-in…');
            void syncServerSession();
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
            if (window.WakuConvex.getSnapshot().authenticated) {
                window.location.assign('/dashboard');
                return;
            }
            try {
                setSignInIntent();
                await window.WakuConvex.signInGoogle();
                return;
            } catch (_error) {
                clearSignInIntent();
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

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let lenis = null;

    if (!prefersReducedMotion) {
        lenis = new Lenis({
            autoRaf: true,
            anchors: true,
            lerp: 0.08,
            smoothWheel: true,
            wheelMultiplier: 0.9,
        });
    }

    function densifyTrack(track) {
        const units = () => Array.from(track.querySelectorAll('.landing-testimonial-set'));
        const firstUnit = units()[0];
        if (!firstUnit) {
            return;
        }

        const unitWidth = firstUnit.getBoundingClientRect().width;
        if (unitWidth <= 0) {
            return;
        }

        const minUnits = Math.ceil((window.innerWidth * 2.5) / unitWidth);
        const targetUnits = Math.max(4, minUnits % 2 === 0 ? minUnits : minUnits + 1);

        while (units().length < targetUnits) {
            const copy = firstUnit.cloneNode(true);
            copy.setAttribute('aria-hidden', 'true');
            track.appendChild(copy);
        }
    }

    function setupMarquee(track, {
        direction = 1,
        loopDurationSec = 42,
        startPhase = 0,
        scrollMultiplier = 0.9,
    } = {}) {
        if (!track || prefersReducedMotion) {
            return;
        }

        let offsetPx = 0;
        let halfLoopPx = 0;
        let isScrollDriving = false;
        let isHovered = false;
        let scrollEndTimer = null;
        let lastScrollY = lenis ? lenis.scroll : window.scrollY;
        const scrollEndDelayMs = 280;
        let idleSpeed = 1;
        let hasInitialOffset = false;

        function measureLoop() {
            if (track.classList.contains('landing-testimonial-track')) {
                densifyTrack(track);
            }

            halfLoopPx = track.scrollWidth / 2;
            idleSpeed = halfLoopPx > 0 ? halfLoopPx / (loopDurationSec * 60) : 1;

            if (!hasInitialOffset && halfLoopPx > 0) {
                const phase = Number.parseFloat(track.dataset.marqueePhase ?? `${startPhase}`) || 0;
                offsetPx = -halfLoopPx * Math.min(Math.max(phase, 0), 1);
                hasInitialOffset = true;
            }

            wrapOffset();
            applyTransform();
        }

        function wrapOffset() {
            if (halfLoopPx <= 0) {
                return;
            }

            while (offsetPx >= 0) {
                offsetPx -= halfLoopPx;
            }

            while (offsetPx < -halfLoopPx) {
                offsetPx += halfLoopPx;
            }
        }

        function applyTransform() {
            track.style.transform = `translateX(${offsetPx}px)`;
        }

        function driveFromScrollDelta(delta) {
            if (delta === 0) {
                return;
            }

            isScrollDriving = true;
            offsetPx += delta * scrollMultiplier * direction;
            wrapOffset();
            applyTransform();

            clearTimeout(scrollEndTimer);
            scrollEndTimer = setTimeout(() => {
                isScrollDriving = false;
            }, scrollEndDelayMs);
        }

        function onScroll() {
            const currentY = lenis ? lenis.scroll : window.scrollY;
            const delta = currentY - lastScrollY;
            lastScrollY = currentY;
            driveFromScrollDelta(delta);
        }

        function tick() {
            if (!isScrollDriving && !isHovered && halfLoopPx > 0) {
                offsetPx += idleSpeed * direction;
                wrapOffset();
                applyTransform();
            }

            requestAnimationFrame(tick);
        }

        const marquee = track.closest('.landing-tech-stack-marquee, .landing-testimonial-marquee-row');
        if (marquee) {
            marquee.addEventListener('mouseenter', () => {
                isHovered = true;
                track.classList.add('is-paused');
            });
            marquee.addEventListener('mouseleave', () => {
                isHovered = false;
                track.classList.remove('is-paused');
            });
        }

        measureLoop();
        window.addEventListener('resize', measureLoop);

        if (lenis) {
            lenis.on('scroll', onScroll);
        } else {
            window.addEventListener('scroll', onScroll, { passive: true });
        }

        requestAnimationFrame(tick);
    }

    setupMarquee(document.querySelector('.landing-tech-stack-track'), {
        direction: 1,
        loopDurationSec: 42,
    });

    for (const track of document.querySelectorAll('.landing-testimonial-track')) {
        const direction = track.dataset.marqueeDirection === 'left' ? -1 : 1;
        setupMarquee(track, {
            direction,
            loopDurationSec: 100,
            scrollMultiplier: 0.4,
        });
    }
})();

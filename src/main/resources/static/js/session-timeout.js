/**
 * session-timeout.js
 *
 * Tracks user inactivity on the frontend and shows a SweetAlert2 warning
 * before the session expires. If the user is still active, the timer resets.
 * If they ignore the warning, they are redirected to /login?timeout=true.
 *
 * ⚙️ Configuration (match these with SessionTimeoutConfig.java):
 *   SESSION_DURATION_MS  — total session lifetime in milliseconds (default: 30 min)
 *   WARNING_BEFORE_MS    — how early to show the warning popup (default: 5 min before expiry)
 *   LOGOUT_URL           — where to redirect after timeout
 */
(function () {
    'use strict';

    // ── Configuration ────────────────────────────────────────────────────────
    const SESSION_DURATION_MS = 30 * 60 * 1000;   // 30 minutes
    const WARNING_BEFORE_MS  =  5 * 60 * 1000;    //  5 minutes before expiry
    const LOGOUT_URL         = '/login?timeout=true';
    const KEEP_ALIVE_URL     = '/api/keep-alive';  // optional ping endpoint (see note below)

    // ── Internal state ───────────────────────────────────────────────────────
    let warningTimer  = null;
    let logoutTimer   = null;
    let warningOpen   = false;
    let countdownInterval = null;

    // ── Helpers ──────────────────────────────────────────────────────────────
    function clearAllTimers() {
        clearTimeout(warningTimer);
        clearTimeout(logoutTimer);
        clearInterval(countdownInterval);
        warningTimer  = null;
        logoutTimer   = null;
        countdownInterval = null;
    }

    function doLogout() {
        clearAllTimers();
        window.location.href = LOGOUT_URL;
    }

    // Optional: ping the server to keep the server-side session alive
    function keepAlive() {
        fetch(KEEP_ALIVE_URL, { method: 'GET', credentials: 'same-origin' })
            .then(response => {
                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }
                return response.json();
            })
            .then(data => {
                console.log('[SessionTimeout] Keep-alive successful:', data);
            })
            .catch(error => {
                console.warn('[SessionTimeout] Keep-alive failed:', error);
                // If keep-alive fails, we should logout to be safe
                if (error.message.includes('401') || error.message.includes('403')) {
                    console.log('[SessionTimeout] Session expired, logging out');
                    doLogout();
                }
            });
    }

    // ── Warning popup ────────────────────────────────────────────────────────
    function showWarning() {
        if (warningOpen) return;
        warningOpen = true;

        let secondsLeft = WARNING_BEFORE_MS / 1000;

        Swal.fire({
            icon: 'warning',
            title: 'Session Expiring Soon',
            html: `Your session will expire in <strong id="swal-countdown">${formatTime(secondsLeft)}</strong>.<br>Do you want to stay logged in?`,
            showCancelButton: true,
            confirmButtonText: 'Stay Logged In',
            cancelButtonText:  'Logout Now',
            confirmButtonColor: '#002868',
            cancelButtonColor:  '#d33',
            allowOutsideClick: false,
            allowEscapeKey:    false,
            timerProgressBar:  true,
            timer: WARNING_BEFORE_MS,
            didOpen: () => {
                // Live countdown inside the popup
                countdownInterval = setInterval(() => {
                    secondsLeft--;
                    const el = document.getElementById('swal-countdown');
                    if (el && secondsLeft >= 0) el.textContent = formatTime(secondsLeft);
                    if (secondsLeft <= 0) {
                        clearInterval(countdownInterval);
                        // Auto-logout when countdown reaches zero
                        doLogout();
                    }
                }, 1000);
            },
            willClose: () => {
                clearInterval(countdownInterval);
                countdownInterval = null;
            }
        }).then(result => {
            warningOpen = false;
            if (result.isConfirmed) {
                keepAlive();        // ping the server to refresh the server-side session
                resetTimers();      // restart the frontend timers
            } else if (result.dismiss === Swal.DismissReason.cancel) {
                doLogout();         // user clicked "Logout Now"
            }
            // Don't logout on timer completion - handled by countdown interval
        });
    }

    // ── Timer management ─────────────────────────────────────────────────────
    function resetTimers() {
        clearAllTimers();

        const warningDelay = SESSION_DURATION_MS - WARNING_BEFORE_MS;

        warningTimer = setTimeout(() => {
            showWarning();
        }, warningDelay);

        logoutTimer = setTimeout(() => {
            if (!warningOpen) doLogout(); // safety net if popup was never shown
        }, SESSION_DURATION_MS);
    }

    // ── Activity detection ───────────────────────────────────────────────────
    // Reset timers on any meaningful user activity
    const ACTIVITY_EVENTS = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll', 'click'];
    let activityThrottle = null;

    function onUserActivity() {
        if (activityThrottle) return;          // throttle to once every 30 s
        activityThrottle = setTimeout(() => {
            activityThrottle = null;
            if (!warningOpen) resetTimers();   // only reset if popup is NOT showing
        }, 30_000);
    }

    ACTIVITY_EVENTS.forEach(evt =>
        document.addEventListener(evt, onUserActivity, { passive: true })
    );

    // ── Formatting helper ────────────────────────────────────────────────────
    function formatTime(totalSeconds) {
        const m = Math.floor(totalSeconds / 60);
        const s = Math.floor(totalSeconds % 60);
        return `${m}:${s.toString().padStart(2, '0')}`;
    }

    // ── Boot ─────────────────────────────────────────────────────────────────
    // Ensure SweetAlert2 is loaded before initializing
    if (typeof Swal === 'undefined') {
        console.error('[SessionTimeout] SweetAlert2 not loaded - session timeout disabled');
    } else {
        resetTimers();
        console.log('[SessionTimeout] Initialized — expires in', SESSION_DURATION_MS / 60000, 'min');
    }

})();
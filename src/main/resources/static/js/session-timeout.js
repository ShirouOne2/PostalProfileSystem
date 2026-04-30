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
    const SESSION_DURATION_MS = 15 * 60 * 1000;   // 15 minutes
    const WARNING_BEFORE_MS = 2 * 60 * 1000;    //  2 minutes before expiry
    const LOGOUT_URL = '/login?timeout=true';
    const KEEP_ALIVE_URL = '/api/keep-alive';

    // ── Security: Prevent back navigation to login when authenticated ────────
    function preventLoginPageAccess() {
        // Check if we're on the login page and have a valid session
        if (window.location.pathname === '/login' || window.location.pathname.includes('login')) {
            fetch('/api/user/current', {
                method: 'GET',
                credentials: 'same-origin',
                headers: { 'X-Requested-With': 'XMLHttpRequest' }
            })
                .then(response => {
                    if (response.ok) {
                        // User is still authenticated, redirect to main app
                        window.location.href = '/table';
                    }
                })
                .catch(() => {
                    // If request fails, allow staying on login page
                    console.log('[SessionTimeout] Could not verify session status');
                });
        }
    }

    // Run check on page load
    preventLoginPageAccess();

    // Also check when user navigates back (popstate event)
    window.addEventListener('popstate', preventLoginPageAccess);

    // ── Internal state ───────────────────────────────────────────────────────
    let warningTimer = null;
    let logoutTimer = null;
    let warningOpen = false;
    let countdownInterval = null;
    let logoutPending = false;   // guard against double-logout

    // ── Helpers ──────────────────────────────────────────────────────────────
    function clearAllTimers() {
        clearTimeout(warningTimer);
        clearTimeout(logoutTimer);
        clearInterval(countdownInterval);
        warningTimer = null;
        logoutTimer = null;
        countdownInterval = null;
    }

    function doLogout() {
        if (logoutPending) return;   // prevent duplicate redirects
        logoutPending = true;
        clearAllTimers();
        Swal.close();                // close any open popup before redirect
        window.location.href = LOGOUT_URL;
    }

    // Optional: ping the server to keep the server-side session alive
    function keepAlive() {
        fetch(KEEP_ALIVE_URL, { method: 'GET', credentials: 'same-origin' })
            .then(response => {
                if (!response.ok) throw new Error(`HTTP ${response.status}`);
                return response.json();
            })
            .then(data => {
                console.log('[SessionTimeout] Keep-alive OK:', data);
            })
            .catch(error => {
                console.warn('[SessionTimeout] Keep-alive failed:', error.message);
                if (error.message.includes('401') || error.message.includes('403')) {
                    doLogout();
                }
            });
    }

    // ── Warning popup ────────────────────────────────────────────────────────
    function showWarning() {
        if (warningOpen || logoutPending) return;
        warningOpen = true;

        let secondsLeft = Math.floor(WARNING_BEFORE_MS / 1000);

        Swal.fire({
            icon: 'warning',
            title: 'Session Expiring Soon',
            html: `Your session will expire in <strong id="swal-countdown">${formatTime(secondsLeft)}</strong>.<br>Do you want to stay logged in?`,
            showCancelButton: true,
            confirmButtonText: 'Stay Logged In',
            cancelButtonText: 'Logout Now',
            confirmButtonColor: '#002868',
            cancelButtonColor: '#d33',
            allowOutsideClick: false,
            allowEscapeKey: false,
            timerProgressBar: true,
            timer: WARNING_BEFORE_MS,
            didOpen: () => {
                countdownInterval = setInterval(() => {
                    secondsLeft = Math.max(0, secondsLeft - 1);
                    const el = document.getElementById('swal-countdown');
                    if (el) el.textContent = formatTime(secondsLeft);
                }, 1000);
            },
            willClose: () => {
                clearInterval(countdownInterval);
                countdownInterval = null;
            }
        }).then(result => {
            warningOpen = false;

            if (result.isConfirmed) {
                // User clicked "Stay Logged In"
                keepAlive();
                resetTimers();
            } else if (
                result.dismiss === Swal.DismissReason.cancel
            ) {
                // User clicked "Logout Now"
                doLogout();
            } else if (
                result.dismiss === Swal.DismissReason.timer ||
                result.dismiss === Swal.DismissReason.backdrop ||
                result.dismiss === Swal.DismissReason.esc
            ) {
                // Timer ran out (or any other auto-dismiss) → logout
                doLogout();
            }
        });
    }

    // ── Timer management ─────────────────────────────────────────────────────
    function resetTimers() {
        clearAllTimers();

        const warningDelay = SESSION_DURATION_MS - WARNING_BEFORE_MS;

        warningTimer = setTimeout(() => {
            showWarning();
        }, warningDelay);

        // Safety-net: force logout if the popup was never shown or interacted with
        logoutTimer = setTimeout(() => {
            if (!warningOpen) doLogout();
        }, SESSION_DURATION_MS);
    }

    // ── Activity detection ───────────────────────────────────────────────────
    const ACTIVITY_EVENTS = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll', 'click'];
    let activityThrottle = null;

    function onUserActivity() {
        if (activityThrottle) return;          // throttle to once every 30 s
        activityThrottle = setTimeout(() => {
            activityThrottle = null;
            if (!warningOpen && !logoutPending) resetTimers();
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
    if (typeof Swal === 'undefined') {
        console.error('[SessionTimeout] SweetAlert2 not loaded — session timeout disabled');
    } else {
        resetTimers();
        console.log('[SessionTimeout] Initialized — expires in', SESSION_DURATION_MS / 60000, 'min');
    }

    // ── Cleanup on navigation ────────────────────────────────────────────────
    // Clear all timers and remove activity listeners before the page unloads
    // to prevent dangling timeouts and memory leaks across navigations.
    window.addEventListener('beforeunload', function () {
        clearAllTimers();
        if (activityThrottle) {
            clearTimeout(activityThrottle);
            activityThrottle = null;
        }
        ACTIVITY_EVENTS.forEach(function (evt) {
            document.removeEventListener(evt, onUserActivity);
        });
    });

})();
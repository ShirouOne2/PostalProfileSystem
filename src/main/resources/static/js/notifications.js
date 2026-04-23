/**
 * Notification System JavaScript
 * Handles SSE connection and notification interactions
 */
(function () {

    var bellLi       = document.getElementById('notifBellLi');
    var badge        = document.getElementById('notifBadge');
    var notifContent = document.getElementById('notifContent');
    var sidebarBadge = document.getElementById('sidebarNotifBadge');

    // Bell appears only for authorized roles; bail out on pages without it.
    if (!bellLi || !notifContent) return;

    var es           = null;
    var retryDelay   = 3000;
    var retryTimer   = null;   // track pending retry so we can cancel it on unload

    // ── Event delegation ─────────────────────────────────────────────────────
    // One listener on #notifContent covers all current and future items —
    // Event delegation on #notifContent covers all current and future items
    notifContent.addEventListener('click', function (e) {

        // Individual notification -> navigate to appropriate inbox and mark as read
        var item = e.target.closest('[data-notif-id]');
        if (item) {
            var notifId = item.getAttribute('data-notif-id');
            
            // Navigate to appropriate page based on notification content
            var notifContent = item.textContent || item.innerText;
            var isApprovalNotification = notifContent.includes('Approval request') || 
                                        notifContent.includes('waiting for Area Admin review') ||
                                        notifContent.includes('ready for SRD final approval');
            
            // Mark as read
            fetch('/api/notifications/mark-read/' + notifId, { method: 'POST' });
            
            // Navigate to appropriate page
            if (isApprovalNotification) {
                window.location.href = '/approvals';
            } else {
                window.location.href = '/notifications';
            }
            return;
        }

        // Mark-all-read link
        var markAll = e.target.closest('[data-mark-all-read]');
        if (markAll) {
            e.preventDefault();
            e.stopPropagation();
            fetch('/api/notifications/mark-all-read', { method: 'POST' });
            return;
        }
    });

    // ── SSE Connection Management ─────────────────────────────────────────────
    function connect() {
        // Never open a second connection if one is already live
        if (es && es.readyState !== EventSource.CLOSED) return;

        es = new EventSource('/api/notifications/stream');

        // ── Badge event ──────────────────────────────────────────────────────
        es.addEventListener('badge', function (e) {
            var count = (e.data || '').trim();
            if (count !== '' && count !== '0') {
                badge.textContent   = count;
                badge.style.display = 'inline-block';
            } else {
                badge.textContent   = '';
                badge.style.display = 'none';
            }
            
            // Update sidebar badge if it exists
            if (sidebarBadge) {
                if (count && count !== '0') {
                    sidebarBadge.textContent = count;
                    sidebarBadge.style.display = 'inline-block';
                } else {
                    sidebarBadge.style.display = 'none';
                }
            }
        });

        // ── Notification HTML event ───────────────────────────────────────────
        // Server sends only inner content (no outer .dropdown-menu wrapper).
        es.addEventListener('notification', function (e) {
            var html = (e.data || '').trim();
            if (!html) return;

            notifContent.innerHTML = html;

            // Shake the bell to signal new/updated notifications
            bellLi.classList.remove('bell-shake');
            void bellLi.offsetWidth;             // force reflow to restart animation
            bellLi.classList.add('bell-shake');
        });

        // ── Error / reconnect ─────────────────────────────────────────────────
        es.onerror = function () {
            es.close();
            es = null;
            // Schedule reconnect — store timer ref so beforeunload can cancel it
            retryTimer = setTimeout(function () {
                retryTimer = null;
                connect();
            }, retryDelay);
            retryDelay = Math.min(retryDelay * 2, 30000); // exponential back-off, cap 30 s
        };

        es.onopen = function () {
            retryDelay = 3000; // reset back-off on successful connection
        };
    }

    // ── Initialize ────────────────────────────────────────────────────────────
    connect();
    window._sseClose = function () {
        if (retryTimer) {
            clearTimeout(retryTimer);
            retryTimer = null;
        }
        if (es) {
            es.close();
            es = null;
        }
    };

    // ── Cleanup on navigation ─────────────────────────────────────────────────
    // Close the SSE connection AND cancel any pending retry timer so the server
    // emitter is released immediately and no ghost connections are opened.
    window.addEventListener('beforeunload', function () {
        window._sseClose();
    });

})();
/**
 * notifications.js
 * Polls /api/notifications every 30s, renders bell badge + dropdown list.
 * Works for both Admin (all changes) and User (connectivity per area only).
 */

(function () {
    'use strict';

    const POLL_INTERVAL_MS = 30000; // 30 seconds
    let pollTimer = null;

    // ── On DOM Ready ──────────────────────────────────────────────────────────
    document.addEventListener('DOMContentLoaded', function () {
        fetchNotifications();
        pollTimer = setInterval(fetchNotifications, POLL_INTERVAL_MS);

        // Re-fetch when dropdown opens
        const bell = document.getElementById('alertsDropdown');
        if (bell) {
            bell.addEventListener('click', fetchNotifications);
        }
    });

    // ── Fetch from API ────────────────────────────────────────────────────────
    function fetchNotifications() {
        fetch('/api/notifications', { credentials: 'same-origin' })
            .then(function (res) {
                if (!res.ok) throw new Error('HTTP ' + res.status);
                return res.json();
            })
            .then(function (data) {
                renderBadge(data.count, data.countLabel);
                renderList(data.notifications);
            })
            .catch(function (err) {
                console.warn('[Notifications] fetch error:', err);
                // Always hide loading and show empty state on any error
                showEmptyState('No notifications found.');
            });
    }

    // ── Show empty / error state ──────────────────────────────────────────────
    function showEmptyState(message) {
        const loading = document.getElementById('notif-loading');
        const empty   = document.getElementById('notif-empty');
        const list    = document.getElementById('notif-list');

        if (loading) loading.style.display = 'none';

        // Remove any existing items
        if (list) {
            list.querySelectorAll('.notif-item').forEach(function (el) { el.remove(); });
        }

        if (empty) {
            // Optionally update the message
            const msgEl = empty.querySelector('span');
            if (msgEl && message) msgEl.textContent = message;
            empty.style.display = 'block';
        }
    }

    // ── Render Badge ──────────────────────────────────────────────────────────
    function renderBadge(count, label) {
        const badge = document.getElementById('notif-badge');
        const headerCount = document.getElementById('notif-header-count');
        if (!badge) return;

        if (count > 0) {
            badge.textContent = label || count;
            badge.classList.remove('d-none');
        } else {
            badge.classList.add('d-none');
        }
        if (headerCount) {
            headerCount.textContent = count + ' new';
        }
    }

    // ── Render Notification List ──────────────────────────────────────────────
    function renderList(notifications) {
        const list = document.getElementById('notif-list');
        const loading = document.getElementById('notif-loading');
        const empty = document.getElementById('notif-empty');
        const template = document.getElementById('notif-item-template');

        if (!list || !template) return;

        // Remove loading
        if (loading) loading.style.display = 'none';

        // Remove old items (keep empty + loading nodes)
        const oldItems = list.querySelectorAll('.notif-item');
        oldItems.forEach(function (el) { el.remove(); });

        if (!notifications || notifications.length === 0) {
            if (empty) empty.style.display = 'block';
            return;
        }

        if (empty) empty.style.display = 'none';

        notifications.forEach(function (notif) {
            const clone = template.content.cloneNode(true);
            const wrapper = clone.querySelector('.notif-item');

            // Unread highlight
            const unread = !notif.isRead;
            wrapper.dataset.unread = unread ? 'true' : 'false';
            wrapper.style.background = unread ? '#f0f4ff' : '#fff';

            // Icon
            const iconEl = clone.querySelector('.notif-icon');
            if (iconEl) iconEl.className = 'notif-icon ' + (notif.icon || 'fas fa-bell text-muted');

            // Description
            const descEl = clone.querySelector('.notif-desc');
            if (descEl) {
                descEl.textContent = notif.description || '';
                if (unread) descEl.style.fontWeight = '600';
            }

            // Badge (action type)
            const badgeEl = clone.querySelector('.notif-badge');
            if (badgeEl) {
                badgeEl.className = 'badge badge-' + (notif.badgeClass || 'secondary') + ' notif-badge';
                badgeEl.textContent = formatActionType(notif.actionType);
            }

            // Time
            const timeEl = clone.querySelector('.notif-time');
            if (timeEl) timeEl.textContent = notif.changedAt || '';

            // User
            const userNameEl = clone.querySelector('.notif-user-name');
            if (userNameEl) userNameEl.textContent = notif.changedByUsername || 'System';

            // Click → go to office (if available)
            if (notif.officeId) {
                wrapper.title = 'View Office #' + notif.officeId;
                wrapper.addEventListener('click', function () {
                    window.location.href = '/table?highlight=' + notif.officeId;
                });
            }

            list.appendChild(clone);
        });
    }

    // ── Format Action Type Label ──────────────────────────────────────────────
    function formatActionType(type) {
        switch (type) {
            case 'CREATED':      return 'New';
            case 'UPDATED':      return 'Updated';
            case 'CONNECTED':    return 'Connected';
            case 'DISCONNECTED': return 'Disconnected';
            default:             return type || 'Info';
        }
    }

    // ── Mark as Read (called when bell is clicked) ────────────────────────────
    window.markNotificationsRead = function () {
        fetch('/api/notifications/mark-read', {
            method: 'POST',
            credentials: 'same-origin'
        }).then(function () {
            // Hide badge immediately for snappy UX
            const badge = document.getElementById('notif-badge');
            if (badge) badge.classList.add('d-none');
            const headerCount = document.getElementById('notif-header-count');
            if (headerCount) headerCount.textContent = '0 new';
        }).catch(function (err) {
            console.warn('[Notifications] mark-read error:', err);
        });
    };

})();
/**
 * Sidebar toggle + main-content margin sync
 * Handles sidebar collapse/expand functionality and mobile responsiveness
 */
(function () {
    'use strict';
    var COLLAPSED_KEY = 'sidebarCollapsed';

    // FIX: syncBody now reads from the actual sidebar DOM state,
    // NOT from localStorage — this prevents the stale-read desync
    // that caused the "need to refresh" behaviour.
    function syncBody(collapsed) {
        var sidebar    = document.getElementById('sidebar');
        var burgerIcon = document.querySelector('#sidebarBurgerToggle i');

        // If collapsed is not passed in, derive it from the sidebar element itself
        if (collapsed === undefined) {
            collapsed = sidebar ? sidebar.classList.contains('collapsed') : false;
        }

        document.body.classList.toggle('sidebar-is-collapsed', collapsed);

        if (burgerIcon) {
            burgerIcon.classList.toggle('fa-bars',         !collapsed);
            burgerIcon.classList.toggle('fa-chevron-right', collapsed);
        }
    }

    // Run immediately (before paint) so there's no layout jump on load
    (function applyPersistedState() {
        var sidebar   = document.getElementById('sidebar');
        var collapsed = false; // Always start with expanded sidebar
        if (sidebar && collapsed) sidebar.classList.add('collapsed');
        syncBody(collapsed);
    }());

    window.addEventListener('DOMContentLoaded', function () {
        var sidebar       = document.getElementById('sidebar');
        var sidebarOverlay = document.getElementById('sidebarOverlay');
        var mobileToggle  = document.getElementById('mobileSidebarToggle');
        var burgerToggle  = document.getElementById('sidebarBurgerToggle');

        // ── Desktop burger toggle ────────────────────────────────────────
        if (burgerToggle && sidebar) {
            // FIX: removed e.stopPropagation(), removed capture:true, removed
            // redundant icon manipulation (syncBody handles it), removed
            // "return false" — all of these were causing the lag/stale state.
            burgerToggle.addEventListener('click', function () {
                var isCollapsed = sidebar.classList.toggle('collapsed');
                localStorage.setItem(COLLAPSED_KEY, isCollapsed);
                syncBody(isCollapsed); // pass state directly — no DOM re-read
            });
        }

        // FIX: Removed the MutationObserver entirely. It was observing the
        // sidebar's class attribute and calling syncBody() on EVERY class
        // change (including mobile 'active' toggles), which double-fired
        // syncBody() on every burger click and caused the icon/body class
        // to flip back and forth. The burger click handler above is the
        // single source of truth for desktop collapse now.

        // ── Mobile hamburger ─────────────────────────────────────────────
        if (mobileToggle && sidebar) {
            mobileToggle.addEventListener('click', function (e) {
                e.preventDefault();
                sidebar.classList.toggle('active');
                if (sidebarOverlay) sidebarOverlay.classList.toggle('show');
            });
        }

        // ── Close sidebar when clicking overlay (mobile) ─────────────────
        if (sidebarOverlay) {
            sidebarOverlay.addEventListener('click', function () {
                if (sidebar) sidebar.classList.remove('active');
                sidebarOverlay.classList.remove('show');
            });
        }

        // ── Legacy Bootstrap sidebar toggles ────────────────────────────
        ['sidebarToggle', 'sidebarToggleTop'].forEach(function (id) {
            var btn = document.getElementById(id);
            if (btn && sidebar) {
                btn.addEventListener('click', function () {
                    sidebar.classList.toggle('active');
                });
            }
        });

        // ── Close sidebar on outside click (mobile only) ─────────────────
        document.addEventListener('click', function (e) {
            if (window.innerWidth >= 768) return; // desktop — do nothing
            if (!sidebar) return;
            if (sidebar.contains(e.target)) return;
            if (e.target.closest('#sidebarToggle, #sidebarToggleTop, #mobileSidebarToggle')) return;

            sidebar.classList.remove('active');
            if (sidebarOverlay) sidebarOverlay.classList.remove('show');
        });
    });
}());
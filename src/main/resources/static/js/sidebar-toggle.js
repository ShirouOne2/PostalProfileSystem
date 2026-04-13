/**
 * Sidebar toggle + main-content margin sync
 * Handles sidebar collapse/expand functionality and mobile responsiveness
 */
(function () {
    'use strict';
    var COLLAPSED_KEY = 'sidebarCollapsed';

    function syncBody() {
        var collapsed = localStorage.getItem(COLLAPSED_KEY) === 'true';
        if (collapsed) {
            document.body.classList.add('sidebar-is-collapsed');
        } else {
            document.body.classList.remove('sidebar-is-collapsed');
        }
    }

    // Run immediately (before paint) so there's no layout jump
    syncBody();

    // Listen for sidebar toggle from sidebar.html script
    var observer = new MutationObserver(function (mutations) {
        mutations.forEach(function (m) {
            if (m.attributeName === 'class') syncBody();
        });
    });

    window.addEventListener('DOMContentLoaded', function () {
        var sidebar = document.getElementById('sidebar');
        var sidebarOverlay = document.getElementById('sidebarOverlay');
        var mobileToggle = document.getElementById('mobileSidebarToggle');
        
        if (sidebar) observer.observe(sidebar, { attributes: true });

        // Mobile hamburger menu functionality
        if (mobileToggle) {
            mobileToggle.addEventListener('click', function (e) {
                e.preventDefault();
                sidebar.classList.toggle('active');
                sidebarOverlay.classList.toggle('show');
            });
        }

        // Close sidebar when clicking overlay
        if (sidebarOverlay) {
            sidebarOverlay.addEventListener('click', function () {
                sidebar.classList.remove('active');
                sidebarOverlay.classList.remove('show');
            });
        }

        // Also wire legacy Bootstrap sidebar toggle if present
        var toggleBtn = document.getElementById('sidebarToggle');
        var toggleTop = document.getElementById('sidebarToggleTop');
        [toggleBtn, toggleTop].forEach(function (btn) {
            if (!btn) return;
            btn.addEventListener('click', function () {
                sidebar && sidebar.classList.toggle('active');
            });
        });

        // Close sidebar on outside click (mobile)
        document.addEventListener('click', function (e) {
            if (window.innerWidth < 768) {
                var sidebar = document.getElementById('sidebar');
                if (sidebar && !sidebar.contains(e.target) &&
                    !e.target.closest('#sidebarToggle, #sidebarToggleTop, #mobileSidebarToggle')) {
                    sidebar.classList.remove('active');
                    sidebarOverlay.classList.remove('show');
                }
            }
        });
    });
})();

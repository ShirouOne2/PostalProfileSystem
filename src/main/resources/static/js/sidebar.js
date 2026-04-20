/**
 * sidebar.js
 * 
 * Handles sidebar toggle functionality
 * Optimized for performance with cached DOM references
 */

(function () {
    // Cache references once - no repeated DOM queries on click
    var btn = document.getElementById('sidebarBurgerToggle');
    var sidebar = document.getElementById('sidebar');
    var pageWrapper = document.querySelector('.page-wrapper');

    if (!btn || !sidebar) return;

    btn.addEventListener('click', function () {
        // classList.toggle is ~10x faster than jQuery toggleClass
        sidebar.classList.toggle('collapsed');
        if (pageWrapper) pageWrapper.classList.toggle('sidebar-collapsed');
    });
})();

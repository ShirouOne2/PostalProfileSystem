/**
 * global-tooltips.js
 * Centralized Bootstrap tooltip initialization for all pages.
 * Handles tooltips for insert-office, table, and profile pages.
 */
(function () {
    // Init tooltips after Bootstrap JS is ready
    function initTooltips() {
        if (typeof $ === 'undefined' || typeof $.fn.tooltip === 'undefined') {
            setTimeout(initTooltips, 100);
            return;
        }
        $('[data-toggle="tooltip"]').tooltip();
        // Re-init inside edit modal each time it opens
        $('#editOfficeModal').on('shown.bs.modal', function () {
            $(this).find('[data-toggle="tooltip"]').tooltip();
        });
    }
    document.addEventListener('DOMContentLoaded', initTooltips);
})();

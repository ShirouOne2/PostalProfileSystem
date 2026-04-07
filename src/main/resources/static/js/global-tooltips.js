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
        try {
            // Destroy existing tooltips to prevent duplicates
            $('[data-toggle="tooltip"]').tooltip('dispose');
            // Initialize all tooltips
            $('[data-toggle="tooltip"]').tooltip({
                container: 'body',
                trigger: 'hover focus',
                delay: { show: 300, hide: 100 }
            });
        } catch (error) {
            console.warn('Tooltip initialization error:', error);
        }
        
        // Re-init inside edit modal each time it opens
        $('#editOfficeModal').on('shown.bs.modal', function () {
            setTimeout(function() {
                try {
                    $(this).find('[data-toggle="tooltip"]').tooltip('dispose').tooltip({
                        container: 'body',
                        trigger: 'hover focus',
                        delay: { show: 300, hide: 100 }
                    });
                } catch (error) {
                    console.warn('Modal tooltip re-init error:', error);
                }
            }, 200);
        });
    }
    
    // Also initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initTooltips);
    } else {
        initTooltips();
    }
})();

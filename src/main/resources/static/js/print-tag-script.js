/* ============================================================
   print-tag-script.js
   Handles print-specific behavior for the property tag page
   ============================================================ */

document.addEventListener('DOMContentLoaded', function() {
    // Auto-focus print button when page loads
    const printBtn = document.querySelector('.btn-print');
    if (printBtn) {
        printBtn.focus();
    }
    
    // Handle print-specific styling
    window.addEventListener('beforeprint', function() {
        // Ensure all images are loaded before printing
        const images = document.querySelectorAll('img');
        images.forEach(img => {
            if (!img.complete) {
                img.onload = function() {
                    // Image loaded, ready for print
                };
            }
        });
    });
    
    // Optional: Auto-trigger print dialog after page load
    // Uncomment the next line if you want auto-print
    // setTimeout(() => window.print(), 1000);
});

/**
 * sidebar-dashboard.js
 * Handles the sidebar dashboard stats and filter functionality
 */
document.addEventListener('DOMContentLoaded', function() {
    
    // Sync sidebar filters with main table filters
    function syncSidebarFilters() {
        const sidebarAreaFilter = document.getElementById('sidebarAreaFilter');
        const sidebarStatusFilter = document.getElementById('sidebarStatusFilter');
        const sidebarApplyBtn = document.getElementById('sidebarApplyFilters');
        
        if (!sidebarAreaFilter || !sidebarStatusFilter || !sidebarApplyBtn) return;
        
        // Populate area filter if it's empty (for system admin)
        if (sidebarAreaFilter.options.length === 1) {
            // Get areas from the main filter if available
            const mainAreaFilter = document.getElementById('filterArea') || document.getElementById('areaFilter');
            if (mainAreaFilter) {
                sidebarAreaFilter.innerHTML = mainAreaFilter.innerHTML;
            }
        }
        
        // Apply filters button handler
        sidebarApplyBtn.addEventListener('click', function() {
            const areaValue = sidebarAreaFilter.value;
            const statusValue = sidebarStatusFilter.value;
            
            // Update main table filters
            const mainAreaFilter = document.getElementById('filterArea') || document.getElementById('areaFilter');
            const mainStatusFilter = document.getElementById('statusFilter');
            
            if (mainAreaFilter) {
                mainAreaFilter.value = areaValue;
                // Trigger change event
                mainAreaFilter.dispatchEvent(new Event('change'));
            }
            
            if (mainStatusFilter) {
                mainStatusFilter.value = statusValue;
                // Trigger change event  
                mainStatusFilter.dispatchEvent(new Event('change'));
            }
            
            // Apply the filters
            const applyBtn = document.getElementById('applyFilters');
            if (applyBtn) {
                applyBtn.click();
            }
        });
        
        // Sync filters when main filters change
        const mainAreaFilter = document.getElementById('filterArea') || document.getElementById('areaFilter');
        const mainStatusFilter = document.getElementById('statusFilter');
        
        if (mainAreaFilter) {
            mainAreaFilter.addEventListener('change', function() {
                sidebarAreaFilter.value = this.value;
            });
        }
        
        if (mainStatusFilter) {
            mainStatusFilter.addEventListener('change', function() {
                sidebarStatusFilter.value = this.value;
            });
        }
    }
    
    // Animate stat cards on hover
    function animateStatCards() {
        const statCards = document.querySelectorAll('.stat-card');
        statCards.forEach(card => {
            card.addEventListener('mouseenter', function() {
                this.style.transform = 'translateY(-2px) scale(1.02)';
            });
            
            card.addEventListener('mouseleave', function() {
                this.style.transform = 'translateY(0) scale(1)';
            });
        });
    }
    
    // Initialize
    syncSidebarFilters();
    animateStatCards();
    
    // Update stats periodically (optional - refresh every 30 seconds)
    setInterval(function() {
        // You could add an AJAX call here to refresh stats without page reload
        // For now, stats are server-rendered
    }, 30000);
});

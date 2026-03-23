/**
 * Navigation Performance Optimizer
 * Prevents layout shifts and adds loading states during page navigation
 */
(function() {
    'use strict';

    // Cache DOM elements with optimized selectors
    const sidebar = document.getElementById('sidebar');
    const mainContent = document.querySelector('.main-content');
    const sidebarLinks = document.querySelectorAll('.sidebar-link[data-page]');
    const subLinks = document.querySelectorAll('.sidebar-sublink[data-page]');
    
    // Create lookup map for faster page detection
    const pageLinkMap = new Map();
    
    // Build page-to-link mapping for O(1) lookup
    function buildPageLinkMap() {
        [...sidebarLinks, ...subLinks].forEach(link => {
            const page = link.getAttribute('data-page');
            if (page) {
                pageLinkMap.set(page, link);
            }
        });
    }

    // Loading state CSS - Optimized for performance
    const loadingStyles = `
        .navigation-loading {
            pointer-events: none;
            opacity: 0.7;
        }
        
        .sidebar-link.loading::after,
        .sidebar-sublink.loading::after {
            content: '';
            position: absolute;
            right: 1rem;
            top: 50%;
            transform: translateY(-50%);
            width: 12px;
            height: 12px;
            border: 2px solid transparent;
            border-top: 2px solid var(--phlpost-blue);
            border-radius: 50%;
            animation: spin 0.6s linear infinite;
            will-change: transform;
        }
        
        @keyframes spin {
            0% { transform: translateY(-50%) rotate(0deg); }
            100% { transform: translateY(-50%) rotate(360deg); }
        }
        
        .page-transitioning {
            position: relative;
            overflow: hidden;
        }
        
        .page-transitioning::before {
            content: '';
            position: absolute;
            top: 0;
            left: -100%;
            width: 100%;
            height: 2px;
            background: linear-gradient(90deg, transparent, var(--phlpost-blue), transparent);
            animation: slide 1s ease-in-out infinite;
            z-index: 9999;
            will-change: transform;
        }
        
        @keyframes slide {
            0% { left: -100%; }
            100% { left: 100%; }
        }
    `;

    // Inject loading styles
    function injectStyles() {
        const styleSheet = document.createElement('style');
        styleSheet.textContent = loadingStyles;
        document.head.appendChild(styleSheet);
    }

    // Show loading state on navigation
    function showLoadingState(link) {
        if (!link) return;
        
        // Add loading class to clicked link
        link.classList.add('loading');
        link.style.position = 'relative';
        
        // Add loading class to main content
        if (mainContent) {
            mainContent.classList.add('page-transitioning');
        }
        
        // Disable other navigation temporarily
        sidebarLinks.forEach(otherLink => {
            if (otherLink !== link) {
                otherLink.classList.add('navigation-loading');
            }
        });
        
        subLinks.forEach(otherLink => {
            if (otherLink !== link) {
                otherLink.classList.add('navigation-loading');
            }
        });
    }

    // Hide loading state
    function hideLoadingState() {
        // Remove all loading classes
        document.querySelectorAll('.loading, .navigation-loading, .page-transitioning').forEach(el => {
            el.classList.remove('loading', 'navigation-loading', 'page-transitioning');
        });
    }

    // Handle navigation clicks with optimized event handling
    function handleNavigationClick(e) {
        const link = e.currentTarget;
        const href = link.getAttribute('href');
        const page = link.getAttribute('data-page');
        
        // Skip external links, anchors, and special links
        if (!href || href.startsWith('#') || href.startsWith('http') || href.includes('javascript')) {
            return;
        }
        
        // Prevent default and show loading state
        e.preventDefault();
        showLoadingState(link);
        
        // Use optimized navigation with shorter delay
        requestAnimationFrame(() => {
            window.location.href = href;
        });
    }

    // Initialize navigation optimizer
    function init() {
        injectStyles();
        buildPageLinkMap();
        
        // Use event delegation for better performance
        if (sidebar) {
            sidebar.addEventListener('click', function(e) {
                const target = e.target.closest('.sidebar-link[data-page], .sidebar-sublink[data-page]');
                if (target) {
                    handleNavigationClick.call(target, e);
                }
            });
        }
        
        // Clean up loading state on page unload
        window.addEventListener('beforeunload', hideLoadingState);
        
        // Clean up loading state when page is fully loaded
        if (document.readyState === 'complete') {
            requestAnimationFrame(hideLoadingState);
        } else {
            window.addEventListener('load', () => {
                requestAnimationFrame(hideLoadingState);
            });
        }
    }

    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();

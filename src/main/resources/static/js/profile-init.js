/**
 * Profile Page Initialization Script
 * Handles tab switching and carousel initialization
 * Separated from profile.html for better code organization
 */

document.addEventListener('DOMContentLoaded', function () {
    // Initialize carousel
    var carousel = document.getElementById('coverPhotoCarousel');
    if (carousel) {
        // Check if bootstrap.Carousel is available (Bootstrap 4) or use jQuery if not
        if (typeof bootstrap !== 'undefined' && bootstrap.Carousel) {
            new bootstrap.Carousel(carousel, {
                interval: 5000,
                ride: 'carousel'
            });
        } else if (typeof $ !== 'undefined' && $.fn.carousel) {
            // Fallback to jQuery for Bootstrap 4 compatibility
            $(carousel).carousel({
                interval: 5000,
                ride: 'carousel'
            });
        }
    }
    
    // Tab switching
    document.querySelectorAll('.profile-tabs .tab-item').forEach(function (btn) {
        btn.addEventListener('click', function () {
            if (btn.dataset.tab === 'assets') {
                var roleFlags = document.getElementById('profileRoleFlags');
                var isAsset = roleFlags ? roleFlags.dataset.isAsset === 'true' : false;
                if (!isAsset) {
                    if (typeof Swal !== 'undefined') {
                        Swal.fire({
                            icon: 'error',
                            title: 'Access Denied',
                            text: 'For User Asset Only'
                        });
                    } else {
                        alert('For User Asset Only');
                    }
                    return;
                }
            }

            document.querySelectorAll('.profile-tabs .tab-item').forEach(function (b) { 
                b.classList.remove('active'); 
            });
            document.querySelectorAll('.tab-panel').forEach(function (p) { 
                p.classList.remove('active'); 
            });
            btn.classList.add('active');
            document.getElementById('tab-' + btn.dataset.tab).classList.add('active');
        });
    });
});

document.addEventListener('DOMContentLoaded', function () {
    const toggles = document.querySelectorAll('.sidebar-dropdown-toggle');

    toggles.forEach(toggle => {
        toggle.addEventListener('click', function (e) {
            e.preventDefault();
            e.stopPropagation();
            const dropdown = this.closest('.sidebar-dropdown');
            const isOpen = dropdown.classList.contains('open');

            // Close all other open dropdowns
            document.querySelectorAll('.sidebar-dropdown.open').forEach(d => {
                if (d !== dropdown) d.classList.remove('open');
            });

            dropdown.classList.toggle('open', !isOpen);
        });
    });

    // Ensure submenu links work properly
    const sublinks = document.querySelectorAll('.sidebar-sublink');
    sublinks.forEach(link => {
        link.addEventListener('click', function (e) {
            // Allow normal navigation for submenu links
            // Don't prevent default behavior
        });
    });
});

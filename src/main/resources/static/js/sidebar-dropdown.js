document.addEventListener('DOMContentLoaded', function () {
    const toggles = document.querySelectorAll('.sidebar-dropdown-toggle');

    toggles.forEach(toggle => {
        toggle.addEventListener('click', function (e) {
            e.preventDefault();
            const dropdown = this.closest('.sidebar-dropdown');
            const isOpen = dropdown.classList.contains('open');

            // Close all other open dropdowns
            document.querySelectorAll('.sidebar-dropdown.open').forEach(d => {
                if (d !== dropdown) d.classList.remove('open');
            });

            dropdown.classList.toggle('open', !isOpen);
        });
    });
});

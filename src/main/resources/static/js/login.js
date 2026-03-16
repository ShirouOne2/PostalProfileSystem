document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('loginForm');

    // ── Handle URL-based messages (server redirects) ─────────────────────────
    const params = new URLSearchParams(window.location.search);

    if (params.get('error') !== null) {
        Swal.fire({
            icon: 'error',
            title: 'Login Failed',
            text: 'Invalid email or password. Please try again.',
            confirmButtonColor: '#002868',
            confirmButtonText: 'Try Again',
            customClass: { popup: 'swal-phlpost' }
        });
    }

    if (params.get('logout') !== null) {
        Swal.fire({
            icon: 'success',
            title: 'Logged Out',
            text: 'You have been successfully logged out.',
            confirmButtonColor: '#002868',
            timer: 3000,
            timerProgressBar: true,
            customClass: { popup: 'swal-phlpost' }
        });
    }

    if (params.get('timeout') !== null) {
        Swal.fire({
            icon: 'warning',
            title: 'Session Expired',
            text: 'Your session has expired due to inactivity. Please log in again.',
            confirmButtonColor: '#002868',
            confirmButtonText: 'Login Again',
            customClass: { popup: 'swal-phlpost' }
        });
    }

    // ── Login form submission ─────────────────────────────────────────────────
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const email    = document.getElementById('email').value;
        const password = document.getElementById('password').value;
        const button   = document.querySelector('.login-button');

        button.disabled    = true;
        button.textContent = 'Authenticating...';

        try {
            const formData = new URLSearchParams();
            formData.append('email', email);
            formData.append('password', password);

            const response = await fetch('/login', {
                method:  'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body:    formData.toString()
            });

            if (response.redirected) {
                window.location.href = response.url;
            } else if (response.ok) {
                window.location.href = '/dashboard';
            } else {
                Swal.fire({
                    icon:               'error',
                    title:              'Login Failed',
                    text:               'Invalid email or password. Please try again.',
                    confirmButtonColor: '#002868',
                    confirmButtonText:  'Try Again',
                    customClass:        { popup: 'swal-phlpost' }
                });
                button.disabled    = false;
                button.textContent = 'Login';
            }
        } catch (error) {
            console.error('Login Error:', error);
            Swal.fire({
                icon:               'error',
                title:              'Server Error',
                text:               'Unable to connect. Please try again later.',
                confirmButtonColor: '#002868',
                customClass:        { popup: 'swal-phlpost' }
            });
            button.disabled    = false;
            button.textContent = 'Login';
        }
    });
});

// ── Toggle password visibility ────────────────────────────────────────────────
function togglePassword(icon) {
    const input = icon.parentElement.querySelector('input');
    if (input.type === 'password') {
        input.type = 'text';
        icon.name  = 'eye-off-outline';
    } else {
        input.type = 'password';
        icon.name  = 'eye-outline';
    }
}

// ── Splash screen ─────────────────────────────────────────────────────────────
window.addEventListener('DOMContentLoaded', function () {
    setTimeout(function () {
        const splash = document.getElementById('splashScreen');
        const login  = document.getElementById('loginContainer');

        splash.classList.add('splash-fade-out');
        setTimeout(function () {
            splash.style.display = 'none';
            login.style.display  = 'flex';
            login.classList.add('login-fade-in');
        }, 600);
    }, 2800);
});
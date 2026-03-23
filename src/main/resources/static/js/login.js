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
    // WHY native submit instead of fetch:
    //   Using fetch('/login') and then setting window.location.href causes the
    //   dashboard to load TWICE — once inside the fetch (Spring Security follows
    //   the 302 redirect internally) and again when JS sets window.location.
    //   Native form submit lets the browser handle the Spring Security redirect
    //   chain in one step, so /dashboard is only hit once.
    loginForm.addEventListener('submit', (e) => {
        e.preventDefault();

        const email    = document.getElementById('email').value.trim();
        const password = document.getElementById('password').value;
        const button   = document.querySelector('.login-button');

        if (!email || !password) {
            Swal.fire({
                icon:               'warning',
                title:              'Missing Fields',
                text:               'Please enter your email and password.',
                confirmButtonColor: '#002868',
                customClass:        { popup: 'swal-phlpost' }
            });
            return;
        }

        button.disabled    = true;
        button.textContent = 'Authenticating...';

        // Build a real <form> and submit it so the browser follows Spring
        // Security's 302 redirect natively — no double page load.
        const form = document.createElement('form');
        form.method  = 'POST';
        form.action  = '/login';

        const addField = (name, value) => {
            const input = document.createElement('input');
            input.type  = 'hidden';
            input.name  = name;
            input.value = value;
            form.appendChild(input);
        };

        addField('email',    email);
        addField('password', password);

        document.body.appendChild(form);
        form.submit();
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
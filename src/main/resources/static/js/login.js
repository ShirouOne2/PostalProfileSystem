document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('loginForm');

    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;
        const button = document.querySelector('.login-button');

        // Show loading SweetAlert
        Swal.fire({
            title: 'Authenticating...',
            html: 'Please wait while we verify your credentials',
            allowOutsideClick: false,
            allowEscapeKey: false,
            showConfirmButton: false,
            didOpen: () => {
                Swal.showLoading();
            }
        });

        button.disabled = true;
        button.textContent = "Authenticating...";

        try {
            const formData = new URLSearchParams();
            formData.append('email', email);       // must match SecurityConfig usernameParameter
            formData.append('password', password);

            const response = await fetch('/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: formData.toString()
            });

            if (response.redirected) {
                Swal.fire({
                    icon: 'success',
                    title: 'Login Successful!',
                    text: 'Redirecting to dashboard...',
                    showConfirmButton: false,
                    timer: 1500,
                    timerProgressBar: true
                }).then(() => {
                    window.location.href = response.url;
                });
            } else if (response.ok) {
                Swal.fire({
                    icon: 'success',
                    title: 'Login Successful!',
                    text: 'Redirecting to dashboard...',
                    showConfirmButton: false,
                    timer: 1500,
                    timerProgressBar: true
                }).then(() => {
                    window.location.href = '/dashboard';
                });
            } else {
                Swal.fire({
                    icon: 'error',
                    title: 'Login Failed',
                    text: 'Invalid email or password',
                    confirmButtonColor: '#dc3545',
                    confirmButtonText: 'Try Again',
                    showClass: {
                        popup: 'animate__animated animate__fadeInDown'
                    },
                    hideClass: {
                        popup: 'animate__animated animate__fadeOutUp'
                    }
                });
                button.disabled = false;
                button.textContent = "Login";
            }
        } catch (error) {
            console.error("Login Error:", error);
            Swal.fire({
                icon: 'error',
                title: 'Server Error',
                text: 'Unable to connect to the server. Please try again later.',
                confirmButtonColor: '#dc3545',
                confirmButtonText: 'OK',
                footer: '<a href="/contact" style="color: #6c757d;">Need help? Contact support</a>'
            });
            button.disabled = false;
            button.textContent = "Login";
        }
    });
});

// Toggle password visibility function
function togglePassword(icon) {
    const passwordInput = icon.parentElement.querySelector('input[type="password"]');
    
    if (passwordInput.type === 'password') {
        passwordInput.type = 'text';
        icon.name = 'eye-off-outline';
    } else {
        passwordInput.type = 'password';
        icon.name = 'eye-outline';
    }
}

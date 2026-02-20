document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('loginForm');

    // Check if redirected here due to login error (from Spring Security failureUrl)
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.has('error')) {
        Swal.fire({
            icon: 'error',
            title: 'Login Failed',
            text: 'Invalid email or password. Please try again.',
            confirmButtonColor: '#dc3545',
            confirmButtonText: 'Try Again',
            showClass: {
                popup: 'animate__animated animate__fadeInDown'
            },
            hideClass: {
                popup: 'animate__animated animate__fadeOutUp'
            }
        });
    }

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
            formData.append('email', email);
            formData.append('password', password);

            const response = await fetch('/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: formData.toString(),
                redirect: 'manual' // ✅ Don't auto-follow redirects
            });

            // Spring Security redirects to /dashboard on success, /login?error=true on failure
            if (response.type === 'opaqueredirect' || response.status === 302) {
                // We can't read the redirect URL with 'manual', so check via a separate call
                const checkResponse = await fetch('/dashboard', {
                    method: 'GET',
                    redirect: 'manual'
                });

                if (checkResponse.status === 200 || checkResponse.type === 'basic') {
                    // Authenticated successfully
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
                    // Not authenticated — wrong credentials
                    Swal.fire({
                        icon: 'error',
                        title: 'Login Failed',
                        text: 'Invalid email or password. Please try again.',
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
            } else {
                // Fallback: not redirected at all — treat as error
                Swal.fire({
                    icon: 'error',
                    title: 'Login Failed',
                    text: 'Invalid email or password. Please try again.',
                    confirmButtonColor: '#dc3545',
                    confirmButtonText: 'Try Again'
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
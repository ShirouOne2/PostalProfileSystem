document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('loginForm');

    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;
        const button = document.querySelector('.login-button');

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
                window.location.href = response.url;
            } else if (response.ok) {
                window.location.href = '/dashboard';
            } else {
                Swal.fire({
                    icon: 'error',
                    title: 'Login Failed',
                    text: 'Invalid email or password',
                    showConfirmButton: true
                });
                button.disabled = false;
                button.textContent = "Login";
            }
        } catch (error) {
            console.error("Login Error:", error);
            Swal.fire({
                icon: 'error',
                title: 'Server Error',
                text: 'Please try again later'
            });
            button.disabled = false;
            button.textContent = "Login";
        }
    });
});

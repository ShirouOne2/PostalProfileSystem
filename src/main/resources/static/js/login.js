// login.js
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
            // Spring Security expects URL Encoded data for formLogin
            const formData = new URLSearchParams();
            formData.append('email', email);
            formData.append('password', password);

            const response = await fetch('/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: formData.toString()
            });

            // If login is successful, Spring redirects to /dashboard
            if (response.redirected) {
                window.location.href = response.url;
            } else if (response.ok) {
                window.location.href = '/dashboard';
            } else {
                alert("Invalid email or password");
                button.disabled = false;
                button.textContent = "Login";
            }
        } catch (error) {
            console.error("Login Error:", error);
            button.disabled = false;
        }
    });
});
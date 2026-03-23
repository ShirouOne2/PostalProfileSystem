// Get email and token from URL params
const params = new URLSearchParams(window.location.search);
const email = params.get('email') || '';
const token = params.get('token') || '';

// ===== Password Toggle =====
function togglePassword(icon) {
    const input = icon.parentElement.querySelector('input');
    if (input.type === 'password') {
        input.type = 'text';
        icon.name = 'eye-off-outline';
    } else {
        input.type = 'password';
        icon.name = 'eye-outline';
    }
}

// ===== Password Strength =====
const strengthColors = ['#ef4444', '#f59e0b', '#eab308', '#84cc16', '#10b981'];
const strengthLabels = ['Very Weak', 'Weak', 'Fair', 'Good', 'Strong'];

function calculatePasswordStrength(password) {
    let strength = 0;
    if (password.length >= 6)  strength++;
    if (password.length >= 10) strength++;
    if (/[a-z]/.test(password)) strength++;
    if (/[A-Z]/.test(password)) strength++;
    if (/[0-9]/.test(password)) strength++;
    if (/[^a-zA-Z0-9]/.test(password)) strength++;
    return Math.min(strength, 4);
}

document.getElementById('newPassword').addEventListener('input', function () {
    const password = this.value;
    const fill = document.getElementById('strengthFill');
    const text = document.getElementById('strengthText');

    if (!password) {
        fill.style.width = '0%';
        text.textContent = '';
        return;
    }

    const strength = calculatePasswordStrength(password);
    const percent = ((strength + 1) / 5) * 100;
    const color = strengthColors[strength];

    fill.style.width = percent + '%';
    fill.style.background = color;
    text.textContent = strengthLabels[strength];
    text.style.color = color;
});

// ===== Form Submit =====
document.getElementById('resetPasswordForm').addEventListener('submit', async function (e) {
    e.preventDefault();

    const newPassword = document.getElementById('newPassword').value;
    const confirmPassword = document.getElementById('confirmPassword').value;
    const btn = document.getElementById('resetBtn');
    const btnText = document.getElementById('resetBtnText');
    const spinner = document.getElementById('resetBtnSpinner');

    if (newPassword !== confirmPassword) {
        await Swal.fire({
            icon: 'error',
            title: 'Password Mismatch',
            text: 'New password and confirm password must match.',
            confirmButtonColor: '#ef4444'
        });
        return;
    }

    if (newPassword.length < 6) {
        await Swal.fire({
            icon: 'error',
            title: 'Weak Password',
            text: 'Password must be at least 6 characters long.',
            confirmButtonColor: '#ef4444'
        });
        return;
    }

    btn.disabled = true;
    btnText.style.display = 'none';
    spinner.style.display = 'inline-flex';

    try {
        const res = await fetch('/api/auth/reset-password', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, token, newPassword, confirmPassword })
        });

        const data = await res.json();

        if (res.ok) {
            await Swal.fire({
                icon: 'success',
                title: 'Password Reset Successful!',
                text: 'Your password has been reset. You can now login.',
                confirmButtonColor: '#10b981'
            });
            window.location.href = '/login';
        } else {
            Swal.fire({
                icon: 'error',
                title: 'Reset Failed',
                text: data.message || 'Failed to reset password. Please try again.',
                confirmButtonColor: '#ef4444'
            });
        }
    } catch (err) {
        Swal.fire({
            icon: 'error',
            title: 'Error',
            text: 'Something went wrong. Please try again.',
            confirmButtonColor: '#ef4444'
        });
    } finally {
        btn.disabled = false;
        btnText.style.display = 'inline';
        spinner.style.display = 'none';
    }
});
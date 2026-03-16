// Get email from URL param
const params = new URLSearchParams(window.location.search);
const email = params.get('email') || '';
if (email) {
    document.getElementById('otpSubtext').textContent = `We sent a 6-digit code to ${email}`;
}

// OTP box auto-advance
const boxes = document.querySelectorAll('.otp-box');
boxes.forEach((box, idx) => {
    box.addEventListener('input', () => {
        box.value = box.value.replace(/[^0-9]/g, '');
        if (box.value && idx < boxes.length - 1) boxes[idx + 1].focus();
    });
    box.addEventListener('keydown', (e) => {
        if (e.key === 'Backspace' && !box.value && idx > 0) boxes[idx - 1].focus();
    });
    box.addEventListener('paste', (e) => {
        e.preventDefault();
        const pasted = e.clipboardData.getData('text').replace(/[^0-9]/g, '').slice(0, 6);
        pasted.split('').forEach((ch, i) => { if (boxes[i]) boxes[i].value = ch; });
        if (boxes[pasted.length - 1]) boxes[pasted.length - 1].focus();
    });
});

// Countdown timer (5 minutes)
let seconds = 300;
const countdownEl = document.getElementById('countdown');
const timerText = document.getElementById('timerText');
const resendLink = document.getElementById('resendLink');

const timer = setInterval(() => {
    seconds--;
    const m = String(Math.floor(seconds / 60)).padStart(2, '0');
    const s = String(seconds % 60).padStart(2, '0');
    countdownEl.textContent = `${m}:${s}`;
    if (seconds <= 0) {
        clearInterval(timer);
        timerText.style.display = 'none';
        resendLink.style.display = 'inline';
    }
}, 1000);

// Resend OTP
resendLink.addEventListener('click', async (e) => {
    e.preventDefault();
    try {
        await fetch('/api/auth/request-otp', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email })
        });
        Swal.fire({ icon: 'success', title: 'OTP Resent!', text: 'Check your email again.', confirmButtonColor: '#3b82f6' });
        seconds = 300;
        timerText.style.display = 'inline';
        resendLink.style.display = 'none';
    } catch (err) {
        Swal.fire({ icon: 'error', title: 'Failed', text: 'Could not resend OTP.', confirmButtonColor: '#ef4444' });
    }
});

// Verify OTP
document.getElementById('verifyBtn').addEventListener('click', async () => {
    const otp = Array.from(boxes).map(b => b.value).join('');
    if (otp.length < 6) {
        Swal.fire({ icon: 'warning', title: 'Incomplete', text: 'Please enter the full 6-digit OTP.', confirmButtonColor: '#3b82f6' });
        return;
    }

    const btn = document.getElementById('verifyBtn');
    btn.disabled = true;
    btn.textContent = 'Verifying...';

    try {
        const res = await fetch('/api/auth/verify-otp', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, otp })
        });
        const data = await res.json();

        if (res.ok) {
            window.location.href = '/reset-password?email=' + encodeURIComponent(email) + '&token=' + encodeURIComponent(data.resetToken || '');
        } else {
            Swal.fire({ icon: 'error', title: 'Invalid OTP', text: data.message || 'The OTP is incorrect or has expired.', confirmButtonColor: '#ef4444' });
        }
    } catch (err) {
        Swal.fire({ icon: 'error', title: 'Error', text: 'Something went wrong.', confirmButtonColor: '#ef4444' });
    } finally {
        btn.disabled = false;
        btn.textContent = 'Verify OTP';
    }
});
document.getElementById('requestOtpForm').addEventListener('submit', async function(e) {
    e.preventDefault();

    const email = document.getElementById('email').value.trim();
    const btn = document.getElementById('sendBtn');
    const btnText = document.getElementById('sendBtnText');
    const spinner = document.getElementById('sendBtnSpinner');

    btn.disabled = true;
    btnText.style.display = 'none';
    spinner.style.display = 'inline-flex';

    try {
        const res = await fetch('/api/auth/request-otp', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email })
        });

        const data = await res.json();

        if (res.ok) {
            await Swal.fire({
                icon: 'success',
                title: 'OTP Sent!',
                text: 'Please check your email for the OTP code.',
                confirmButtonColor: '#3b82f6'
            });
            window.location.href = '/verify-otp?email=' + encodeURIComponent(email);
        } else {
            Swal.fire({
                icon: 'error',
                title: 'Failed',
                text: data.message || 'Email not found. Please try again.',
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
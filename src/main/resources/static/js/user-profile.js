/**
 * user-profile.js
 * Handles the "Change Password" section on the My Profile page.
 *
 * Uses vanilla JS (no jQuery) so it works regardless of load order.
 * Wrapped in DOMContentLoaded so it runs safely after the DOM is ready.
 */
document.addEventListener('DOMContentLoaded', function () {

    // ── Toggle password visibility ────────────────────────────────────
    function wireToggle(btnId, inputId, iconId) {
        var btn   = document.getElementById(btnId);
        var input = document.getElementById(inputId);
        var icon  = document.getElementById(iconId);
        if (!btn || !input || !icon) return;

        btn.addEventListener('click', function () {
            var isPassword = input.type === 'password';
            input.type     = isPassword ? 'text' : 'password';
            icon.classList.toggle('fa-eye',        !isPassword);
            icon.classList.toggle('fa-eye-slash',   isPassword);
        });
    }

    wireToggle('toggleCurrentPassword', 'currentPassword', 'currentPasswordIcon');
    wireToggle('toggleNewPassword',     'newPassword',      'newPasswordIcon');
    wireToggle('toggleConfirmPassword', 'confirmPassword',  'confirmPasswordIcon');

    // ── Save Password button ──────────────────────────────────────────
    var saveBtn = document.getElementById('savePasswordBtn');
    if (!saveBtn) return;

    saveBtn.addEventListener('click', function () {
        var userId          = saveBtn.getAttribute('data-user-id');
        var currentPassword = (document.getElementById('currentPassword')?.value  || '').trim();
        var newPassword     = (document.getElementById('newPassword')?.value       || '').trim();
        var confirmPassword = (document.getElementById('confirmPassword')?.value   || '').trim();

        // ── Client-side validation ────────────────────────────────────
        if (!currentPassword) {
            showAlert('warning', 'Please enter your current password.');
            return;
        }
        if (!newPassword) {
            showAlert('warning', 'Please enter a new password.');
            return;
        }
        if (newPassword.length < 6) {
            showAlert('warning', 'New password must be at least 6 characters.');
            return;
        }
        if (newPassword !== confirmPassword) {
            showAlert('danger', 'New password and confirm password do not match.');
            return;
        }
        if (newPassword === currentPassword) {
            showAlert('warning', 'New password must be different from your current password.');
            return;
        }

        // ── Disable button while saving ───────────────────────────────
        saveBtn.disabled    = true;
        saveBtn.textContent = 'Saving…';

        fetch('/api/users/' + userId + '/change-password', {
            method:  'PUT',
            headers: { 'Content-Type': 'application/json' },
            body:    JSON.stringify({ currentPassword: currentPassword, newPassword: newPassword })
        })
        .then(function (res) { return res.json(); })
        .then(function (data) {
            if (data.success) {
                showAlert('success', 'Password changed successfully!');
                // Clear all password fields
                document.getElementById('currentPassword').value = '';
                document.getElementById('newPassword').value     = '';
                document.getElementById('confirmPassword').value = '';
            } else {
                showAlert('danger', data.message || 'Failed to change password. Please try again.');
            }
        })
        .catch(function () {
            showAlert('danger', 'An error occurred. Please try again.');
        })
        .finally(function () {
            saveBtn.disabled    = false;
            saveBtn.innerHTML   = '<i class="fas fa-save mr-1"></i> Save Password';
        });
    });

    // ── Alert helper ─────────────────────────────────────────────────
    function showAlert(type, message) {
        var alertEl = document.getElementById('pwAlert');
        if (!alertEl) return;

        // Map type to Bootstrap alert class + icon
        var iconClass = 'fa-info-circle';
        if (type === 'success') iconClass = 'fa-check-circle';
        if (type === 'danger')  iconClass = 'fa-times-circle';
        if (type === 'warning') iconClass = 'fa-exclamation-triangle';

        alertEl.className = 'alert alert-' + type;
        alertEl.innerHTML = '<i class="fas ' + iconClass + ' mr-2"></i>' + message;
        alertEl.style.display = 'block';

        // Auto-hide after 5 seconds (except errors)
        if (type !== 'danger') {
            setTimeout(function () {
                alertEl.style.display = 'none';
            }, 5000);
        }
    }
});
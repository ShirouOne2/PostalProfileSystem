/* ── User Profile Page Scripts ────────────────────────────────── */

$(document).ready(function () {
    var userId = /*[[${user.id}]]*/ 0;
    var originalUsername = /*[[${user.username}]]*/ '';
    var originalEmail = /*[[${user.email}]]*/ '';

    // ── Edit Profile Functionality ──────────────────────────────
    $('#saveProfileBtn').on('click', function () {
        var username = $('#editUsername').val().trim();
        var email = $('#editEmail').val().trim();
        var $btn = $(this);

        // Clear previous alert
        $('#profileAlert').hide().removeClass('alert-success alert-danger');

        // Validate
        if (!username || !email) {
            showProfileAlert('danger', 'Please fill in all fields.');
            return;
        }

        // Email validation
        var emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            showProfileAlert('danger', 'Please enter a valid email address.');
            return;
        }

        // Check if anything changed
        if (username === originalUsername && email === originalEmail) {
            showProfileAlert('warning', 'No changes detected.');
            return;
        }

        $btn.prop('disabled', true).html('<i class="fas fa-spinner fa-spin mr-1"></i> Saving...');

        $.ajax({
            url: '/api/users/' + userId + '/profile',
            method: 'PUT',
            contentType: 'application/json',
            data: JSON.stringify({
                username: username,
                email: email
            }),
            success: function (res) {
                $btn.prop('disabled', false).html('<i class="fas fa-save mr-1"></i> Save Profile');
                if (res.success) {
                    showProfileAlert('success', '<i class="fas fa-check-circle mr-1"></i> Profile updated successfully!');
                    // Update original values
                    originalUsername = username;
                    originalEmail = email;
                    // Update display on page
                    $('.up-name').text(username);
                    $('.up-email span').text(email);
                    $('#editUsername').val(username);
                    $('#editEmail').val(email);
                } else {
                    showProfileAlert('danger', res.message || 'Failed to update profile.');
                }
            },
            error: function (xhr) {
                $btn.prop('disabled', false).html('<i class="fas fa-save mr-1"></i> Save Profile');
                var msg = xhr.responseJSON ? xhr.responseJSON.message : 'An error occurred.';
                showProfileAlert('danger', msg);
            }
        });
    });

    // Cancel edit - reset to original values
    $('#cancelEditBtn').on('click', function () {
        $('#editUsername').val(originalUsername);
        $('#editEmail').val(originalEmail);
        $('#profileAlert').hide();
    });

    // ── Password Change Functionality ────────────────────────────
    $('#savePasswordBtn').on('click', function () {
        var current = $('#currentPassword').val().trim();
        var newPw   = $('#newPassword').val().trim();
        var confirm = $('#confirmPassword').val().trim();
        var $btn    = $(this);

        // Clear previous alert
        $('#pwAlert').hide().removeClass('alert-success alert-danger');

        // Validate
        if (!current || !newPw || !confirm) {
            showAlert('danger', 'Please fill in all password fields.');
            return;
        }
        if (newPw.length < 6) {
            showAlert('danger', 'New password must be at least 6 characters.');
            return;
        }
        if (newPw !== confirm) {
            showAlert('danger', 'New password and confirmation do not match.');
            return;
        }

        $btn.prop('disabled', true).html('<i class="fas fa-spinner fa-spin mr-1"></i> Saving...');

        $.ajax({
            url: '/api/users/' + userId + '/change-password',
            method: 'PUT',
            contentType: 'application/json',
            data: JSON.stringify({
                currentPassword: current,
                newPassword:     newPw
            }),
            success: function (res) {
                $btn.prop('disabled', false).html('<i class="fas fa-save mr-1"></i> Save Password');
                if (res.success) {
                    showAlert('success', '<i class="fas fa-check-circle mr-1"></i> Password changed successfully!');
                    $('#currentPassword, #newPassword, #confirmPassword').val('');
                } else {
                    showAlert('danger', res.message || 'Failed to change password.');
                }
            },
            error: function (xhr) {
                $btn.prop('disabled', false).html('<i class="fas fa-save mr-1"></i> Save Password');
                var msg = xhr.responseJSON ? xhr.responseJSON.message : 'An error occurred.';
                showAlert('danger', msg);
            }
        });
    });

    // ── Alert Functions ─────────────────────────────────────────
    function showAlert(type, msg) {
        $('#pwAlert')
            .addClass('alert-' + type)
            .html(msg)
            .slideDown(200);
    }

    function showProfileAlert(type, msg) {
        $('#profileAlert')
            .addClass('alert-' + type)
            .html(msg)
            .slideDown(200);
    }
});

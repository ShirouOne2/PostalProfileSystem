/* ── User Profile Page Scripts ────────────────────────────────── */

$(document).ready(function () {
    var userId = /*[[${user.id}]]*/ 0;

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

    function showAlert(type, msg) {
        $('#pwAlert')
            .addClass('alert-' + type)
            .html(msg)
            .slideDown(200);
    }
});

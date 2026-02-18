/**
 * Profile Page JavaScript
 * Handles archive functionality for individual post office profiles
 */

$(document).ready(function () {
    var officeId   = $('#profileArchiveBtn').data('office-id');
    var officeName = $('#profileArchiveBtn').data('office-name');

    $('#profileArchiveBtn').on('click', function () {
        $('#profileArchiveReason').val('');
        $('#profileArchiveModal').modal('show');
    });

    $('#profileConfirmArchiveBtn').on('click', function () {
        var reason = $('#profileArchiveReason').val().trim();
        var $btn   = $(this);
        $btn.prop('disabled', true).html('<i class="fas fa-spinner fa-spin mr-1"></i> Archiving...');

        $.ajax({
            url: '/api/archive/' + officeId,
            method: 'POST',
            contentType: 'application/json',
            data: JSON.stringify({ reason: reason }),
            success: function (res) {
                $('#profileArchiveModal').modal('hide');
                $btn.prop('disabled', false).html('<i class="fas fa-archive mr-1"></i> Archive');
                if (res.success) {
                    Swal.fire({
                        icon: 'success',
                        title: 'Archived!',
                        text: res.message,
                        timer: 2000,
                        showConfirmButton: false
                    }).then(function () { window.location.href = '/table'; });
                } else {
                    Swal.fire({ icon: 'error', title: 'Archive Failed', text: res.message || 'Failed to archive.' });
                }
            },
            error: function (xhr) {
                $btn.prop('disabled', false).html('<i class="fas fa-archive mr-1"></i> Archive');
                var msg = xhr.responseJSON ? xhr.responseJSON.message : 'An error occurred.';
                Swal.fire({ icon: 'error', title: 'Error', text: msg });
            }
        });
    });
});

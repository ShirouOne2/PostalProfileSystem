/**
 * Profile Page JavaScript
 * Handles archive functionality and edit modal for individual post office profiles
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

// Edit Modal Functions
function openEditModal() {
    var officeId = $('#profileArchiveBtn').data('office-id');
    $('#editOfficeId').val(officeId);

    // Fetch data from API instead of scraping DOM to avoid incorrect values
    $.ajax({
        url: '/api/postal-office/' + officeId,
        method: 'GET',
        success: function(data) {
            $('#editName').val(data.name || '');
            $('#editPostmaster').val(data.postmaster || '');
            $('#editAddress').val(data.address || '');
            $('#editZipCode').val(data.zipCode || '');
            $('#editStatus').val(data.connectionStatus ? 'true' : 'false');
            $('#editISP').val(data.internetServiceProvider || '');
            $('#editSpeed').val(data.speed || '');
            $('#editTypeOfConnection').val(data.typeOfConnection || '');
            $('#editStaticIP').val(data.staticIpAddress || '');
            $('#editNoOfEmployees').val(data.noOfEmployees || '');
            $('#editNoOfTellers').val(data.noOfPostalTellers || '');
            $('#editNoOfCarriers').val(data.noOfLetterCarriers || '');
            $('#editContactPerson').val(data.postalOfficeContactPerson || '');
            $('#editContactNumber').val(data.postalOfficeContactNumber || '');
            $('#editISPContactPerson').val(data.ispContactPerson || '');
            $('#editISPContactNumber').val(data.ispContactNumber || '');
            $('#editLatitude').val(data.latitude || '');
            $('#editLongitude').val(data.longitude || '');

            // Load image previews
            $('#profilePicPreview').attr('src', data.profilePicture || '/images/no-image.png');
            $('#coverPhotoPreview').attr('src', data.coverPhoto || '/images/no-image.png');
            $('#profilePicUploadStatus').html('');
            $('#coverPhotoUploadStatus').html('');

            $('#editOfficeModal').modal('show');
        },
        error: function() {
            Swal.fire({ icon: 'error', title: 'Error', text: 'Failed to load office data.' });
        }
    });
}

/**
 * Preview the selected image and upload it immediately to the server.
 * @param {HTMLInputElement} input  - the file input element
 * @param {string}           type  - 'profile' or 'cover'
 */
function previewAndUploadImage(input, type) {
    if (!input.files || !input.files[0]) return;

    var file = input.files[0];
    var maxSize = 5 * 1024 * 1024; // 5 MB

    if (file.size > maxSize) {
        Swal.fire({ icon: 'warning', title: 'File Too Large', text: 'Please choose an image smaller than 5 MB.' });
        input.value = '';
        return;
    }

    // Local preview
    var reader = new FileReader();
    reader.onload = function(e) {
        if (type === 'profile') {
            $('#profilePicPreview').attr('src', e.target.result);
        } else {
            $('#coverPhotoPreview').attr('src', e.target.result);
        }
    };
    reader.readAsDataURL(file);

    // Upload to server
    var officeId = $('#editOfficeId').val();
    var statusEl = type === 'profile' ? $('#profilePicUploadStatus') : $('#coverPhotoUploadStatus');
    statusEl.html('<small class="text-muted"><i class="fas fa-spinner fa-spin"></i> Uploading...</small>');

    var formData = new FormData();
    formData.append('file', file);
    formData.append('type', type);

    $.ajax({
        url: '/api/postal-office/' + officeId + '/upload-image',
        method: 'POST',
        data: formData,
        processData: false,
        contentType: false,
        success: function(res) {
            if (res.success) {
                statusEl.html('<small class="text-success"><i class="fas fa-check-circle"></i> Uploaded!</small>');
                // Update main profile page images live (no need to reload)
                if (type === 'profile') {
                    $('#mainProfilePic').attr('src', res.url);
                } else {
                    var coverDiv = $('#coverPhotoDiv');
                    coverDiv.css({
                        'background-image': 'url(' + res.url + ')',
                        'background-size': 'cover',
                        'background-position': 'center',
                        'background': ''
                    });
                    coverDiv.css('background-image', 'url(' + res.url + ')');
                }
            } else {
                statusEl.html('<small class="text-danger"><i class="fas fa-times-circle"></i> ' + (res.message || 'Upload failed.') + '</small>');
            }
        },
        error: function() {
            statusEl.html('<small class="text-danger"><i class="fas fa-times-circle"></i> Upload failed. Try again.</small>');
        }
    });
}

function saveOfficeChanges() {
    var officeId = $('#editOfficeId').val();
    var $btn = $('#editOfficeModal .btn-warning');
    
    var formData = {
        id: officeId,
        name: $('#editName').val(),
        postmaster: $('#editPostmaster').val() || null,
        address: $('#editAddress').val() || null,
        zipCode: $('#editZipCode').val() || null,
        connectionStatus: $('#editStatus').val() === 'true',
        internetServiceProvider: $('#editISP').val() || null,
        speed: $('#editSpeed').val() || null,
        typeOfConnection: $('#editTypeOfConnection').val() || null,
        staticIpAddress: $('#editStaticIP').val() || null,
        noOfEmployees: parseInt($('#editNoOfEmployees').val()) || 0,
        noOfPostalTellers: parseInt($('#editNoOfTellers').val()) || 0,
        noOfLetterCarriers: parseInt($('#editNoOfCarriers').val()) || 0,
        postalOfficeContactPerson: $('#editContactPerson').val() || null,
        postalOfficeContactNumber: $('#editContactNumber').val() || null,
        ispContactPerson: $('#editISPContactPerson').val() || null,
        ispContactNumber: $('#editISPContactNumber').val() || null,
        latitude: $('#editLatitude').val() || null,
        longitude: $('#editLongitude').val() || null
    };
    
    $btn.prop('disabled', true).html('<i class="fas fa-spinner fa-spin mr-1"></i> Saving...');
    
    $.ajax({
        url: '/api/postal-office/' + officeId,
        method: 'PUT',
        contentType: 'application/json',
        data: JSON.stringify(formData),
        success: function (res) {
            $('#editOfficeModal').modal('hide');
            $btn.prop('disabled', false).html('<i class="fas fa-save"></i> Save Changes');
            
            if (res.success) {
                Swal.fire({
                    icon: 'success',
                    title: 'Updated!',
                    text: 'Post office information has been updated successfully.',
                    timer: 2000,
                    showConfirmButton: false
                }).then(function () {
                    location.reload();
                });
            } else {
                Swal.fire({ 
                    icon: 'error', 
                    title: 'Update Failed', 
                    text: res.message || 'Failed to update post office.' 
                });
            }
        },
        error: function (xhr) {
            $btn.prop('disabled', false).html('<i class="fas fa-save"></i> Save Changes');
            var msg = xhr.responseJSON ? xhr.responseJSON.message : 'An error occurred while updating.';
            Swal.fire({ icon: 'error', title: 'Error', text: msg });
        }
    });
}   
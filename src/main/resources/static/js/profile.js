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

            $('#editOfficeModal').modal('show');
        },
        error: function() {
            Swal.fire({ icon: 'error', title: 'Error', text: 'Failed to load office data.' });
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
/**
 * profile-edit.js
 * - Edit Profile button → fills and opens #editOfficeModal
 * - saveOfficeChanges() → PUT /api/postal-office/{id}
 * - uploadPhoto() → POST /api/postal-office/{id}/cover-photo  OR  /profile-photo
 *
 * Loaded by main-layout.html AFTER jQuery (so $() works).
 */

$(function () {

    /* ── Edit Profile button ─────────────────────────────────── */
    $('#profileEditBtn').on('click', function () {
        var d = window.OFFICE_DATA;
        if (!d || !d.id) { Swal.fire('Error', 'Office data not found.', 'error'); return; }

        $('#editOfficeId').val(d.id);
        $('#editName').val(d.name || '');
        $('#editPostmaster').val(d.postmaster || '');
        $('#editAddress').val(d.address || '');
        $('#editZipCode').val(d.zipCode || '');
        $('#editStatus').val(
            (d.connectionStatus === true || d.connectionStatus === 'true') ? 'true' : 'false'
        );
        $('#editISP').val(d.internetServiceProvider || '');
        $('#editSpeed').val(d.speed || '');
        
        // Handle typeOfConnection - add to dropdown if not exists
        var typeOfConn = d.typeOfConnection || '';
        if (typeOfConn && $('#editTypeOfConnection option[value="' + typeOfConn + '"]').length === 0) {
            $('#editTypeOfConnection').append('<option value="' + typeOfConn + '">' + typeOfConn + '</option>');
        }
        $('#editTypeOfConnection').val(typeOfConn);
        
        $('#editStaticIP').val(d.staticIpAddress || '');
        $('#editNoOfEmployees').val(d.noOfEmployees != null ? d.noOfEmployees : 0);
        $('#editNoOfTellers').val(d.noOfPostalTellers != null ? d.noOfPostalTellers : 0);
        $('#editNoOfCarriers').val(d.noOfLetterCarriers != null ? d.noOfLetterCarriers : 0);
        $('#editContactPerson').val(d.postalOfficeContactPerson || '');
        $('#editContactNumber').val(d.postalOfficeContactNumber || '');
        $('#editISPContactPerson').val(d.ispContactPerson || '');
        $('#editISPContactNumber').val(d.ispContactNumber || '');
        $('#editLatitude').val(d.latitude != null ? d.latitude : '');
        $('#editLongitude').val(d.longitude != null ? d.longitude : '');

        $('#editOfficeModal').modal('show');
    });

});

/* ── Save changes ────────────────────────────────────────────── */
function saveOfficeChanges() {
    var id = $('#editOfficeId').val();
    if (!id) { Swal.fire('Error', 'No office ID.', 'error'); return; }

    var name = $('#editName').val().trim();
    if (!name) {
        Swal.fire('Validation', 'Office Name is required.', 'warning');
        $('#editName').focus();
        return;
    }

    var payload = {
        name:                      name,
        postmaster:                $('#editPostmaster').val().trim(),
        address:                   $('#editAddress').val().trim(),
        zipCode:                   $('#editZipCode').val().trim(),
        connectionStatus:          $('#editStatus').val() === 'true',
        internetServiceProvider:   $('#editISP').val().trim(),
        speed:                     $('#editSpeed').val().trim(),
        typeOfConnection:          $('#editTypeOfConnection').val().trim() || null,
        staticIpAddress:           $('#editStaticIP').val().trim(),
        noOfEmployees:             parseInt($('#editNoOfEmployees').val()) || 0,
        noOfPostalTellers:         parseInt($('#editNoOfTellers').val()) || 0,
        noOfLetterCarriers:        parseInt($('#editNoOfCarriers').val()) || 0,
        postalOfficeContactPerson: $('#editContactPerson').val().trim(),
        postalOfficeContactNumber: $('#editContactNumber').val().trim(),
        ispContactPerson:          $('#editISPContactPerson').val().trim(),
        ispContactNumber:          $('#editISPContactNumber').val().trim(),
        latitude:                  parseFloat($('#editLatitude').val()) || null,
        longitude:                 parseFloat($('#editLongitude').val()) || null
    };

    var $btn = $('#editOfficeModal .modal-footer .btn-warning');
    $btn.prop('disabled', true).html('<i class="fas fa-spinner fa-spin mr-1"></i>Saving...');

    $.ajax({
        url: '/api/postal-office/' + id,
        type: 'PUT',
        contentType: 'application/json',
        data: JSON.stringify(payload),
        success: function (res) {
            if (res.success) {
                $('#editOfficeModal').modal('hide');
                Swal.fire({
                    icon: 'success',
                    title: res.requiresApproval ? 'Submitted!' : 'Saved!',
                    text: res.message || (res.requiresApproval ? 'Your changes were submitted for approval.' : 'Changes saved successfully.'),
                    timer: 1800,
                    showConfirmButton: false
                })
                    .then(function () { location.reload(); });
            } else {
                Swal.fire('Error', res.message || 'Save failed.', 'error');
            }
        },
        error: function (xhr) {
            Swal.fire('Error', (xhr.responseJSON || {}).message || ('HTTP ' + xhr.status), 'error');
        },
        complete: function () {
            $btn.prop('disabled', false).html('<i class="fas fa-save mr-1"></i>Save Changes');
        }
    });
}

/* ── Photo upload (cover or profile) ────────────────────────── */
function uploadPhoto(input, type) {
    var id = window.OFFICE_DATA && window.OFFICE_DATA.id;
    if (!id) { Swal.fire('Error', 'Office ID not found.', 'error'); return; }
    if (!input.files || !input.files[0]) return;

    var file = input.files[0];

    // Validate size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
        Swal.fire('Error', 'Image must be smaller than 5MB.', 'error');
        input.value = '';
        return;
    }

    var formData = new FormData();
    formData.append('file', file);

    var endpoint = '/api/postal-office/' + id + '/' + (type === 'cover' ? 'cover-photo/1' : 'profile-photo');

    Swal.fire({
        title: 'Uploading...',
        text: 'Please wait',
        allowOutsideClick: false,
        didOpen: function () { Swal.showLoading(); }
    });

    $.ajax({
        url: endpoint,
        type: 'POST',
        data: formData,
        processData: false,
        contentType: false,
        success: function (res) {
            Swal.close();
            if (res.success) {
                // Update the UI immediately without full reload
                var cacheBust = '?t=' + Date.now();
                if (type === 'cover') {
                    $('.cover-photo').css('background-image', 'url(' + endpoint + cacheBust + ')');
                } else {
                    $('#profilePicImg').attr('src', endpoint + cacheBust);
                }
                Swal.fire({ icon: 'success', title: 'Photo updated!', timer: 1500, showConfirmButton: false });
            } else {
                Swal.fire('Error', res.message || 'Upload failed.', 'error');
            }
        },
        error: function (xhr) {
            Swal.close();
            Swal.fire('Error', (xhr.responseJSON || {}).message || ('HTTP ' + xhr.status), 'error');
        },
        complete: function () { input.value = ''; }
    });
}
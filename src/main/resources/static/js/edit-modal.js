/**
 * edit-modal.js
 * Works on both Profile page and Table page.
 *
 * Profile page : #profileEditBtn → uses window.OFFICE_DATA (Thymeleaf-injected)
 * Table page   : .btn-edit       → uses data-office-id, fetches /api/postal-office/{id}
 * Save         : PUT /api/postal-office/{id}
 */

$(function () {

    /* ─── PROFILE PAGE: Edit Profile button ─────────────────── */
    $(document).on('click', '#profileEditBtn', function () {
        var d = window.OFFICE_DATA;
        if (!d || !d.id) {
            Swal.fire('Error', 'Office data not available.', 'error');
            return;
        }
        fillModal(d);
        $('#editOfficeModal').modal('show');
    });

    /* ─── TABLE PAGE: per-row edit buttons ───────────────────── */
    $(document).on('click', '.btn-edit', function () {
        var id = $(this).data('office-id');
        if (!id) return;

        $.getJSON('/api/postal-office/' + id)
            .done(function (d) {
                fillModal(d);
                $('#editOfficeModal').modal('show');
            })
            .fail(function (xhr) {
                var msg = (xhr.responseJSON || {}).message || 'Failed to load office.';
                Swal.fire('Error', msg, 'error');
            });
    });

    /* ─── Fill every field in the modal ─────────────────────── */
    function fillModal(d) {
        $('#editOfficeId').val(d.id || '');
        $('#editName').val(d.name || '');
        $('#editPostmaster').val(d.postmaster || '');
        $('#editAddress').val(d.address || '');
        $('#editZipCode').val(d.zipCode || '');
        $('#editStatus').val(
            (d.connectionStatus === true || d.connectionStatus === 'true') ? 'true' : 'false'
        );
        $('#editISP').val(d.internetServiceProvider || '');
        $('#editSpeed').val(d.speed || '');
        $('#editTypeOfConnection').val(d.typeOfConnection || '');
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
    }

});

/* ─── Save (called by onclick in edit-modal.html) ────────────── */
function saveOfficeChanges() {
    var id = $('#editOfficeId').val();
    if (!id) { Swal.fire('Error', 'No office ID.', 'error'); return; }

    var name = $('#editName').val().trim();
    if (!name) {
        Swal.fire('Validation Error', 'Office Name is required.', 'warning');
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
        typeOfConnection:          $('#editTypeOfConnection').val().trim(),
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
    $btn.prop('disabled', true).html('<i class="fas fa-spinner fa-spin mr-1"></i>Saving…');

    $.ajax({
        url:         '/api/postal-office/' + id,
        type:        'PUT',
        contentType: 'application/json',
        data:        JSON.stringify(payload),
        success: function (res) {
            if (res.success) {
                $('#editOfficeModal').modal('hide');
                Swal.fire({
                    icon: 'success',
                    title: 'Saved!',
                    text: 'Changes have been saved successfully.',
                    timer: 1800,
                    showConfirmButton: false
                }).then(function () { location.reload(); });
            } else {
                Swal.fire('Error', res.message || 'Save failed.', 'error');
            }
        },
        error: function (xhr) {
            var msg = (xhr.responseJSON || {}).message || ('Server error (HTTP ' + xhr.status + ')');
            Swal.fire('Error', msg, 'error');
        },
        complete: function () {
            $btn.prop('disabled', false).html('<i class="fas fa-save mr-1"></i>Save Changes');
        }
    });
}

/* ─── Archive from Edit Modal ────────────────────────────────── */
$(function () {

    // Archive button — use SweetAlert2 to avoid backdrop conflicts
    $(document).on('click', '#editModalArchiveBtn', function () {
        var id   = $('#editOfficeId').val();
        var name = $('#editName').val() || 'this office';
        if (!id) { Swal.fire('Error', 'No office selected.', 'error'); return; }

        $('#editOfficeModal').modal('hide');

        $('#editOfficeModal').one('hidden.bs.modal', function () {
            // Force clean Bootstrap backdrop leftovers
            $('.modal-backdrop').remove();
            $('body').removeClass('modal-open').css('padding-right', '');

            Swal.fire({
                title: 'Archive Office?',
                html:
                    '<div style="text-align:left;padding:0 4px">' +
                        '<div style="display:flex;align-items:center;gap:10px;background:#fff5f5;border:1px solid #fcc;border-radius:8px;padding:12px 14px;margin-bottom:14px">' +
                            '<i class="fas fa-archive" style="color:#e74a3b;font-size:20px;flex-shrink:0"></i>' +
                            '<div>' +
                                '<div style="font-weight:700;color:#c0392b;font-size:0.95rem">' + name + '</div>' +
                                '<div style="font-size:0.8rem;color:#888;margin-top:2px">This office will be hidden from all views but can be restored later.</div>' +
                            '</div>' +
                        '</div>' +
                        '<label style="font-size:0.8rem;font-weight:600;color:#5a5c69;margin-bottom:5px;display:block">Reason <span style="font-weight:400;color:#aaa">(optional)</span></label>' +
                        '<textarea id="swalArchiveReason" style="width:100%;border:1px solid #d1d3e2;border-radius:6px;padding:10px 12px;font-size:0.85rem;resize:vertical;min-height:80px;outline:none;font-family:inherit;color:#333" placeholder="e.g. Office closed, Duplicate record, Under review..."></textarea>' +
                    '</div>',
                icon: null,
                showCancelButton: true,
                confirmButtonColor: '#e74a3b',
                cancelButtonColor: '#6c757d',
                confirmButtonText: '<i class="fas fa-archive" style="margin-right:6px"></i> Archive',
                cancelButtonText: '<i class="fas fa-times" style="margin-right:6px"></i> Cancel',
                reverseButtons: true,
                customClass: {
                    popup:         'swal-archive-popup',
                    title:         'swal-archive-title',
                    confirmButton: 'swal-archive-confirm',
                    cancelButton:  'swal-archive-cancel'
                },
                didOpen: function () {
                    document.querySelector('.swal-archive-popup').style.borderRadius = '12px';
                    document.querySelector('.swal-archive-popup').style.padding = '28px 28px 24px';
                    var title = document.querySelector('.swal-archive-title');
                    if (title) { title.style.fontSize = '1.15rem'; title.style.color = '#2c3e50'; }
                },
                preConfirm: function () {
                    return document.getElementById('swalArchiveReason').value.trim();
                }
            }).then(function (result) {
                if (!result.isConfirmed) return;

                fetch('/api/postal-office/' + id + '/archive', {
                    method:  'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body:    JSON.stringify({ reason: result.value })
                })
                .then(function (r) { return r.json(); })
                .then(function (res) {
                    if (res.success) {
                        Swal.fire({
                            icon: 'success',
                            title: 'Archived!',
                            text: 'Office has been archived.',
                            timer: 1800,
                            showConfirmButton: false
                        }).then(function () { location.reload(); });
                    } else {
                        Swal.fire('Error', res.message || 'Archive failed.', 'error');
                    }
                })
                .catch(function () {
                    Swal.fire('Error', 'An error occurred.', 'error');
                });
            });
        });
    });

    // Confirm archive
    $(document).on('click', '#editArchiveConfirmBtn', function () {
        var id     = $('#editOfficeId').val();
        var reason = $('#editArchiveReason').val().trim();
        if (!id) { Swal.fire('Error', 'No office selected.', 'error'); return; }

        var $btn = $('#editArchiveConfirmBtn');
        $btn.prop('disabled', true).html('<i class="fas fa-spinner fa-spin mr-1"></i>Archiving…');

        fetch('/api/postal-office/' + id + '/archive', {
            method:  'POST',
            headers: { 'Content-Type': 'application/json' },
            body:    JSON.stringify({ reason: reason })
        })
        .then(function (r) { return r.json(); })
        .then(function (res) {
            $('#editArchiveModal').modal('hide');
            if (res.success) {
                Swal.fire({
                    icon: 'success',
                    title: 'Archived!',
                    text: 'Office has been archived.',
                    timer: 1800,
                    showConfirmButton: false
                }).then(function () { location.reload(); });
            } else {
                Swal.fire('Error', res.message || 'Archive failed.', 'error');
            }
        })
        .catch(function () {
            Swal.fire('Error', 'An error occurred.', 'error');
        })
        .finally(function () {
            $btn.prop('disabled', false).html('<i class="fas fa-archive mr-1"></i>Confirm Archive');
        });
    });

});
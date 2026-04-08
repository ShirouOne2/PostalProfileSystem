/**
 * edit-modal.js
 * Works on Dashboard, Table, Profile, and Quarters pages.
 *
 * Profile page : #profileEditBtn → fetches /api/postal-office/{id}
 * Table/Dashboard: .btn-edit     → fetches /api/postal-office/{id}
 * Save         : PUT /api/postal-office/{id}
 *
 * Area auto-lock:
 *   - System Admin (role 1)  → Area dropdown is free to change
 *   - Area Admin   (role 2)  → Area is auto-set to their assigned area and LOCKED
 *   - User         (role 3)  → Area is auto-set to their assigned area and LOCKED
 *
 * ALL functions called from HTML onclick="" are at TOP LEVEL (window scope).
 */

/* ─── Module-level cache ────────────────────────────────────────────────── */
var _areasCache   = null;
var _regionsCache = null;

/* ─── jQuery ready: preload data + event bindings ───────────────────────── */
$(function () {

    // Preload areas and regions so modal opens fast
    if (!_areasCache)   _areasCache   = $.getJSON('/api/postal/areas');
    if (!_regionsCache) _regionsCache = $.getJSON('/api/postal/regions');

    /* Keep hidden input in sync with Area select */
    $(document).on('change', '#editAreaId', function () {
        $('#editAreaIdHidden').val(this.value);
    });

    /* Profile page — Edit Profile button */
    $(document).on('click', '#profileEditBtn', function () {
        var d = window.OFFICE_DATA;
        if (!d || !d.id) { Swal.fire('Error', 'Office data not available.', 'error'); return; }
        $.getJSON('/api/postal-office/' + d.id)
            .done(function (data) { window.openModal(data); })
            .fail(function ()     { window.openModal(d); });
    });

    /* Table / Dashboard — per-row edit buttons */
    $(document).on('click', '.btn-edit', function () {
        var id = $(this).data('office-id');
        if (!id) return;
        $.getJSON('/api/postal-office/' + id)
            .done(function (d) { window.openModal(d); })
            .fail(function (xhr) {
                Swal.fire('Error', (xhr.responseJSON || {}).message || 'Failed to load office.', 'error');
            });
    });

    /* Archive button inside the modal */
    $(document).on('click', '#editModalArchiveBtn', function () {
        var id   = $('#editOfficeId').val();
        var name = $('#editName').val() || 'this office';
        if (!id) { Swal.fire('Error', 'No office selected.', 'error'); return; }

        $('#editOfficeModal').modal('hide');
        $('#editOfficeModal').one('hidden.bs.modal', function () {
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
                cancelButtonColor:  '#6c757d',
                confirmButtonText:  '<i class="fas fa-archive" style="margin-right:6px"></i> Archive',
                cancelButtonText:   '<i class="fas fa-times"   style="margin-right:6px"></i> Cancel',
                reverseButtons: true,
                customClass: { popup: 'swal-archive-popup', title: 'swal-archive-title' },
                didOpen: function () {
                    var p = document.querySelector('.swal-archive-popup');
                    if (p) { p.style.borderRadius = '12px'; p.style.padding = '28px 28px 24px'; }
                    var t = document.querySelector('.swal-archive-title');
                    if (t) { t.style.fontSize = '1.15rem'; t.style.color = '#2c3e50'; }
                },
                preConfirm: function () {
                    return document.getElementById('swalArchiveReason').value.trim();
                }
            }).then(function (result) {
                if (!result.isConfirmed) return;
                fetch('/api/archive/' + id, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ reason: result.value })
                })
                .then(function (r) { return r.json(); })
                .then(function (res) {
                    if (res.success) {
                        Swal.fire({ icon: 'success', title: 'Archived!', text: 'Office has been archived.',
                            timer: 1800, showConfirmButton: false })
                            .then(function () { location.reload(); });
                    } else {
                        Swal.fire('Error', res.message || 'Archive failed.', 'error');
                    }
                })
                .catch(function () { Swal.fire('Error', 'An error occurred.', 'error'); });
            });
        });
    });

    /* Cascading location dropdowns */
    $(document).on('change', '#editRegionId', function () {
        _resetSelect('#editProvinceId', '-- Select Province --',          true);
        _resetSelect('#editCityMunId',  '-- Select City/Municipality --', true);
        _resetSelect('#editBarangayId', '-- Select Barangay --',          true);
        if (!this.value) return;
        _loadOptions('/api/postal/provinces/by-region/' + this.value, '#editProvinceId', '-- Select Province --')
            .catch(function () { Swal.fire('Error', 'Failed to load provinces.', 'error'); });
    });

    $(document).on('change', '#editProvinceId', function () {
        _resetSelect('#editCityMunId',  '-- Select City/Municipality --', true);
        _resetSelect('#editBarangayId', '-- Select Barangay --',          true);
        if (!this.value) return;
        _loadOptions('/api/postal/cities/by-province/' + this.value, '#editCityMunId', '-- Select City/Municipality --')
            .catch(function () { Swal.fire('Error', 'Failed to load cities.', 'error'); });
    });

    $(document).on('change', '#editCityMunId', function () {
        _resetSelect('#editBarangayId', '-- Select Barangay --', true);
        if (!this.value) return;
        _loadOptions('/api/postal/barangays/by-city/' + this.value, '#editBarangayId', '-- Select Barangay (Optional) --')
            .catch(function () { Swal.fire('Error', 'Failed to load barangays.', 'error'); });
    });

}); // end $(function)

/* ═══════════════════════════════════════════════════════════════════════════
   GLOBAL FUNCTIONS
   These MUST be at top level so HTML onclick="" attributes can call them.
   ═══════════════════════════════════════════════════════════════════════ */

/**
 * Open the edit modal.
 * Called by: dashboard.js, table.js, quarters.js, profile.js, etc.
 */
window.openModal = function (d) {
    $.when(_areasCache, _regionsCache).then(
        function (areasResult, regionsResult) {
            _populateSelect('#editAreaId',   areasResult[0],   'id', 'name', '-- Select Area --');
            _populateSelect('#editRegionId', regionsResult[0], 'id', 'name', '-- Select Region --');
            _fillModal(d);
            _applyAreaLock();
            _resetPhotoUI();
            if (typeof window.syncStatusTogglesToModal === 'function') window.syncStatusTogglesToModal();
            $('#editOfficeModal').modal('show');
            if (d.id && typeof editModalLoadPhotos === 'function') editModalLoadPhotos(d.id);
        },
        function () {
            // Reference data load failed — still open modal
            _fillModal(d);
            _applyAreaLock();
            _resetPhotoUI();
            $('#editOfficeModal').modal('show');
            if (d.id && typeof editModalLoadPhotos === 'function') editModalLoadPhotos(d.id);
        }
    );
};

/**
 * Save changes.
 * Called by: onclick="saveOfficeChanges()" in edit-modal.html
 */
function saveOfficeChanges() {
    var id = ($('#editOfficeId').val() || '').trim();
    if (!id) { Swal.fire('Error', 'No office ID.', 'error'); return; }

    var name = ($('#editName').val() || '').trim();
    if (!name) {
        Swal.fire('Validation Error', 'Office Name is required.', 'warning');
        $('#editName').focus();
        return;
    }

    var payload = {
        name:                      name,
        postmaster:                ($('#editPostmaster').val()        || '').trim(),
        classification:             $('#editClassification').val()    || null,
        serviceProvided:            $('#editServiceProvided').val()   || null,
        address:                   ($('#editAddress').val()           || '').trim(),
        zipCode:                   ($('#editZipCode').val()           || '').trim(),
        latitude:                   parseFloat($('#editLatitude').val())  || null,
        longitude:                  parseFloat($('#editLongitude').val()) || null,
        connectionStatus:           $('#editStatus').val() === 'true',
        officeStatus:               $('#editOfficeStatus').val()      || null,
        internetServiceProvider:   ($('#editISP').val()               || '').trim(),
        typeOfConnection:          ($('#editTypeOfConnection').val()  || '').trim(),
        speed:                     ($('#editSpeed').val()             || '').trim(),
        staticIpAddress:           ($('#editStaticIP').val()          || '').trim(),
        noOfEmployees:              parseInt($('#editNoOfEmployees').val()) || 0,
        noOfPostalTellers:          parseInt($('#editNoOfTellers').val())   || 0,
        noOfLetterCarriers:         parseInt($('#editNoOfCarriers').val())  || 0,
        postalOfficeContactPerson: ($('#editContactPerson').val()    || '').trim(),
        postalOfficeContactNumber: ($('#editContactNumber').val()    || '').trim(),
        ispContactPerson:          ($('#editISPContactPerson').val() || '').trim(),
        ispContactNumber:          ($('#editISPContactNumber').val() || '').trim(),
        remarks:                   ($('#editRemarks').val()          || '').trim() || null,
        // Read area from HIDDEN input — disabled <select> returns '' in some browsers
        areaId:     parseInt($('#editAreaIdHidden').val()) || null,
        regionId:   parseInt($('#editRegionId').val())     || null,
        provinceId: parseInt($('#editProvinceId').val())   || null,
        cityMunId:  parseInt($('#editCityMunId').val())    || null,
        barangayId: parseInt($('#editBarangayId').val())   || null
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
                    icon: 'success', title: 'Saved!',
                    text: 'Changes have been saved successfully.',
                    timer: 1800, showConfirmButton: false
                }).then(function () { location.reload(); });
            } else {
                Swal.fire('Error', res.message || 'Save failed.', 'error');
            }
        },
        error: function (xhr) {
            Swal.fire('Error', (xhr.responseJSON || {}).message || ('Server error (HTTP ' + xhr.status + ')'), 'error');
        },
        complete: function () {
            $btn.prop('disabled', false).html('<i class="fas fa-save mr-1"></i>Save Changes');
        }
    });
}

/* ═══════════════════════════════════════════════════════════════════════════
   PRIVATE HELPERS  (prefixed _ — not intended for external use)
   ═══════════════════════════════════════════════════════════════════════ */

function _fillModal(d) {
    $('#editOfficeId').val(d.id || '');

    _setField('#editName',       d.name);
    _setField('#editPostmaster', d.postmaster);
    $('#editClassification').val(d.classification  || '');
    $('#editServiceProvided').val(d.serviceProvided || '');

    _setField('#editAddress',   d.address);
    _setField('#editZipCode',   d.zipCode);
    _setField('#editLatitude',  d.latitude  != null ? d.latitude  : null);
    _setField('#editLongitude', d.longitude != null ? d.longitude : null);

    $('#editStatus').val(
        (d.connectionStatus === true || d.connectionStatus === 'true') ? 'true' : 'false'
    );
    $('#editOfficeStatus').val(d.officeStatus || '');
    $('#editISP').val(d.internetServiceProvider || '');
    $('#editTypeOfConnection').val(d.typeOfConnection || '');
    _setField('#editSpeed',    d.speed);
    _setField('#editStaticIP', d.staticIpAddress);

    $('#editNoOfEmployees').val(d.noOfEmployees     != null ? d.noOfEmployees     : '').attr('placeholder', d.noOfEmployees     != null ? '' : 'N/A');
    $('#editNoOfTellers').val(d.noOfPostalTellers   != null ? d.noOfPostalTellers  : '').attr('placeholder', d.noOfPostalTellers  != null ? '' : 'N/A');
    $('#editNoOfCarriers').val(d.noOfLetterCarriers != null ? d.noOfLetterCarriers : '').attr('placeholder', d.noOfLetterCarriers != null ? '' : 'N/A');

    _setField('#editContactPerson',    d.postalOfficeContactPerson);
    _setField('#editContactNumber',    d.postalOfficeContactNumber);
    _setField('#editISPContactPerson', d.ispContactPerson);
    _setField('#editISPContactNumber', d.ispContactNumber);
    _setField('#editRemarks',          d.remarks);

    $('#editAreaId').val(d.areaId || '');
    $('#editAreaIdHidden').val(d.areaId || '');

    _fillLocationHierarchy(d);
}

function _fillLocationHierarchy(d) {
    var regionId   = d.regionId   || null;
    var provinceId = d.provinceId || null;
    var cityMunId  = d.cityMunId  || null;
    var barangayId = d.barangayId || null;

    _resetSelect('#editProvinceId', '-- Select Province --',          true);
    _resetSelect('#editCityMunId',  '-- Select City/Municipality --', true);
    _resetSelect('#editBarangayId', '-- Select Barangay --',          true);

    $('#editRegionId').val(regionId || '');
    if (!regionId) return;

    _loadOptions('/api/postal/provinces/by-region/' + regionId, '#editProvinceId', '-- Select Province --')
        .then(function () {
            $('#editProvinceId').val(provinceId || '');
            if (!provinceId) return;
            return _loadOptions('/api/postal/cities/by-province/' + provinceId, '#editCityMunId', '-- Select City/Municipality --')
                .then(function () {
                    $('#editCityMunId').val(cityMunId || '');
                    if (!cityMunId) return;
                    return _loadOptions('/api/postal/barangays/by-city/' + cityMunId, '#editBarangayId', '-- Select Barangay --')
                        .then(function () { $('#editBarangayId').val(barangayId || ''); });
                });
        })
        .catch(function (err) { console.error('[edit-modal] Location hierarchy error:', err); });
}

function _applyAreaLock() {
    var roleId     = window.CURRENT_USER_ROLE_ID;
    var userAreaId = window.CURRENT_USER_AREA_ID;

    if (roleId !== 1 && userAreaId != null) {
        $('#editAreaId').val(userAreaId).prop('disabled', true);
        $('#editAreaIdHidden').val(userAreaId);
    } else {
        $('#editAreaId').prop('disabled', false);
        $('#editAreaIdHidden').val($('#editAreaId').val());
    }
}

function _resetPhotoUI() {
    var slots = [
        { box: 'editProfileBox', ph: 'editProfilePlaceholder', pv: 'editProfilePreview' },
        { box: 'editCover1Box',  ph: 'editCover1Placeholder',  pv: 'editCover1Preview'  },
        { box: 'editCover2Box',  ph: 'editCover2Placeholder',  pv: 'editCover2Preview'  },
        { box: 'editCover3Box',  ph: 'editCover3Placeholder',  pv: 'editCover3Preview'  }
    ];
    slots.forEach(function (s) {
        var bx = document.getElementById(s.box);
        var ph = document.getElementById(s.ph);
        var pv = document.getElementById(s.pv);
        if (bx) bx.classList.remove('loaded');
        if (ph) ph.style.display = '';
        if (pv) { pv.src = ''; pv.style.display = 'none'; }
        if (bx) { var db = bx.querySelector('.edit-photo-delete-btn'); if (db) db.style.display = 'none'; }
    });
}

function _setField(selector, value) {
    var $el = $(selector);
    if (value !== null && value !== undefined && String(value).trim() !== '') {
        $el.val(value).attr('placeholder', '');
    } else {
        $el.val('').attr('placeholder', 'N/A');
    }
}

function _loadOptions(url, selector, placeholder) {
    var $sel = $(selector);
    $sel.html('<option value="">Loading…</option>').prop('disabled', true);
    return $.getJSON(url).then(function (list) {
        $sel.html('<option value="">' + placeholder + '</option>');
        $.each(list, function (_, item) {
            $sel.append($('<option>').val(item.id).text(item.name));
        });
        $sel.prop('disabled', false);
    });
}

function _populateSelect(selector, list, idKey, labelKey, placeholder) {
    var $sel = $(selector);
    $sel.html('<option value="">' + placeholder + '</option>');
    $.each(list || [], function (_, item) {
        $sel.append($('<option>').val(item[idKey]).text(item[labelKey]));
    });
    $sel.prop('disabled', false);
}

function _resetSelect(selector, placeholder, disabled) {
    $(selector).html('<option value="">' + placeholder + '</option>').prop('disabled', !!disabled);
}
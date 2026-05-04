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
var _editOriginal = null;

/* ─── jQuery ready: preload data + event bindings ───────────────────────── */
$(function () {

    // Preload areas so modal opens fast
    if (!_areasCache)   _areasCache   = $.getJSON('/api/postal/areas');

    /* Keep hidden input in sync with Area select */
    $(document).on('change', '#editAreaId', function () {
        $('#editAreaIdHidden').val(this.value);
    });

    /* Cascading location dropdowns (Area → Province → City → Barangay) */
    $(document).on('change', '#editAreaId', function () {
        _resetSelect('#editProvinceId', '-- Select Province --',          true);
        _resetSelect('#editCityMunId',  '-- Select City/Municipality --', true);
        _resetSelect('#editBarangayId', '-- Select Barangay --',          true);

        if (!this.value) return;
        _loadOptions('/api/postal/provinces/by-area/' + this.value, '#editProvinceId', '-- Select Province --')
            .catch(function () { Swal.fire('Error', 'Failed to load provinces.', 'error'); });
    });

    /* Profile page — Edit Profile button */
    $(document).on('click', '#profileEditBtn', function () {
        var d = window.OFFICE_DATA;
        if (!d || !d.id) { Swal.fire('Error', 'Office data not available.', 'error'); return; }
        var $btn = $(this);
        var oldHtml = $btn.html();
        $btn.prop('disabled', true).html('<i class="fas fa-spinner fa-spin mr-1"></i>Loading...');

        $.getJSON('/api/postal-office/' + d.id)
            .done(function (data) { window.openModal(data); })
            .fail(function (xhr) {
                Swal.fire(
                    'Error',
                    (xhr && xhr.responseJSON && xhr.responseJSON.message)
                        ? xhr.responseJSON.message
                        : 'Failed to load latest office data for editing.',
                    'error'
                );
            })
            .always(function () {
                $btn.prop('disabled', false).html(oldHtml);
            });
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
    $.when(_areasCache).then(
        function (areasData) {
            // With a single $.when(deferred), jQuery passes the resolved JSON as the first arg
            // (not as [data, status, jqXHR] like in the multi-deferred case).
            _populateSelect('#editAreaId', areasData, 'id', 'name', '-- Select Area --');
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

    if ($('#editName').length && !($('#editName').val() || '').trim()) {
        Swal.fire('Validation Error', 'Office Name is required.', 'warning');
        $('#editName').focus();
        return;
    }

    var candidate = {};
    _setIfExists(candidate, 'name', '#editName', function () { return _trimOrNull('#editName'); });
    _setIfExists(candidate, 'postmaster', '#editPostmaster', function () { return _trimOrNull('#editPostmaster'); });
    _setIfExists(candidate, 'classification', '#editClassification', function () { return _trimOrNull('#editClassification'); });
    _setIfExists(candidate, 'serviceProvided', '#editServiceProvided', function () { return _trimOrNull('#editServiceProvided'); });
    _setIfExists(candidate, 'address', '#editAddress', function () { return _trimOrNull('#editAddress'); });
    _setIfExists(candidate, 'zipCode', '#editZipCode', function () { return _trimOrNull('#editZipCode'); });
    _setIfExists(candidate, 'latitude', '#editLatitude', function () { return _numOrNull('#editLatitude'); });
    _setIfExists(candidate, 'longitude', '#editLongitude', function () { return _numOrNull('#editLongitude'); });
    _setIfExists(candidate, 'connectionStatus', '#editStatus', function () { return $('#editStatus').val() === 'true'; });
    _setIfExists(candidate, 'officeStatus', '#editOfficeStatus', function () { return _trimOrNull('#editOfficeStatus'); });
    _setIfExists(candidate, 'internetServiceProvider', '#editISP', function () { return _trimOrNull('#editISP'); });
    _setIfExists(candidate, 'typeOfConnection', '#editTypeOfConnection', function () { return _trimOrNull('#editTypeOfConnection'); });
    _setIfExists(candidate, 'speed', '#editSpeed', function () { return _trimOrNull('#editSpeed'); });
    _setIfExists(candidate, 'staticIpAddress', '#editIPAddressType', function () {
        var t = $('#editIPAddressType').val();
        return t === 'static' ? 'Static' : (t === 'dynamic' ? 'Dynamic' : null);
    });
    _setIfExists(candidate, 'noOfEmployees', '#editNoOfEmployees', function () { return _intOrNull('#editNoOfEmployees'); });
    _setIfExists(candidate, 'noOfPostalTellers', '#editNoOfTellers', function () { return _intOrNull('#editNoOfTellers'); });
    _setIfExists(candidate, 'noOfLetterCarriers', '#editNoOfCarriers', function () { return _intOrNull('#editNoOfCarriers'); });
    _setIfExists(candidate, 'postalOfficeContactPerson', '#editContactPerson', function () { return _trimOrNull('#editContactPerson'); });
    _setIfExists(candidate, 'postalOfficeContactNumber', '#editContactNumber', function () { return _trimOrNull('#editContactNumber'); });
    _setIfExists(candidate, 'ispContactPerson', '#editISPContactPerson', function () { return _trimOrNull('#editISPContactPerson'); });
    _setIfExists(candidate, 'ispContactNumber', '#editISPContactNumber', function () { return _trimOrNull('#editISPContactNumber'); });
    _setIfExists(candidate, 'remarks', '#editRemarks', function () { return _trimOrNull('#editRemarks'); });
    _setIfExists(candidate, 'areaId', '#editAreaIdHidden', function () { return _intOrNull('#editAreaIdHidden'); });
    _setIfExists(candidate, 'provinceId', '#editProvinceId', function () { return _intOrNull('#editProvinceId'); });
    _setIfExists(candidate, 'cityMunId', '#editCityMunId', function () { return _intOrNull('#editCityMunId'); });
    _setIfExists(candidate, 'barangayId', '#editBarangayId', function () { return _intOrNull('#editBarangayId'); });

    var payload = {};
    Object.keys(candidate).forEach(function (k) {
        if (!_isEqual(candidate[k], _editOriginal ? _editOriginal[k] : undefined)) {
            payload[k] = candidate[k];
        }
    });

    if (Object.keys(payload).length === 0) {
        Swal.fire('No Changes', 'No field changes detected.', 'info');
        return;
    }

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
                    title: res.requiresApproval ? 'Submitted!' : 'Saved!',
                    text: res.message || (res.requiresApproval
                        ? 'Your changes were submitted for approval.'
                        : 'Changes have been saved successfully.'),
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
    _editOriginal = _snapshotOriginal(d || {});
    $('#editOfficeId').val(d.id || '');

    _setField('#editName',       d.name);
    _setField('#editOfficeCode', d.officeCode);
    _setField('#editPostmaster', d.postmaster);
    $('#editActingPostmaster').val(d.actingPostmaster || '');
    _setField('#editOfficeEmail', d.officeEmail);
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
    $('#editIsActive').val(d.isActive || '');
    $('#editIsConnected').val(d.isConnected || '');
    _setField('#editDateOpen', d.dateOpen);
    _setField('#editDateClosed', d.dateClosed);
    $('#editFrequencyOfDelivery').val(d.frequencyOfDelivery || '');
    
    $('#editISP').val(d.internetServiceProvider || '');
    
    // Handle typeOfConnection - add to dropdown if not exists
    var typeOfConn = d.typeOfConnection || '';
    if (typeOfConn && $('#editTypeOfConnection option[value="' + typeOfConn + '"]').length === 0) {
        $('#editTypeOfConnection').append('<option value="' + typeOfConn + '">' + typeOfConn + '</option>');
    }
    $('#editTypeOfConnection').val(typeOfConn);
    
    _setField('#editSpeed',    d.speed);
    $('#editIPAddressType').val(d.staticIpAddress === 'Static' ? 'static' : '');

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
    var areaId     = d.areaId     || null;
    var provinceId = d.provinceId || null;
    var cityMunId  = d.cityMunId  || null;
    var barangayId = d.barangayId || null;

    _resetSelect('#editProvinceId', '-- Select Province --',          true);
    _resetSelect('#editCityMunId',  '-- Select City/Municipality --', true);
    _resetSelect('#editBarangayId', '-- Select Barangay --',          true);

    if (!areaId) return;

    _loadOptions('/api/postal/provinces/by-area/' + areaId, '#editProvinceId', '-- Select Province --')
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
    // Locking/disabled behavior removed by request.
    // Keep hidden field synced for payload consistency.
    $('#editAreaId').prop('disabled', false);
    $('#editAreaIdHidden').val($('#editAreaId').val());
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

function _snapshotOriginal(d) {
    return {
        name: _norm(d.name),
        postmaster: _norm(d.postmaster),
        classification: _norm(d.classification),
        serviceProvided: _norm(d.serviceProvided),
        address: _norm(d.address),
        zipCode: _norm(d.zipCode),
        latitude: _normNum(d.latitude),
        longitude: _normNum(d.longitude),
        connectionStatus: d.connectionStatus === true || d.connectionStatus === 'true',
        officeStatus: _norm(d.officeStatus),
        internetServiceProvider: _norm(d.internetServiceProvider),
        typeOfConnection: _norm(d.typeOfConnection),
        speed: _norm(d.speed),
        staticIpAddress: _norm(d.staticIpAddress),
        noOfEmployees: _normInt(d.noOfEmployees),
        noOfPostalTellers: _normInt(d.noOfPostalTellers),
        noOfLetterCarriers: _normInt(d.noOfLetterCarriers),
        postalOfficeContactPerson: _norm(d.postalOfficeContactPerson),
        postalOfficeContactNumber: _norm(d.postalOfficeContactNumber),
        ispContactPerson: _norm(d.ispContactPerson),
        ispContactNumber: _norm(d.ispContactNumber),
        remarks: _norm(d.remarks),
        areaId: _normInt(d.areaId),
        provinceId: _normInt(d.provinceId),
        cityMunId: _normInt(d.cityMunId),
        barangayId: _normInt(d.barangayId)
    };
}

function _setIfExists(obj, key, selector, getter) {
    if (!$(selector).length) return;
    obj[key] = getter();
}
function _trimOrNull(selector) {
    var v = $(selector).val();
    if (v === null || v === undefined) return null;
    v = String(v).trim();
    return v === '' ? null : v;
}
function _intOrNull(selector) {
    var v = $(selector).val();
    if (v === null || v === undefined || String(v).trim() === '') return null;
    var n = parseInt(v, 10);
    return isNaN(n) ? null : n;
}
function _numOrNull(selector) {
    var v = $(selector).val();
    if (v === null || v === undefined || String(v).trim() === '') return null;
    var n = parseFloat(v);
    return isNaN(n) ? null : n;
}
function _norm(v) {
    if (v === null || v === undefined) return null;
    var s = String(v).trim();
    return s === '' ? null : s;
}
function _normInt(v) {
    if (v === null || v === undefined || String(v).trim() === '') return null;
    var n = parseInt(v, 10);
    return isNaN(n) ? null : n;
}
function _normNum(v) {
    if (v === null || v === undefined || String(v).trim() === '') return null;
    var n = parseFloat(v);
    return isNaN(n) ? null : n;
}
function _isEqual(a, b) {
    return String(a) === String(b);
}
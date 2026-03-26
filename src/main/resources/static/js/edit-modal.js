/**
 * edit-modal.js
 * Works on both Profile page and Table page.
 *
 * Profile page : #profileEditBtn → uses window.OFFICE_DATA (Thymeleaf-injected)
 * Table page   : .btn-edit       → uses data-office-id, fetches /api/postal-office/{id}
 * Save         : PUT /api/postal-office/{id}
 *
 * Area auto-lock:
 *   - System Admin (role 1)  → Area dropdown is free to change
 *   - Area Admin   (role 2)  → Area is auto-set to their assigned area and LOCKED (disabled)
 *   - User         (role 3)  → Area is auto-set to their assigned area and LOCKED (disabled)
 *
 * FIX: Disabled <select> elements return empty string in some browsers.
 *      We mirror the Area value into a hidden input (#editAreaIdHidden) so
 *      saveOfficeChanges() always reads the correct value regardless of
 *      whether the dropdown is disabled or not.
 *
 * window.CURRENT_USER_ROLE_ID and window.CURRENT_USER_AREA_ID are injected by
 * the <script th:inline="javascript"> block in edit-modal.html via GlobalModelAdvice.
 */

$(function () {

    /* ─── Preload areas + regions once, cache the jQuery Deferred ─────────── */
    var _areasCache   = null;
    var _regionsCache = null;

    function preloadReferenceData() {
        if (!_areasCache)   _areasCache   = $.getJSON('/api/postal/areas');
        if (!_regionsCache) _regionsCache = $.getJSON('/api/postal/regions');
    }

    preloadReferenceData();

    /* ─── Keep hidden input in sync whenever the Area select changes ───────── */
    $(document).on('change', '#editAreaId', function () {
        $('#editAreaIdHidden').val(this.value);
    });

    /* ─── PROFILE PAGE: Edit Profile button ────────────────────────────────── */
    $(document).on('click', '#profileEditBtn', function () {
        var d = window.OFFICE_DATA;
        if (!d || !d.id) { Swal.fire('Error', 'Office data not available.', 'error'); return; }
        // Fetch full data from API (includes IDs for dropdowns)
        $.getJSON('/api/postal-office/' + d.id)
            .done(function (data) { openModal(data); })
            .fail(function () {
                // Fallback to window.OFFICE_DATA if API fails
                openModal(d);
            });
    });

    /* ─── TABLE PAGE: per-row edit buttons ─────────────────────────────────── */
    $(document).on('click', '.btn-edit', function () {
        var id = $(this).data('office-id');
        if (!id) return;
        $.getJSON('/api/postal-office/' + id)
            .done(function (d) { openModal(d); })
            .fail(function (xhr) {
                Swal.fire('Error', (xhr.responseJSON || {}).message || 'Failed to load office.', 'error');
            });
    });

    /* ─── Open modal ────────────────────────────────────────────────────────── */
    function openModal(d) {
        $.when(_areasCache, _regionsCache).then(
            function (areasResult, regionsResult) {
                populateSelect('#editAreaId',   areasResult[0],   'id', 'name', '-- Select Area --');
                populateSelect('#editRegionId', regionsResult[0], 'id', 'name', '-- Select Region --');
                fillModal(d);
                applyAreaLock(d);
                resetEditPhotoUI();
                $('#editOfficeModal').modal('show');
                if (d.id && typeof editModalLoadPhotos === 'function') editModalLoadPhotos(d.id);
            },
            function () {
                fillModal(d);
                applyAreaLock(d);
                resetEditPhotoUI();
                $('#editOfficeModal').modal('show');
                if (d.id && typeof editModalLoadPhotos === 'function') editModalLoadPhotos(d.id);
            }
        );
    }

    /* ─── Reset photo UI when modal opens fresh ────────────────── */
    function resetEditPhotoUI() {
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

    /* ─── Lock Area for non-admin users ─────────────────────────────────────── */
    /**
     * System Admin (role 1): free to change Area.
     * Everyone else (role 2 / 3): Area is forced to their own areaId and locked.
     *
     * After setting the visible <select> we always mirror the final value into
     * #editAreaIdHidden so saveOfficeChanges() can read it safely.
     */
    function applyAreaLock(d) {
        var roleId     = window.CURRENT_USER_ROLE_ID;
        var userAreaId = window.CURRENT_USER_AREA_ID;

        if (roleId !== 1 && userAreaId != null) {
            // Non-admin: override with the user's own area and lock the dropdown
            $('#editAreaId').val(userAreaId).prop('disabled', true);
            $('#editAreaIdHidden').val(userAreaId);
        } else {
            // System Admin: use the office's saved area, dropdown stays editable
            $('#editAreaId').prop('disabled', false);
            $('#editAreaIdHidden').val($('#editAreaId').val());
        }
    }

    /* ─── Fill every field in the modal ─────────────────────────────────────── */
    function fillModal(d) {
        $('#editOfficeId').val(d.id || '');

        // Basic
        $('#editName').val(d.name || '');
        $('#editPostmaster').val(d.postmaster || '');
        $('#editClassification').val(d.classification || '');
        $('#editServiceProvided').val(d.serviceProvided || '');

        // Address / coordinates
        $('#editAddress').val(d.address || '');
        $('#editZipCode').val(d.zipCode || '');
        $('#editLatitude').val(d.latitude   != null ? d.latitude   : '');
        $('#editLongitude').val(d.longitude != null ? d.longitude  : '');

        // Connectivity
        $('#editStatus').val(
            (d.connectionStatus === true || d.connectionStatus === 'true') ? 'true' : 'false'
        );
        $('#editOfficeStatus').val(d.officeStatus || '');
        $('#editISP').val(d.internetServiceProvider || '');
        $('#editTypeOfConnection').val(d.typeOfConnection || '');
        $('#editSpeed').val(d.speed || '');
        $('#editStaticIP').val(d.staticIpAddress || '');

        // Staff
        $('#editNoOfEmployees').val(d.noOfEmployees     != null ? d.noOfEmployees     : 0);
        $('#editNoOfTellers').val(d.noOfPostalTellers   != null ? d.noOfPostalTellers  : 0);
        $('#editNoOfCarriers').val(d.noOfLetterCarriers != null ? d.noOfLetterCarriers : 0);

        // Contacts
        $('#editContactPerson').val(d.postalOfficeContactPerson || '');
        $('#editContactNumber').val(d.postalOfficeContactNumber || '');
        $('#editISPContactPerson').val(d.ispContactPerson || '');
        $('#editISPContactNumber').val(d.ispContactNumber || '');
        $('#editRemarks').val(d.remarks || '');

        // Area — set visible select + mirror to hidden input.
        // applyAreaLock() will override for non-admin users right after this.
        $('#editAreaId').val(d.areaId || '');
        $('#editAreaIdHidden').val(d.areaId || '');

        // Cascade Region → Province → City → Barangay
        fillLocationHierarchy(d);
    }

    /* ─── Cascade location hierarchy ────────────────────────────────────────── */
    function fillLocationHierarchy(d) {
        var regionId   = d.regionId   || null;
        var provinceId = d.provinceId || null;
        var cityMunId  = d.cityMunId  || null;
        var barangayId = d.barangayId || null;

        // Reset all dependent dropdowns first
        resetSelect('#editProvinceId', '-- Select Province --',          true);
        resetSelect('#editCityMunId',  '-- Select City/Municipality --',  true);
        resetSelect('#editBarangayId', '-- Select Barangay --',           true);

        // Set region value first
        $('#editRegionId').val(regionId || '');
        
        if (!regionId) {
            console.log('[edit-modal] No regionId provided, skipping province/city/barangay loading');
            return;
        }

        console.log('[edit-modal] Loading provinces for region:', regionId);
        
        // Load provinces and then set province value
        loadOptions('/api/postal/provinces/by-region/' + regionId, '#editProvinceId', '-- Select Province --')
            .then(function () {
                $('#editProvinceId').val(provinceId || '');
                console.log('[edit-modal] Province set to:', provinceId);
                
                if (!provinceId) {
                    console.log('[edit-modal] No provinceId provided, skipping city/barangay loading');
                    return;
                }

                // Load cities and then set city value
                return loadOptions('/api/postal/cities/by-province/' + provinceId, '#editCityMunId', '-- Select City/Municipality --')
                    .then(function () {
                        $('#editCityMunId').val(cityMunId || '');
                        console.log('[edit-modal] City set to:', cityMunId);
                        
                        if (!cityMunId) {
                            console.log('[edit-modal] No cityMunId provided, skipping barangay loading');
                            return;
                        }

                        // Load barangays and then set barangay value
                        return loadOptions('/api/postal/barangays/by-city/' + cityMunId, '#editBarangayId', '-- Select Barangay --')
                            .then(function () {
                                $('#editBarangayId').val(barangayId || '');
                                console.log('[edit-modal] Barangay set to:', barangayId);
                            });
                    });
            })
            .catch(function (err) { 
                console.error('[edit-modal] Location hierarchy error:', err);
                Swal.fire('Warning', 'Failed to load location data. Please check your internet connection.', 'warning');
            });
    }

    /* ─── Cascading change handlers ──────────────────────────────────────────── */
    $(document).on('change', '#editRegionId', function () {
        resetSelect('#editProvinceId', '-- Select Province --',          true);
        resetSelect('#editCityMunId',  '-- Select City/Municipality --',  true);
        resetSelect('#editBarangayId', '-- Select Barangay --',           true);
        if (!this.value) return;
        loadOptions('/api/postal/provinces/by-region/' + this.value, '#editProvinceId', '-- Select Province --')
            .catch(function () { Swal.fire('Error', 'Failed to load provinces.', 'error'); });
    });

    $(document).on('change', '#editProvinceId', function () {
        resetSelect('#editCityMunId',  '-- Select City/Municipality --',  true);
        resetSelect('#editBarangayId', '-- Select Barangay --',           true);
        if (!this.value) return;
        loadOptions('/api/postal/cities/by-province/' + this.value, '#editCityMunId', '-- Select City/Municipality --')
            .catch(function () { Swal.fire('Error', 'Failed to load cities.', 'error'); });
    });

    $(document).on('change', '#editCityMunId', function () {
        resetSelect('#editBarangayId', '-- Select Barangay --', true);
        if (!this.value) return;
        loadOptions('/api/postal/barangays/by-city/' + this.value, '#editBarangayId', '-- Select Barangay (Optional) --')
            .catch(function () { Swal.fire('Error', 'Failed to load barangays.', 'error'); });
    });

    /* ─── Generic helpers ────────────────────────────────────────────────────── */
    function loadOptions(url, selector, placeholder) {
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

    function populateSelect(selector, list, idKey, labelKey, placeholder) {
        var $sel = $(selector);
        $sel.html('<option value="">' + placeholder + '</option>');
        $.each(list || [], function (_, item) {
            $sel.append($('<option>').val(item[idKey]).text(item[labelKey]));
        });
        $sel.prop('disabled', false);
    }

    function resetSelect(selector, placeholder, disabled) {
        $(selector).html('<option value="">' + placeholder + '</option>').prop('disabled', disabled);
    }

});

/* ─── Save ───────────────────────────────────────────────────────────────────── */
function saveOfficeChanges() {
    var id = $('#editOfficeId').val();
    if (!id) { Swal.fire('Error', 'No office ID.', 'error'); return; }

    var name = $('#editName').val().trim();
    if (!name) {
        Swal.fire('Validation Error', 'Office Name is required.', 'warning');
        $('#editName').focus();
        return;
    }

    /*
     * Read areaId from the HIDDEN input, not the visible <select>.
     * When the select is disabled (non-admin users), some browsers return ''
     * from .val() — the hidden input always holds the correct value.
     */
    var payload = {
        name:                      name,
        postmaster:                ($('#editPostmaster').val() || '').trim(),
        classification:            $('#editClassification').val(),
        serviceProvided:           $('#editServiceProvided').val(),
        address:                   ($('#editAddress').val() || '').trim(),
        zipCode:                   ($('#editZipCode').val() || '').trim(),
        latitude:                  parseFloat($('#editLatitude').val())  || null,
        longitude:                 parseFloat($('#editLongitude').val()) || null,
        connectionStatus:          $('#editStatus').val() === 'true',
        officeStatus:              $('#editOfficeStatus').val() || null,
        internetServiceProvider:   ($('#editISP').val() || '').trim(),
        typeOfConnection:          ($('#editTypeOfConnection').val() || '').trim(),
        speed:                     ($('#editSpeed').val() || '').trim(),
        staticIpAddress:           ($('#editStaticIP').val() || '').trim(),
        noOfEmployees:             parseInt($('#editNoOfEmployees').val()) || 0,
        noOfPostalTellers:         parseInt($('#editNoOfTellers').val())   || 0,
        noOfLetterCarriers:        parseInt($('#editNoOfCarriers').val())  || 0,
        postalOfficeContactPerson: ($('#editContactPerson').val() || '').trim(),
        postalOfficeContactNumber: ($('#editContactNumber').val() || '').trim(),
        ispContactPerson:          ($('#editISPContactPerson').val() || '').trim(),
        ispContactNumber:          ($('#editISPContactNumber').val() || '').trim(),
        remarks:                   ($('#editRemarks').val() || '').trim() || null,
        areaId:                    parseInt($('#editAreaIdHidden').val())  || null,  // ← hidden input
        regionId:                  parseInt($('#editRegionId').val())      || null,
        provinceId:                parseInt($('#editProvinceId').val())    || null,
        cityMunId:                 parseInt($('#editCityMunId').val())     || null,
        barangayId:                parseInt($('#editBarangayId').val())    || null
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

/* ─── Archive from Edit Modal ─────────────────────────────────────────────── */
$(function () {

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
                cancelButtonColor: '#6c757d',
                confirmButtonText: '<i class="fas fa-archive" style="margin-right:6px"></i> Archive',
                cancelButtonText: '<i class="fas fa-times" style="margin-right:6px"></i> Cancel',
                reverseButtons: true,
                customClass: { popup: 'swal-archive-popup', title: 'swal-archive-title' },
                didOpen: function () {
                    document.querySelector('.swal-archive-popup').style.borderRadius = '12px';
                    document.querySelector('.swal-archive-popup').style.padding = '28px 28px 24px';
                    var t = document.querySelector('.swal-archive-title');
                    if (t) { t.style.fontSize = '1.15rem'; t.style.color = '#2c3e50'; }
                },
                preConfirm: function () {
                    return document.getElementById('swalArchiveReason').value.trim();
                }
            }).then(function (result) {
                if (!result.isConfirmed) return;
                fetch('/api/archive/' + id, {
                    method: 'POST', headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ reason: result.value })
                })
                .then(function (r) { return r.json(); })
                .then(function (res) {
                    if (res.success) {
                        Swal.fire({ icon: 'success', title: 'Archived!', text: 'Office has been archived.',
                            timer: 1800, showConfirmButton: false })
                            .then(function () { location.reload(); });
                    } else { Swal.fire('Error', res.message || 'Archive failed.', 'error'); }
                })
                .catch(function () { Swal.fire('Error', 'An error occurred.', 'error'); });
            });
        });
    });

    $(document).on('click', '#editArchiveConfirmBtn', function () {
        var id     = $('#editOfficeId').val();
        var reason = $('#editArchiveReason').val().trim();
        if (!id) { Swal.fire('Error', 'No office selected.', 'error'); return; }

        var $btn = $('#editArchiveConfirmBtn');
        $btn.prop('disabled', true).html('<i class="fas fa-spinner fa-spin mr-1"></i>Archiving…');

        fetch('/api/archive/' + id, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ reason: reason })
        })
        .then(function (r) { return r.json(); })
        .then(function (res) {
            $('#editArchiveModal').modal('hide');
            if (res.success) {
                Swal.fire({ icon: 'success', title: 'Archived!', text: 'Office has been archived.',
                    timer: 1800, showConfirmButton: false })
                    .then(function () { location.reload(); });
            } else { Swal.fire('Error', res.message || 'Archive failed.', 'error'); }
        })
        .catch(function () { Swal.fire('Error', 'An error occurred.', 'error'); })
        .finally(function () {
            $btn.prop('disabled', false).html('<i class="fas fa-archive mr-1"></i>Confirm Archive');
        });
    });

});
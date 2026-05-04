/**
 * profile.js
 * Loaded by main-layout.html AFTER jQuery — activePage == 'profile’
 *
 * Edit: handled by edit-modal.js (#profileEditBtn → API + openModal).
 */

function profilePostArchiveRedirect() {
    var src = window.PROFILE_PAGE_SOURCE || 'table';
    if (src === 'quarters') {
        var u = sessionStorage.getItem('quartersReturnUrl');
        sessionStorage.removeItem('quartersReturnUrl');
        window.location.href = u || '/quarters';
        return;
    }
    if (src === 'dashboard') {
        var d = sessionStorage.getItem('dashboardReturnUrl');
        sessionStorage.removeItem('dashboardReturnUrl');
        window.location.href = d || '/dashboard';
        return;
    }
    window.location.href = '/table';
}

$(document).ready(function () {

    // ── Photo Upload Triggers ─────────────────────────────────
    // Profile photo upload (unchanged)
    $('#profileUploadOverlay').on('click', function () {
        $('#profilePhotoInput').trigger('click');
    });

    $('#profilePhotoInput').on('change', function () {
        uploadPhoto(this, 'profile');
    });

    // Cover photo uploads (carousel - multiple slots)
    $('.cover-upload-overlay').on('click', function () {
        var slot = $(this).data('slot');
        $('#coverPhotoInput' + slot).trigger('click');
    });

    // Individual cover photo input handlers
    for (let i = 1; i <= 3; i++) {
        $('#coverPhotoInput' + i).on('change', function () {
            var slot = $(this).data('slot');
            uploadCarouselPhoto(this, slot);
        });
    }

    var o = window.OFFICE_DATA;
    if (!o) {
        console.warn('profile.js: window.OFFICE_DATA not found');
    }

    // ── Archive ───────────────────────────────────────────────
    $('#profileArchiveBtn').on('click', function () {
        if (!window.OFFICE_DATA || !window.OFFICE_DATA.id) return;
        o = window.OFFICE_DATA;
        var name = o.name || 'this office';

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
                popup:          'swal-archive-popup',
                title:          'swal-archive-title',
                confirmButton:  'swal-archive-confirm',
                cancelButton:   'swal-archive-cancel'
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

            fetch('/api/archive/' + o.id, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ reason: result.value })
            })
            .then(function (r) { return r.json(); })
            .then(function (res) {
                if (res.success) {
                    Swal.fire({
                        icon: 'success', title: 'Archived!',
                        text: 'Office archived successfully.',
                        timer: 1800, showConfirmButton: false
                    }).then(function () { profilePostArchiveRedirect(); });
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

// ── Photo Upload ──────────────────────────────────────────────
function uploadPhoto(input, type) {
    var id = window.OFFICE_DATA && window.OFFICE_DATA.id;
    if (!id) { Swal.fire('Error', 'Office ID not found.', 'error'); return; }
    if (!input.files || !input.files[0]) return;

    var file = input.files[0];
    if (file.size > 5 * 1024 * 1024) {
        Swal.fire('Error', 'Image must be smaller than 5MB.', 'error');
        input.value = '';
        return;
    }

    var formData = new FormData();
    formData.append('file', file);
    var endpoint = '/api/postal-office/' + id + '/' + (type === 'cover' ? 'cover-photo/1' : 'profile-photo');

    Swal.fire({ title: 'Uploading...', allowOutsideClick: false, didOpen: function () { Swal.showLoading(); } });

    $.ajax({
        url: endpoint,
        type: 'POST',
        data: formData,
        processData: false,
        contentType: false,
        success: function (res) {
            Swal.close();
            if (res.success) {
                var cacheBust = '?t=' + Date.now();
                if (type === 'cover') {
                    $('.cover-photo').css({
                        'background-image': 'url(' + endpoint + cacheBust + ')',
                        'background-size': 'cover',
                        'background-position': 'center'
                    });
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

// ── Carousel Photo Upload (for individual slots) ─────────────
function uploadCarouselPhoto(input, slot) {
    var id = window.OFFICE_DATA && window.OFFICE_DATA.id;
    if (!id) { Swal.fire('Error', 'Office ID not found.', 'error'); return; }
    if (!input.files || !input.files[0]) return;

    var file = input.files[0];
    if (file.size > 5 * 1024 * 1024) {
        Swal.fire('Error', 'Image must be smaller than 5MB.', 'error');
        input.value = '';
        return;
    }

    var formData = new FormData();
    formData.append('file', file);
    var endpoint = '/api/postal-office/' + id + '/cover-photo/' + slot;

    Swal.fire({ title: 'Uploading...', allowOutsideClick: false, didOpen: function () { Swal.showLoading(); } });

    $.ajax({
        url: endpoint,
        type: 'POST',
        data: formData,
        processData: false,
        contentType: false,
        success: function (res) {
            Swal.close();
            if (res.success) {
                var cacheBust = '?t=' + Date.now();
                // Update the specific carousel slide
                $('.carousel-item:nth-child(' + slot + ') .cover-photo').css({
                    'background-image': 'url(' + endpoint + cacheBust + ')',
                    'background-size': 'cover',
                    'background-position': 'center'
                });
                Swal.fire({ icon: 'success', title: 'Cover photo ' + slot + ' updated!', timer: 1500, showConfirmButton: false });
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
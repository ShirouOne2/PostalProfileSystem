/**
 * archive.js
 *
 * Handles all archive / restore interactions:
 *   - Archive button on table.html  (opens reason modal → POST /api/archive/{id})
 *   - Restore button on archive.html (POST /api/restore/{id})
 *   - Bulk restore on archive.html   (POST /api/restore/bulk)
 *   - Select-all checkbox on archive.html
 *
 * Requires: jQuery, SweetAlert2, Bootstrap 4
 */
$(document).ready(function () {
    console.log('Archive.js loaded and ready!');

    // ── Helpers ──────────────────────────────────────────────────────────────

    const Toast = Swal.mixin({
        toast: true,
        position: 'top-end',
        showConfirmButton: false,
        timer: 3000,
        timerProgressBar: true
    });

    function showSuccess(msg) {
        Toast.fire({ icon: 'success', title: msg });
    }

    function showError(msg) {
        Toast.fire({ icon: 'error', title: msg });
    }

    // ── ARCHIVE from table.html ───────────────────────────────────────────────
    // Attach this button in table.html:
    //   <button class="btn btn-sm btn-warning btn-archive"
    //           th:data-office-id="${office.id}"
    //           th:data-office-name="${office.name}"
    //           title="Archive Office">
    //       <i class="fas fa-archive"></i>
    //   </button>

    let pendingArchiveId   = null;
    let pendingArchiveRow  = null;

    $(document).on('click', '.btn-archive', function (e) {
        e.preventDefault();
        e.stopPropagation();
        console.log('Archive button clicked!', this);
        console.log('Office ID:', $(this).data('office-id'));
        console.log('Office Name:', $(this).data('office-name'));
        
        pendingArchiveId  = $(this).data('office-id');
        pendingArchiveRow = $(this).closest('tr');
        const name        = $(this).data('office-name');

        console.log('Setting up modal with name:', name);
        
        // Check if modal element exists
        const $modal = $('#archiveReasonModal');
        console.log('Modal element found:', $modal.length > 0);
        console.log('Bootstrap modal available:', typeof $.fn.modal === 'function');
        
        if ($modal.length === 0) {
            console.error('Archive modal not found in DOM!');
            alert('Error: Archive modal not found. Please refresh the page.');
            return;
        }
        
        $('#archiveOfficeName').text(name);
        $('#archiveReasonInput').val('');
        
        // Try to show modal
        try {
            // Try Bootstrap 4/5 modal syntax
            if (typeof bootstrap !== 'undefined' && bootstrap.Modal) {
                const modal = new bootstrap.Modal($modal[0]);
                modal.show();
                console.log('Bootstrap 5 modal shown successfully');
            } else if (typeof $.fn.modal === 'function') {
                $modal.modal('show');
                console.log('Bootstrap 4 modal shown successfully');
            } else {
                // Fallback: force show using direct DOM manipulation
                $modal.addClass('show').css('display', 'block');
                $('body').addClass('modal-open');
                $('<div class="modal-backdrop fade show"></div>').insertAfter($modal);
                console.log('Fallback modal show method used');
            }
        } catch (error) {
            console.error('Error showing modal:', error);
            alert('Error showing archive modal: ' + error.message);
        }
    });

    // Fallback: Also try to catch clicks on the archive icon
    $(document).on('click', '.btn-archive i', function (e) {
        e.preventDefault();
        e.stopPropagation();
        console.log('Archive icon clicked!', this);
        const $button = $(this).parent('.btn-archive');
        if ($button.length) {
            $button.trigger('click');
        }
    });

    $('#confirmArchiveBtn').on('click', function () {
        if (!pendingArchiveId) return;

        const reason = $('#archiveReasonInput').val().trim();
        const $btn   = $(this);

        $btn.prop('disabled', true).html('<i class="fas fa-spinner fa-spin mr-1"></i> Archiving...');

        $.ajax({
            url: '/api/archive/' + pendingArchiveId,
            method: 'POST',
            contentType: 'application/json',
            data: JSON.stringify({ reason: reason }),
            success: function (res) {
                $('#archiveReasonModal').modal('hide');
                $btn.prop('disabled', false).html('<i class="fas fa-archive mr-1"></i> Archive');

                if (res.success) {
                    // Check if we're on dashboard page - if so, reload the page
                    if (window.location.pathname.includes('/dashboard')) {
                        showSuccess(res.message);
                        setTimeout(() => location.reload(), 1500);
                    } else {
                        // Remove the row from the active table
                        if (pendingArchiveRow) pendingArchiveRow.fadeOut(400, function () { $(this).remove(); });
                        showSuccess(res.message);
                    }
                } else {
                    showError(res.message || 'Archive failed.');
                }
            },
            error: function (xhr) {
                $btn.prop('disabled', false).html('<i class="fas fa-archive mr-1"></i> Archive');
                const msg = xhr.responseJSON?.message || 'An error occurred.';
                showError(msg);
            }
        });
    });

    // ── RESTORE single (archive.html) ─────────────────────────────────────────

    $(document).on('click', '.btn-restore', function () {
        const id   = $(this).data('office-id');
        const name = $(this).data('office-name');
        const $row = $(this).closest('tr');

        Swal.fire({
            icon: 'question',
            title: 'Restore Office?',
            html: `<strong>${name}</strong> will be returned to the active inventory as <em>Inactive</em>. You can re-activate it afterwards.`,
            showCancelButton: true,
            confirmButtonText: 'Restore',
            confirmButtonColor: '#28a745',
            cancelButtonText: 'Cancel'
        }).then(result => {
            if (!result.isConfirmed) return;

            $.ajax({
                url: '/api/restore/' + id,
                method: 'POST',
                success: function (res) {
                    if (res.success) {
                        $row.fadeOut(400, function () { $(this).remove(); updateArchivedCount(-1); });
                        showSuccess(res.message);
                    } else {
                        showError(res.message || 'Restore failed.');
                    }
                },
                error: function (xhr) {
                    showError(xhr.responseJSON?.message || 'An error occurred.');
                }
            });
        });
    });

    // ── SELECT ALL (archive.html) ─────────────────────────────────────────────

    $('#selectAll').on('change', function () {
        $('.row-checkbox').prop('checked', this.checked);
        refreshBulkBar();
    });

    $(document).on('change', '.row-checkbox', function () {
        const total    = $('.row-checkbox').length;
        const checked  = $('.row-checkbox:checked').length;
        $('#selectAll').prop('indeterminate', checked > 0 && checked < total);
        $('#selectAll').prop('checked', checked === total);
        refreshBulkBar();
    });

    function refreshBulkBar() {
        const count = $('.row-checkbox:checked').length;
        if (count > 0) {
            $('#selectedCount').text(count);
            $('#bulkActionBar').show();
        } else {
            $('#bulkActionBar').hide();
        }
    }

    $('#btnClearSelection').on('click', function () {
        $('.row-checkbox, #selectAll').prop('checked', false);
        refreshBulkBar();
    });

    // ── BULK RESTORE (archive.html) ───────────────────────────────────────────

    $('#btnBulkRestore').on('click', function () {
        const ids = $('.row-checkbox:checked').map(function () {
            return parseInt($(this).data('id'));
        }).get();

        if (ids.length === 0) return;

        Swal.fire({
            icon: 'question',
            title: `Restore ${ids.length} office(s)?`,
            text: 'They will be returned to the active inventory as Inactive.',
            showCancelButton: true,
            confirmButtonText: 'Restore All',
            confirmButtonColor: '#28a745'
        }).then(result => {
            if (!result.isConfirmed) return;

            $.ajax({
                url: '/api/restore/bulk',
                method: 'POST',
                contentType: 'application/json',
                data: JSON.stringify({ ids: ids }),
                success: function (res) {
                    if (res.success) {
                        // Remove restored rows from the table
                        $('.row-checkbox:checked').closest('tr').fadeOut(400, function () {
                            $(this).remove();
                            updateArchivedCount(-ids.length);
                        });
                        $('#bulkActionBar').hide();
                        showSuccess(res.message);
                    } else {
                        showError(res.message || 'Bulk restore failed.');
                    }
                },
                error: function (xhr) {
                    showError(xhr.responseJSON?.message || 'An error occurred.');
                }
            });
        });
    });

    // ── Helpers ───────────────────────────────────────────────────────────────

    function updateArchivedCount(delta) {
        // Update the stats card on archive.html
        const $counter = $('.text-warning.mb-0');
        if ($counter.length) {
            const current = parseInt($counter.text()) || 0;
            $counter.text(Math.max(0, current + delta));
        }
    }

});
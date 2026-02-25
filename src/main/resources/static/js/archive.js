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

    // Global function to remove all modal backdrops
    window.removeAllModalBackdrops = function() {
        $('.modal-backdrop').remove();
        $('.modal-open').removeClass('modal-open');
        $('body').removeClass('modal-open');
        $('body').css('overflow', '');
        $('body').css('padding-right', '');
        console.log('Backdrop removed forcefully');
    };
    
    // Aggressive backdrop removal - multiple approaches
    setInterval(function() {
        if ($('.modal-backdrop').length > 0 && !$('.modal.show').length) {
            removeAllModalBackdrops();
        }
    }, 200); // Faster check - every 200ms
    
    // Mutation observer to catch backdrop creation
    const observer = new MutationObserver(function(mutations) {
        mutations.forEach(function(mutation) {
            if (mutation.addedNodes) {
                mutation.addedNodes.forEach(function(node) {
                    if (node.nodeType === 1 && node.classList && node.classList.contains('modal-backdrop')) {
                        setTimeout(function() {
                            if (!$('.modal.show').length) {
                                $(node).remove();
                                console.log('Backdrop removed by observer');
                            }
                        }, 10);
                    }
                });
            }
        });
    });
    
    observer.observe(document.body, {
        childList: true,
        subtree: true
    });
    
    // Click anywhere to remove backdrop (emergency)
    $(document).on('click', function(e) {
        if ($(e.target).hasClass('modal-backdrop')) {
            $(e.target).remove();
            removeAllModalBackdrops();
        }
    });

    // Clean up modal backdrop when archive modal is hidden
    $('#archiveReasonModal').on('hidden.bs.modal', function () {
        removeAllModalBackdrops();
        
        // Double-check after a short delay
        setTimeout(function() {
            removeAllModalBackdrops();
        }, 50);
    });

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

    $(document).on('click', '.btn-archive', function () {
        pendingArchiveId  = $(this).data('office-id');
        pendingArchiveRow = $(this).closest('tr');
        const name        = $(this).data('office-name');

        $('#archiveOfficeName').text(name);
        $('#archiveReasonInput').val('');
        $('#archiveReasonModal').modal('show');
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
                    // Remove row properly - use DataTable API if available, else fade out
                    if (pendingArchiveRow) {
                        const $table = pendingArchiveRow.closest('table');
                        if ($table.length && $.fn.DataTable.isDataTable($table)) {
                            $table.DataTable().row(pendingArchiveRow).remove().draw(false);
                        } else {
                            pendingArchiveRow.fadeOut(400, function () { $(this).remove(); });
                        }
                    }
                    showSuccess(res.message);
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
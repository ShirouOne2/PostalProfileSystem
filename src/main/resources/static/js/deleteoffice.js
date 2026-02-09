/**
 * deleteoffice.js
 * Handles deletion of postal offices with confirmation dialog
 * Requires: SweetAlert2, jQuery
 */

/**
 * Handler function that reads data attributes from the button
 * and calls deleteOffice()
 * @param {HTMLElement} button
 */
function handleDelete(button) {
    const officeId = parseInt(button.getAttribute('data-office-id'));
    const officeName = button.getAttribute('data-office-name');

    deleteOffice(officeId, officeName);
}

/**
 * Delete a postal office with confirmation
 * @param {number} officeId
 * @param {string} officeName
 */
function deleteOffice(officeId, officeName) {
    Swal.fire({
        title: 'Are you sure?',
        html: `Do you want to delete <strong>${officeName}</strong>?<br><br>This action cannot be undone!`,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#dc3545',
        cancelButtonColor: '#6c757d',
        confirmButtonText: '<i class="fas fa-trash-alt"></i> Yes, delete it!',
        cancelButtonText: '<i class="fas fa-times"></i> Cancel',
        focusCancel: true,
        reverseButtons: true
    }).then((result) => {
        if (result.isConfirmed) {
            Swal.fire({
                title: 'Deleting...',
                html: 'Please wait while we delete the post office.',
                allowOutsideClick: false,
                allowEscapeKey: false,
                didOpen: () => Swal.showLoading()
            });

            $.ajax({
                url: '/api/postal-office/' + officeId,
                type: 'DELETE',
                success: function(response) {
                    Swal.fire({
                        title: 'Deleted!',
                        text: 'Post office has been deleted successfully.',
                        icon: 'success',
                        confirmButtonColor: '#28a745',
                        timer: 2000,
                        timerProgressBar: true
                    }).then(() => location.reload());
                },
                error: function(xhr) {
                    let errorMessage = 'Failed to delete post office.';
                    if (xhr.responseJSON && xhr.responseJSON.message) {
                        errorMessage = xhr.responseJSON.message;
                    }
                    Swal.fire({
                        title: 'Error!',
                        text: errorMessage,
                        icon: 'error',
                        confirmButtonColor: '#dc3545'
                    });
                }
            });
        }
    });
}

/**
 * Optional: Delete office without full page reload (for DataTables UX)
 * @param {number} officeId
 * @param {string} officeName
 * @param {HTMLElement} rowElement
 */
function deleteOfficeWithoutReload(officeId, officeName, rowElement) {
    Swal.fire({
        title: 'Are you sure?',
        html: `Do you want to delete <strong>${officeName}</strong>?<br><br>This action cannot be undone!`,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#dc3545',
        cancelButtonColor: '#6c757d',
        confirmButtonText: '<i class="fas fa-trash-alt"></i> Yes, delete it!',
        cancelButtonText: '<i class="fas fa-times"></i> Cancel',
        focusCancel: true,
        reverseButtons: true
    }).then((result) => {
        if (result.isConfirmed) {
            Swal.fire({
                title: 'Deleting...',
                html: 'Please wait while we delete the post office.',
                allowOutsideClick: false,
                allowEscapeKey: false,
                didOpen: () => Swal.showLoading()
            });

            $.ajax({
                url: '/api/postal-office/' + officeId,
                type: 'DELETE',
                success: function(response) {
                    Swal.fire({
                        title: 'Deleted!',
                        text: 'Post office has been deleted successfully.',
                        icon: 'success',
                        confirmButtonColor: '#28a745',
                        timer: 2000,
                        timerProgressBar: true
                    });

                    // Remove row from DataTable
                    if ($.fn.DataTable && $.fn.DataTable.isDataTable('#myTable')) {
                        var table = $('#myTable').DataTable();
                        table.row($(rowElement).closest('tr')).remove().draw();
                    } else {
                        location.reload();
                    }
                },
                error: function(xhr) {
                    let errorMessage = 'Failed to delete post office.';
                    if (xhr.responseJSON && xhr.responseJSON.message) {
                        errorMessage = xhr.responseJSON.message;
                    }
                    Swal.fire({
                        title: 'Error!',
                        text: errorMessage,
                        icon: 'error',
                        confirmButtonColor: '#dc3545'
                    });
                }
            });
        }
    });
}

/**
 * Optional: Bulk delete multiple offices
 * @param {Array<number>} officeIds
 */
function bulkDeleteOffices(officeIds) {
    if (!officeIds || officeIds.length === 0) {
        Swal.fire({
            title: 'No Selection',
            text: 'Please select at least one office to delete.',
            icon: 'info',
            confirmButtonColor: '#007bff'
        });
        return;
    }

    Swal.fire({
        title: 'Are you sure?',
        html: `Do you want to delete <strong>${officeIds.length}</strong> post office(s)?<br><br>This action cannot be undone!`,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#dc3545',
        cancelButtonColor: '#6c757d',
        confirmButtonText: '<i class="fas fa-trash-alt"></i> Yes, delete them!',
        cancelButtonText: '<i class="fas fa-times"></i> Cancel',
        focusCancel: true,
        reverseButtons: true
    }).then((result) => {
        if (result.isConfirmed) {
            Swal.fire({
                title: 'Deleting...',
                html: `Please wait while we delete ${officeIds.length} post office(s).`,
                allowOutsideClick: false,
                allowEscapeKey: false,
                didOpen: () => Swal.showLoading()
            });

            $.ajax({
                url: '/api/postal-office/bulk-delete',
                type: 'DELETE',
                contentType: 'application/json',
                data: JSON.stringify({ ids: officeIds }),
                success: function(response) {
                    Swal.fire({
                        title: 'Deleted!',
                        text: `${officeIds.length} post office(s) have been deleted successfully.`,
                        icon: 'success',
                        confirmButtonColor: '#28a745',
                        timer: 2000,
                        timerProgressBar: true
                    }).then(() => location.reload());
                },
                error: function(xhr) {
                    let errorMessage = 'Failed to delete post offices.';
                    if (xhr.responseJSON && xhr.responseJSON.message) {
                        errorMessage = xhr.responseJSON.message;
                    }
                    Swal.fire({
                        title: 'Error!',
                        text: errorMessage,
                        icon: 'error',
                        confirmButtonColor: '#dc3545'
                    });
                }
            });
        }
    });
}
/**
 * Post Office Inventory DataTable Initialization
 * PHLPost - Post Office Management System
 * Enhanced with SweetAlert2 for better UX
 */

document.addEventListener('DOMContentLoaded', function() {
    
    // Initialize DataTable
    const table = new DataTable('#myTable', {
        // Pagination
        pageLength: 25,
        lengthMenu: [10, 25, 50, 100],
        
        // Enable features
        paging: true,
        ordering: true,
        info: true,
        searching: true,
        
        // Column configuration
        columnDefs: [
            { 
                targets: 0, // # column
                width: '80px',
                orderable: true,
                className: 'dt-center'
            },
            { 
                targets: 1, // Post Office Name
                orderable: true
            },
            { 
                targets: 2, // Area
                orderable: true
            },
            { 
                targets: 3, // City
                orderable: true
            },
            { 
                targets: 4, // Status column
                width: '100px',
                orderable: true,
                className: 'dt-center'
            },
            { 
                targets: 5, // Actions column
                width: '120px',
                orderable: false,
                className: 'dt-center',
                searchable: false
            }
        ],
        
        // Default sorting by Area column (index 2), then by # column
        order: [[2, 'asc'], [0, 'asc']],
        
        // Language customization
        language: {
            search: "Search:",
            lengthMenu: "Show _MENU_ entries per page",
            info: "Showing _START_ to _END_ of _TOTAL_ entries",
            infoEmpty: "No entries found",
            infoFiltered: "(filtered from _MAX_ total entries)",
            paginate: {
                first: "<<",
                previous: "<",
                next: ">",
                last: ">>"
            },
            zeroRecords: "No matching records found"
        },
        
        // DOM layout - search on right, entries on left
        dom: '<"row mb-3"<"col-sm-6"l><"col-sm-6 text-right"f>>rt<"row"<"col-sm-6"i><"col-sm-6"p>>',
        
        // Responsive
        responsive: true,
        
        // State saving
        stateSave: true,
        stateDuration: 60 * 60, // 1 hour
        
        // Draw callback
        drawCallback: function(settings) {
            console.log('Table drawn with ' + settings.aoData.length + ' records');
            
            // Re-attach delete button event listeners after table redraw
            attachDeleteButtonListeners();
        }
    });
    
    /**
     * Attach delete button event listeners
     */
    function attachDeleteButtonListeners() {
        const deleteButtons = document.querySelectorAll('.btn-delete');
        deleteButtons.forEach(button => {
            // Remove existing listener to prevent duplicates
            const newButton = button.cloneNode(true);
            button.parentNode.replaceChild(newButton, button);
            
            // Add click event
            newButton.addEventListener('click', function() {
                const officeId = this.getAttribute('data-office-id');
                const officeName = this.getAttribute('data-office-name');
                handleDelete(officeId, officeName);
            });
        });
    }
    
    // Initial attachment of delete listeners only
    attachDeleteButtonListeners();
    
    console.log('DataTable initialized successfully');
});

/**
 * Handle delete action with SweetAlert2 or native confirm
 */
function handleDelete(officeId, officeName) {
    // Check if SweetAlert2 is available
    if (typeof Swal !== 'undefined') {
        // Use SweetAlert2 for better UX
        Swal.fire({
            title: 'Delete Post Office?',
            html: `Are you sure you want to delete <strong>${officeName}</strong>?<br><small class="text-muted">This action cannot be undone.</small>`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#dc3545',
            cancelButtonColor: '#6c757d',
            confirmButtonText: '<i class="fas fa-trash"></i> Yes, Delete',
            cancelButtonText: '<i class="fas fa-times"></i> Cancel',
            reverseButtons: true
        }).then((result) => {
            if (result.isConfirmed) {
                performDelete(officeId, officeName);
            }
        });
    } else {
        // Fallback to native confirm
        if (!confirm(`Are you sure you want to delete "${officeName}"?\n\nThis action cannot be undone!`)) {
            return;
        }
        performDelete(officeId, officeName);
    }
}

/**
 * Execute the delete operation
 */
function performDelete(officeId, officeName) {
    // Show loading state
    if (typeof Swal !== 'undefined') {
        Swal.fire({
            title: 'Deleting...',
            html: `Removing <strong>${officeName}</strong>`,
            allowOutsideClick: false,
            allowEscapeKey: false,
            showConfirmButton: false,
            didOpen: () => {
                Swal.showLoading();
            }
        });
    } else {
        // Fallback loading indicator
        const loadingDiv = document.createElement('div');
        loadingDiv.id = 'deleteLoadingIndicator';
        loadingDiv.innerHTML = '<div style="position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);background:white;padding:20px;border-radius:8px;box-shadow:0 2px 10px rgba(0,0,0,0.1);z-index:9999"><i class="fas fa-spinner fa-spin"></i> Deleting...</div>';
        document.body.appendChild(loadingDiv);
    }
    
    fetch('/api/postal-office/' + officeId, {
        method: 'DELETE'
    })
    .then(response => response.json())
    .then(data => {
        // Remove loading indicator if using fallback
        const loadingDiv = document.getElementById('deleteLoadingIndicator');
        if (loadingDiv) {
            document.body.removeChild(loadingDiv);
        }
        
        if (data.success) {
            if (typeof Swal !== 'undefined') {
                Swal.fire({
                    icon: 'success',
                    title: 'Deleted!',
                    text: `${officeName} has been removed successfully.`,
                    timer: 2000,
                    showConfirmButton: false
                }).then(() => {
                    window.location.reload();
                });
            } else {
                alert('Post office deleted successfully!');
                window.location.reload();
            }
        } else {
            if (typeof Swal !== 'undefined') {
                Swal.fire({
                    icon: 'error',
                    title: 'Delete Failed',
                    text: data.message || 'Failed to delete post office',
                    confirmButtonText: 'OK'
                });
            } else {
                alert('Error: ' + (data.message || 'Failed to delete post office'));
            }
        }
    })
    .catch(error => {
        // Remove loading indicator if using fallback
        const loadingDiv = document.getElementById('deleteLoadingIndicator');
        if (loadingDiv) {
            document.body.removeChild(loadingDiv);
        }
        
        console.error('Error:', error);
        
        if (typeof Swal !== 'undefined') {
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: 'An error occurred while deleting the post office',
                confirmButtonText: 'OK'
            });
        } else {
            alert('Failed to delete post office');
        }
    });
}
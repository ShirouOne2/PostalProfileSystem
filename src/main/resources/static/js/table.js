/**
 * Post Office Inventory DataTable Initialization
 * PHLPost - Post Office Management System
 * Enhanced with SweetAlert2 for better UX
 * WITH EDIT FUNCTIONALITY
 */

document.addEventListener('DOMContentLoaded', function() {
    
    // Create edit modal
    createEditModal();
    
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
                width: '150px',
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
            
            // Re-attach button event listeners after table redraw
            attachButtonListeners();
        }
    });
    
    /**
     * Attach button event listeners (edit and delete)
     */
    function attachButtonListeners() {
        // Edit buttons
        const editButtons = document.querySelectorAll('.btn-edit');
        editButtons.forEach(button => {
            const newButton = button.cloneNode(true);
            button.parentNode.replaceChild(newButton, button);
            
            newButton.addEventListener('click', function() {
                const officeId = this.getAttribute('data-office-id');
                handleEdit(officeId);
            });
        });
        
        // Delete buttons
        const deleteButtons = document.querySelectorAll('.btn-delete');
        deleteButtons.forEach(button => {
            const newButton = button.cloneNode(true);
            button.parentNode.replaceChild(newButton, button);
            
            newButton.addEventListener('click', function() {
                const officeId = this.getAttribute('data-office-id');
                const officeName = this.getAttribute('data-office-name');
                handleDelete(officeId, officeName);
            });
        });
    }
    
    // Initial attachment of button listeners
    attachButtonListeners();
    
    console.log('DataTable initialized successfully');
});

/**
 * Create Edit Modal
 */
function createEditModal() {
    const modalHTML = `
        <div class="modal fade" id="editOfficeModal" tabindex="-1" role="dialog">
            <div class="modal-dialog modal-lg" role="document">
                <div class="modal-content">
                    <div class="modal-header bg-warning text-white">
                        <h5 class="modal-title">
                            <i class="fas fa-edit"></i> Edit Post Office
                        </h5>
                        <button type="button" class="close text-white" data-dismiss="modal">
                            <span>&times;</span>
                        </button>
                    </div>
                    <div class="modal-body">
                        <form id="editOfficeForm">
                            <input type="hidden" id="editOfficeId">
                            
                            <div class="row">
                                <!-- Basic Information -->
                                <div class="col-md-6">
                                    <div class="form-group">
                                        <label for="editName">Office Name <span class="text-danger">*</span></label>
                                        <input type="text" class="form-control" id="editName" required>
                                    </div>
                                </div>
                                
                                <div class="col-md-6">
                                    <div class="form-group">
                                        <label for="editPostmaster">Postmaster</label>
                                        <input type="text" class="form-control" id="editPostmaster">
                                    </div>
                                </div>
                            </div>
                            
                            <div class="form-group">
                                <label for="editAddress">Address</label>
                                <textarea class="form-control" id="editAddress" rows="2"></textarea>
                            </div>
                            
                            <div class="row">
                                <div class="col-md-6">
                                    <div class="form-group">
                                        <label for="editZipCode">Zip Code</label>
                                        <input type="text" class="form-control" id="editZipCode">
                                    </div>
                                </div>
                                
                                <div class="col-md-6">
                                    <div class="form-group">
                                        <label for="editStatus">Status <span class="text-danger">*</span></label>
                                        <select class="form-control" id="editStatus" required>
                                            <option value="true">Active</option>
                                            <option value="false">Inactive</option>
                                        </select>
                                    </div>
                                </div>
                            </div>
                            
                            <!-- ISP Information -->
                            <h6 class="mt-3 mb-2 text-primary">Internet Service Provider</h6>
                            <div class="row">
                                <div class="col-md-6">
                                    <div class="form-group">
                                        <label for="editISP">ISP</label>
                                        <input type="text" class="form-control" id="editISP">
                                    </div>
                                </div>
                                
                                <div class="col-md-6">
                                    <div class="form-group">
                                        <label for="editSpeed">Speed</label>
                                        <input type="text" class="form-control" id="editSpeed" placeholder="e.g., 100 Mbps">
                                    </div>
                                </div>
                            </div>
                            
                            <div class="row">
                                <div class="col-md-6">
                                    <div class="form-group">
                                        <label for="editTypeOfConnection">Connection Type</label>
                                        <input type="text" class="form-control" id="editTypeOfConnection" placeholder="e.g., Fiber, DSL">
                                    </div>
                                </div>
                                
                                <div class="col-md-6">
                                    <div class="form-group">
                                        <label for="editStaticIP">Static IP Address</label>
                                        <input type="text" class="form-control" id="editStaticIP">
                                    </div>
                                </div>
                            </div>
                            
                            <!-- Staff Information -->
                            <h6 class="mt-3 mb-2 text-primary">Staff Information</h6>
                            <div class="row">
                                <div class="col-md-4">
                                    <div class="form-group">
                                        <label for="editNoOfEmployees">No. of Employees</label>
                                        <input type="number" class="form-control" id="editNoOfEmployees" min="0">
                                    </div>
                                </div>
                                
                                <div class="col-md-4">
                                    <div class="form-group">
                                        <label for="editNoOfTellers">No. of Tellers</label>
                                        <input type="number" class="form-control" id="editNoOfTellers" min="0">
                                    </div>
                                </div>
                                
                                <div class="col-md-4">
                                    <div class="form-group">
                                        <label for="editNoOfCarriers">No. of Carriers</label>
                                        <input type="number" class="form-control" id="editNoOfCarriers" min="0">
                                    </div>
                                </div>
                            </div>
                            
                            <!-- Contact Information -->
                            <h6 class="mt-3 mb-2 text-primary">Contact Information</h6>
                            <div class="row">
                                <div class="col-md-6">
                                    <div class="form-group">
                                        <label for="editContactPerson">Office Contact Person</label>
                                        <input type="text" class="form-control" id="editContactPerson">
                                    </div>
                                </div>
                                
                                <div class="col-md-6">
                                    <div class="form-group">
                                        <label for="editContactNumber">Office Contact Number</label>
                                        <input type="text" class="form-control" id="editContactNumber">
                                    </div>
                                </div>
                            </div>
                            
                            <div class="row">
                                <div class="col-md-6">
                                    <div class="form-group">
                                        <label for="editISPContactPerson">ISP Contact Person</label>
                                        <input type="text" class="form-control" id="editISPContactPerson">
                                    </div>
                                </div>
                                
                                <div class="col-md-6">
                                    <div class="form-group">
                                        <label for="editISPContactNumber">ISP Contact Number</label>
                                        <input type="text" class="form-control" id="editISPContactNumber">
                                    </div>
                                </div>
                            </div>
                            
                            <!-- Location Coordinates -->
                            <h6 class="mt-3 mb-2 text-primary">Location Coordinates</h6>
                            <div class="row">
                                <div class="col-md-6">
                                    <div class="form-group">
                                        <label for="editLatitude">Latitude</label>
                                        <input type="number" class="form-control" id="editLatitude" step="0.000001">
                                    </div>
                                </div>
                                
                                <div class="col-md-6">
                                    <div class="form-group">
                                        <label for="editLongitude">Longitude</label>
                                        <input type="number" class="form-control" id="editLongitude" step="0.000001">
                                    </div>
                                </div>
                            </div>
                        </form>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-dismiss="modal">
                            <i class="fas fa-times"></i> Cancel
                        </button>
                        <button type="button" class="btn btn-warning" onclick="saveOfficeChanges()">
                            <i class="fas fa-save"></i> Save Changes
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modalHTML);
}

/**
 * Handle edit action
 */
function handleEdit(officeId) {
    // Show loading
    if (typeof Swal !== 'undefined') {
        Swal.fire({
            title: 'Loading Office Data...',
            allowOutsideClick: false,
            allowEscapeKey: false,
            showConfirmButton: false,
            didOpen: () => {
                Swal.showLoading();
            }
        });
    }
    
    // Fetch office data
    fetch('/api/postal-office/' + officeId)
        .then(response => response.json())
        .then(office => {
            if (typeof Swal !== 'undefined') {
                Swal.close();
            }
            
            // Populate form fields
            document.getElementById('editOfficeId').value = office.id;
            document.getElementById('editName').value = office.name || '';
            document.getElementById('editPostmaster').value = office.postmaster || '';
            document.getElementById('editAddress').value = office.address || '';
            document.getElementById('editZipCode').value = office.zipCode || '';
            document.getElementById('editStatus').value = office.connectionStatus ? 'true' : 'false';
            document.getElementById('editISP').value = office.internetServiceProvider || '';
            document.getElementById('editSpeed').value = office.speed || '';
            document.getElementById('editTypeOfConnection').value = office.typeOfConnection || '';
            document.getElementById('editStaticIP').value = office.staticIpAddress || '';
            document.getElementById('editNoOfEmployees').value = office.noOfEmployees || '';
            document.getElementById('editNoOfTellers').value = office.noOfPostalTellers || '';
            document.getElementById('editNoOfCarriers').value = office.noOfLetterCarriers || '';
            document.getElementById('editContactPerson').value = office.postalOfficeContactPerson || '';
            document.getElementById('editContactNumber').value = office.postalOfficeContactNumber || '';
            document.getElementById('editISPContactPerson').value = office.ispContactPerson || '';
            document.getElementById('editISPContactNumber').value = office.ispContactNumber || '';
            document.getElementById('editLatitude').value = office.latitude || '';
            document.getElementById('editLongitude').value = office.longitude || '';
            
            // Show modal (Bootstrap 4)
            $('#editOfficeModal').modal('show');
        })
        .catch(error => {
            console.error('Error:', error);
            if (typeof Swal !== 'undefined') {
                Swal.fire({
                    icon: 'error',
                    title: 'Error',
                    text: 'Failed to load office data',
                    confirmButtonText: 'OK'
                });
            } else {
                alert('Failed to load office data');
            }
        });
}

/**
 * Save office changes
 */
function saveOfficeChanges() {
    const id = document.getElementById('editOfficeId').value;
    
    // Validate required fields
    if (!document.getElementById('editName').value) {
        if (typeof Swal !== 'undefined') {
            Swal.fire({
                icon: 'warning',
                title: 'Validation Error',
                text: 'Office name is required',
                confirmButtonText: 'OK'
            });
        } else {
            alert('Office name is required');
        }
        return;
    }
    
    // Prepare update data
    const updateData = {
        name: document.getElementById('editName').value,
        postmaster: document.getElementById('editPostmaster').value || null,
        address: document.getElementById('editAddress').value || null,
        zipCode: document.getElementById('editZipCode').value || null,
        connectionStatus: document.getElementById('editStatus').value === 'true',
        internetServiceProvider: document.getElementById('editISP').value || null,
        speed: document.getElementById('editSpeed').value || null,
        typeOfConnection: document.getElementById('editTypeOfConnection').value || null,
        staticIpAddress: document.getElementById('editStaticIP').value || null,
        noOfEmployees: document.getElementById('editNoOfEmployees').value ? parseInt(document.getElementById('editNoOfEmployees').value) : null,
        noOfPostalTellers: document.getElementById('editNoOfTellers').value ? parseInt(document.getElementById('editNoOfTellers').value) : null,
        noOfLetterCarriers: document.getElementById('editNoOfCarriers').value ? parseInt(document.getElementById('editNoOfCarriers').value) : null,
        postalOfficeContactPerson: document.getElementById('editContactPerson').value || null,
        postalOfficeContactNumber: document.getElementById('editContactNumber').value || null,
        ispContactPerson: document.getElementById('editISPContactPerson').value || null,
        ispContactNumber: document.getElementById('editISPContactNumber').value || null,
        latitude: document.getElementById('editLatitude').value ? parseFloat(document.getElementById('editLatitude').value) : null,
        longitude: document.getElementById('editLongitude').value ? parseFloat(document.getElementById('editLongitude').value) : null
    };
    
    // Show saving progress
    if (typeof Swal !== 'undefined') {
        Swal.fire({
            title: 'Saving Changes...',
            allowOutsideClick: false,
            allowEscapeKey: false,
            showConfirmButton: false,
            didOpen: () => {
                Swal.showLoading();
            }
        });
    }
    
    // Send update request
    fetch('/api/postal-office/' + id, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(updateData)
    })
    .then(response => response.json())
    .then(data => {
        // Hide modal
        $('#editOfficeModal').modal('hide');
        
        if (typeof Swal !== 'undefined') {
            Swal.fire({
                icon: 'success',
                title: 'Success!',
                text: 'Post office updated successfully',
                timer: 2000,
                showConfirmButton: false
            }).then(() => {
                window.location.reload();
            });
        } else {
            alert('Post office updated successfully!');
            window.location.reload();
        }
    })
    .catch(error => {
        console.error('Error:', error);
        if (typeof Swal !== 'undefined') {
            Swal.fire({
                icon: 'error',
                title: 'Update Failed',
                text: 'Failed to update post office',
                confirmButtonText: 'OK'
            });
        } else {
            alert('Failed to update post office');
        }
    });
}

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
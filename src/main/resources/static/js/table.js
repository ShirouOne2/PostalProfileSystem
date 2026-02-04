let postOfficeTable;
let currentEditRecord = null;

$(document).ready(function() {
    initializeDataTable();
    setupEventListeners();
});

function initializeDataTable() {
    postOfficeTable = $('#postOfficeTable').DataTable({
        responsive: true,
        pageLength: 25,
        lengthMenu: [[10, 25, 50, 100, -1], [10, 25, 50, 100, "All"]],
        ordering: true,
        searching: true,
        info: true,
        autoWidth: false,
        processing: true,
        serverSide: true,
        scrollX: false,
        scrollCollapse: false,
        fixedColumns: false,
        ajax: {
            url: '/table/api/post-offices',
            data: function(d) {
                d.area = $('#areaFilter').val();
                d.status = $('#statusFilter').val();
                d.services = $('#servicesFilter').val();
                d.classification = $('#classificationFilter').val();
            },
            dataSrc: function(json) {
                return json.data || [];
            }
        },
        columnDefs: [
            {
                targets: [0], // # column
                width: '50px',
                className: 'text-center'
            },
            {
                targets: [1], // Area column
                width: '80px',
                className: 'text-center'
            },
            {
                targets: [2], // Post Office Name column
                width: '150px',
                minWidth: '200px',
                className: 'col-post-office-name text-left'
            },
            {
                targets: [3], // Services Provided column
                width: '120px',
                className: 'text-center'
            },
            {
                targets: [4], // Classification column
                width: '140px',
                className: 'text-center'
            },
            {
                targets: [5], // No. Of Postal Teller column
                width: '120px',
                className: 'text-center'
            },
            {
                targets: [6], // No. Of Letter Carriers column
                width: '140px',
                className: 'text-center'
            },
            {
                targets: [7], // Address column
                width: '300px',
                minWidth: '250px',
                className: 'col-address text-left'
            },
            {
                targets: [8], // Connection column
                width: '150px',
                className: 'text-center'
            },
            {
                targets: [9], // Contact column
                width: '130px',
                className: 'text-center'
            },
            {
                targets: [10], // Status column
                width: '100px',
                className: 'text-center'
            },
            {
                targets: [11], // Actions column
                width: '120px',
                className: 'text-center actions'
            }
        ],
        // Default sort: Area then Post Office Name
        order: [
            [1, 'asc'],
            [2, 'asc']
        ],
        columns: [
            { 
                data: null,
                render: function(data, type, row, meta) {
                    return meta.row + 1;
                }
            },
            { data: 'area' },
            { data: 'postalOffice' },
            { 
                data: 'servicesProvided',
                render: function(data) {
                    return data || 'N/A';
                }
            },
            { 
                data: 'classification',
                render: function(data) {
                    return data || 'N/A';
                }
            },
            { 
                data: 'noOfPostalTeller',
                render: function(data) {
                    return data || 'N/A';
                }
            },
            { 
                data: 'noOfLetterCarriers',
                render: function(data) {
                    return data || 'N/A';
                }
            },
            { 
                data: 'addressLine',
                render: function(data, type, row) {
                    // Build address from components if addressLine is empty
                    let address = data;
                    if (!address) {
                        const parts = [];
                        if (row.barangay) parts.push(row.barangay);
                        if (row.city) parts.push(row.city);
                        if (row.province) parts.push(row.province);
                        if (row.zipCode) parts.push(row.zipCode);
                        address = parts.length > 0 ? parts.join(', ') : 'N/A';
                    }
                    return address;
                }
            },
            { 
                data: 'typeOfConnection',
                render: function(data) {
                    if (!data) return '<span class="badge badge-secondary">N/A</span>';
                    
                    // Parse connection attributes from TYPE_OF_CONNECTION format
                    const attributes = [];
                    if (data.includes('Wired:Yes')) attributes.push('wired');
                    if (data.includes('Shared:Yes')) attributes.push('shared');
                    if (data.includes('Free:Yes')) attributes.push('free');
                    
                    return attributes.length > 0 ? attributes.join(', ') : data;
                }
            },
            { 
                data: 'contactNumber',
                render: function(data) {
                    return data || 'N/A';
                }
            },
            { 
                data: 'connectivityStatus',
                render: function(data) {
                    if (!data) return '<span class="badge badge-secondary">N/A</span>';
                    
                    const status = data.toLowerCase().trim();
                    let badgeClass = 'badge-secondary';
                    let displayText = data;
                    
                    if (status === 'connected' || status === 'active') {
                        badgeClass = 'badge-success';
                    } else if (status === 'disconnected' || status === 'inactive') {
                        badgeClass = 'badge-danger';
                    } else if (status === 'pending') {
                        badgeClass = 'badge-warning';
                    } else if (status === 'under maintenance') {
                        badgeClass = 'badge-info';
                    }
                    
                    return '<span class="badge ' + badgeClass + '">' + displayText + '</span>';
                }
            },
            {
                data: null,
                render: function(data, type, row) {
                    return `
                        <div class="btn-group">
                            <button type="button" class="btn btn-sm btn-secondary dropdown-toggle" data-toggle="dropdown" aria-haspopup="true" aria-expanded="false">
                                Actions
                            </button>
                            <div class="dropdown-menu dropdown-menu-right">
                                <a class="dropdown-item" href="#" onclick="viewProfile(${row.id})" title="View Profile">
                                    <i class="fas fa-eye"></i> View
                                </a>
                                <div class="dropdown-divider"></div>
                                <button class="dropdown-item" onclick="editPostOffice(${row.id})" title="Edit Record">
                                    <i class="fas fa-edit"></i> Edit
                                </button>
                                <div class="dropdown-divider"></div>
                                <button class="dropdown-item text-danger" onclick="deletePostOffice(${row.id})" title="Delete Record">
                                    <i class="fas fa-trash"></i> Delete
                                </button>
                            </div>
                        </div>
                    `;
                }
            }
        ],
        initComplete: function() {
            var api = this.api();
            
            // First, adjust all columns to ensure proper width calculation
            api.columns.adjust();
            
            // Force perfect column alignment - match header and body widths exactly
            api.columns().every(function(index) {
                var column = this;
                var header = $(column.header());
                var headerClass = header.attr('class') || '';
                var headerWidth = header.outerWidth();
                
                // Set exact width on header with border consideration
                header.css({
                    'width': headerWidth + 'px',
                    'min-width': headerWidth + 'px',
                    'max-width': headerWidth + 'px',
                    'box-sizing': 'border-box'
                });
                
                // Apply same width to all cells in this column
                $(column.nodes()).each(function() {
                    var cell = $(this);
                    cell.css({
                        'width': headerWidth + 'px',
                        'min-width': headerWidth + 'px',
                        'max-width': headerWidth + 'px',
                        'box-sizing': 'border-box'
                    });
                    
                    // Apply alignment classes
                    if (headerClass.includes('text-left')) {
                        cell.addClass('text-left').css('text-align', 'left');
                    } else if (headerClass.includes('text-center')) {
                        cell.addClass('text-center').css('text-align', 'center');
                    } else if (headerClass.includes('text-right')) {
                        cell.addClass('text-right').css('text-align', 'right');
                    }
                });
            });
            
            // Ensure borders are perfectly aligned and table layout is fixed
            $('#postOfficeTable').css({
                'table-layout': 'fixed',
                'width': '100%'
            });
            
            $('#postOfficeTable thead th, #postOfficeTable tbody td').css({
                'box-sizing': 'border-box',
                'border-collapse': 'collapse'
            });
            
            // Ensure perfect alignment between header and body cells
            $('#postOfficeTable thead th').each(function(index) {
                var $header = $(this);
                var headerWidth = $header.outerWidth();
                $('#postOfficeTable tbody td:nth-child(' + (index + 1) + ')').css({
                    'width': headerWidth + 'px',
                    'min-width': headerWidth + 'px',
                    'max-width': headerWidth + 'px'
                });
            });
            
            // Re-adjust after setting widths
            api.columns.adjust();
            
            console.log('DataTable initialized successfully');
        },
        drawCallback: function() {
            var api = this.api();
            
            // Adjust column widths on each draw to maintain alignment
            api.columns.adjust();
            
            // Force perfect column alignment after each draw
            api.columns().every(function(index) {
                var column = this;
                var header = $(column.header());
                var headerClass = header.attr('class') || '';
                var headerWidth = header.outerWidth();
                
                // Ensure header and cells have matching widths
                if (headerWidth > 0) {
                    header.css('width', headerWidth + 'px');
                    header.css('min-width', headerWidth + 'px');
                    
                    $(column.nodes()).each(function() {
                        var cell = $(this);
                        cell.css('width', headerWidth + 'px');
                        cell.css('min-width', headerWidth + 'px');
                        
                        // Re-apply alignment classes
                        if (headerClass.includes('text-left')) {
                            cell.addClass('text-left').css('text-align', 'left');
                        } else if (headerClass.includes('text-center')) {
                            cell.addClass('text-center').css('text-align', 'center');
                        } else if (headerClass.includes('text-right')) {
                            cell.addClass('text-right').css('text-align', 'right');
                        }
                    });
                }
            });
            
            // Ensure perfect alignment between header and body cells on each draw
            $('#postOfficeTable thead th').each(function(index) {
                var $header = $(this);
                var headerWidth = $header.outerWidth();
                if (headerWidth > 0) {
                    $('#postOfficeTable tbody td:nth-child(' + (index + 1) + ')').css({
                        'width': headerWidth + 'px',
                        'min-width': headerWidth + 'px',
                        'max-width': headerWidth + 'px'
                    });
                }
            });
            
            // Final adjustment
            api.columns.adjust();
        },
        language: {
            search: "Search:",
            lengthMenu: "Show _MENU_ entries",
            info: "Showing _START_ to _END_ of _TOTAL_ entries",
            paginate: {
                first: "First",
                last: "Last",
                next: "Next",
                previous: "Previous"
            },
            processing: '<div class="loader-bar"><span></span><span></span><span></span><span></span><span></span></div>'
        }
    });
    
    // Adjust columns on window resize
    $(window).on('resize', function() {
        if ($.fn.DataTable.isDataTable('#postOfficeTable')) {
            postOfficeTable.columns.adjust();
        }
    });
}

function setupEventListeners() {
        // Filter change handlers
    $('#areaFilter, #statusFilter, #servicesFilter, #classificationFilter').on('change', function() {
        reloadTable();
    });

    // Clear filters link
    $('a[href*="table"]').on('click', function(e) {
        if ($(this).text().includes('Clear')) {
            e.preventDefault();
            clearFilters();
        }
    });
}

function reloadTable() {
    if (postOfficeTable) {
        postOfficeTable.ajax.reload();
    }
}

function clearFilters() {
    $('#areaFilter').val('');
    $('#statusFilter').val('');
    $('#servicesFilter').val('');
    $('#classificationFilter').val('');
    reloadTable();
}

function showPageLoader(message) {
    $('#pageLoader').removeClass('hidden');
    if (message) {
        $('#loaderStatusText').text(message);
    }
}

function hidePageLoader() {
    $('#pageLoader').addClass('hidden');
}

function viewProfile(id) {
    // Open profile in new tab
    window.open('/profile-view?id=' + id, '_blank');
}

function editPostOffice(id) {
    console.log('Opening edit modal for ID:', id);
    
    // Show modal first
    $('#editModal').modal('show');
    
    // Show loading indicator
    $('#editModal .modal-body').prepend('<div id="editLoading" class="text-center py-2"><i class="fas fa-spinner fa-spin"></i> Loading...</div>');
    
    // Fetch post office data
    fetch('/api/post-office/' + id)
        .then(response => {
            console.log('Response status:', response.status);
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            return response.json();
        })
        .then(response => {
            console.log('Data object:', response);
            console.log('Data.id:', response.postOffice ? response.postOffice.id : 'undefined');
            console.log('Response type:', typeof response);
            console.log('Data type:', typeof response.postOffice);
            
            if (response.postOffice) {
                console.log('Available data properties:', Object.keys(response.postOffice));
            }
            
            // Remove loading indicator
            $('#editLoading').remove();
            
            if (response.success && response.postOffice) {
                // Use the global postOfficeEditor to populate and show the modal
                if (window.postOfficeEditor) {
                    window.postOfficeEditor.populateForm(response.postOffice);
                } else {
                    console.error('PostOfficeEditor not initialized');
                    alert('Error: Post office editor not available');
                    $('#editModal').modal('hide');
                }
            } else {
                console.error('API Error:', response.error);
                alert('Error loading post office data: ' + (response.error || 'Unknown error'));
                $('#editModal').modal('hide');
            }
        })
        .catch(error => {
            // Remove loading indicator
            $('#editLoading').remove();
            console.error('Fetch Error:', error);
            alert('Error loading post office data: ' + error.message);
            $('#editModal').modal('hide');
        });
}

function populateEditModal(record) {
    const content = `
        <div class="container-fluid p-4">
            <form id="editForm">
                <div class="row">
                    <div class="col-md-6">
                        <div class="form-group">
                            <label for="postalOffice">Post Office Name</label>
                            <input type="text" class="form-control" id="postalOffice" value="${record.postalOffice || ''}">
                        </div>
                    </div>
                    <div class="col-md-6">
                        <div class="form-group">
                            <label for="area">Area</label>
                            <input type="text" class="form-control" id="area" value="${record.area || ''}">
                        </div>
                    </div>
                </div>
                <div class="row">
                    <div class="col-md-6">
                        <div class="form-group">
                            <label for="servicesProvided">Services Provided</label>
                            <select class="form-control" id="servicesProvided">
                                <option value="Acceptance Only" ${record.servicesProvided === 'Acceptance Only' ? 'selected' : ''}>Acceptance Only</option>
                                <option value="Delivered Only" ${record.servicesProvided === 'Delivered Only' ? 'selected' : ''}>Delivered Only</option>
                                <option value="Acceptance and Delivery" ${record.servicesProvided === 'Acceptance and Delivery' ? 'selected' : ''}>Acceptance and Delivery</option>
                            </select>
                        </div>
                    </div>
                    <div class="col-md-6">
                        <div class="form-group">
                            <label for="classification">Classification</label>
                            <select class="form-control" id="classification">
                                <option value="Regular" ${record.classification === 'Regular' ? 'selected' : ''}>Regular</option>
                                <option value="Extension" ${record.classification === 'Extension' ? 'selected' : ''}>Extension</option>
                                <option value="Mall" ${record.classification === 'Mall' ? 'selected' : ''}>Mall</option>
                                <option value="Campus" ${record.classification === 'Campus' ? 'selected' : ''}>Campus</option>
                                <option value="LGU" ${record.classification === 'LGU' ? 'selected' : ''}>LGU</option>
                                <option value="Private" ${record.classification === 'Private' ? 'selected' : ''}>Private</option>
                                <option value="Other" ${record.classification === 'Other' ? 'selected' : ''}>Other</option>
                            </select>
                        </div>
                    </div>
                </div>
                <div class="row">
                    <div class="col-md-6">
                        <div class="form-group">
                            <label for="noOfPostalTeller">No. Of Postal Teller</label>
                            <input type="number" class="form-control" id="noOfPostalTeller" value="${record.noOfPostalTeller || ''}">
                        </div>
                    </div>
                    <div class="col-md-6">
                        <div class="form-group">
                            <label for="noOfLetterCarriers">No. Of Letter Carriers</label>
                            <input type="number" class="form-control" id="noOfLetterCarriers" value="${record.noOfLetterCarriers || ''}">
                        </div>
                    </div>
                </div>
                <div class="row">
                    <div class="col-md-12">
                        <div class="form-group">
                            <label for="addressLine">Address</label>
                            <textarea class="form-control" id="addressLine" rows="3">${record.addressLine || ''}</textarea>
                        </div>
                    </div>
                </div>
                <div class="row">
                    <div class="col-md-6">
                        <div class="form-group">
                            <label for="contactNumber">Contact Number</label>
                            <input type="text" class="form-control" id="contactNumber" value="${record.contactNumber || ''}">
                        </div>
                    </div>
                    <div class="col-md-6">
                        <div class="form-group">
                            <label for="connectivityStatus">Connectivity Status</label>
                            <select class="form-control" id="connectivityStatus">
                                <option value="Connected" ${record.connectivityStatus === 'Connected' ? 'selected' : ''}>Connected</option>
                                <option value="Disconnected" ${record.connectivityStatus === 'Disconnected' ? 'selected' : ''}>Disconnected</option>
                                <option value="Pending" ${record.connectivityStatus === 'Pending' ? 'selected' : ''}>Pending</option>
                                <option value="Under Maintenance" ${record.connectivityStatus === 'Under Maintenance' ? 'selected' : ''}>Under Maintenance</option>
                            </select>
                        </div>
                    </div>
                </div>
            </form>
        </div>
    `;
    
    $('#editModalContent').html(content);
}

function deletePostOffice(id) {
    Swal.fire({
        title: 'Are you sure?',
        text: "You won't be able to revert this!",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#d33',
        cancelButtonColor: '#3085d6',
        confirmButtonText: 'Yes, delete it!'
    }).then((result) => {
        if (result.isConfirmed) {
            showPageLoader('Deleting record...');
            
            $.ajax({
                url: '/table/api/post-offices/' + id,
                method: 'DELETE',
                success: function(response) {
                    hidePageLoader();
                    
                    if (response.success) {
                        Swal.fire('Deleted!', 'Post office has been deleted.', 'success');
                        reloadTable();
                    } else {
                        Swal.fire('Error', response.message || 'Failed to delete post office', 'error');
                    }
                },
                error: function() {
                    hidePageLoader();
                    Swal.fire('Error', 'Failed to delete post office', 'error');
                }
            });
        }
    });
}

// Save changes handler
$('#saveChangesBtn').on('click', function() {
    if (!currentEditRecord) return;
    
    const formData = {
        id: currentEditRecord.id,
        postalOffice: $('#postalOffice').val(),
        area: $('#area').val(),
        servicesProvided: $('#servicesProvided').val(),
        classification: $('#classification').val(),
        noOfPostalTeller: $('#noOfPostalTeller').val(),
        noOfLetterCarriers: $('#noOfLetterCarriers').val(),
        addressLine: $('#addressLine').val(),
        contactNumber: $('#contactNumber').val(),
        connectivityStatus: $('#connectivityStatus').val()
    };
    
    showPageLoader('Saving changes...');
    
    $.ajax({
        url: '/table/api/post-offices/' + currentEditRecord.id,
        method: 'PUT',
        contentType: 'application/json',
        data: JSON.stringify(formData),
        success: function(response) {
            hidePageLoader();
            
            if (response.success) {
                Swal.fire('Success!', 'Post office updated successfully', 'success');
                $('#editModal').modal('hide');
                reloadTable();
            } else {
                Swal.fire('Error', response.message || 'Failed to update post office', 'error');
            }
        },
        error: function() {
            hidePageLoader();
            Swal.fire('Error', 'Failed to update post office', 'error');
        }
    });
});

// Sidebar navigation
$("#show-dashboard").click(function(e) {
    e.preventDefault();
    window.location.href = '/dashboard';
});

$("#show-data-table").click(function(e) {
    e.preventDefault();
    // Already on table page
});

$("#show-quarters").click(function(e) {
    e.preventDefault();
    window.location.href = '/quarters';
});

// Set DATA TABLE menu as active on page load
$(document).ready(function() {
    // Clear all active states first
    $('.sidebar-menu .nav-link-toggle').removeClass('active');
    // Set current page as active
    $("#show-data-table").addClass('active');
});

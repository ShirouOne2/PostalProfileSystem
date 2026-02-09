/**
 * Quarters Management Page - jQuery DataTables Version
 */

$(document).ready(function() {
   
    // ===============================
    // Manual Update Button
    // ===============================
    $('#manualUpdateBtn').on('click', function() {
        if (confirm('Update Quarter Data?\n\nThis will refresh the quarterly statistics')) {
            window.location.reload();
        }
    });

    // ===============================
    // Filter Change Handlers
    // ===============================
    $('#areaFilter, #quarterFilter, #statusFilter').on('change', function() {
        applyFilters();
    });

    function applyFilters() {
        const params = [];
        const area = $('#areaFilter').val();
        const quarter = $('#quarterFilter').val();
        const status = $('#statusFilter').val();

        if (area) params.push('areaFilter=' + encodeURIComponent(area));
        if (quarter) params.push('quarterFilter=' + encodeURIComponent(quarter));
        if (status) params.push('statusFilter=' + encodeURIComponent(status));

        window.location.href = '/quarters?' + params.join('&');
    }

    // ===============================
    // Year Selector Change
    // ===============================
    $('#yearSelector').on('change', function() {
        const year = $(this).val();
        if (year) {
            window.location.href = '/quarters?year=' + encodeURIComponent(year);
        }
    });

    // ===============================
    // Initialize DataTable for Post Offices
    // ===============================
    if ($('#postOfficeTable').length) {
        $('#postOfficeTable').DataTable({
            processing: true,
            serverSide: false,
            ajax: {
                url: '/api/post-offices',
                dataSrc: '' // Use the response array directly
            },
            columns: [
                { 
                    data: null,
                    render: function(data, type, row, meta) {
                        return meta.row + 1;
                    }
                },
                { 
                    data: 'areaId',
                    defaultContent: 'N/A',
                    render: function(data) {
                        return data ? 'Area ' + data : 'N/A';
                    }
                },
                { data: 'name', defaultContent: 'N/A' },
                { data: 'address', defaultContent: 'N/A' },
                { data: 'zipCode', defaultContent: 'N/A' },
                { 
                    data: 'speed',
                    defaultContent: 'N/A',
                    render: function(data) {
                        return data || 'N/A';
                    }
                },
                { 
                    data: 'status',
                    render: function(data) {
                        return data 
                            ? '<span class="badge badge-success">Active</span>' 
                            : '<span class="badge badge-danger">Inactive</span>';
                    }
                },
                { 
                    data: 'postmaster', 
                    defaultContent: 'N/A',
                    render: function(data) {
                        return data || 'N/A';
                    }
                },
                {
                    data: null,
                    render: function(data, type, row) {
                        return `
                            <button class="btn btn-sm btn-info" onclick="viewOffice(${row.id})" title="View Details">
                                <i class="fas fa-eye"></i>
                            </button>
                            <button class="btn btn-sm btn-warning" onclick="editOffice(${row.id})" title="Edit">
                                <i class="fas fa-edit"></i>
                            </button>
                            <button class="btn btn-sm btn-danger" onclick="deleteOffice(${row.id})" title="Delete">
                                <i class="fas fa-trash"></i>
                            </button>
                        `;
                    }
                }
            ],
            pageLength: 25,
            responsive: true,
            order: [[1, 'asc']],
            language: {
                emptyTable: "No post offices found",
                loadingRecords: "Loading...",
                processing: "Processing..."
            }
        });
    }

    // ===============================
    // Clickable Stat Cards
    // ===============================
    $('.clickable-card').on('click', function() {
        const filter = $(this).data('filter');
        const year = $(this).data('year');

        if (filter === 'connected') {
            window.location.href = '/quarters?statusFilter=active&year=' + encodeURIComponent(year);
        } else if (filter === 'disconnected') {
            window.location.href = '/quarters?statusFilter=inactive&year=' + encodeURIComponent(year);
        } else if (filter === 'all') {
            window.location.href = '/quarters?year=' + encodeURIComponent(year);
        }
    });

    // ===============================
    // Print Report Button
    // ===============================
    $('#printReportBtn').on('click', function() {
        window.print();
    });
});

// ===============================
// View Office Details
// ===============================
function viewOffice(id) {
    window.location.href = '/profile/' + id;
}

// ===============================
// Edit Office (placeholder)
// ===============================
function editOffice(id) {
    console.log('Edit office:', id);
    alert('Edit functionality coming soon...');
}

// ===============================
// Delete Office (placeholder)
// ===============================
function deleteOffice(id) {
    console.log('Delete office:', id);
    if (confirm('Delete Office?\n\nAre you sure you want to delete this office?')) {
        alert('Delete functionality coming soon...');
    }
}
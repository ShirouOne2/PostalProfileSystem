/**
 * Quarters Management Page - Main JavaScript
 */

$(document).ready(function() {
    console.log('Quarters page initialized');

    // ===============================
    // Manual Update Button
    // ===============================
    $('#manualUpdateBtn').on('click', function() {
        Swal.fire({
            title: 'Update Quarter Data?',
            text: 'This will refresh the quarterly statistics',
            icon: 'question',
            showCancelButton: true,
            confirmButtonText: 'Yes, Update',
            cancelButtonText: 'Cancel'
        }).then((result) => {
            if (result.isConfirmed) {
                window.location.reload();
            }
        });
    });

    // ===============================
    // Filter Change Handlers
    // ===============================
    $('#areaFilter, #quarterFilter, #statusFilter').on('change', function() {
        const params = [];
        const area = $('#areaFilter').val();
        const quarter = $('#quarterFilter').val();
        const status = $('#statusFilter').val();

        if (area) params.push('areaFilter=' + area);
        if (quarter) params.push('quarterFilter=' + quarter);
        if (status) params.push('statusFilter=' + status);

        window.location.href = '/quarters?' + params.join('&');
    });

    // ===============================
    // Year Selector Change
    // ===============================
    $('#yearSelector').on('change', function() {
        window.location.href = '/quarters?year=' + $(this).val();
    });

    // ===============================
    // Initialize DataTable for Post Offices
    // ===============================
    if ($('#postOfficeTable').length) {
        $('#postOfficeTable').DataTable({
            processing: true,
            serverSide: false,
            ajax: '/api/post-offices', // Replace with your API endpoint
            columns: [
                { 
                    data: null,
                    render: function(data, type, row, meta) {
                        return meta.row + 1; // Row number
                    }
                },
                { data: 'areaId', defaultContent: 'N/A' },
                { data: 'name', defaultContent: 'N/A' },
                { data: 'province', defaultContent: 'N/A' },
                { data: 'speed', defaultContent: 'N/A' },
                { 
                    data: 'status',
                    render: function(data) {
                        return data 
                            ? '<span class="badge badge-success">Active</span>' 
                            : '<span class="badge badge-danger">Inactive</span>';
                    }
                },
                { data: 'remarks', defaultContent: 'N/A' },
                {
                    data: null,
                    render: function(data, type, row) {
                        return `
                            <button class="btn btn-sm btn-warning" onclick="editOffice(${row.id})">
                                <i class="fas fa-edit"></i>
                            </button>
                            <button class="btn btn-sm btn-danger" onclick="deleteOffice(${row.id})">
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
            window.location.href = '/quarters?statusFilter=active&year=' + year;
        } else if (filter === 'disconnected') {
            window.location.href = '/quarters?statusFilter=inactive&year=' + year;
        } else if (filter === 'all') {
            window.location.href = '/quarters?year=' + year;
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
// Edit Office (placeholder)
// ===============================
function editOffice(id) {
    console.log('Edit office:', id);
    Swal.fire({
        icon: 'info',
        title: 'Edit Office',
        text: 'Edit functionality coming soon...'
    });
}

// ===============================
// Delete Office (placeholder)
// ===============================
function deleteOffice(id) {
    console.log('Delete office:', id);
    Swal.fire({
        title: 'Delete Office?',
        text: 'Are you sure you want to delete this office?',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'Yes, Delete',
        cancelButtonText: 'Cancel'
    }).then((result) => {
        if (result.isConfirmed) {
            Swal.fire('Deleted!', 'Delete functionality coming soon...', 'success');
        }
    });
}

// table.js - DataTable initialization and event handlers for Post Office Inventory

$(document).ready(function() {
    console.log('Initializing DataTable...');
    console.log('jQuery loaded:', typeof jQuery !== 'undefined');
    console.log('DataTables loaded:', typeof $.fn.DataTable !== 'undefined');
    
    // Initialize DataTable
    var table = $('#staticTable').DataTable({
        "responsive": true,
        "pageLength": 25,
        "lengthMenu": [[10, 25, 50, 100], [10, 25, 50, 100]],
        "dom": 'rtip',
        "pagingType": "full_numbers",
        "language": {
            "search": "Search:",
            "lengthMenu": "Show _MENU_ entries per page",
            "info": "Showing _START_ to _END_ of _TOTAL_ entries",
            "infoEmpty": "No entries available",
            "infoFiltered": "(filtered from _MAX_ total entries)",
            "zeroRecords": "No matching records found",
            "emptyTable": "No data available in table",
            "paginate": {
                "first": "First",
                "last": "Last",
                "next": "Next",
                "previous": "Previous"
            }
        },
        "order": [[2, 'asc'], [1, 'asc']],
        "columnDefs": [
            { 
                "orderable": false, 
                "targets": 0,
                "render": function (data, type, row, meta) {
                    return meta.row + meta.settings._iDisplayStart + 1;
                }
            },
            { "orderable": false, "targets": 5 }
        ],
        "drawCallback": function(settings) {
            console.log('Table drawn - Showing:', settings._iDisplayStart + 1, 'to', settings._iDisplayEnd, 'of', settings.fnRecordsTotal());
        }
    });

    console.log('DataTable initialized successfully');

    // Custom search input
    $('#tableSearch').on('keyup', function() {
        table.search(this.value).draw();
    });

    // Custom entries limit dropdown
    $('#entriesLimit').on('change', function() {
        table.page.len(parseInt(this.value)).draw();
    });

    // View button
    $(document).on('click', '.btn-view', function() {
        var officeId = $(this).data('id');
        window.location.href = '/post-offices/view/' + officeId;
    });

    // Edit button
    $(document).on('click', '.btn-edit', function() {
        var officeId = $(this).data('id');
        window.location.href = '/post-offices/edit/' + officeId;
    });

    // Delete button
    $(document).on('click', '.btn-delete', function() {
        var officeId = $(this).data('id');
        var officeName = $(this).data('name');
        
        if (confirm('Are you sure you want to delete "' + officeName + '"?\n\nThis action cannot be undone.')) {
            fetch('/post-offices/delete/' + officeId, {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' }
            })
            .then(function(response) {
                if (response.ok) {
                    alert('Post office "' + officeName + '" deleted successfully!');
                    location.reload();
                } else {
                    return response.json().then(function(data) {
                        throw new Error(data.message || 'Failed to delete post office');
                    });
                }
            })
            .catch(function(error) {
                console.error('Error:', error);
                alert('An error occurred while deleting the post office.\n\nError: ' + error.message);
            });
        }
    });

    // Store table instance globally
    window.postOfficeTable = table;
});
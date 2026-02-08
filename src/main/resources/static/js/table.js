$(document).ready(function() {
    console.log('Initializing DataTable...');

    // Destroy existing DataTable if already initialized
    if ($.fn.DataTable.isDataTable('#staticTable')) {
        console.log('DataTable already initialized, destroying it...');
        $('#staticTable').DataTable().destroy();
    }

    // Re-initialize DataTable
    var table = $('#staticTable').DataTable({
        responsive: true,
        pageLength: 25,
        lengthMenu: [[10, 25, 50, 100], [10, 25, 50, 100]],
        dom: 'rtip',
        pagingType: 'full_numbers',
        order: [[2, 'asc'], [1, 'asc']],
        columnDefs: [
            { 
                orderable: false, 
                targets: 0, // Row number column
                render: function(data, type, row, meta) {
                    return meta.row + meta.settings._iDisplayStart + 1;
                }
            },
            { orderable: false, targets: 5 } // Actions column
        ],
        language: {
            search: 'Search:',
            lengthMenu: 'Show _MENU_ entries per page',
            info: 'Showing _START_ to _END_ of _TOTAL_ entries',
            infoEmpty: 'No entries available',
            infoFiltered: '(filtered from _MAX_ total entries)',
            zeroRecords: 'No matching records found',
            emptyTable: 'No data available in table',
            paginate: {
                first: 'First',
                last: 'Last',
                next: 'Next',
                previous: 'Previous'
            }
        },
        drawCallback: function(settings) {
            console.log('Table drawn:', settings._iDisplayStart + 1, 'to', settings._iDisplayEnd, 'of', settings.fnRecordsTotal());
        }
    });

    console.log('DataTable initialized successfully');

    // The rest of your JS (search, entries, view/edit/delete buttons)
    // ...
});

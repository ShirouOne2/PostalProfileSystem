/**
 * Post Office Inventory DataTable Initialization
 * PHLPost - Post Office Management System
 */

$(document).ready(function() {
    // Initialize DataTable
    let table = new DataTable('#myTable', {
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
                first: "1",
                previous: "‹",
                next: "›",
                last: "»"
            },
            zeroRecords: "No matching records found"
        },
        
        // DOM layout - controls positioning of table elements
        dom: '<"top"lf>rt<"bottom"ip><"clear">',
        
        // Responsive
        responsive: true,
        
        // State saving - remembers page, sorting, etc.
        stateSave: true,
        stateDuration: 60 * 60, // 1 hour
        
        // Draw callback - runs after table is drawn
        drawCallback: function(settings) {
            console.log('Table drawn with ' + settings.aoData.length + ' records');
        }
    });
    
    console.log('DataTable initialized successfully');
});
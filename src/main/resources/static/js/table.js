/**
 * Post Office Inventory DataTable Initialization
 * PHLPost - Post Office Management System
 * Vanilla JavaScript version (still uses DataTables library but no jQuery wrapper)
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
                first: "«",
                previous: "‹",
                next: "›",
                last: "»"
            },
            zeroRecords: "No matching records found"
        },
        
        // DOM layout
        dom: '<"top"lf>rt<"bottom"ip><"clear">',
        
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
    
    // Attach delete button event listeners
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
    
    // Initial attachment of delete listeners
    attachDeleteButtonListeners();
    
    console.log('DataTable initialized successfully');
});

/**
 * Handle delete action
 */
function handleDelete(officeId, officeName) {
    if (!confirm(`Are you sure you want to delete "${officeName}"?\n\nThis action cannot be undone!`)) {
        return;
    }
    
    // Show loading state
    const loadingDiv = document.createElement('div');
    loadingDiv.innerHTML = '<div style="position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);background:white;padding:20px;border-radius:8px;box-shadow:0 2px 10px rgba(0,0,0,0.1);z-index:9999"><i class="fas fa-spinner fa-spin"></i> Deleting...</div>';
    document.body.appendChild(loadingDiv);
    
    fetch('/api/postal-office/' + officeId, {
        method: 'DELETE'
    })
    .then(response => response.json())
    .then(data => {
        document.body.removeChild(loadingDiv);
        
        if (data.success) {
            alert('Post office deleted successfully!');
            window.location.reload();
        } else {
            alert('Error: ' + data.message);
        }
    })
    .catch(error => {
        document.body.removeChild(loadingDiv);
        console.error('Error:', error);
        alert('Failed to delete post office');
    });
}
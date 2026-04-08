/**
 * Dashboard — Stats Cards + Filter Panel + System Admin Table
 *
 * System Admin columns: # | Name | Area | Province | City | Connection | Office | Actions
 * Area Admin columns: # | Name | Province | City | Connectivity | Office Status | Actions (Area hidden)
 * User columns: # | Name | Province | City | Connectivity | Office Status | Actions (Area hidden)
 *
 * Edit modal handled by edit-modal.js — do NOT bind .btn-edit here.
 */

let dashboardTable;
let map;
let markers = [];
let markerClusterGroup;

// Detect which table layout is rendered (set by Thymeleaf th:if="${isSystemAdmin}")
const IS_ADMIN = document.body?.dataset?.isSystemAdmin === 'true' || 
    (document.getElementById('systemAdminTable')
    ?.querySelector('thead th:nth-child(3)')
    ?.textContent.trim().toLowerCase().includes('area') ?? false);

// Also check if user is Area Admin by looking for the isAreaAdmin data attribute
const IS_AREA_ADMIN = document.body?.dataset?.isAreaAdmin === 'true' || false;
const IS_PRIVILEGED_USER = IS_ADMIN || IS_AREA_ADMIN;

document.addEventListener('DOMContentLoaded', function () {

    // ── Initialize Stats Cards ─────────────────────────────────────────────
    initializeStatsCards();

    // ── Initialize Filter Panel ───────────────────────────────────────────
    initializeFilterPanel();

    // ── Initialize System Admin Table (if visible) ───────────────────────
    if (IS_ADMIN && document.getElementById('systemAdminTable')) {
        initializeSystemAdminTable();
    }

    // ── Initialize Regular Dashboard Table (if visible) ───────────────────
    if (!IS_ADMIN && document.getElementById('officeTable')) {
        initializeOfficeTable();
    }

    // ── Initialize Map ─────────────────────────────────────────────────────
    if (document.getElementById('map')) {
        initializeMap();
    }
});

// ── Stats Cards Functionality ───────────────────────────────────────────
function initializeStatsCards() {
    // Stats cards are static from server, no additional JS needed initially
    // Can add real-time updates here if needed
}

// ── Filter Panel Functionality ───────────────────────────────────────────
function initializeFilterPanel() {
    const toggleFilterBody = document.getElementById('toggleFilterBody');
    const filterBody = document.getElementById('filterBody');
    const filterChevron = document.getElementById('filterChevron');
    const applyFilters = document.getElementById('applyFilters');
    const resetFilters = document.getElementById('resetFilters');

    // Toggle filter body visibility
    if (toggleFilterBody && filterBody && filterChevron) {
        toggleFilterBody.addEventListener('click', function() {
            const isHidden = filterBody.style.display === 'none';
            filterBody.style.display = isHidden ? 'block' : 'none';
            filterChevron.className = isHidden ? 'fas fa-chevron-up' : 'fas fa-chevron-down';
        });
    }

    // Apply filters
    if (applyFilters) {
        applyFilters.addEventListener('click', function() {
            applyTableFilters();
        });
    }

    // Reset filters
    if (resetFilters) {
        resetFilters.addEventListener('click', function() {
            resetTableFilters();
        });
    }

    // Enter key on search input
    const searchInput = document.getElementById('tableSearchInput');
    if (searchInput) {
        searchInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                applyTableFilters();
            }
        });
    }
}

function applyTableFilters() {
    const tableId = IS_ADMIN ? '#systemAdminTable' : '#officeTable';
    if (!$.fn.DataTable.isDataTable(tableId)) return;
    const table = $(tableId).DataTable();
    
    const searchValue = document.getElementById('tableSearchInput')?.value || '';
    const areaValue = document.getElementById('filterArea')?.value || '';
    const connectivityValue = document.getElementById('filterConnectivity')?.value || '';
    const officeStatusValue = document.getElementById('filterOfficeStatus')?.value || '';

    // Apply search
    table.search(searchValue);

    if (IS_ADMIN) {
        // Admin: # | Name(1) | Area(2) | Province(3) | City(4) | Conn(5) | Office(6) | Remarks(7) | Actions(8)
        table.column(2).search(areaValue ? areaValue : '');
        table.column(5).search(connectivityValue ? (connectivityValue === 'true' ? 'Active' : 'Inactive') : '');
        table.column(6).search(officeStatusValue ? officeStatusValue : '');
    } else {
        // Non-admin filtering logic
        if (IS_AREA_ADMIN) {
            // Area Admin: #(0) | Name(1) | Area(2) | Province(3) | City(4) | Conn(5) | Office(6) | Actions(7)
            table.column(2).search(areaValue ? areaValue : '');
            table.column(5).search(connectivityValue ? (connectivityValue === 'true' ? 'Active' : 'Inactive') : '');
            table.column(6).search(officeStatusValue ? officeStatusValue : '');
        } else {
            // Regular User: #(0) | Name(1) | Province(2) | City(3) | Conn(4) | Office(5) | Actions(6)
            table.column(4).search(connectivityValue ? (connectivityValue === 'true' ? 'Active' : 'Inactive') : '');
            table.column(5).search(officeStatusValue ? officeStatusValue : '');
        }
    }

    table.draw();
    updateActiveFilterCount();
}

function resetTableFilters() {
    const tableId = IS_ADMIN ? '#systemAdminTable' : '#officeTable';
    if (!$.fn.DataTable.isDataTable(tableId)) return;
    const table = $(tableId).DataTable();
    
    // Reset all filters
    table.search('').columns().search('').draw();

    // Reset form inputs
    if (document.getElementById('tableSearchInput')) document.getElementById('tableSearchInput').value = '';
    if (document.getElementById('filterArea')) document.getElementById('filterArea').value = '';
    if (document.getElementById('filterConnectivity')) document.getElementById('filterConnectivity').value = '';
    if (document.getElementById('filterOfficeStatus')) document.getElementById('filterOfficeStatus').value = '';

    updateActiveFilterCount();
}

function updateActiveFilterCount() {
    const searchInput = document.getElementById('tableSearchInput')?.value || '';
    const areaValue = document.getElementById('filterArea')?.value || '';
    const connectivityValue = document.getElementById('filterConnectivity')?.value || '';
    const officeStatusValue = document.getElementById('filterOfficeStatus')?.value || '';

    const activeFilters = [searchInput, areaValue, connectivityValue, officeStatusValue].filter(v => v !== '').length;
    const badge = document.getElementById('activeFilterCount');
    
    if (badge) {
        if (activeFilters > 0) {
            badge.textContent = activeFilters;
            badge.style.display = 'inline-block';
        } else {
            badge.style.display = 'none';
        }
    }

    // Update summary text
    const tableId = IS_ADMIN ? '#systemAdminTable' : '#officeTable';
    if ($.fn.DataTable.isDataTable(tableId)) {
        const table = $(tableId).DataTable();
        const summaryText = document.getElementById('tableSummaryText');
        if (summaryText) {
            const total = table.data().length;
            const filtered = table.rows({search: 'applied'}).count();
            summaryText.textContent = filtered === total ? `${total} offices` : `${filtered} of ${total} offices`;
        }
    }
}

// ── System Admin Table Functionality ───────────────────────────────────────
function initializeSystemAdminTable() {
    if ($.fn.DataTable.isDataTable('#systemAdminTable')) {
        $('#systemAdminTable').DataTable().destroy();
    }

    const adminColumnDefs = [
        { targets: 0, width: '45px', orderable: false, className: 'dt-center', render: function(data, type, row, meta) {
            return meta.row + meta.settings._iDisplayStart + 1;
        }},
        { targets: 1, orderable: true, render: function(data, type, row, meta) {
            if (!data) return 'N/A';
            var trNode = meta.settings.aoData[meta.row].nTr;
            var officeId = trNode ? trNode.getAttribute('data-office-id') : '';
            return '<a href="#" class="office-name-link" data-office-id="' + officeId + '" data-office-name="' + data.replace(/"/g, '&quot;') + '" onclick="openOfficeProfilePopup(this.dataset.officeId, this.dataset.officeName); return false;">' + data + '</a>';
        }},
        { targets: 2, orderable: true },   // Area
        { targets: 3, orderable: true },   // Province
        { targets: 4, orderable: true },   // City/Municipality
        { targets: 5, width: '120px', orderable: true, className: 'dt-center' },  // Connection
        { targets: 6, width: '105px', orderable: true, className: 'dt-center' },  // Office Status
        { targets: 7, width: '120px', orderable: false, className: 'dt-center', searchable: false } // Actions
    ];

    dashboardTable = $('#systemAdminTable').DataTable({
        pageLength: 25,
        lengthMenu: [10, 25, 50, 100],
        paging: true,
        ordering: true,
        info: true,
        searching: true,
        serverSide: false,

        columnDefs: adminColumnDefs,
        order: [[2, ''], [1, '']], // Sort by Area then Name

        language: {
            search: '',
            searchPlaceholder: 'Quick search...',
            lengthMenu: 'Show _MENU_ entries',
            info: 'Showing _START_–_END_ of _TOTAL_ offices',
            infoEmpty: 'No offices found',
            infoFiltered: '(filtered from _MAX_ total)',
            paginate: { first: '«', previous: '‹', next: '›', last: '»' },
            zeroRecords: 'No matching offices found'
        },

        dom: '<"dt-length-wrap"l>rt<"dt-footer d-flex align-items-center justify-content-between mt-3"ip>',
        responsive: true,
        initComplete: function() {
            updateActiveFilterCount();
        }
    });
}

// ── Regular Office Table Functionality ───────────────────────────────────────
function initializeOfficeTable() {
    if ($.fn.DataTable.isDataTable('#officeTable')) {
        $('#officeTable').DataTable().destroy();
    }

    // Dynamic column definitions based on user role
    let userColumnDefs;
    
    if (IS_AREA_ADMIN) {
        // Area Admin: 8 columns including Area
        userColumnDefs = [
            { targets: 0, width: '60px', orderable: false, className: 'dt-center', render: function(data, type, row, meta) {
                return meta.row + meta.settings._iDisplayStart + 1;
            }}, // #
            { targets: 1, orderable: true, render: function(data, type, row, meta) {
                if (!data) return 'N/A';
                var trNode = meta.settings.aoData[meta.row].nTr;
                var officeId = trNode ? trNode.getAttribute('data-office-id') : '';
                return '<a href="#" class="office-name-link" data-office-id="' + officeId + '" data-office-name="' + data.replace(/"/g, '&quot;') + '" onclick="openOfficeProfilePopup(this.dataset.officeId, this.dataset.officeName); return false;">' + data + '</a>';
            }},   // Name
            { targets: 2, orderable: true },   // Area
            { targets: 3, orderable: true },   // Province
            { targets: 4, orderable: true },   // City/Municipality
            { targets: 5, orderable: true, className: 'dt-center' }, // Connectivity
            { targets: 6, orderable: true, className: 'dt-center' }, // Office Status
            { targets: 7, width: '120px', orderable: false, className: 'dt-center', searchable: false } // Actions
        ];
    } else {
        // Regular User: 7 columns (no Area column)
        userColumnDefs = [
            { targets: 0, width: '60px', orderable: false, className: 'dt-center', render: function(data, type, row, meta) {
                return meta.row + meta.settings._iDisplayStart + 1;
            }}, // #
            { targets: 1, orderable: true, render: function(data, type, row, meta) {
                if (!data) return 'N/A';
                var trNode = meta.settings.aoData[meta.row].nTr;
                var officeId = trNode ? trNode.getAttribute('data-office-id') : '';
                return '<a href="#" class="office-name-link" data-office-id="' + officeId + '" data-office-name="' + data.replace(/"/g, '&quot;') + '" onclick="openOfficeProfilePopup(this.dataset.officeId, this.dataset.officeName); return false;">' + data + '</a>';
            }},   // Name
            { targets: 2, orderable: true },   // Province
            { targets: 3, orderable: true },   // City/Municipality
            { targets: 4, orderable: true, className: 'dt-center' }, // Connectivity
            { targets: 5, orderable: true, className: 'dt-center' }, // Office Status
            { targets: 6, width: '120px', orderable: false, className: 'dt-center', searchable: false } // Actions
        ];
    }

    dashboardTable = $('#officeTable').DataTable({
        pageLength: 25,
        lengthMenu: [10, 25, 50, 100],
        paging: true,
        ordering: true,
        info: true,
        searching: true,
        serverSide: false,

        columnDefs: userColumnDefs,
        order: [[1, '']], // Sort by Name

        language: {
            search: '',
            searchPlaceholder: 'Quick search...',
            lengthMenu: 'Show _MENU_ entries',
            info: 'Showing _START_–_END_ of _TOTAL_ offices',
            infoEmpty: 'No offices found',
            infoFiltered: '(filtered from _MAX_ total)',
            paginate: { first: '«', previous: '‹', next: '›', last: '»' },
            zeroRecords: 'No matching offices found'
        },

        dom: '<"dt-length-wrap"l>rt<"dt-footer d-flex align-items-center justify-content-between mt-3"ip>',
        responsive: true,
        initComplete: function() {
            updateActiveFilterCount();
        }
    });
}

// ── Map Functionality ─────────────────────────────────────────────────────
function initializeMap() {
    // Initialize map if map element exists
    if (typeof L !== 'undefined' && document.getElementById('map')) {
        map = L.map('map').setView([14.5995, 120.9842], 6); // Philippines center

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap contributors'
        }).addTo(map);

        // Add markers for offices
        addOfficeMarkers();
    }
}

function addOfficeMarkers() {
    // This would typically fetch office coordinates and add markers
    // Implementation depends on your data structure
}

// ── Export Functionality ───────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', function() {
    const exportBtn = document.getElementById('exportBtn');
    if (exportBtn) {
        exportBtn.addEventListener('click', function() {
            exportTableData();
        });
    }

    const refreshBtn = document.getElementById('refreshBtn');
    if (refreshBtn) {
        refreshBtn.addEventListener('click', function() {
            location.reload();
        });
    }
});

// ── Edit Button Handler for Dashboard ─────────────────────────────────────
// Fetch office data via API using the office ID stored on the button
$(document).on('click', '.btn-edit', function () {
    var id = $(this).data('office-id');
    if (!id) return;

    $.getJSON('/api/postal-office/' + id)
        .done(function (d) {
            if (typeof window.openModal === 'function') {
                window.openModal(d);
            } else {
                Swal.fire('Error', 'Edit modal not properly loaded', 'error');
            }
        })
        .fail(function (xhr) {
            Swal.fire('Error', (xhr.responseJSON || {}).message || 'Failed to load office data.', 'error');
        });
});

function exportTableData() {
    const tableId = IS_ADMIN ? '#systemAdminTable' : '#officeTable';
    const table = $(tableId).DataTable();
    
    // Export to CSV
    const csvData = table.data().toArray().map(function(row) {
        return row.join(',');
    }).join('\n');
    
    const blob = new Blob([csvData], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'postal-offices-' + new Date().toISOString().split('T')[0] + '.csv';
    a.click();
    window.URL.revokeObjectURL(url);
}

// ── Cleanup ───────────────────────────────────────────────────────────────
window.addEventListener('beforeunload', function () {
    const tableId = IS_ADMIN ? '#systemAdminTable' : '#officeTable';
    if (dashboardTable && $.fn.DataTable.isDataTable(tableId)) {
        dashboardTable.destroy();
    }
    document.getElementById('editOfficeModal')?.remove();
});
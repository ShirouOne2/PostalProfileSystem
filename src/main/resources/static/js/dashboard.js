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

(function () {
    'use strict';

    /* ── Detect role from rendered table ────────────────── */
    const IS_ADMIN = !!document.querySelector('#dashTable thead th:nth-child(3)')
            ?.textContent.trim().toLowerCase().includes('area');

    let dashTable;
    let pendingArchiveId = null;

    /* ── Bootstrap DataTable ────────────────────────────── */
    document.addEventListener('DOMContentLoaded', function () {

        if ($.fn.DataTable.isDataTable('#dashTable')) {
            $('#dashTable').DataTable().destroy();
        }

        const adminCols = [
            { targets: 0, width: '45px', orderable: false, className: 'dt-center',
                  render: (d, t, r, meta) => meta.row + meta.settings._iDisplayStart + 1 },
            { targets: 1, orderable: true },
            { targets: 2, orderable: true },
            { targets: 3, orderable: true },
            { targets: 4, orderable: true },
            { targets: 5, width: '120px', orderable: true, className: 'dt-center' },
            { targets: 6, width: '105px', orderable: true, className: 'dt-center' },
            { targets: 7, orderable: false },
            { targets: 8, width: '120px', orderable: false, className: 'dt-center', searchable: false }
        ];

        const userCols = [
            { targets: 0, width: '45px', orderable: false, className: 'dt-center',
                  render: (d, t, r, meta) => meta.row + meta.settings._iDisplayStart + 1 },
            { targets: 1, orderable: true },
            { targets: 2, width: '140px', orderable: true, className: 'dt-center' },
            { targets: 3, width: '120px', orderable: true },
            { targets: 4, orderable: false },
            { targets: 5, width: '110px', orderable: false, className: 'dt-center', searchable: false }
        ];

        dashTable = new DataTable('#dashTable', {
            pageLength: 25,
            lengthMenu: [10, 25, 50, 100],
            paging:    true,
            ordering:  true,
            info:      true,
            searching: true,
            serverSide: false,
            columnDefs: IS_ADMIN ? adminCols : userCols,
            order: IS_ADMIN ? [[2, 'asc'], [1, 'asc']] : [[1, 'asc']],
            language: {
                search: '', searchPlaceholder: 'Quick search…',
                lengthMenu: 'Show _MENU_ entries',
                info: 'Showing _START_–_END_ of _TOTAL_ offices',
                infoEmpty: 'No offices found',
                infoFiltered: '(filtered from _MAX_ total)',
                paginate: { first: '«', previous: '‹', next: '›', last: '»' },
                zeroRecords: 'No matching offices found'
            },
            dom: '<"dt-length-wrap"l>rt<"dt-footer d-flex align-items-center justify-content-between mt-3"ip>',
            responsive: true,
            stateSave: false,
            drawCallback: function () { updateSummary(this.api()); }
        });

        /* Hide default DT search */
        document.querySelector('.dataTables_filter')?.style.setProperty('display','none','important');

        /* Wire filters */
        initFilters();
        updateSummary(dashTable);
    });

    /* ── Filters ────────────────────────────────────────── */
    function initFilters() {
        /* Toggle panel */
        document.getElementById('dashToggleFilterBody')?.addEventListener('click', function () {
            const body    = document.getElementById('dashFilterBody');
            const chevron = document.getElementById('dashFilterChevron');
            const hidden  = body.classList.toggle('d-none');
            chevron.classList.toggle('fa-chevron-up',  !hidden);
            chevron.classList.toggle('fa-chevron-down', hidden);
        });

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

        /* Clear search × */
        document.getElementById('dashClearSearchBtn')?.addEventListener('click', function () {
            document.getElementById('dashSearchInput').value = '';
            applyFilters();
        });

        /* Live search */
        let timer;
        document.getElementById('dashSearchInput')?.addEventListener('input', function () {
            clearTimeout(timer);
            timer = setTimeout(applyFilters, 300);
        });
        document.getElementById('dashSearchInput')?.addEventListener('keydown', function (e) {
            if (e.key === 'Enter') { e.preventDefault(); applyFilters(); }
        });

        /* Instant on dropdown */
        ['dashFilterArea', 'dashFilterConnStatus', 'dashFilterOfficeStatus'].forEach(id => {
            document.getElementById(id)?.addEventListener('change', applyFilters);
        });

        /* Print / Export */
        document.getElementById('dashPrintBtn')?.addEventListener('click', printReport);
        document.getElementById('dashExportBtn')?.addEventListener('click', exportCSV);

        /* Archive modal */
        document.querySelectorAll('.btn-archive').forEach(btn => {
            btn.addEventListener('click', function () {
                pendingArchiveId = this.dataset.officeId;
                document.getElementById('dashArchiveOfficeName').textContent = this.dataset.officeName;
                $('#dashArchiveModal').modal('show');
            });
        });

        document.getElementById('dashConfirmArchiveBtn')?.addEventListener('click', confirmArchive);
    }

    /* ── Apply Filters ───────────────────────────────────── */
    function applyFilters() {
        const search = document.getElementById('dashSearchInput')?.value.trim() || '';
        const area   = document.getElementById('dashFilterArea')?.value || '';
        const conn   = document.getElementById('dashFilterConnStatus')?.value || '';
        const office = document.getElementById('dashFilterOfficeStatus')?.value || '';

        // Build regex filters
        const searchRegex = search ? new RegExp(search, 'i') : null;
        const areaRegex   = area   ? new RegExp(area, 'i')   : null;
        const connRegex   = conn   ? new RegExp(conn, 'i')   : null;
        const officeRegex = office ? new RegExp(office, 'i') : null;

        // Apply filters
        dashTable.column(1).search(searchRegex ? searchRegex : '').draw();
        if (IS_ADMIN) {
            dashTable.column(2).search(areaRegex ? areaRegex : '').draw();
            dashTable.column(5).search(connRegex ? connRegex : '').draw();
            dashTable.column(6).search(officeRegex ? officeRegex : '').draw();
        } else {
            dashTable.column(2).search(connRegex ? connRegex : '').draw();
        }

        updateActiveFilterTags(search, area, conn, office);
        updateFilterCount(search, area, conn, office);
    }

    /* ── Clear Filters ───────────────────────────────────── */
    function clearFilters() {
        document.getElementById('dashSearchInput').value = '';
        document.getElementById('dashFilterArea').value = '';
        document.getElementById('dashFilterConnStatus').value = '';
        document.getElementById('dashFilterOfficeStatus').value = '';

        // Remove visual states
        document.querySelectorAll('.filter-input, .filter-select').forEach(el => {
            el.classList.remove('has-value');
        });

        applyFilters();
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
        if (area) {
            container.appendChild(createTag('area', area, 'fas fa-map-marker-alt'));
        }
        if (conn) {
            container.appendChild(createTag('active', conn, 'fas fa-wifi'));
        }
        if (office) {
            container.appendChild(createTag('open', office, 'fas fa-door-open'));
        }
    }

    function createTag(type, value, icon) {
        const tag = document.createElement('span');
        tag.className = `filter-tag-pill tag-${type}`;
        tag.innerHTML = `
            <i class="${icon} mr-1"></i>${value}
            <button class="tag-remove-btn" onclick="removeFilter('${type}')">×</button>
        `;
        return tag;
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
        applyFilters();
    }

    /* ── Update Filter Count ─────────────────────────────── */
    function updateFilterCount(search, area, conn, office) {
        const count = [search, area, conn, office].filter(v => v).length;
        const badge = document.getElementById('dashActiveFilterCount');
        if (count > 0) {
            badge.textContent = count;
            badge.style.display = 'inline-block';
        } else {
            badge.style.display = 'none';
        }
    }

    /* ── Update Summary ────────────────────────────────────── */
    function updateSummary(api) {
        const total = api.page.info().recordsDisplay;
        const filtered = api.rows({search:'applied'}).count();
        const summary = document.getElementById('dashSummaryText');
        if (filtered < total) {
            summary.textContent = `Showing ${filtered} of ${total} offices`;
        } else {
            summary.textContent = `${total} offices total`;
        }
    }

    /* ── Print Report ───────────────────────────────────────── */
    function printReport() {
        const printWindow = window.open('', '_blank');
        const table = document.getElementById('dashTable').cloneNode(true);
        
        // Remove action column for print
        table.querySelectorAll('th:last-child, td:last-child').forEach(el => el.remove());
        
        printWindow.document.write(`
            <html>
            <head>
                <title>Post Office Dashboard Report</title>
                <style>
                    body { font-family: Arial, sans-serif; margin: 20px; }
                    table { width: 100%; border-collapse: collapse; }
                    th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
                    th { background-color: #f2f2f2; font-weight: bold; }
                    .text-center { text-align: center; }
                </style>
            </head>
            <body>
                <h2>Post Office Dashboard Report</h2>
                <p>Generated: ${new Date().toLocaleString()}</p>
                ${table.outerHTML}
            </body>
            </html>
        `);
        printWindow.document.close();
        printWindow.print();
    }

    /* ── Export CSV ─────────────────────────────────────────── */
    function exportCSV() {
        const rows = dashTable.data().toArray();
        const headers = IS_ADMIN 
            ? ['Name', 'Area', 'Region', 'City/Municipality', 'Connection', 'Office Status', 'Remarks']
            : ['Name', 'Connection Status', 'Speed', 'Remarks'];
        
        let csv = headers.join(',') + '\n';
        
        rows.forEach(row => {
            const data = IS_ADMIN
                ? [row[1], row[2], row[3], row[4], 
                   row[5].includes('Active') ? 'Active' : 'Inactive',
                   row[6].includes('Open') ? 'Open' : row[6].includes('Closed') ? 'Closed' : 'Unknown',
                   row[7]]
                : [row[1], 
                   row[2].includes('Active') ? 'Active' : 'Inactive',
                   row[3],
                   row[4]];
            
            csv += data.map(field => `"${field}"`).join(',') + '\n';
        });
        
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `post-office-dashboard-${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
        window.URL.revokeObjectURL(url);
    }

    /* ── View Office Details ───────────────────────────────── */
    function dashViewOffice(officeId) {
        window.location.href = `/profile/${officeId}`;
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

    /* ── Confirm Archive ───────────────────────────────────── */
    function confirmArchive() {
        if (!pendingArchiveId) return;
        
        const reason = document.getElementById('dashArchiveReasonInput').value.trim();
        
        fetch('/archive/archive', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: `id=${pendingArchiveId}&reason=${encodeURIComponent(reason)}`
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                Swal.fire('Success!', 'Post office archived successfully.', 'success')
                    .then(() => location.reload());
            } else {
                Swal.fire('Error!', data.message || 'Failed to archive post office.', 'error');
            }
        })
        .catch(error => {
            console.error('Archive error:', error);
            Swal.fire('Error!', 'An unexpected error occurred.', 'error');
        })
        .finally(() => {
            $('#dashArchiveModal').modal('hide');
            pendingArchiveId = null;
            document.getElementById('dashArchiveReasonInput').value = '';
        });
    }
    document.getElementById('editOfficeModal')?.remove();
});

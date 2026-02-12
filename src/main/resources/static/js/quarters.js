/**
 * Quarters Management Page
 * Includes full filter support: Year, Quarter (Q1â€“Q4), Area, Status (Active/Inactive)
 */

$(document).ready(function () {
    console.log('âœ… Quarters.js loaded');

    createMapModal();
    initializeTable();
    initializeButtons();
    initializeFilters();
    initializeYearSelector();
    initializeClickableCards();
    initializeMapModal();
    checkCurrentQuarterSnapshot();
    initializeFilterPanel();
});


/* =====================================================
   FILTER PANEL
===================================================== */
function initializeFilterPanel() {

    // â”€â”€ Collapse / expand toggle â”€â”€
    $('#toggleFiltersBtn').on('click', function () {
        const body    = $('#filterBody');
        const chevron = $('#filterChevron');

        body.toggleClass('collapsed');
        chevron.toggleClass('fa-chevron-up fa-chevron-down');
    });

    // â”€â”€ Highlight selects that already have a value (page load) â”€â”€
    highlightActiveSelects();

    // â”€â”€ Render any pre-selected tags from URL params â”€â”€
    renderFilterTags();

    // â”€â”€ Apply button â”€â”€
    $('#applyFiltersBtn').off('click').on('click', function () {
        applyFilters();
    });

    // â”€â”€ Clear button â”€â”€
    $('#clearFiltersBtn').off('click').on('click', function () {
        clearFilters();
    });

    // â”€â”€ Live highlight on change â”€â”€
    $('#yearSelector, #quarterFilter, #areaFilter, #statusFilter').on('change', function () {
        highlightActiveSelects();
        renderFilterTags();
    });

    // â”€â”€ Allow pressing Enter in any select to apply â”€â”€
    $('#yearSelector, #quarterFilter, #areaFilter, #statusFilter').on('keypress', function (e) {
        if (e.key === 'Enter') applyFilters();
    });
}

/**
 * Build query string from current filter values and navigate.
 */
function applyFilters() {
    const year    = $('#yearSelector').val();
    const quarter = $('#quarterFilter').val();
    const area    = $('#areaFilter').val();
    const status  = $('#statusFilter').val();

    const params = [];
    if (year)    params.push('year='          + encodeURIComponent(year));
    if (quarter) params.push('quarterFilter=' + encodeURIComponent(quarter));
    if (area)    params.push('areaFilter='    + encodeURIComponent(area));
    if (status)  params.push('statusFilter='  + encodeURIComponent(status));

    const url = '/quarters' + (params.length ? '?' + params.join('&') : '');

    // Provide visual feedback before navigating
    $('#applyFiltersBtn')
        .addClass('loading')
        .html('<i class="fas fa-spinner fa-spin mr-1"></i> Applying...');

    window.location.href = url;
}

/**
 * Reset all filters and go back to base page.
 */
function clearFilters() {
    $('#yearSelector').val('');
    $('#quarterFilter').val('');
    $('#areaFilter').val('');
    $('#statusFilter').val('');
    highlightActiveSelects();
    renderFilterTags();

    window.location.href = '/quarters';
}

/**
 * Add/remove the .has-value CSS class on each select.
 */
function highlightActiveSelects() {
    $('#yearSelector, #quarterFilter, #areaFilter, #statusFilter').each(function () {
        if ($(this).val()) {
            $(this).addClass('has-value');
        } else {
            $(this).removeClass('has-value');
        }
    });
}

/**
 * Read current select values and render pill tags above the action buttons.
 */
function renderFilterTags() {
    const container = $('#activeFilterTags');
    container.empty();

    const year    = $('#yearSelector').val();
    const quarter = $('#quarterFilter').val();
    const area    = $('#areaFilter option:selected').text().trim();
    const areaVal = $('#areaFilter').val();
    const status  = $('#statusFilter').val();

    if (year) {
        container.append(buildTag('tag-year', 'fas fa-calendar', 'Year: ' + year, 'yearSelector'));
    }
    if (quarter) {
        const qLabel = getQuarterLabel(quarter);
        container.append(buildTag('tag-quarter', 'fas fa-layer-group', qLabel, 'quarterFilter'));
    }
    if (areaVal) {
        container.append(buildTag('tag-area', 'fas fa-map-marker-alt', 'Area: ' + area, 'areaFilter'));
    }
    if (status) {
        const isActive = status === 'active';
        const cls      = isActive ? 'tag-status-active' : 'tag-status-inactive';
        const icon     = isActive ? 'fas fa-check-circle' : 'fas fa-times-circle';
        const label    = isActive ? 'Active' : 'Inactive';
        container.append(buildTag(cls, icon, label, 'statusFilter'));
    }
}

function getQuarterLabel(q) {
    const map = {
        Q1: 'Q1 (Janâ€“Mar)',
        Q2: 'Q2 (Aprâ€“Jun)',
        Q3: 'Q3 (Julâ€“Sep)',
        Q4: 'Q4 (Octâ€“Dec)'
    };
    return map[q] || q;
}

function buildTag(extraClass, iconClass, text, selectId) {
    return $(`
        <span class="filter-tag ${extraClass}">
            <i class="${iconClass} mr-1"></i>${text}
            <button class="remove-tag" title="Remove filter" data-target="${selectId}">
                <i class="fas fa-times"></i>
            </button>
        </span>
    `).on('click', '.remove-tag', function () {
        const target = $(this).data('target');
        $('#' + target).val('');
        highlightActiveSelects();
        renderFilterTags();
    });
}


/* =====================================================
   TABLE INITIALIZATION
===================================================== */
function initializeTable() {
    if (!$('#postOfficeTable').length) return;

    if ($.fn.DataTable.isDataTable('#postOfficeTable')) {
        $('#postOfficeTable').DataTable().destroy();
        $('#postOfficeTable').empty();
    }

    // Read filter values set by the current URL / selects
    const areaFilter   = $('#areaFilter').val()   || '';
    const statusFilter = $('#statusFilter').val() || '';

    const table = $('#postOfficeTable').DataTable({
        processing: true,
        serverSide: false,
        ajax: {
            url: '/api/post-offices/all',
            dataSrc: ''
        },
        columnDefs: [
            { targets: [4], visible: false, searchable: false }
        ],
        columns: [
            { data: null,      render: (d, t, r, m) => m.row + 1 },
            { data: 'areaId',  render: d => d ? 'Area ' + d : 'N/A' },
            { data: 'name',    defaultContent: 'N/A' },
            { data: 'address', defaultContent: 'N/A' },
            { data: 'zipCode', defaultContent: 'N/A' },
            { data: 'isp',     defaultContent: 'N/A' },
            {
                data: 'status',
                render: d => d
                    ? '<span class="badge badge-success">Active</span>'
                    : '<span class="badge badge-danger">Inactive</span>'
            },
            { data: 'postmaster', defaultContent: 'N/A' },
            {
                data: null,
                render: (d, t, row) => `
                    <button class="btn btn-sm btn-info view-btn" data-id="${row.id}" data-name="${row.name || 'Office'}">
                        <i class="fas fa-eye"></i>
                    </button>
                    <button class="btn btn-sm btn-warning edit-btn" data-id="${row.id}">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn btn-sm btn-danger delete-btn" data-id="${row.id}" data-name="${row.name || 'Office'}">
                        <i class="fas fa-trash"></i>
                    </button>
                `
            }
        ],
        pageLength: 25,
        responsive: true,
        order: [[1, 'asc']],

        // Apply server-side resolved filters after data loads
        initComplete: function () {
            applyTableFilters(this.api(), areaFilter, statusFilter);
            updateTableSummary(this.api());
        }
    });

    // Re-apply filters whenever data redraws
    table.on('draw', function () {
        updateTableSummary(table);
    });

    // Delegated button events
    $('#postOfficeTable').on('click', '.view-btn',   function () { 
        viewOffice($(this).data('id'), $(this).data('name'));
    });
    $('#postOfficeTable').on('click', '.edit-btn',   function () { 
        editOffice($(this).data('id'));
    });
    $('#postOfficeTable').on('click', '.delete-btn', function () { 
        deleteOffice($(this).data('id'), $(this).data('name'));
    });
}

/**
 * Apply Area + Status column filters to a DataTable API instance.
 */
function applyTableFilters(api, areaFilter, statusFilter) {
    if (!api) return;

    // Area column = index 1 â†’ search 'Area X'
    if (areaFilter) {
        api.column(1).search('Area ' + areaFilter);
    }

    // Status column = index 6
    if (statusFilter) {
        const statusText = statusFilter === 'active' ? 'Active' : 'Inactive';
        api.column(6).search(statusText);
    }

    api.draw();
}

function updateTableSummary(api) {
    const info    = api.page.info();
    const total   = info.recordsTotal;
    const visible = info.recordsDisplay;
    const summary = visible < total
        ? `Showing <strong>${visible}</strong> of <strong>${total}</strong> offices (filtered)`
        : `Showing all <strong>${total}</strong> offices`;
    $('#tableFilterSummary').html(summary);
}

/* =====================================================
   LEGACY FILTER (kept for compatibility, now superseded
   by initializeFilterPanel + applyFilters above)
===================================================== */
function initializeFilters() {
    // No-op: filter logic is handled by initializeFilterPanel()
}


/* =====================================================
   YEAR SELECTOR  (standalone dropdown â†’ navigate)
===================================================== */
function initializeYearSelector() {
    // The year selector is now part of the filter panel.
    // This no-op prevents double-binding.
}


/* =====================================================
   CLICKABLE STAT CARDS
===================================================== */
function initializeClickableCards() {
    $('.clickable-card').on('click', function () {
        const filter = $(this).data('filter');
        const year   = $(this).data('year');

        if (filter === 'connected') {
            window.location.href = `/quarters?statusFilter=active&year=${encodeURIComponent(year)}`;
        } else if (filter === 'disconnected') {
            window.location.href = `/quarters?statusFilter=inactive&year=${encodeURIComponent(year)}`;
        } else {
            window.location.href = `/quarters?year=${encodeURIComponent(year)}`;
        }
    });
}


/* =====================================================
   SNAPSHOT FUNCTIONS
===================================================== */
function createCurrentSnapshot() {
    $.ajax({
        url: '/api/connectivity-history/snapshot/current',
        method: 'POST',
        success: function (response) {
            if (response.success) {
                Swal.fire({
                    icon: 'success',
                    title: 'Snapshot Created!',
                    html: `
                        <p><strong>Quarter:</strong> Q${response.quarter} ${response.year}</p>
                        <p><strong>Total Offices:</strong> ${response.totalOffices}</p>
                        <p><strong>Connected:</strong> ${response.connected}</p>
                        <p><strong>Disconnected:</strong> ${response.disconnected}</p>
                    `,
                    timer: 3000
                }).then(() => location.reload());
            } else {
                Swal.fire({ icon: 'warning', title: 'Snapshot Already Exists', text: response.message });
            }
        },
        error: function (xhr) {
            Swal.fire({
                icon: 'error',
                title: 'Failed to Create Snapshot',
                text: xhr.responseJSON?.message || 'An error occurred'
            });
        }
    });
}

function checkCurrentQuarterSnapshot() {
    $.ajax({
        url: '/api/connectivity-history/current-quarter',
        method: 'GET',
        success: function (response) {
            if (response.hasSnapshot) {
                $('#manualUpdateBtn')
                    .removeClass('btn-outline-primary btn-outline-warning')
                    .addClass('btn-success')
                    .html('<i class="fas fa-check"></i> Snapshot Exists');
            } else {
                $('#manualUpdateBtn')
                    .removeClass('btn-success')
                    .addClass('btn-outline-warning')
                    .html('<i class="fas fa-exclamation-triangle"></i> Create Snapshot');
            }
        }
    });
}

function deleteCurrentSnapshot() {
    $.ajax({
        url: '/api/connectivity-history/snapshot/current',
        method: 'DELETE',
        success: function (response) {
            if (response.success) {
                Swal.fire({
                    icon: 'success',
                    title: 'Snapshot Deleted!',
                    html: `
                        <p><strong>Quarter:</strong> Q${response.quarter} ${response.year}</p>
                        <p><strong>Total Offices Removed:</strong> ${response.totalOffices}</p>
                        <p><strong>Connected:</strong> ${response.connected}</p>
                        <p><strong>Disconnected:</strong> ${response.disconnected}</p>
                    `,
                    timer: 3000
                }).then(() => location.reload());
            } else {
                Swal.fire({ icon: 'warning', title: 'No Snapshot Found', text: response.message });
            }
        },
        error: function (xhr) {
            Swal.fire({
                icon: 'error',
                title: 'Failed to Delete Snapshot',
                text: xhr.responseJSON?.message || 'An error occurred'
            });
        }
    });
}


/* =====================================================
   MAP MODAL + LEAFLET
===================================================== */
function createMapModal() {
    const modalHTML = `
        <div class="modal fade" id="mapmodal" tabindex="-1">
            <div class="modal-dialog modal-xl">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title font-weight-bold">Map View</h5>
                        <button type="button" class="close" data-dismiss="modal"><span>&times;</span></button>
                    </div>
                    <div class="modal-body p-0">
                        <div id="leafletMap" style="height: 500px;"></div>
                    </div>
                </div>
            </div>
        </div>
    `;
    $('body').append(modalHTML);
}

function initializeMapModal() {
    $('#mapmodal').on('shown.bs.modal', function () {
        if (!window.leafletMap) initializeMap();
    });
}

function initializeMap() {
    const map = L.map('leafletMap').setView([12.8797, 121.7740], 6);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: 'Â© OpenStreetMap contributors',
        maxZoom: 18
    }).addTo(map);

    $.get('/api/post-offices', function (offices) {
        offices.forEach(office => {
            if (office.lat && office.lng) {
                const marker = L.circleMarker([office.lat, office.lng], {
                    radius: 8,
                    fillColor: office.status ? 'green' : 'red',
                    color: '#fff',
                    weight: 2,
                    fillOpacity: 0.8
                }).addTo(map);

                marker.bindPopup(`
                    <strong>${office.name}</strong><br>
                    <span class="badge badge-${office.status ? 'success' : 'danger'}">
                        ${office.status ? 'Active' : 'Inactive'}
                    </span><br>
                    ${office.address || 'No address'}
                `);
            }
        });
    });

    window.leafletMap = map;
}


/* =====================================================
   OFFICE ACTIONS - ENHANCED WITH LOADING ANIMATIONS
===================================================== */

/**
 * View office profile with loading animation
 */
function viewOffice(id, officeName) {
    // Show loading dialog
    Swal.fire({
        title: 'Loading Profile...',
        html: `Opening profile for <strong>${officeName || 'Post Office'}</strong>`,
        allowOutsideClick: false,
        allowEscapeKey: false,
        showConfirmButton: false,
        didOpen: () => {
            Swal.showLoading();
        }
    });
    
    // Navigate to profile page after brief delay
    setTimeout(() => {
        window.location.href = '/profile/' + id;
    }, 500);
}

/**
 * Edit office (placeholder for future implementation)
 */
function editOffice(id) { 
    Swal.fire({ 
        icon: 'info', 
        title: 'Coming Soon', 
        text: 'Edit functionality is under development.',
        confirmButtonText: 'OK'
    }); 
}

/**
 * Delete office with confirmation and progress feedback
 */
function deleteOffice(id, officeName) {
    Swal.fire({
        title: 'Delete Post Office?',
        html: `Are you sure you want to delete <strong>${officeName || 'this post office'}</strong>?<br><small class="text-muted">This action cannot be undone.</small>`,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#dc3545',
        cancelButtonColor: '#6c757d',
        confirmButtonText: '<i class="fas fa-trash"></i> Yes, Delete',
        cancelButtonText: '<i class="fas fa-times"></i> Cancel',
        reverseButtons: true
    }).then((result) => {
        if (result.isConfirmed) {
            performDelete(id, officeName);
        }
    });
}

/**
 * Execute the delete operation
 */
function performDelete(id, officeName) {
    // Show deleting progress
    Swal.fire({
        title: 'Deleting...',
        html: `Removing <strong>${officeName || 'post office'}</strong>`,
        allowOutsideClick: false,
        allowEscapeKey: false,
        showConfirmButton: false,
        didOpen: () => {
            Swal.showLoading();
        }
    });
    
    // Send DELETE request
    $.ajax({
        url: '/api/postal-office/' + id,
        method: 'DELETE',
        success: function(response) {
            if (response.success) {
                Swal.fire({
                    icon: 'success',
                    title: 'Deleted!',
                    text: `${officeName || 'Post office'} has been removed successfully.`,
                    timer: 2000,
                    showConfirmButton: false
                }).then(() => {
                    // Reload page to refresh the table
                    location.reload();
                });
            } else {
                Swal.fire({
                    icon: 'error',
                    title: 'Delete Failed',
                    text: response.message || 'Failed to delete post office',
                    confirmButtonText: 'OK'
                });
            }
        },
        error: function(xhr) {
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: xhr.responseJSON?.message || 'An error occurred while deleting the post office',
                confirmButtonText: 'OK'
            });
        }
    });
}
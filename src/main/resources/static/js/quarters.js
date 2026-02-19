/**
 * Quarters Management Page
 * Includes full filter support: Year, Quarter (Q1Ã¢â‚¬â€œQ4), Area, Status (Active/Inactive)
 * WITH EDIT FUNCTIONALITY
 */

$(document).ready(function () {
    console.log('Ã¢Å“â€œ Quarters.js loaded');

    createMapModal();
    createEditModal();
    createArchiveModal();
    initializeTable();
    initializeFilters();
    initializeYearSelector();
    initializeClickableCards();
    initializeMapModal();
    initializeFilterPanel();

    // Print button
    $('#printReportBtn').on('click', function () {
        const year    = $('#yearSelector option:selected').text().trim()  || 'All Years';
        const quarter = $('#quarterFilter option:selected').text().trim() || 'All Quarters';
        const area    = $('#areaFilter option:selected').text().trim()    || 'All Areas';
        const status  = $('#statusFilter option:selected').text().trim()  || 'All Status';

        const rows = [];
        $('#postOfficeTable tbody tr').each(function () {
            const cols = $(this).find('td');
            if (cols.length >= 8) {
                rows.push(
                    '<tr>' +
                    '<td>' + $(cols[0]).text() + '</td>' +
                    '<td>' + $(cols[1]).text() + '</td>' +
                    '<td>' + $(cols[2]).text() + '</td>' +
                    '<td>' + $(cols[3]).text() + '</td>' +
                    '<td>' + $(cols[4]).text() + '</td>' +
                    '<td>' + $(cols[5]).text() + '</td>' +
                    '<td>' + $(cols[6]).text() + '</td>' +
                    '<td>' + $(cols[7]).text() + '</td>' +
                    '</tr>'
                );
            }
        });

        const printWindow = window.open('', '_blank');
        printWindow.document.write(`
            <!DOCTYPE html><html><head>
            <title>PHLPost Quarters Report</title>
            <style>
                body { font-family: Arial, sans-serif; font-size: 12px; margin: 24px; color: #333; }
                h2 { text-align: center; margin-bottom: 4px; color: #2c3e50; }
                .subtitle { text-align: center; color: #777; margin-bottom: 10px; font-size: 11px; }
                .filters { text-align: center; margin-bottom: 16px; }
                .filters span { display: inline-block; margin: 2px 4px; background: #f0f0f0; padding: 2px 10px; border-radius: 10px; font-size: 11px; }
                table { width: 100%; border-collapse: collapse; }
                th { background: #2c3e50; color: white; padding: 7px 8px; text-align: left; font-size: 11px; }
                td { padding: 6px 8px; border-bottom: 1px solid #e0e0e0; font-size: 11px; }
                tr:nth-child(even) td { background: #f9f9f9; }
                @media print { body { margin: 10px; } }
            </style>
            </head><body>
            <h2>PHLPost Quarters Report</h2>
            <div class="subtitle">Printed: ${new Date().toLocaleString()}</div>
            <div class="filters">
                <span>Year: ${year}</span>
                <span>Quarter: ${quarter}</span>
                <span>Area: ${area}</span>
                <span>Status: ${status}</span>
            </div>
            <table>
                <thead><tr>
                    <th>#</th><th>AREA</th><th>POSTAL OFFICE</th><th>ADDRESS</th>
                    <th>ZIP CODE</th><th>SPEED</th><th>STATUS</th><th>POSTMASTER</th>
                </tr></thead>
                <tbody>${rows.join('')}</tbody>
            </table>
            </body></html>
        `);
        printWindow.document.close();
        printWindow.focus();
        setTimeout(function() { printWindow.print(); }, 400);
    });

    // Archive modal confirm button
    $('#quartersConfirmArchiveBtn').on('click', function () {
        const id     = $('#quartersArchiveModal').data('office-id');
        const name   = $('#quartersArchiveOfficeName').text();
        const reason = $('#quartersArchiveReasonInput').val().trim();
        
        // Validate reason field
        if (!reason) {
            Swal.fire({
                icon: 'warning',
                title: 'Validation Error',
                text: 'Please provide a reason for archiving this post office.',
                confirmButtonText: 'OK'
            });
            return;
        }
        
        $('#quartersArchiveModal').modal('hide');
        performArchive(id, name, reason);
    });
});

/* =====================================================
   FILTER PANEL
===================================================== */
function initializeFilterPanel() {

    // Ã¢â‚¬â€œÃ¢â‚¬â€œ Collapse / expand toggle Ã¢â‚¬â€œÃ¢â‚¬â€œ
    $('#toggleFiltersBtn').on('click', function () {
        const body    = $('#filterBody');
        const chevron = $('#filterChevron');

        body.toggleClass('collapsed');
        chevron.toggleClass('fa-chevron-up fa-chevron-down');
    });

    // Ã¢â‚¬â€œÃ¢â‚¬â€œ Highlight selects that already have a value (page load) Ã¢â‚¬â€œÃ¢â‚¬â€œ
    highlightActiveSelects();

    // Ã¢â‚¬â€œÃ¢â‚¬â€œ Render any pre-selected tags from URL params Ã¢â‚¬â€œÃ¢â‚¬â€œ
    renderFilterTags();

    // Ã¢â‚¬â€œÃ¢â‚¬â€œ Apply button Ã¢â‚¬â€œÃ¢â‚¬â€œ
    $('#applyFiltersBtn').off('click').on('click', function () {
        applyFilters();
    });

    // Ã¢â‚¬â€œÃ¢â‚¬â€œ Clear button Ã¢â‚¬â€œÃ¢â‚¬â€œ
    $('#clearFiltersBtn').off('click').on('click', function () {
        clearFilters();
    });

    // Ã¢â‚¬â€œÃ¢â‚¬â€œ Live highlight on change Ã¢â‚¬â€œÃ¢â‚¬â€œ
    $('#yearSelector, #quarterFilter, #areaFilter, #statusFilter').on('change', function () {
        highlightActiveSelects();
        renderFilterTags();
    });

    // Ã¢â‚¬â€œÃ¢â‚¬â€œ Allow pressing Enter in any select to apply Ã¢â‚¬â€œÃ¢â‚¬â€œ
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
        if (status === 'active') {
            container.append(buildTag('tag-status-active', 'fas fa-check-circle', 'Active', 'statusFilter'));
        } else if (status === 'inactive') {
            container.append(buildTag('tag-status-inactive', 'fas fa-times-circle', 'Inactive', 'statusFilter'));
        } else if (status === 'newly_connected') {
            container.append(buildTag('tag-status-newly-connected', 'fas fa-plus-circle', 'Newly Connected', 'statusFilter'));
        } else if (status === 'newly_disconnected') {
            container.append(buildTag('tag-status-newly-disconnected', 'fas fa-minus-circle', 'Newly Disconnected', 'statusFilter'));
        }
    }
}

function getQuarterLabel(q) {
    const map = {
        Q1: 'Q1 (JanÃ¢â‚¬â€œMar)',
        Q2: 'Q2 (AprÃ¢â‚¬â€œJun)',
        Q3: 'Q3 (JulÃ¢â‚¬â€œSep)',
        Q4: 'Q4 (OctÃ¢â‚¬â€œDec)'
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
    const yearFilter    = $('#yearSelector').val()   || '';
    const quarterFilter = $('#quarterFilter').val()  || '';
    const areaFilter    = $('#areaFilter').val()     || '';
    const statusFilter  = $('#statusFilter').val()   || '';

    // Debug logging
    console.log('Table filters:', {
        year: yearFilter,
        quarter: quarterFilter,
        area: areaFilter,
        status: statusFilter
    });

    // Build AJAX URL with filter parameters
    let ajaxUrl = '/api/post-offices/all';
    const params = [];
    
    if (yearFilter)    params.push('year=' + encodeURIComponent(yearFilter));
    if (quarterFilter) params.push('quarter=' + encodeURIComponent(quarterFilter));
    if (areaFilter)    params.push('area=' + encodeURIComponent(areaFilter));
    if (statusFilter)  params.push('status=' + encodeURIComponent(statusFilter));
    
    if (params.length > 0) {
        ajaxUrl += '?' + params.join('&');
    }

    console.log('AJAX URL:', ajaxUrl);

    const table = $('#postOfficeTable').DataTable({
        processing: true,
        serverSide: false,
        ajax: {
            url: ajaxUrl,
            dataSrc: ''
        },
        columns: [
            { data: null,      render: (d, t, r, m) => m.row + 1 },
            { data: 'areaId',  render: d => d ? 'Area ' + d : 'N/A' },
            { data: 'name',    defaultContent: 'N/A' },
            { data: 'address', defaultContent: 'N/A' },
            { data: 'zipCode', defaultContent: 'N/A' },
            { 
                data: 'speed',
                defaultContent: 'N/A',
                render: d => d || 'N/A'
            },
            {
                data: 'status',
                render: function(data, type, row) {
                    let statusBadge = data
                        ? '<span class="badge badge-success">Active</span>'
                        : '<span class="badge badge-danger">Inactive</span>';
                    
                    // Add "New This Quarter" badge if applicable
                    if (row.newThisQuarter) {
                        statusBadge += ' <span class="badge badge-info ml-1">New This Quarter</span>';
                    }
                    
                    return statusBadge;
                }
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
                    <button class="btn btn-sm btn-archive-quarter" style="background:#fd7e14;color:white;"
                            data-id="${row.id}" data-name="${row.name || 'Office'}" title="Archive Office">
                        <i class="fas fa-archive"></i>
                    </button>
                `
            }
        ],
        pageLength: 25,
        responsive: true,
        order: [[1, 'asc']],

        // Apply server-side resolved filters after data loads
        initComplete: function () {
            // No client-side filtering needed - handled by server-side AJAX URL
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
    $('#postOfficeTable').on('click', '.btn-archive-quarter', function () {
        archiveOfficeFromQuarters($(this).data('id'), $(this).data('name'));
    });
}

/**
 * Apply Area + Status column filters to a DataTable API instance.
 */
function applyTableFilters(api, areaFilter, statusFilter) {
    if (!api) return;

    // Area column = index 1 Ã¢â‚¬â€œ search 'Area X'
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
   YEAR SELECTOR  (standalone dropdown Ã¢â‚¬â€œ navigate)
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
   MAP MODAL + LEAFLET
===================================================== */
function createMapModal() {
    const modalHTML = `
        <div class="modal fade" id="mapmodal" tabindex="-1">
            <div class="modal-dialog modal-xl">
                <div class="modal-content">
                    <div class="modal-header" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);">
                        <h5 class="modal-title font-weight-bold text-white">
                            <i class="fas fa-map mr-2"></i>Map View
                        </h5>
                        <button type="button" class="close text-white" data-dismiss="modal"><span>&times;</span></button>
                    </div>
                    <div class="modal-body p-0">
                        <!-- Filter Bar -->
                        <div class="d-flex align-items-center px-3 py-2 bg-light border-bottom" style="gap:10px; flex-wrap:wrap;">
                            <span class="font-weight-bold text-muted small"><i class="fas fa-filter mr-1"></i>Filter:</span>
                            <select id="mapStatusFilter" class="form-control form-control-sm" style="width:140px;">
                                <option value="">All Status</option>
                                <option value="active">● Active</option>
                                <option value="inactive">● Inactive</option>
                            </select>
                            <select id="mapAreaFilter" class="form-control form-control-sm" style="width:160px;">
                                <option value="">All Areas</option>
                            </select>
                            <button id="applyMapFilter" class="btn btn-primary btn-sm">
                                <i class="fas fa-search mr-1"></i>Apply
                            </button>
                            <button id="clearMapFilter" class="btn btn-outline-secondary btn-sm">
                                <i class="fas fa-times mr-1"></i>Clear
                            </button>
                            <span id="mapFilterSummary" class="ml-auto small text-muted"></span>
                        </div>
                        <!-- Legend -->
                        <div class="d-flex align-items-center px-3 py-1 bg-white border-bottom" style="gap:16px;">
                            <span class="small"><span style="color:#1cc88a; font-size:16px;">●</span> Active</span>
                            <span class="small"><span style="color:#e74a3b; font-size:16px;">●</span> Inactive</span>
                        </div>
                        <div id="quartersLeafletMap" style="height: 480px;"></div>
                    </div>
                </div>
            </div>
        </div>
    `;
    $('body').append(modalHTML);
}

window._quartersMap     = null;
window._quartersMarkers = [];

function initializeMapModal() {
    // Copy area options from page filter on open
    $('#mapmodal').on('show.bs.modal', function () {
        const $mapArea = $('#mapAreaFilter');
        if ($mapArea.find('option').length <= 1) {
            $('#areaFilter option').each(function () {
                if ($(this).val()) {
                    $mapArea.append($('<option>', { value: $(this).val(), text: $(this).text() }));
                }
            });
        }
    });

    // Initialize or resize map after modal animation finishes
    $('#mapmodal').on('shown.bs.modal', function () {
        if (!window._quartersMap) {
            initializeMap();
        } else {
            window._quartersMap.invalidateSize();
        }
    });

    $('#applyMapFilter').on('click', function () { applyMapFilters(); });
    $('#clearMapFilter').on('click', function () {
        $('#mapStatusFilter').val('');
        $('#mapAreaFilter').val('');
        applyMapFilters();
    });
}

function applyMapFilters() {
    const status = $('#mapStatusFilter').val();
    const area   = $('#mapAreaFilter').val();
    let visible  = 0;

    window._quartersMarkers.forEach(function (item) {
        const statusMatch = !status ||
            (status === 'active'   &&  item.office.status) ||
            (status === 'inactive' && !item.office.status);
        const areaMatch = !area || String(item.office.areaId) === String(area);

        if (statusMatch && areaMatch) {
            item.marker.addTo(window._quartersMap);
            visible++;
        } else {
            item.marker.remove();
        }
    });

    const total   = window._quartersMarkers.length;
    const summary = (status || area)
        ? 'Showing <strong>' + visible + '</strong> of <strong>' + total + '</strong> offices'
        : 'Showing all <strong>' + total + '</strong> offices';
    $('#mapFilterSummary').html(summary);
}

function initializeMap() {
    const map = L.map('quartersLeafletMap').setView([12.8797, 121.7740], 6);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
        maxZoom: 18
    }).addTo(map);

    // shown.bs.modal fires after animation — safe to invalidate immediately
    map.invalidateSize();
    window._quartersMap     = map;
    window._quartersMarkers = [];

    $.get('/api/post-offices', function (offices) {
        offices.forEach(function (office) {
            if (office.lat && office.lng) {
                const marker = L.circleMarker([office.lat, office.lng], {
                    radius: 8,
                    fillColor: office.status ? '#1cc88a' : '#e74a3b',
                    color: '#fff',
                    weight: 2,
                    fillOpacity: 0.85
                }).addTo(map);

                marker.bindPopup(
                    '<strong>' + office.name + '</strong><br>' +
                    '<span style="color:' + (office.status ? '#1cc88a' : '#e74a3b') + ';font-weight:bold;">' +
                        (office.status ? '● Active' : '● Inactive') +
                    '</span><br>' +
                    (office.address || 'No address')
                );

                window._quartersMarkers.push({ marker: marker, office: office });
            }
        });
        $('#mapFilterSummary').html('Showing all <strong>' + window._quartersMarkers.length + '</strong> offices');
    });
}


/* =====================================================
   EDIT MODAL
===================================================== */
function createEditModal() {
    const modalHTML = `
        <div class="modal fade" id="editOfficeModal" tabindex="-1" role="dialog">
            <div class="modal-dialog modal-lg" role="document">
                <div class="modal-content">
                    <div class="modal-header bg-warning text-white">
                        <h5 class="modal-title">
                            <i class="fas fa-edit"></i> Edit Post Office
                        </h5>
                        <button type="button" class="close text-white" data-dismiss="modal">
                            <span>&times;</span>
                        </button>
                    </div>
                    <div class="modal-body">
                        <form id="editOfficeForm">
                            <input type="hidden" id="editOfficeId">
                            
                            <div class="row">
                                <!-- Basic Information -->
                                <div class="col-md-6">
                                    <div class="form-group">
                                        <label for="editName">Office Name <span class="text-danger">*</span></label>
                                        <input type="text" class="form-control" id="editName" required>
                                    </div>
                                </div>
                                
                                <div class="col-md-6">
                                    <div class="form-group">
                                        <label for="editPostmaster">Postmaster</label>
                                        <input type="text" class="form-control" id="editPostmaster">
                                    </div>
                                </div>
                            </div>
                            
                            <div class="form-group">
                                <label for="editAddress">Address</label>
                                <textarea class="form-control" id="editAddress" rows="2"></textarea>
                            </div>
                            
                            <div class="row">
                                <div class="col-md-6">
                                    <div class="form-group">
                                        <label for="editZipCode">Zip Code</label>
                                        <input type="text" class="form-control" id="editZipCode">
                                    </div>
                                </div>
                                
                                <div class="col-md-6">
                                    <div class="form-group">
                                        <label for="editStatus">Status <span class="text-danger">*</span></label>
                                        <select class="form-control" id="editStatus" required>
                                            <option value="true">Active</option>
                                            <option value="false">Inactive</option>
                                        </select>
                                    </div>
                                </div>
                            </div>
                            
                            <!-- ISP Information -->
                            <h6 class="mt-3 mb-2 text-primary">Internet Service Provider</h6>
                            <div class="row">
                                <div class="col-md-6">
                                    <div class="form-group">
                                        <label for="editISP">ISP</label>
                                        <input type="text" class="form-control" id="editISP">
                                    </div>
                                </div>
                                
                                <div class="col-md-6">
                                    <div class="form-group">
                                        <label for="editSpeed">Speed</label>
                                        <input type="text" class="form-control" id="editSpeed" placeholder="e.g., 100 Mbps">
                                    </div>
                                </div>
                            </div>
                            
                            <div class="row">
                                <div class="col-md-6">
                                    <div class="form-group">
                                        <label for="editTypeOfConnection">Connection Type</label>
                                        <input type="text" class="form-control" id="editTypeOfConnection" placeholder="e.g., Fiber, DSL">
                                    </div>
                                </div>
                                
                                <div class="col-md-6">
                                    <div class="form-group">
                                        <label for="editStaticIP">Static IP Address</label>
                                        <input type="text" class="form-control" id="editStaticIP">
                                    </div>
                                </div>
                            </div>
                            
                            <!-- Staff Information -->
                            <h6 class="mt-3 mb-2 text-primary">Staff Information</h6>
                            <div class="row">
                                <div class="col-md-4">
                                    <div class="form-group">
                                        <label for="editNoOfEmployees">No. of Employees</label>
                                        <input type="number" class="form-control" id="editNoOfEmployees" min="0">
                                    </div>
                                </div>
                                
                                <div class="col-md-4">
                                    <div class="form-group">
                                        <label for="editNoOfTellers">No. of Tellers</label>
                                        <input type="number" class="form-control" id="editNoOfTellers" min="0">
                                    </div>
                                </div>
                                
                                <div class="col-md-4">
                                    <div class="form-group">
                                        <label for="editNoOfCarriers">No. of Carriers</label>
                                        <input type="number" class="form-control" id="editNoOfCarriers" min="0">
                                    </div>
                                </div>
                            </div>
                            
                            <!-- Contact Information -->
                            <h6 class="mt-3 mb-2 text-primary">Contact Information</h6>
                            <div class="row">
                                <div class="col-md-6">
                                    <div class="form-group">
                                        <label for="editContactPerson">Office Contact Person</label>
                                        <input type="text" class="form-control" id="editContactPerson">
                                    </div>
                                </div>
                                
                                <div class="col-md-6">
                                    <div class="form-group">
                                        <label for="editContactNumber">Office Contact Number</label>
                                        <input type="text" class="form-control" id="editContactNumber">
                                    </div>
                                </div>
                            </div>
                            
                            <div class="row">
                                <div class="col-md-6">
                                    <div class="form-group">
                                        <label for="editISPContactPerson">ISP Contact Person</label>
                                        <input type="text" class="form-control" id="editISPContactPerson">
                                    </div>
                                </div>
                                
                                <div class="col-md-6">
                                    <div class="form-group">
                                        <label for="editISPContactNumber">ISP Contact Number</label>
                                        <input type="text" class="form-control" id="editISPContactNumber">
                                    </div>
                                </div>
                            </div>
                            
                            <!-- Location Coordinates -->
                            <h6 class="mt-3 mb-2 text-primary">Location Coordinates</h6>
                            <div class="row">
                                <div class="col-md-6">
                                    <div class="form-group">
                                        <label for="editLatitude">Latitude</label>
                                        <input type="number" class="form-control" id="editLatitude" step="0.000001">
                                    </div>
                                </div>
                                
                                <div class="col-md-6">
                                    <div class="form-group">
                                        <label for="editLongitude">Longitude</label>
                                        <input type="number" class="form-control" id="editLongitude" step="0.000001">
                                    </div>
                                </div>
                            </div>
                        </form>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-dismiss="modal">
                            <i class="fas fa-times"></i> Cancel
                        </button>
                        <button type="button" class="btn btn-warning" onclick="saveOfficeChanges()">
                            <i class="fas fa-save"></i> Save Changes
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;
    $('body').append(modalHTML);
}

function createArchiveModal() {
    const modalHTML = `
        <div class="modal fade" id="quartersArchiveModal" tabindex="-1" role="dialog">
            <div class="modal-dialog" role="document">
                <div class="modal-content">
                    <div class="modal-header bg-danger text-white">
                        <h5 class="modal-title">
                            <i class="fas fa-archive"></i> Archive Post Office
                        </h5>
                        <button type="button" class="close text-white" data-dismiss="modal">
                            <span>&times;</span>
                        </button>
                    </div>
                    <div class="modal-body">
                        <div class="alert alert-warning">
                            <i class="fas fa-exclamation-triangle mr-2"></i>
                            <strong>Warning:</strong> Archiving this post office will remove it from the active list.
                        </div>
                        
                        <p>Are you sure you want to archive <strong id="quartersArchiveOfficeName"></strong>?</p>
                        
                        <div class="form-group">
                            <label for="quartersArchiveReasonInput">Reason for archiving <span class="text-danger">*</span></label>
                            <textarea class="form-control" id="quartersArchiveReasonInput" rows="3" 
                                      placeholder="Please provide a reason for archiving this post office..." required></textarea>
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-dismiss="modal">
                            <i class="fas fa-times"></i> Cancel
                        </button>
                        <button type="button" class="btn btn-danger" id="quartersConfirmArchiveBtn">
                            <i class="fas fa-archive"></i> Archive Office
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;
    $('body').append(modalHTML);
}


/* =====================================================
   OFFICE ACTIONS - ENHANCED WITH EDIT FUNCTIONALITY
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
 * Edit office - Load data and show modal
 */
function editOffice(id) { 
    // Show loading
    Swal.fire({
        title: 'Loading Office Data...',
        allowOutsideClick: false,
        allowEscapeKey: false,
        showConfirmButton: false,
        didOpen: () => {
            Swal.showLoading();
        }
    });
    
    // Fetch office data
    $.ajax({
        url: '/api/postal-office/' + id,
        method: 'GET',
        success: function(office) {
            Swal.close();
            
            // Populate form fields
            $('#editOfficeId').val(office.id);
            $('#editName').val(office.name || '');
            $('#editPostmaster').val(office.postmaster || '');
            $('#editAddress').val(office.address || '');
            $('#editZipCode').val(office.zipCode || '');
            $('#editStatus').val(office.connectionStatus ? 'true' : 'false');
            $('#editISP').val(office.internetServiceProvider || '');
            $('#editSpeed').val(office.speed || '');
            $('#editTypeOfConnection').val(office.typeOfConnection || '');
            $('#editStaticIP').val(office.staticIpAddress || '');
            $('#editNoOfEmployees').val(office.noOfEmployees || '');
            $('#editNoOfTellers').val(office.noOfPostalTellers || '');
            $('#editNoOfCarriers').val(office.noOfLetterCarriers || '');
            $('#editContactPerson').val(office.postalOfficeContactPerson || '');
            $('#editContactNumber').val(office.postalOfficeContactNumber || '');
            $('#editISPContactPerson').val(office.ispContactPerson || '');
            $('#editISPContactNumber').val(office.ispContactNumber || '');
            $('#editLatitude').val(office.latitude || '');
            $('#editLongitude').val(office.longitude || '');
            
            // Show modal
            $('#editOfficeModal').modal('show');
        },
        error: function(xhr) {
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: xhr.responseJSON?.message || 'Failed to load office data',
                confirmButtonText: 'OK'
            });
        }
    });
}

/**
 * Save office changes
 */
function saveOfficeChanges() {
    const id = $('#editOfficeId').val();
    
    // Validate required fields
    if (!$('#editName').val()) {
        Swal.fire({
            icon: 'warning',
            title: 'Validation Error',
            text: 'Office name is required',
            confirmButtonText: 'OK'
        });
        return;
    }
    
    // Prepare update data
    const updateData = {
        name: $('#editName').val(),
        postmaster: $('#editPostmaster').val() || null,
        address: $('#editAddress').val() || null,
        zipCode: $('#editZipCode').val() || null,
        connectionStatus: $('#editStatus').val() === 'true',
        internetServiceProvider: $('#editISP').val() || null,
        speed: $('#editSpeed').val() || null,
        typeOfConnection: $('#editTypeOfConnection').val() || null,
        staticIpAddress: $('#editStaticIP').val() || null,
        noOfEmployees: $('#editNoOfEmployees').val() ? parseInt($('#editNoOfEmployees').val()) : null,
        noOfPostalTellers: $('#editNoOfTellers').val() ? parseInt($('#editNoOfTellers').val()) : null,
        noOfLetterCarriers: $('#editNoOfCarriers').val() ? parseInt($('#editNoOfCarriers').val()) : null,
        postalOfficeContactPerson: $('#editContactPerson').val() || null,
        postalOfficeContactNumber: $('#editContactNumber').val() || null,
        ispContactPerson: $('#editISPContactPerson').val() || null,
        ispContactNumber: $('#editISPContactNumber').val() || null,
        latitude: $('#editLatitude').val() ? parseFloat($('#editLatitude').val()) : null,
        longitude: $('#editLongitude').val() ? parseFloat($('#editLongitude').val()) : null
    };
    
    // Show saving progress
    Swal.fire({
        title: 'Saving Changes...',
        allowOutsideClick: false,
        allowEscapeKey: false,
        showConfirmButton: false,
        didOpen: () => {
            Swal.showLoading();
        }
    });
    
    // Send update request
    $.ajax({
        url: '/api/postal-office/' + id,
        method: 'PUT',
        contentType: 'application/json',
        data: JSON.stringify(updateData),
        success: function(response) {
            $('#editOfficeModal').modal('hide');
            
            Swal.fire({
                icon: 'success',
                title: 'Success!',
                text: 'Post office updated successfully',
                timer: 2000,
                showConfirmButton: false
            }).then(() => {
                // Reload the page to refresh the table
                location.reload();
            });
        },
        error: function(xhr) {
            Swal.fire({
                icon: 'error',
                title: 'Update Failed',
                text: xhr.responseJSON?.message || 'Failed to update post office',
                confirmButtonText: 'OK'
            });
        }
    });
}


/**
 * Archive office from Quarters page
 */
function archiveOfficeFromQuarters(id, officeName) {
    // Populate and show the archive modal
    $('#quartersArchiveOfficeName').text(officeName);
    $('#quartersArchiveReasonInput').val('');
    $('#quartersArchiveModal').data('office-id', id);
    $('#quartersArchiveModal').modal('show');
}

/**
 * Execute the archive operation
 */
function performArchive(id, officeName, reason) {
    Swal.fire({
        title: 'Archiving...',
        html: `Archiving <strong>${officeName || 'post office'}</strong>`,
        allowOutsideClick: false,
        allowEscapeKey: false,
        showConfirmButton: false,
        didOpen: () => { Swal.showLoading(); }
    });

    $.ajax({
        url: '/api/archive/' + id,
        method: 'POST',
        contentType: 'application/json',
        data: JSON.stringify({ reason: reason }),
        success: function (response) {
            if (response.success) {
                Swal.fire({
                    icon: 'success',
                    title: 'Archived!',
                    text: response.message,
                    timer: 2000,
                    showConfirmButton: false
                }).then(() => { location.reload(); });
            } else {
                Swal.fire({ icon: 'error', title: 'Archive Failed', text: response.message || 'Failed to archive post office' });
            }
        },
        error: function (xhr) {
            Swal.fire({ icon: 'error', title: 'Error', text: xhr.responseJSON?.message || 'An error occurred' });
        }
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
/**
 * Quarters Management Page
 * Includes full filter support: Year, Quarter (Q1-Q4), Area, Status (Active/Inactive)
 * WITH EDIT FUNCTIONALITY
 */

$(document).ready(function () {
    console.log('✓ Quarters.js loaded');

    createMapModal();
    createEditModal();
    initializeTable();
    initializeFilters();
    initializeYearSelector();
    initializeClickableCards();
    initializeMapModal();
    initializeFilterPanel();

    // ── View Map button ────────────────────────────────────────────────────────
    $(document).on('click', '#viewMapBtn', function (e) {
        e.preventDefault();
        openMapModal();
    });

    // ── Print button ─────────────────────────────────────────────────────────
    $('#printReportBtn').on('click', function () {
        printQuartersReport();
    });

    // Archive modal confirm button
    $('#quartersConfirmArchiveBtn').on('click', function () {
        const id     = $('#quartersArchiveModal').data('office-id');
        const name   = $('#quartersArchiveOfficeName').text();
        const reason = $('#quartersArchiveReasonInput').val().trim();
        $('#quartersArchiveModal').modal('hide');
        performArchive(id, name, reason);
    });
});


/* =====================================================
   FILTER PANEL
===================================================== */
function initializeFilterPanel() {

    // -- Collapse / expand toggle --
    $('#toggleFiltersBtn').on('click', function () {
        const body    = $('#filterBody');
        const chevron = $('#filterChevron');

        body.toggleClass('collapsed');
        chevron.toggleClass('fa-chevron-up fa-chevron-down');
    });

    // -- Highlight selects that already have a value (page load) --
    highlightActiveSelects();

    // -- Render any pre-selected tags from URL params --
    renderFilterTags();

    // -- Apply button --
    $('#applyFiltersBtn').off('click').on('click', function () {
        applyFilters();
    });

    // -- Clear button --
    $('#clearFiltersBtn').off('click').on('click', function () {
        clearFilters();
    });

    // -- Live highlight on change --
    $('#yearSelector, #quarterFilter, #areaFilter, #statusFilter').on('change', function () {
        highlightActiveSelects();
        renderFilterTags();
    });

    // -- Allow pressing Enter in any select to apply --
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
        Q1: 'Q1 (Jan-Mar)',
        Q2: 'Q2 (Apr-Jun)',
        Q3: 'Q3 (Jul-Sep)',
        Q4: 'Q4 (Oct-Dec)'
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
    let ajaxUrl = '/api/quarters/post-offices';
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

    // Area column = index 1 - search 'Area X'
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
   YEAR SELECTOR  (standalone dropdown - navigate)
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
    // Build the modal HTML and inject into body
    if ($('#mapmodal').length) return; // already created
    var html =
        '<div class="modal fade" id="mapmodal" tabindex="-1" role="dialog" aria-hidden="true">' +
          '<div class="modal-dialog modal-xl" role="document">' +
            '<div class="modal-content">' +
              '<div class="modal-header" style="background:linear-gradient(135deg,#002868,#6f42c1);color:#fff;">' +
                '<h5 class="modal-title font-weight-bold">' +
                  '<i class="fas fa-map-marked-alt mr-2"></i>Map View' +
                '</h5>' +
                '<button type="button" class="close text-white" data-dismiss="modal"><span>&times;</span></button>' +
              '</div>' +
              '<div class="modal-body p-0" id="mapModalBody">' +
                '<div id="mapContainer" style="height:520px;width:100%;background:#e8e8e8;"></div>' +
              '</div>' +
            '</div>' +
          '</div>' +
        '</div>';
    $('body').append(html);
}

function initializeMapModal() {
    // no-op: event binding is handled inside openMapModal()
}

/**
 * Open the map modal and (re-)initialise Leaflet inside it.
 * Called directly by the View Map button click handler.
 */
function openMapModal() {
    var $modal = $('#mapmodal');

    // Ensure modal exists in DOM
    if (!$modal.length) {
        createMapModal();
        $modal = $('#mapmodal');
    }

    // Destroy any previous Leaflet instance and reset the container
    if (window.leafletMap) {
        try { window.leafletMap.off(); window.leafletMap.remove(); } catch (e) {}
        window.leafletMap = null;
    }
    // Swap container so Leaflet has a pristine element (no _leaflet_id)
    $('#mapContainer').replaceWith(
        '<div id="mapContainer" style="height:520px;width:100%;background:#e8e8e8;"></div>'
    );

    // Show the modal, then init Leaflet after Bootstrap animation completes
    $modal.one('shown.bs.modal', function () {
        setTimeout(function () {
            initializeMap();
        }, 100);
    });

    $modal.modal('show');
}


/* =====================================================
   PRINT REPORT
===================================================== */
function printQuartersReport() {
    // Gather current filter values for the report title
    const year    = $('#yearSelector').val()                        || 'All Years';
    const quarter = $('#quarterFilter option:selected').text().trim() || 'All Quarters';
    const area    = $('#areaFilter option:selected').text().trim()    || 'All Areas';
    const status  = $('#statusFilter option:selected').text().trim()  || 'All Status';

    // Collect visible table rows
    const dtApi = $('#postOfficeTable').DataTable();
    const rows  = dtApi.rows({ search: 'applied' }).data();

    if (rows.length === 0) {
        Swal.fire({
            icon: 'warning',
            title: 'No Data',
            text: 'There are no records to print with the current filters.',
            confirmButtonColor: '#002868'
        });
        return;
    }

    // Build table rows HTML
    let rowsHtml = '';
    rows.each(function (row, idx) {
        const status = row.status
            ? '<span style="color:#155724;font-weight:600;">Active</span>'
            : '<span style="color:#721c24;font-weight:600;">Inactive</span>';
        rowsHtml += `
            <tr>
                <td>${idx + 1}</td>
                <td>${row.areaId ? 'Area ' + row.areaId : 'N/A'}</td>
                <td>${row.name || 'N/A'}</td>
                <td>${row.address || 'N/A'}</td>
                <td>${row.zipCode || 'N/A'}</td>
                <td>${row.speed || 'N/A'}</td>
                <td>${status}</td>
                <td>${row.postmaster || 'N/A'}</td>
            </tr>`;
    });

    const printWindow = window.open('', '_blank', 'width=1100,height=750');
    printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <title>Connectivity Report</title>
            <style>
                * { box-sizing: border-box; margin: 0; padding: 0; }
                body { font-family: 'Segoe UI', Arial, sans-serif; font-size: 12px; color: #222; padding: 24px; }

                /* Header */
                .report-header { display: flex; align-items: center; border-bottom: 3px solid #002868; padding-bottom: 14px; margin-bottom: 18px; }
                .report-header .logo-block { flex-shrink: 0; margin-right: 18px; }
                .report-header .logo-block img { height: 60px; }
                .report-header .title-block h1 { font-size: 18px; color: #002868; font-weight: 700; letter-spacing: 0.5px; }
                .report-header .title-block p  { font-size: 12px; color: #555; margin-top: 3px; }

                /* Meta row */
                .meta-row { display: flex; flex-wrap: wrap; gap: 10px; background: #f4f7fb; border: 1px solid #dde3ee; border-radius: 6px; padding: 10px 14px; margin-bottom: 18px; }
                .meta-item { font-size: 11px; color: #444; }
                .meta-item strong { color: #002868; }

                /* Stats summary */
                .stats-bar { display: flex; gap: 12px; margin-bottom: 18px; }
                .stat-box { flex: 1; text-align: center; border-radius: 6px; padding: 10px 8px; }
                .stat-box.connected   { background: #d4edda; border: 1px solid #c3e6cb; }
                .stat-box.disconnected{ background: #f8d7da; border: 1px solid #f5c6cb; }
                .stat-box.total       { background: #d1ecf1; border: 1px solid #bee5eb; }
                .stat-box .num  { font-size: 22px; font-weight: 700; }
                .stat-box .lbl  { font-size: 10px; text-transform: uppercase; letter-spacing: 0.5px; margin-top: 2px; }
                .stat-box.connected    .num { color: #155724; }
                .stat-box.disconnected .num { color: #721c24; }
                .stat-box.total        .num { color: #0c5460; }

                /* Table */
                table { width: 100%; border-collapse: collapse; margin-top: 6px; }
                thead tr { background: #002868; color: #fff; }
                thead th { padding: 8px 10px; font-size: 11px; font-weight: 600; text-align: left; text-transform: uppercase; letter-spacing: 0.4px; }
                tbody tr { border-bottom: 1px solid #e8eaf0; }
                tbody tr:nth-child(even) { background: #f7f9fc; }
                tbody td { padding: 7px 10px; font-size: 11px; vertical-align: middle; }

                /* Footer */
                .report-footer { margin-top: 24px; border-top: 1px solid #dde3ee; padding-top: 10px; display: flex; justify-content: space-between; font-size: 10px; color: #888; }

                @media print {
                    body { padding: 12px; }
                    thead tr { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
                    .stat-box { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
                }
            </style>
        </head>
        <body>
            <div class="report-header">
                <div class="logo-block">
                    <!-- PHLPost logo placeholder -->
                    <div style="width:60px;height:60px;background:#002868;border-radius:8px;display:flex;align-items:center;justify-content:center;color:#FFD700;font-size:10px;font-weight:700;text-align:center;line-height:1.2;">PHLPost<br>LOGO</div>
                </div>
                <div class="title-block">
                    <h1>PHLPost — Connectivity Report</h1>
                    <p>Post Office Connectivity Management System</p>
                </div>
            </div>

            <div class="meta-row">
                <div class="meta-item"><strong>Year:</strong> ${year}</div>
                <div class="meta-item"><strong>Quarter:</strong> ${quarter}</div>
                <div class="meta-item"><strong>Area:</strong> ${area}</div>
                <div class="meta-item"><strong>Status Filter:</strong> ${status}</div>
                <div class="meta-item"><strong>Total Records:</strong> ${rows.length}</div>
                <div class="meta-item"><strong>Printed:</strong> ${new Date().toLocaleString('en-PH')}</div>
            </div>

            <div class="stats-bar">
                <div class="stat-box connected">
                    <div class="num">${rows.toArray().filter(r => r.status).length}</div>
                    <div class="lbl">Active / Connected</div>
                </div>
                <div class="stat-box disconnected">
                    <div class="num">${rows.toArray().filter(r => !r.status).length}</div>
                    <div class="lbl">Inactive / Disconnected</div>
                </div>
                <div class="stat-box total">
                    <div class="num">${rows.length}</div>
                    <div class="lbl">Total Offices</div>
                </div>
            </div>

            <table>
                <thead>
                    <tr>
                        <th>#</th>
                        <th>Area</th>
                        <th>Post Office</th>
                        <th>Address</th>
                        <th>Zip Code</th>
                        <th>Speed</th>
                        <th>Status</th>
                        <th>Postmaster</th>
                    </tr>
                </thead>
                <tbody>${rowsHtml}</tbody>
            </table>

            <div class="report-footer">
                <span>PHLPost Office Connectivity Management System</span>
                <span>Generated: ${new Date().toLocaleString('en-PH')}</span>
            </div>

            <script>window.onload = function() { window.print(); }<\/script>
        </body>
        </html>
    `);
    printWindow.document.close();
}

function initializeMap() {
    var container = document.getElementById('mapContainer');
    if (!container) {
        console.error('[Map] #mapContainer not found');
        return;
    }
    if (container._leaflet_id) {
        console.warn('[Map] Already initialized');
        return;
    }

    try {
        var map = L.map('mapContainer', { zoomControl: true }).setView([12.8797, 121.7740], 6);
        window.leafletMap = map;

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
            maxZoom: 18
        }).addTo(map);

        setTimeout(function () { map.invalidateSize(); }, 300);

        // ── Search bar ──────────────────────────────────────────────────────
        var allMarkers   = [];
        var searchControl = L.control({ position: 'topright' });
        searchControl.onAdd = function () {
            var div = L.DomUtil.create('div', '');
            div.style.cssText = 'background:#fff;padding:6px 8px;border-radius:8px;box-shadow:0 2px 8px rgba(0,0,0,0.25);display:flex;align-items:center;gap:6px;min-width:240px;';
            div.innerHTML =
                '<i style="color:#888;font-size:13px;" class="fas fa-search"></i>' +
                '<input id="mapSearchInput" type="text" placeholder="Search post office..." ' +
                  'style="border:none;outline:none;font-size:13px;flex:1;padding:2px 4px;font-family:inherit;" />' +
                '<button id="mapSearchClear" title="Clear" ' +
                  'style="border:none;background:none;cursor:pointer;color:#aaa;font-size:14px;padding:0;line-height:1;">&times;</button>';
            L.DomEvent.disableClickPropagation(div);
            return div;
        };
        searchControl.addTo(map);

        // ── Load markers from API ───────────────────────────────────────────
        $.get('/api/post-offices', function (offices) {
            var connected    = 0;
            var disconnected = 0;

            offices.forEach(function (office) {
                // API returns: latitude, longitude, name, connectionStatus, address
                var lat = office.latitude;
                var lng = office.longitude;
                if (!lat || !lng) return;

                var isActive = office.connectionStatus === true || office.connectionStatus === 'true';
                if (isActive) connected++; else disconnected++;

                var marker = L.circleMarker([lat, lng], {
                    radius:      9,
                    fillColor:   isActive ? '#28a745' : '#dc3545',
                    color:       '#fff',
                    weight:      2,
                    fillOpacity: 0.85
                });

                var popupHtml =
                    '<div style="min-width:180px;">' +
                    '<strong style="font-size:13px;">' + (office.name || 'N/A') + '</strong><br>' +
                    '<span style="display:inline-block;margin:3px 0;padding:2px 8px;border-radius:10px;font-size:11px;font-weight:600;' +
                        'background:' + (isActive ? '#d4edda' : '#f8d7da') + ';' +
                        'color:'      + (isActive ? '#155724' : '#721c24') + ';">' +
                        (isActive ? '&#10003; Active' : '&#10007; Inactive') +
                    '</span><br>' +
                    '<small style="color:#555;">' + (office.address || 'No address') + '</small>' +
                    (office.area   ? '<br><small><i class="fas fa-map-marker-alt" style="color:#002868;"></i> ' + office.area + '</small>' : '') +
                    (office.speed  ? '<br><small><i class="fas fa-tachometer-alt" style="color:#6c757d;"></i> ' + office.speed + '</small>' : '') +
                    '</div>';

                marker.bindPopup(popupHtml, { maxWidth: 240 });
                marker.addTo(map);

                // Store reference for search
                allMarkers.push({ marker: marker, name: (office.name || '').toLowerCase(), office: office });
            });

            // Update legend counts
            $('#mapLegendConnected').text('Active (' + connected + ')');
            $('#mapLegendDisconnected').text('Inactive (' + disconnected + ')');

            // ── Wire up search ──────────────────────────────────────────────
            $(document).off('input.mapSearch').on('input.mapSearch', '#mapSearchInput', function () {
                var q = $(this).val().trim().toLowerCase();
                allMarkers.forEach(function (item) {
                    if (!q || item.name.indexOf(q) !== -1) {
                        item.marker.addTo(map);
                        item.marker.setStyle({ radius: 9, fillOpacity: 0.85 });
                    } else {
                        map.removeLayer(item.marker);
                    }
                });
                // Zoom to first match
                if (q) {
                    var match = allMarkers.find(function (item) { return item.name.indexOf(q) !== -1; });
                    if (match) {
                        map.setView(match.marker.getLatLng(), 12);
                        match.marker.openPopup();
                    }
                }
            });

            $(document).off('click.mapClear').on('click.mapClear', '#mapSearchClear', function () {
                $('#mapSearchInput').val('').trigger('input');
                map.setView([12.8797, 121.7740], 6);
            });

        }).fail(function (xhr) {
            console.warn('[Map] Failed to load /api/post-offices:', xhr.status, xhr.statusText);
        });

        // ── Legend ──────────────────────────────────────────────────────────
        var legend = L.control({ position: 'bottomright' });
        legend.onAdd = function () {
            var div = L.DomUtil.create('div', '');
            div.style.cssText = 'background:#fff;padding:10px 14px;border-radius:8px;font-size:12px;' +
                                 'box-shadow:0 2px 8px rgba(0,0,0,0.2);line-height:2;min-width:140px;';
            div.innerHTML =
                '<strong style="display:block;margin-bottom:4px;color:#002868;">Legend</strong>' +
                '<span style="display:inline-block;width:12px;height:12px;background:#28a745;border-radius:50%;margin-right:6px;vertical-align:middle;"></span>' +
                '<span id="mapLegendConnected">Active (0)</span><br>' +
                '<span style="display:inline-block;width:12px;height:12px;background:#dc3545;border-radius:50%;margin-right:6px;vertical-align:middle;"></span>' +
                '<span id="mapLegendDisconnected">Inactive (0)</span>';
            return div;
        };
        legend.addTo(map);

    } catch (err) {
        console.error('[Map] Leaflet init error:', err);
    }
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
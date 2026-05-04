/**
 * Quarters Management Page
 */

/** Role booleans from #quartersRoleFlags (injected inside page content; not on document.body). */
function quartersRoleAttr(dashedKey) {
    const el = document.getElementById('quartersRoleFlags');
    if (!el) return false;
    const v = el.getAttribute('data-' + dashedKey);
    return v != null && String(v).toLowerCase() === 'true';
}

$(document).ready(function () {

    createMapModal();
    initializeTable();
    initializeFilters();
    initializeYearSelector();
    initializeClickableCards();
    initializeMapModal();
    initializeFilterPanel();

    $(document).on('click', '#viewMapBtn', function (e) {
        e.preventDefault();
        openMapModal();
    });

    $('#printReportBtn').on('click', function () {
        printQuartersReport();
    });

    const _qScroll = sessionStorage.getItem('quartersReturnScroll');
    if (_qScroll) {
        sessionStorage.removeItem('quartersReturnScroll');
        setTimeout(function () {
            window.scrollTo({ top: parseInt(_qScroll), behavior: 'instant' });
        }, 600);
    }
});

/* =====================================================
   FILTER PANEL
===================================================== */
function initializeFilterPanel() {
    $('#toggleFiltersBtn').on('click', function () {
        const body    = $('#filterBody');
        const chevron = $('#filterChevron');
        body.toggleClass('collapsed');
        chevron.toggleClass('fa-chevron-up fa-chevron-down');
    });

    highlightActiveSelects();
    renderFilterTags();

    $('#applyFiltersBtn').off('click').on('click', function () {
        applyFilters();
    });

    $('#clearFiltersBtn').off('click').on('click', function () {
        clearFilters();
    });

    $('#yearSelector, #quarterFilter, #areaFilter, #statusFilter').on('change', function () {
        highlightActiveSelects();
        renderFilterTags();
    });

    $('#yearSelector, #quarterFilter, #areaFilter, #statusFilter').on('keypress', function (e) {
        if (e.key === 'Enter') applyFilters();
    });

    // Search bar
    $('#searchBar').on('input', function () {
        const searchTerm = $(this).val().trim();
        highlightSearchBar(searchTerm);
        performSearch(searchTerm);
    });

    $('#searchBar').on('keypress', function (e) {
        if (e.key === 'Enter') {
            e.preventDefault();
            const searchTerm = $(this).val().trim();
            if (searchTerm) applyFiltersWithSearch();
        }
    });

    $('#searchClearBtn').on('click', function () {
        $('#searchBar').val('');
        highlightSearchBar('');
        performSearch('');
    });
}

function getCurrentQuarter() {
    const month = new Date().getMonth() + 1;
    if      (month <= 3)  return 'Q1';
    else if (month <= 6)  return 'Q2';
    else if (month <= 9)  return 'Q3';
    else                  return 'Q4';
}

function applyFilters() {
    const year   = $('#yearSelector').val();
    const area   = $('#areaFilter').length ? $('#areaFilter').val() : '';
    const status = $('#statusFilter').val();

    let quarter = $('#quarterFilter').val();
    if (!quarter) quarter = getCurrentQuarter();

    const params = [];
    if (year)    params.push('year='          + encodeURIComponent(year));
    if (quarter) params.push('quarterFilter=' + encodeURIComponent(quarter));
    if (area)    params.push('areaFilter='    + encodeURIComponent(area));
    if (status)  params.push('statusFilter='  + encodeURIComponent(status));

    const url = '/quarters' + (params.length ? '?' + params.join('&') : '');

    $('#applyFiltersBtn')
        .addClass('loading')
        .html('<i class="fas fa-spinner fa-spin mr-1"></i> Applying...');

    window.location.href = url;
}

function clearFilters() {
    $('#yearSelector').val('');
    $('#quarterFilter').val('');
    if ($('#areaFilter').length) $('#areaFilter').val('');
    $('#statusFilter').val('');
    $('#searchBar').val('');
    highlightActiveSelects();
    highlightSearchBar('');
    renderFilterTags();
    window.location.href = '/quarters';
}

function highlightActiveSelects() {
    $('#yearSelector, #quarterFilter, #areaFilter, #statusFilter').each(function () {
        $(this).toggleClass('has-value', !!$(this).val());
    });
}

function renderFilterTags() {
    const container = $('#activeFilterTags');
    container.empty();

    const year    = $('#yearSelector').val();
    const quarter = $('#quarterFilter').val();
    const area    = $('#areaFilter').length ? $('#areaFilter option:selected').text().trim() : '';
    const areaVal = $('#areaFilter').length ? $('#areaFilter').val() : '';
    const status  = $('#statusFilter').val();
    const search  = $('#searchBar').val().trim();

    if (year)    container.append(buildTag('tag-year',    'fas fa-calendar',       'Year: ' + year,           'yearSelector'));
    if (quarter) container.append(buildTag('tag-quarter', 'fas fa-layer-group',    getQuarterLabel(quarter),  'quarterFilter'));
    if (areaVal) container.append(buildTag('tag-area',    'fas fa-map-marker-alt', 'Area: ' + area,           'areaFilter'));
    if (status === 'active')             container.append(buildTag('tag-status-active',             'fas fa-check-circle',  'Active',             'statusFilter'));
    else if (status === 'inactive')      container.append(buildTag('tag-status-inactive',           'fas fa-times-circle',  'Inactive',           'statusFilter'));
    else if (status === 'newly_connected')    container.append(buildTag('tag-status-newly-connected',    'fas fa-plus-circle',   'Newly Connected',    'statusFilter'));
    else if (status === 'newly_disconnected') container.append(buildTag('tag-status-newly-disconnected', 'fas fa-minus-circle',  'Newly Disconnected', 'statusFilter'));
    if (search)  container.append(buildTag('tag-search', 'fas fa-search', 'Search: ' + search, 'searchBar'));
}

function getQuarterLabel(q) {
    const map = { Q1: 'Q1 (Jan-Mar)', Q2: 'Q2 (Apr-Jun)', Q3: 'Q3 (Jul-Sep)', Q4: 'Q4 (Oct-Dec)' };
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
        if (target === 'searchBar') {
            highlightSearchBar('');
            performSearch('');
        } else {
            highlightActiveSelects();
        }
        renderFilterTags();
    });
}

/* =====================================================
   SEARCH FUNCTIONALITY
===================================================== */
function highlightSearchBar(searchTerm) {
    $('#searchBar').toggleClass('has-value', !!searchTerm);
}

function performSearch(searchTerm) {
    if (!$.fn.DataTable.isDataTable('#postOfficeTable')) return;
    const table = $('#postOfficeTable').DataTable();
    table.search(searchTerm, false, false, true).draw();
}

function applyFiltersWithSearch() {
    const year   = $('#yearSelector').val();
    const area   = $('#areaFilter').length ? $('#areaFilter').val() : '';
    const status = $('#statusFilter').val();
    const search = $('#searchBar').val().trim();

    let quarter = $('#quarterFilter').val();
    if (!quarter) quarter = getCurrentQuarter();

    const params = [];
    if (year)    params.push('year='          + encodeURIComponent(year));
    if (quarter) params.push('quarterFilter=' + encodeURIComponent(quarter));
    if (area)    params.push('areaFilter='    + encodeURIComponent(area));
    if (status)  params.push('statusFilter='  + encodeURIComponent(status));
    if (search)  params.push('search='        + encodeURIComponent(search));

    const url = '/quarters' + (params.length ? '?' + params.join('&') : '');

    $('#applyFiltersBtn')
        .addClass('loading')
        .html('<i class="fas fa-spinner fa-spin mr-1"></i> Applying...');

    window.location.href = url;
}
   /* =====================================================
   TABLE INITIALIZATION
   Columns: # | Name | Area | Province | City/Municipality | Connection Status | Office Status | Speed | Action
===================================================== */
function initializeTable() {
    if (!$('#postOfficeTable').length) return;

    if ($.fn.DataTable.isDataTable('#postOfficeTable')) {
        $('#postOfficeTable').DataTable().destroy();
        $('#postOfficeTable').empty();
    }

    const yearFilter    = $('#yearSelector').val()  || '';
    const quarterFilter = $('#quarterFilter').val() || '';
    const areaFilter    = $('#areaFilter').length ? ($('#areaFilter').val() || '') : '';
    const statusFilter  = $('#statusFilter').val()  || '';

    let ajaxUrl = '/api/quarters/post-offices';
    const params = [];
    if (yearFilter)    params.push('year='    + encodeURIComponent(yearFilter));
    if (quarterFilter) params.push('quarter=' + encodeURIComponent(quarterFilter));
    if (areaFilter)    params.push('area='    + encodeURIComponent(areaFilter));
    if (statusFilter)  params.push('status='  + encodeURIComponent(statusFilter));
    if (params.length) ajaxUrl += '?' + params.join('&');

    try {
        const table = $('#postOfficeTable').DataTable({
            processing: true,
            serverSide: false,
            ajax: {
                url: ajaxUrl,
                dataSrc: '',
                timeout: 30000,
                error: function(xhr) {
                    let msg = 'Failed to load post office data.';
                    if (xhr.status === 0)   msg = 'Network error. Please check your connection.';
                    if (xhr.status === 500) msg = 'Server error. Please try again later.';
                    if (typeof Swal !== 'undefined') {
                        Swal.fire({
                            icon: 'error', 
                            title: 'Data Loading Error', 
                            html: '<p>' + msg + '</p>',
                            confirmButtonText: 'Retry', 
                            showCancelButton: true, 
                            cancelButtonText: 'Refresh Page'
                        }).then(function(result) {
                            if (result.isConfirmed) table.ajax.reload();
                            else if (result.dismiss === Swal.DismissReason.cancel) window.location.reload();
                        });
                    }
                }
            },

            columnDefs: [
                {
                    targets: 0,
                    data: null,
                    render: function(d, t, r, meta) { 
                        try {
                            return meta.row + meta.settings._iDisplayStart + 1; 
                        } catch(e) {
                            return '';
                        }
                    },
                    orderable: false,
                    width: '40px',
                    className: 'dt-center'
                },
                {
                    targets: 1,
                    data: 'area',
                    defaultContent: 'N/A',
                    // System Admin should see Area column; others should not.
                    visible: (function () {
                        return quartersRoleAttr('is-system-admin');
                    })(),
                    render: function(d) { return d || 'N/A'; }
                },
                {
                    targets: 2,
                    data: 'name',
                    defaultContent: 'N/A',
                    render: function(data, type, row) {
                        if (type !== 'display') return data || '';
                        if (!data) return 'N/A';
                        const safe = String(data).replace(/'/g, "\\'");
                        return '<a href="javascript:void(0)" class="office-name-link" onclick="openOfficeProfilePopup(\'' + row.id + '\', \'' + safe + '\')" data-toggle="tooltip" data-placement="top" title="Click to view details for ' + data + '">' + data + '</a>';
                    }
                },
                {
                    targets: 3,
                    data: 'province',
                    defaultContent: 'N/A',
                    render: function(d) { return d || 'N/A'; }
                },
                {
                    targets: 4,
                    data: 'cityMunicipality',
                    defaultContent: 'N/A',
                    render: function(d) { return d || 'N/A'; }
                },
                {
                    targets: 5,
                    data: 'status',
                    width: '140px',
                    className: 'dt-center',
                    render: function(data, type, row) {
                        if (type !== 'display') return data ? 'Active' : 'Inactive';
                        let badge = data
                            ? '<span class="badge badge-success">Active</span>'
                            : '<span class="badge badge-danger">Inactive</span>';
                        if (row.newThisQuarter) {
                            badge += ' <span class="badge badge-info ml-1">New</span>';
                        }
                        return badge;
                    }
                },
                {
                    targets: 6,
                    data: 'speed',
                    defaultContent: 'N/A',
                    render: function(d) { return d || 'N/A'; }
                },
                {
                    targets: 7,
                    data: null,
                    orderable: false,
                    width: '100px',
                    className: (function() {
                        const isSrdOperation = quartersRoleAttr('is-srd-operation');
                        return isSrdOperation ? 'd-none' : 'dt-center';
                    })(),
                    visible: (function() {
                        const isSrdOperation = quartersRoleAttr('is-srd-operation');
                        return !isSrdOperation;
                    })(),
                    render: function(d, t, row) {
                        try {
                            const isSrdOperation   = quartersRoleAttr('is-srd-operation');
                            const canQuarterEdit   = quartersRoleAttr('can-quarter-edit');
                            const canQuarterArchive = quartersRoleAttr('can-quarter-archive');

                            if (isSrdOperation) return '';
                            let btns = '<div class="action-buttons">';
                            if (canQuarterEdit) {
                                btns += '<button class="btn btn-sm btn-warning edit-btn" data-id="' + row.id + '" title="Edit"><i class="fas fa-edit"></i></button>';
                            }
                            btns += '</div>';
                            return btns;
                        } catch(e) {
                            console.error('Error rendering action buttons:', e);
                            return '';
                        }
                    }
                }
            ],

            searching: true,
            search: { search: '' },

            pageLength: 10,
            responsive: true,
            order: (function () {
                // If Area is visible (System Admin), keep old "Area then Name" feel.
                return quartersRoleAttr('is-system-admin') ? [[1, ''], [2, '']] : [[2, '']];
            })(),

            dom: '<"d-flex align-items-center justify-content-between mb-2"<"dt-info" i><"dt-length" l>>rt<"dt-footer d-flex align-items-center justify-content-between mt-2"p>',

            initComplete: function () { 
                try {
                    updateTableSummary(this.api()); 
                } catch(e) {
                    console.error('Table init error:', e);
                }
            }
        });

        table.on('draw', function () { 
            try {
                updateTableSummary(table);
                // Re-initialize tooltips for dynamically added content
                if (typeof $ !== 'undefined' && typeof $.fn.tooltip !== 'undefined') {
                    table.rows().nodes().to$().find('[data-toggle="tooltip"]').tooltip('dispose').tooltip({
                        container: 'body',
                        trigger: 'hover focus',
                        delay: { show: 300, hide: 100 }
                    });
                }
            } catch(e) {
                console.error('Table draw error:', e);
            }
        });

        $('#postOfficeTable').on('click', '.edit-btn', function () {
            editOffice($(this).data('id'));
        });
        $('#postOfficeTable').on('click', '.btn-archive-quarter', function () {
            archiveOfficeFromQuarters($(this).data('id'), $(this).data('name'));
        });
    } catch(error) {
        console.error('DataTables initialization error:', error);
        if (typeof Swal !== 'undefined') {
            Swal.fire({
                icon: 'error', 
                title: 'Table Error', 
                text: 'Failed to initialize data table. Please refresh the page.',
                confirmButtonColor: '#002868'
            });
        }
    }
}

function updateTableSummary(api) {
    const info    = api.page.info();
    const total   = info.recordsTotal;
    const visible = info.recordsDisplay;
    const summary = visible < total
        ? 'Showing <strong>' + visible + '</strong> of <strong>' + total + '</strong> offices (filtered)'
        : 'Showing all <strong>' + total + '</strong> offices';
    $('#tableFilterSummary').html(summary);
}

function initializeFilters()     { /* no-op */ }
function initializeYearSelector(){ /* no-op */ }

/* =====================================================
   CLICKABLE STAT CARDS
===================================================== */
function initializeClickableCards() {
    $('.clickable-card').on('click', function () {
        const filter = $(this).data('filter');
        const year   = $(this).data('year');
        if      (filter === 'connected')    window.location.href = '/quarters?statusFilter=active&year='      + encodeURIComponent(year);
        else if (filter === 'disconnected') window.location.href = '/quarters?statusFilter=inactive&year='    + encodeURIComponent(year);
        else                                window.location.href = '/quarters?year='                          + encodeURIComponent(year);
    });
}

/* =====================================================
   MAP MODAL
===================================================== */
function createMapModal() {
    if ($('#mapmodal').length) return;
    $('body').append(
        '<div class="modal fade" id="mapmodal" tabindex="-1" role="dialog" aria-hidden="true">' +
          '<div class="modal-dialog modal-xl" role="document"><div class="modal-content">' +
            '<div class="modal-header" style="background:linear-gradient(135deg,#002868,#6f42c1);color:#fff;">' +
              '<h5 class="modal-title font-weight-bold"><i class="fas fa-map-marked-alt mr-2"></i>Map View</h5>' +
              '<button type="button" class="close text-white" data-dismiss="modal"><span>&times;</span></button>' +
            '</div>' +
            '<div class="modal-body p-0"><div id="mapContainer" style="height:520px;width:100%;background:#e8e8e8;"></div></div>' +
          '</div></div></div>'
    );
}

function initializeMapModal() { /* no-op */ }

function openMapModal() {
    var $modal = $('#mapmodal');
    if (!$modal.length) { createMapModal(); $modal = $('#mapmodal'); }
    if (window.leafletMap) {
        try { window.leafletMap.off(); window.leafletMap.remove(); } catch(e) {}
        window.leafletMap = null;
    }
    $('#mapContainer').replaceWith('<div id="mapContainer" style="height:520px;width:100%;background:#e8e8e8;"></div>');
    $modal.one('shown.bs.modal', function () { setTimeout(initializeMap, 100); });
    $modal.modal('show');
}

/* =====================================================
   PRINT REPORT
===================================================== */
function printQuartersReport() {
    const year    = $('#yearSelector').val()                          || 'All Years';
    const quarter = $('#quarterFilter option:selected').text().trim() || 'All Quarters';
    const area    = $('#areaFilter option:selected').text().trim()    || 'All Areas';
    const status  = $('#statusFilter option:selected').text().trim()  || 'All Status';

    if (!$.fn.DataTable.isDataTable('#postOfficeTable')) {
        Swal.fire({ icon: 'warning', title: 'No Data', text: 'Table is not ready.', confirmButtonColor: '#002868' });
        return;
    }

    const dtApi = $('#postOfficeTable').DataTable();
    const rows  = dtApi.rows({ search: 'applied' }).data();

    if (rows.length === 0) {
        Swal.fire({ icon: 'warning', title: 'No Data', text: 'No records to print with current filters.', confirmButtonColor: '#002868' });
        return;
    }

    let rowsHtml = '';
    rows.each(function (row, idx) {
        const connStatus = row.status
            ? '<span style="color:#155724;font-weight:600;">Active</span>'
            : '<span style="color:#721c24;font-weight:600;">Inactive</span>';
        
        rowsHtml += '<tr><td>' + (idx + 1) + '</td><td>' + (row.name || 'N/A') + '</td><td>' + (row.area || 'N/A') + '</td><td>' + (row.province || 'N/A') + '</td><td>' + (row.city || 'N/A') + '</td><td>' + connStatus + '</td><td>' + (row.speed || 'N/A') + '</td></tr>';
    });

    const pw = window.open('', '_blank', 'width=1100,height=750');
    pw.document.write('<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Connectivity Report</title><style>body{font-family:\'Segoe UI\',Arial,sans-serif;font-size:12px;color:#222;padding:24px;}h2{color:#002868;}table{width:100%;border-collapse:collapse;margin-top:12px;}thead tr{background:#002868;color:#fff;}thead th{padding:8px 10px;font-size:11px;font-weight:600;text-align:left;text-transform:uppercase;}tbody tr{border-bottom:1px solid #e8eaf0;}tbody tr:nth-child(even){background:#f7f9fc;}tbody td{padding:7px 10px;font-size:11px;}@media print{body{padding:10px;}}</style></head><body>');
    pw.document.write('<h2>PHLPost — Connectivity Report</h2>');
    pw.document.write('<p><strong>Year:</strong> ' + year + ' &nbsp;|&nbsp; <strong>Quarter:</strong> ' + quarter + ' &nbsp;|&nbsp; <strong>Area:</strong> ' + area + ' &nbsp;|&nbsp; <strong>Status:</strong> ' + status + ' &nbsp;|&nbsp; <strong>Total Records:</strong> ' + rows.length + ' &nbsp;|&nbsp; <strong>Printed:</strong> ' + new Date().toLocaleString('en-PH') + '</p>');
    pw.document.write('<table><thead><tr><th>#</th><th>Post Office</th><th>Area</th><th>Province</th><th>City/Municipality</th><th>Connection Status</th><th>Speed</th></tr></thead><tbody>' + rowsHtml + '</tbody></table>');
    pw.document.write('<script>window.onload=function(){window.print();}<\/script></body></html>');
    pw.document.close();
}

function initializeMap() {
    var container = document.getElementById('mapContainer');
    if (!container || container._leaflet_id) return;
    try {
        var map = L.map('mapContainer', { zoomControl: true }).setView([12.8797, 121.7740], 6);
        window.leafletMap = map;
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; OpenStreetMap contributors', maxZoom: 18
        }).addTo(map);
        setTimeout(function () { map.invalidateSize(); }, 300);

        $.get('/api/post-offices', function (offices) {
            var connected = 0, disconnected = 0;
            offices.forEach(function (o) {
                if (!o.latitude || !o.longitude) return;
                var active = o.connectionStatus === true || o.connectionStatus === 'true';
                if (active) connected++; else disconnected++;
                
                var officeId = o.id;
                var nameRaw = o.name || 'N/A';
                var addressRaw = o.address || 'N/A';
                var areaRaw = o.area || 'N/A';
                var postmasterRaw = o.postmaster || 'N/A';
                var speedRaw = o.speed || 'N/A';
                var employeesRaw = o.noOfEmployees || 'N/A';
                var contactPersonRaw = o.postalOfficeContactPerson || 'N/A';
                var contactNumberRaw = o.postalOfficeContactNumber || 'N/A';
                var coverPhotoSrc = o.coverPhotoUrl || '/images/no-image.png';
                
                var popupContent = `
                    <div style="padding:8px;font-family:Segoe UI,Arial,sans-serif;">
                        <div style="margin-bottom:6px;">
                            <span style="color:#002868;font-weight:600;font-size:13px;">${nameRaw}</span><br>
                            <span style="color:#7a869a;font-size:11px;">${areaRaw}</span>
                        </div>
                        <div style="margin-bottom:4px;">
                            <span style="color:#7a869a;">Postmaster</span><br>
                            <strong style="color:#002868;">${postmasterRaw}</strong>
                        </div>
                        <div style="margin-bottom:4px;">
                            <span style="color:#7a869a;">Address</span><br>
                            <span style="color:#4d5a73;font-size:11px;">${addressRaw}</span>
                        </div>
                        <div style="margin-bottom:4px;">
                            <span style="color:#7a869a;">Speed</span><br>
                            <strong style="color:#002868;">${speedRaw}</strong>
                        </div>
                        <div style="margin-bottom:4px;">
                            <span style="color:#7a869a;">Employees</span><br>
                            <strong style="color:#002868;">${employeesRaw}</strong>
                        </div>
                        <div style="margin-bottom:4px;">
                            <span style="color:#7a869a;">Contact</span><br>
                            <strong style="color:#002868;">${contactPersonRaw}</strong><br>
                            <span style="color:#4d5a73;">${contactNumberRaw}</span>
                        </div>
                        <div style="display:flex;gap:6px;margin-top:8px;">
                            <button onclick="openOfficeProfilePopup('${officeId}', '${nameRaw.replace(/'/g, "\\'")}')" style="flex:1;background:#002868;color:#fff;border:none;padding:6px 12px;border-radius:6px;font-size:12px;cursor:pointer;font-weight:600;">View Profile</button>
                        </div>
                    </div>
                `;
                
                L.circleMarker([o.latitude, o.longitude], {
                    radius: 9, fillColor: active ? '#28a745' : '#dc3545',
                    color: '#fff', weight: 2, fillOpacity: 0.85
                }).bindPopup(popupContent, { maxWidth: 280, maxHeight: 400 }).addTo(map);
            });
            $('#mapLegendConnected').text('Active (' + connected + ')');
            $('#mapLegendDisconnected').text('Inactive (' + disconnected + ')');
        });

        var legend = L.control({ position: 'bottomright' });
        legend.onAdd = function () {
            var div = L.DomUtil.create('div', '');
            div.style.cssText = 'background:#fff;padding:10px 14px;border-radius:8px;font-size:12px;box-shadow:0 2px 8px rgba(0,0,0,0.2);';
            div.innerHTML = '<strong style="color:#002868;">Legend</strong><br><span style="display:inline-block;width:12px;height:12px;background:#28a745;border-radius:50%;margin-right:6px;"></span><span id="mapLegendConnected">Active (0)</span><br><span style="display:inline-block;width:12px;height:12px;background:#dc3545;border-radius:50%;margin-right:6px;"></span><span id="mapLegendDisconnected">Inactive (0)</span>';
            return div;
        };
        legend.addTo(map);
    } catch (err) { console.error('[Map] Leaflet init error:', err); }
}

/* =====================================================
   EDIT MODAL - Uses HTML template with restricted sections
===================================================== */

/* =====================================================
   OFFICE ACTIONS
===================================================== */
function viewOffice(id, officeName) {
    const year    = document.getElementById('yearSelector')?.value  || '';
    const quarter = document.getElementById('quarterFilter')?.value || '';
    const area    = document.getElementById('areaFilter')?.value    || '';
    const status  = document.getElementById('statusFilter')?.value  || '';
    const params  = [];
    if (year)    params.push('year='          + encodeURIComponent(year));
    if (quarter) params.push('quarterFilter=' + encodeURIComponent(quarter));
    if (area)    params.push('areaFilter='    + encodeURIComponent(area));
    if (status)  params.push('statusFilter='  + encodeURIComponent(status));
    sessionStorage.setItem('quartersReturnUrl',    '/quarters' + (params.length ? '?' + params.join('&') : ''));
    sessionStorage.setItem('quartersReturnScroll', window.scrollY);
    Swal.fire({ title: 'Loading Profile...', allowOutsideClick: false, allowEscapeKey: false, showConfirmButton: false, didOpen: () => Swal.showLoading() });
    setTimeout(() => { window.location.href = '/profile/' + id + '?source=quarters'; }, 500);
}

function editOffice(id) {
    Swal.fire({ title: 'Loading Office Data...', allowOutsideClick: false, allowEscapeKey: false, showConfirmButton: false, didOpen: () => Swal.showLoading() });
    $.ajax({
        url: '/api/postal-office/' + id, method: 'GET',
        success: function(o) {
            Swal.close();
            
            // Clear any previous modal data
            $('#editOfficeForm')[0].reset();
            
            // Set office ID
            $('#editOfficeId').val(o.id);
            
            // Populate fields that are visible on quarters page (Connectivity section)
            $('#editStatus').val(o.connectionStatus ? 'true' : 'false');
            $('#editOfficeStatus').val(o.officeStatus || '');
            $('#editClassification').val(o.classification || '');
            $('#editServiceProvided').val(o.serviceProvided || '');
            $('#editISP').val(o.internetServiceProvider || '');
            
            // Handle typeOfConnection - add to dropdown if not exists
            var typeOfConn = o.typeOfConnection || '';
            if (typeOfConn && $('#editTypeOfConnection option[value="' + typeOfConn + '"]').length === 0) {
                $('#editTypeOfConnection').append('<option value="' + typeOfConn + '">' + typeOfConn + '</option>');
            }
            $('#editTypeOfConnection').val(typeOfConn);
            
            // Handle IP Address Type
            if (o.staticIpAddress === 'Static') {
                $('#editIPAddressType').val('static');
            } else if (o.staticIpAddress === 'Dynamic' || o.staticIpAddress === null) {
                $('#editIPAddressType').val('dynamic');
            } else {
                $('#editIPAddressType').val('');
            }
            
            window._quartersEditOriginal = {
                connectionStatus: !!o.connectionStatus,
                officeStatus: o.officeStatus || null,
                classification: o.classification || null,
                serviceProvided: o.serviceProvided || null,
                internetServiceProvider: o.internetServiceProvider || null,
                typeOfConnection: o.typeOfConnection || null,
                staticIpAddress: o.staticIpAddress || null
            };
            
            // Handle IP Address Type
            if (o.staticIpAddress === 'Static') {
                $('#editIPAddressType').val('static');
            } else if (o.staticIpAddress === 'Dynamic' || o.staticIpAddress === null) {
                $('#editIPAddressType').val('dynamic');
            } else {
                $('#editIPAddressType').val('');
            }
            
            // Show the modal
            $('#editOfficeModal').modal('show');
        },
        error: function(xhr) { 
            Swal.fire({ 
                icon: 'error', 
                title: 'Error', 
                text: xhr.responseJSON?.message || 'Failed to load office data' 
            }); 
        }
    });
}

function saveOfficeChanges() {
    const id = $('#editOfficeId').val();
    const candidate = {
        connectionStatus: $('#editStatus').val() === 'true',
        officeStatus: $('#editOfficeStatus').val() || null,
        classification: $('#editClassification').val() || null,
        serviceProvided: $('#editServiceProvided').val() || null,
        internetServiceProvider: $('#editISP').val() || null,
        typeOfConnection: $('#editTypeOfConnection').val() || null,
        staticIpAddress: $('#editIPAddressType').val() === 'static'
            ? 'Static'
            : ($('#editIPAddressType').val() === 'dynamic' ? 'Dynamic' : null)
    };
    const original = window._quartersEditOriginal || {};
    const data = {};
    Object.keys(candidate).forEach((k) => {
        if (String(candidate[k]) !== String(original[k])) {
            data[k] = candidate[k];
        }
    });
    if (Object.keys(data).length === 0) {
        Swal.fire({ icon: 'info', title: 'No Changes', text: 'No field changes detected.' });
        return;
    }
    Swal.fire({ title: 'Saving Changes...', allowOutsideClick: false, allowEscapeKey: false, showConfirmButton: false, didOpen: () => Swal.showLoading() });
    $.ajax({
        url: '/api/postal-office/' + id, method: 'PUT', contentType: 'application/json', data: JSON.stringify(data),
        success: function(res) {
            $('#editOfficeModal').modal('hide');
            Swal.fire({
                icon: 'success',
                title: res && res.requiresApproval ? 'Submitted!' : 'Saved!',
                text: (res && res.message) ? res.message : ((res && res.requiresApproval)
                    ? 'Your changes were submitted for approval.'
                    : 'Changes have been saved successfully'),
                timer: 1800,
                showConfirmButton: false
            })
                .then(() => location.reload());
        },
        error: function(xhr) { Swal.fire({ icon: 'error', title: 'Update Failed', text: xhr.responseJSON?.message || 'Failed to update post office' }); }
    });
}

function archiveOfficeFromQuarters(id, officeName) {
    $('#quartersArchiveOfficeName').text(officeName);
    $('#quartersArchiveReasonInput').val('');
    $('#quartersArchiveModal').data('office-id', id).modal('show');
}

// Archive modal confirmation button handler
$(document).on('click', '#quartersConfirmArchiveBtn', function() {
    const modal = $('#quartersArchiveModal');
    const officeId = modal.data('office-id');
    const officeName = $('#quartersArchiveOfficeName').text();
    const reason = $('#quartersArchiveReasonInput').val().trim();

    if (!officeId) {
        Swal.fire({ icon: 'error', title: 'Error', text: 'Office ID not found' });
        return;
    }

    modal.modal('hide');
    performArchive(officeId, officeName, reason);
});

function performArchive(id, officeName, reason) {
    Swal.fire({ title: 'Archiving...', allowOutsideClick: false, allowEscapeKey: false, showConfirmButton: false, didOpen: () => Swal.showLoading() });
    $.ajax({
        url: '/api/archive/' + id, method: 'POST', contentType: 'application/json', data: JSON.stringify({ reason }),
        success: function(res) {
            if (res.success) Swal.fire({ icon: 'success', title: 'Archived!', text: res.message, timer: 2000, showConfirmButton: false }).then(() => location.reload());
            else Swal.fire({ icon: 'error', title: 'Archive Failed', text: res.message });
        },
        error: function(xhr) { Swal.fire({ icon: 'error', title: 'Error', text: xhr.responseJSON?.message || 'An error occurred' }); }
    });
}

function infoRow(icon, label, value) {
    const val = (value !== null && value !== undefined && value !== '') ? value : '—';
    return '<div class="mb-2 d-flex align-items-start" style="font-size:13px;"><i class="' + icon + ' text-muted mr-2 mt-1" style="width:14px;flex-shrink:0;"></i><div><span class="text-muted" style="font-size:11px;display:block;">' + label + '</span><strong>' + val + '</strong></div></div>';
}

function renderOfficePopup(data, officeId) {
    const area      = data.areaId ? 'Area ' + data.areaId : 'N/A';
    const connBadge = data.connectionStatus
        ? '<span class="badge badge-success px-3 py-2"><i class="fas fa-wifi mr-1"></i>Active</span>'
        : '<span class="badge badge-danger px-3 py-2"><i class="fas fa-wifi mr-1"></i>Inactive</span>';
    const officeBadge = data.officeStatus === 'OPEN'
        ? '<span class="badge badge-info px-3 py-2"><i class="fas fa-door-open mr-1"></i>Open</span>'
        : data.officeStatus === 'CLOSED'
        ? '<span class="badge badge-danger px-3 py-2"><i class="fas fa-door-closed mr-1"></i>Closed</span>'
        : '';

    const coverPhoto = `/api/postal-office/${officeId}/cover-photo/1`;

    document.getElementById('popupOfficeName').textContent = data.name || 'Post Office Profile';

    document.getElementById('officeProfileModalBody').innerHTML = `
        <!-- Cover Photo Banner -->
        <div style="height:180px;overflow:hidden;position:relative;background:#1a3a7a;">
            <img src="${coverPhoto}" onerror="this.style.display='none'"
                 style="width:100%;height:100%;object-fit:contain;opacity:0.7;">
            <div style="position:absolute;bottom:12px;left:20px;">
                <h4 class="text-white font-weight-bold mb-1" style="text-shadow:0 1px 4px rgba(0,0,0,0.5);">
                    ${data.name || 'N/A'}
                </h4>
                <div style="display:flex;gap:6px;">
                    ${connBadge}
                    ${officeBadge}
                </div>
            </div>
        </div>

        <!-- Body -->
        <div class="p-4">
            <div class="row">

                <!-- Left: Basic Info -->
                <div class="col-md-4 mb-3">
                    <h6 class="font-weight-bold text-primary border-bottom pb-2 mb-3">
                        <i class="fas fa-info-circle mr-1"></i>Basic Information
                    </h6>
                    ${infoRow('fas fa-map-marker-alt', 'Area', area)}
                    ${infoRow('fas fa-envelope', 'ZIP Code', data.zipCode)}
                    ${infoRow('fas fa-map', 'Address', data.address)}
                    ${infoRow('fas fa-user-tie', 'Postmaster', data.postmaster)}
                    ${infoRow('fas fa-tag', 'Classification', data.classification)}
                    ${infoRow('fas fa-concierge-bell', 'Services Provided', data.serviceProvided)}
                </div>

                <!-- Middle: Connectivity -->
                <div class="col-md-4 mb-3">
                    <h6 class="font-weight-bold text-primary border-bottom pb-2 mb-3">
                        <i class="fas fa-wifi mr-1"></i>Connectivity
                    </h6>
                    ${infoRow('fas fa-building', 'ISP', data.internetServiceProvider)}
                    ${infoRow('fas fa-plug', 'Connection Type', data.typeOfConnection)}
                    ${infoRow('fas fa-tachometer-alt', 'Speed', data.speed)}
                    ${infoRow('fas fa-network-wired', 'Static IP', data.staticIpAddress)}
                    ${infoRow('fas fa-comment-alt', 'Remarks', data.remarks)}
                </div>

                <!-- Right: Staff & Contact -->
                <div class="col-md-4 mb-3">
                    <h6 class="font-weight-bold text-primary border-bottom pb-2 mb-3">
                        <i class="fas fa-users mr-1"></i>Staff & Contact
                    </h6>
                    ${infoRow('fas fa-users', 'Employees', data.noOfEmployees)}
                    ${infoRow('fas fa-cash-register', 'Tellers', data.noOfPostalTellers)}
                    ${infoRow('fas fa-mail-bulk', 'Letter Carriers', data.noOfLetterCarriers)}
                    ${infoRow('fas fa-phone', 'Office Contact', data.postalOfficeContactPerson)}
                    ${infoRow('fas fa-phone-alt', 'Contact Number', data.postalOfficeContactNumber)}
                </div>

            </div>
        </div>
    `;
}

window.addEventListener('beforeunload', function () {
    if ($.fn.DataTable.isDataTable('#postOfficeTable')) $('#postOfficeTable').DataTable().destroy();
});
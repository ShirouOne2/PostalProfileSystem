/**
 * report.js — Connectivity Report Page
 * Filter panel, print, and Excel export functionality
 */

$(document).ready(function () {
    initializeFilterPanel();
    initializePrint();
    initializeExportExcel();
    initializeReportTable();
});

/* ── Toggle expandable office list in QB cards ── */
function toggleQbList(btn) {
    var list = btn.nextElementSibling;
    if (!list || !list.classList.contains('qb-list')) return;
    var isOpen = list.classList.toggle('open');
    btn.classList.toggle('open', isOpen);
}

/* ── Toggle names in table cells ── */
function toggleNames(btn) {
    var list = btn.parentElement.querySelector('.qb-names-list');
    if (!list) return;
    var isOpen = list.classList.toggle('open');
    btn.innerHTML = isOpen
        ? '<i class="fas fa-chevron-up mr-1"></i>hide offices'
        : '<i class="fas fa-chevron-down mr-1"></i>show offices';
}

/**
 * Navigate to postal office profile page.
 * data-office-id is set by Thymeleaf from the "ID::" prefix in the entry string.
 * source=report tells the Back button on the profile page to return here.
 */
function goToProfile(el) {
    var id = el.getAttribute('data-office-id');
    if (!id || id.trim() === '') return;
    // Save current URL (with filters) so the Back button on profile works
    sessionStorage.setItem('reportReturnUrl', window.location.href);
    window.location.href = '/profile/' + id.trim() + '?source=report';
}

/* =====================================================
   FILTER PANEL
===================================================== */
function initializeFilterPanel() {

    highlightActiveSelects();
    renderFilterTags();

    $('#toggleFiltersBtn').on('click', function () {
        $('#filterBody').toggleClass('collapsed');
        $('#filterChevron').toggleClass('fa-chevron-up fa-chevron-down');
    });

    $('#applyFiltersBtn').on('click', function () {
        applyFilters();
    });

    $('#clearFiltersBtn').on('click', function () {
        clearFilters();
    });

    $('#yearSelector, #quarterFilter, #areaFilter, #statusFilter').on('change', function () {
        highlightActiveSelects();
        renderFilterTags();
    });

    $('#yearSelector, #quarterFilter, #areaFilter, #statusFilter').on('keypress', function (e) {
        if (e.key === 'Enter') applyFilters();
    });
}

function applyFilters() {
    var year    = $('#yearSelector').val();
    var quarter = $('#quarterFilter').val();
    var area    = $('#areaFilter').val();
    var status  = $('#statusFilter').val();

    var params = [];
    if (year)    params.push('year='          + encodeURIComponent(year));
    if (quarter) params.push('quarterFilter=' + encodeURIComponent(quarter));
    if (area)    params.push('areaFilter='    + encodeURIComponent(area));
    if (status)  params.push('statusFilter='  + encodeURIComponent(status));

    $('#applyFiltersBtn')
        .addClass('loading')
        .html('<i class="fas fa-spinner fa-spin mr-1"></i> Applying...');

    window.location.href = '/report' + (params.length ? '?' + params.join('&') : '');
}

function clearFilters() {
    window.location.href = '/report';
}

function highlightActiveSelects() {
    $('#yearSelector, #quarterFilter, #areaFilter, #statusFilter').each(function () {
        $(this).toggleClass('has-value', !!$(this).val());
    });
}

function renderFilterTags() {
    var container = $('#activeFilterTags');
    container.empty();

    var year     = $('#yearSelector').val();
    var quarter  = $('#quarterFilter').val();
    var areaVal  = $('#areaFilter').val();
    var areaText = $('#areaFilter option:selected').text().trim();
    var status   = $('#statusFilter').val();

    var qLabels = { Q1:'Q1 (Jan–Mar)', Q2:'Q2 (Apr–Jun)', Q3:'Q3 (Jul–Sep)', Q4:'Q4 (Oct–Dec)' };
    var sLabels = {
        active:              'Active',
        inactive:            'Inactive',
        newly_connected:     'Newly Connected',
        newly_disconnected:  'Newly Disconnected'
    };

    if (year)    container.append(buildTag('tag-year',    'fas fa-calendar',        'Year: '   + year,               'yearSelector'));
    if (quarter) container.append(buildTag('tag-quarter', 'fas fa-layer-group',     qLabels[quarter] || quarter,     'quarterFilter'));
    if (areaVal) container.append(buildTag('tag-area',    'fas fa-map-marker-alt',  'Area: '   + areaText,           'areaFilter'));
    if (status)  container.append(buildTag('tag-status-' + status.replace('_','-'), 'fas fa-wifi', sLabels[status] || status, 'statusFilter'));
}

function buildTag(extraClass, iconClass, text, selectId) {
    return $('<span class="filter-tag ' + extraClass + '">' +
             '<i class="' + iconClass + ' mr-1"></i>' + text +
             '<button class="remove-tag" data-target="' + selectId + '" title="Remove">' +
             '<i class="fas fa-times"></i></button></span>')
        .on('click', '.remove-tag', function () {
            $('#' + $(this).data('target')).val('');
            highlightActiveSelects();
            renderFilterTags();
        });
}

/* =====================================================
   PRINT
===================================================== */
function initializePrint() {
    $('#printReportBtn').on('click', function () {
        var $btn = $(this);
        $btn.prop('disabled', true).html('<i class="fas fa-spinner fa-spin mr-1"></i> Preparing...');

        var year    = $('#yearSelector option:selected').text().trim()  || 'All Years';
        var quarter = $('#quarterFilter option:selected').text().trim() || 'All Quarters';
        var area    = $('#areaFilter option:selected').text().trim()    || 'All Areas';
        var status  = $('#statusFilter option:selected').text().trim()  || 'All Status';

        var connected    = $('.border-bottom-success h2').first().text().trim();
        var disconnected = $('.border-bottom-danger h2').first().text().trim();
        var total        = $('.border-bottom-primary h2').first().text().trim();

        // Build table rows
        // Column order: Year(0) | Quarter(1) | Connected(2) | Newly Connected(3) | Disconnected(4) | Newly Disconnected(5) | Total(6) | Status(7)
        var tableRows = '';
        $('#quarterlyBreakdownTable tbody tr').each(function () {
            var cells = $(this).find('td');
            if (cells.length < 7) return;
            var isCurrent = $(this).hasClass('table-info') || $(this).hasClass('font-weight-bold');
            var rowStyle  = isCurrent ? 'background:#eef2ff;font-weight:bold;' : '';

            var year     = cells.eq(0).text().trim();
            var quarter  = cells.eq(1).text().trim();
            var conn     = cells.eq(2).find('.font-weight-bold').text().trim() || cells.eq(2).text().trim() || '—';
            var newlyConn= cells.eq(3).find('.badge-success').text().trim() || cells.eq(3).find('.text-muted').text().trim() || cells.eq(3).text().trim() || '—';
            var disconn  = cells.eq(4).find('.font-weight-bold').text().trim() || cells.eq(4).text().trim() || '—';
            var newlyDisc= cells.eq(5).find('.badge-danger').text().trim() || cells.eq(5).find('.text-muted').text().trim() || cells.eq(5).text().trim() || '—';
            var total    = cells.eq(6).text().trim() || '—';
            var status   = cells.eq(7).text().trim() || '—';

            tableRows += '<tr style="' + rowStyle + '">';
            tableRows += '<td>' + year     + '</td>';
            tableRows += '<td>' + quarter  + '</td>';
            tableRows += '<td style="text-align:center;color:#1a9e72;font-weight:600;">' + conn      + '</td>';
            tableRows += '<td style="text-align:center;color:#28a745;font-weight:600;">' + newlyConn + '</td>';
            tableRows += '<td style="text-align:center;color:#c0392b;font-weight:600;">' + disconn   + '</td>';
            tableRows += '<td style="text-align:center;color:#dc3545;font-weight:600;">' + newlyDisc + '</td>';
            tableRows += '<td style="text-align:center;color:#2e59d9;font-weight:600;">' + total     + '</td>';
            tableRows += '<td style="text-align:center;">'                               + status    + '</td>';
            tableRows += '</tr>';
        });

        var printDate = new Date().toLocaleDateString('en-PH', {
            year: 'numeric', month: 'long', day: 'numeric',
            hour: '2-digit', minute: '2-digit'
        });

        var html = '<!DOCTYPE html><html><head><meta charset="utf-8">' +
            '<title>PHLPost Connectivity Report</title>' +
            '<style>' +
            '* { box-sizing: border-box; margin: 0; padding: 0; }' +
            'body { font-family: Arial, sans-serif; padding: 28px; color: #222; font-size: 13px; }' +
            '.rpt-header { display: flex; justify-content: space-between; align-items: flex-start;' +
            '  border-bottom: 3px solid #002868; padding-bottom: 12px; margin-bottom: 18px; }' +
            '.rpt-header-left h1 { color: #002868; font-size: 18px; margin-bottom: 3px; }' +
            '.rpt-header-left p { color: #666; font-size: 11px; }' +
            '.rpt-header-right { font-size: 11px; color: #555; text-align: right; }' +
            '.filters { display: flex; flex-wrap: wrap; gap: 8px; background: #f4f6fb;' +
            '  border: 1px solid #dde1ed; border-radius: 5px; padding: 10px 14px; margin-bottom: 18px; }' +
            '.filter-chip { font-size: 11px; background: #e8ecf8; border-radius: 12px;' +
            '  padding: 3px 10px; color: #002868; font-weight: 600; }' +
            '.stats { display: flex; gap: 12px; margin-bottom: 20px; }' +
            '.stat-box { flex: 1; border-radius: 6px; padding: 14px 10px; text-align: center; border: 1px solid #ddd; }' +
            '.stat-box .label { font-size: 10px; text-transform: uppercase; letter-spacing: 0.6px; color: #888; margin-bottom: 6px; }' +
            '.stat-box .value { font-size: 26px; font-weight: 700; }' +
            '.stat-connected    { border-top: 4px solid #1cc88a; } .stat-connected .value { color: #1a9e72; }' +
            '.stat-disconnected { border-top: 4px solid #e74a3b; } .stat-disconnected .value { color: #c0392b; }' +
            '.stat-total        { border-top: 4px solid #4e73df; } .stat-total .value { color: #2e59d9; }' +
            'h3 { color: #002868; font-size: 13px; margin-bottom: 8px; border-left: 4px solid #002868; padding-left: 8px; }' +
            'table { width: 100%; border-collapse: collapse; font-size: 12px; }' +
            'thead tr { background: #002868 !important; color: #fff !important;' +
            '  -webkit-print-color-adjust: exact; print-color-adjust: exact; }' +
            'th { padding: 8px 10px; text-align: left; font-weight: 600; font-size: 11px; letter-spacing: 0.3px; }' +
            'td { padding: 7px 10px; border-bottom: 1px solid #e8e8e8; }' +
            'tbody tr:nth-child(even) { background: #f8f9fc; }' +
            '.footer { margin-top: 22px; font-size: 10px; color: #aaa; text-align: center;' +
            '  border-top: 1px solid #eee; padding-top: 10px; }' +
            '@page { margin: 15mm; }' +
            '</style></head><body>' +

            '<div class="rpt-header">' +
            '  <div class="rpt-header-left">' +
            '    <h1>&#128205; PHLPost &mdash; Connectivity Report</h1>' +
            '    <p>Philippine Postal Corporation &bull; Profile System</p>' +
            '  </div>' +
            '  <div class="rpt-header-right">' +
            '    <strong>Generated:</strong><br>' + printDate +
            '  </div>' +
            '</div>' +

            '<div class="filters">' +
            '  <span class="filter-chip">&#128197; ' + year    + '</span>' +
            '  <span class="filter-chip">&#128200; ' + quarter + '</span>' +
            '  <span class="filter-chip">&#128205; ' + area    + '</span>' +
            '  <span class="filter-chip">&#128246; ' + status  + '</span>' +
            '</div>' +

            '<div class="stats">' +
            '  <div class="stat-box stat-connected"><div class="label">Active (Connected)</div><div class="value">' + connected + '</div></div>' +
            '  <div class="stat-box stat-disconnected"><div class="label">Inactive (Disconnected)</div><div class="value">' + disconnected + '</div></div>' +
            '  <div class="stat-box stat-total"><div class="label">Total Offices</div><div class="value">' + total + '</div></div>' +
            '</div>' +

            '<h3>Quarterly Breakdown</h3>' +
            '<table>' +
            '<thead><tr><th>Year</th><th>Quarter</th><th>Connected</th><th>Newly Connected</th><th>Disconnected</th><th>Newly Disconnected</th><th>Total</th><th>Status</th></tr></thead>' +
            '<tbody>' + tableRows + '</tbody>' +
            '</table>' +

            // Newly Connected Offices Table
            '<h3>Newly Connected Offices</h3>' +
            '<table>' +
            '<thead><tr><th>Year</th><th>Quarter</th><th>Office Name</th><th>Area</th></tr></thead>' +
            '<tbody>' + buildNewlyConnectedTable() + '</tbody>' +
            '</table>' +

            // Newly Disconnected Offices Table
            '<h3>Newly Disconnected Offices</h3>' +
            '<table>' +
            '<thead><tr><th>Year</th><th>Quarter</th><th>Office Name</th><th>Area</th></tr></thead>' +
            '<tbody>' + buildNewlyDisconnectedTable() + '</tbody>' +
            '</table>' +

            '<div class="footer">PHLPost Profile System &mdash; Connectivity Report &mdash; Confidential &mdash; ' + printDate + '</div>' +
            '</body></html>';

        // Write to hidden iframe and print — avoids popup blockers & onload issues
        var iframe = document.getElementById('printFrame');
        if (!iframe) {
            iframe = document.createElement('iframe');
            iframe.id = 'printFrame';
            iframe.style.cssText = 'position:fixed;top:-9999px;left:-9999px;width:1px;height:1px;border:none;';
            document.body.appendChild(iframe);
        }

        var doc = iframe.contentWindow.document;
        doc.open();
        doc.write(html);
        doc.close();

        // Wait for iframe to fully render then print
        setTimeout(function () {
            iframe.contentWindow.focus();
            iframe.contentWindow.print();
            $btn.prop('disabled', false).html('<i class="fas fa-print mr-1"></i> Print Report');
        }, 600);
    });
}

/* Helper functions to build office detail tables */
function buildNewlyConnectedTable() {
    var rows = '';
    $('#quarterlyBreakdownTable tbody tr').each(function () {
        var cells = $(this).find('td');
        // Standard check: Ensure row has enough columns
        if (cells.length < 5) return;
        
        var year = cells.eq(0).text().trim();
        var quarter = cells.eq(1).text().trim();
        
        // In PO TEMPLATE structure, 'Newly Connected' is in column 3 (0-indexed)
        // This should contain the count and the office list
        var newlyConnectedCell = cells.eq(3);
        
        var officeList = newlyConnectedCell.find('.qb-names-list');
        if (officeList.length > 0) {
            officeList.find('.qb-names-item').each(function () {
                var areaTag = $(this).find('.qb-area-tag').text().trim();
                // Get office name from the span that comes after the area tag
                var officeName = $(this).find('span').not('.qb-area-tag').first().text().trim();
                
                if (officeName) {
                    rows += '<tr>';
                    rows += '<td>' + year + '</td>';
                    rows += '<td>' + quarter + '</td>';
                    rows += '<td>' + officeName + '</td>';
                    rows += '<td>' + areaTag + '</td>';
                    rows += '</tr>';
                }
            });
        }
    });
    
    if (!rows) {
        rows = '<tr><td colspan="4" class="text-center text-muted">No newly connected offices found</td></tr>';
    }
    
    return rows;
}

function buildNewlyDisconnectedTable() {
    var rows = '';
    $('#quarterlyBreakdownTable tbody tr').each(function () {
        var cells = $(this).find('td');
        // Standard check: Ensure row has enough columns
        if (cells.length < 6) return;
        
        var year = cells.eq(0).text().trim();
        var quarter = cells.eq(1).text().trim();
        
        // In PO TEMPLATE structure, 'Newly Disconnected' is in column 5 (0-indexed)
        // This should contain count and office list
        var newlyDisconnectedCell = cells.eq(5);
        
        var officeList = newlyDisconnectedCell.find('.qb-names-list');
        if (officeList.length > 0) {
            officeList.find('.qb-names-item').each(function () {
                var areaTag = $(this).find('.qb-area-tag').text().trim();
                // Get the office name from the span that comes after the area tag
                var officeName = $(this).find('span').not('.qb-area-tag').first().text().trim();
                
                if (officeName) {
                    rows += '<tr>';
                    rows += '<td>' + year + '</td>';
                    rows += '<td>' + quarter + '</td>';
                    rows += '<td>' + officeName + '</td>';
                    rows += '<td>' + areaTag + '</td>';
                    rows += '</tr>';
                }
            });
        }
    });
    
    if (!rows) {
        rows = '<tr><td colspan="4" class="text-center text-muted">No newly disconnected offices found</td></tr>';
    }
    
    return rows;
}

/* =====================================================
   EXPORT EXCEL
===================================================== */
function initializeExportExcel() {
    $('#exportExcelBtn').on('click', function () {
        var $btn = $(this);

        if (typeof XLSX === 'undefined') {
            Swal.fire({
                icon: 'error',
                title: 'Export Error',
                text: 'Excel library not loaded. Please refresh the page and try again.',
                confirmButtonColor: '#002868'
            });
            return;
        }

        var data = [];
        // Header based on Template Columns
        data.push(['Area', 'Office Name', 'Province', 'City/Municipality', 'Connectivity Status', 'ISP', 'Type of Connection', 'Speed (Mbps)', 'Postmaster']);

        var hasData = false;
        
        // Check if DataTable is available and initialized
        if (typeof $.fn !== 'undefined' && $.fn.DataTable && $.fn.DataTable.isDataTable('#postOfficeTable')) {
            var table = $('#postOfficeTable').DataTable();
            var rows = table.rows().data();
            
            console.log('Export: Found', rows.length, 'rows in DataTable');
            console.log('Export: Sample row data:', rows.length > 0 ? rows[0] : 'No data');
            
            if (rows.length > 0) {
                hasData = true;
                rows.each(function(r, index) {
                    data.push([
                        r.area || 'N/A',
                        r.name || 'N/A',
                        r.province || 'N/A',
                        r.cityMunicipality || 'N/A',
                        r.connectivityStatus || 'N/A',
                        r.internetServiceProvider || 'N/A',
                        r.typeOfConnection || 'N/A',
                        r.speed || 'N/A',
                        r.postmaster || 'N/A'
                    ]);
                });
            }
        } else {
            // Fallback: Extract data directly from table if DataTable is not available
            // Column indices based on actual table structure (0-indexed):
            // 0: #, 1: Area, 2: Office Name, 3: Province, 4: City/Municipality, 
            // 5: Connectivity Status, 6: ISP, 7: Type of Connection, 8: Speed, 9: Postmaster
            $('#postOfficeTable tbody tr').each(function(index) {
                hasData = true;
                var cells = $(this).find('td');
                data.push([
                    cells.eq(1).text().trim() || 'N/A', // Area
                    cells.eq(2).text().trim() || 'N/A', // Office Name
                    cells.eq(3).text().trim() || 'N/A', // Province
                    cells.eq(4).text().trim() || 'N/A', // City/Municipality
                    cells.eq(5).text().trim() || 'N/A', // Connectivity Status
                    cells.eq(6).text().trim() || 'N/A', // ISP
                    cells.eq(7).text().trim() || 'N/A', // Type of Connection
                    cells.eq(8).text().trim() || 'N/A', // Speed
                    cells.eq(9).text().trim() || 'N/A'  // Postmaster
                ]);
            });
        }

        if (!hasData) {
            console.log('Export Debug: No data found. Checking table status...');
            
            // Additional debugging information
            let debugInfo = {
                tableExists: $('#postOfficeTable').length > 0,
                dataTablesLoaded: typeof $.fn !== 'undefined' && $.fn.DataTable,
                isDataTable: $.fn.DataTable.isDataTable('#postOfficeTable'),
                currentFilters: {
                    year: $('#yearSelector').val(),
                    quarter: $('#quarterFilter').val(),
                    area: $('#areaFilter').val(),
                    status: $('#statusFilter').val()
                },
                tableRows: $('#postOfficeTable tbody tr').length
            };
            
            console.log('Export Debug Info:', debugInfo);
            
            let message = 'There is no data to export for the current filters.';
            if (debugInfo.tableRows === 0) {
                message += ' The table appears to be empty. Try clearing filters or refreshing the page.';
            } else if (!debugInfo.isDataTable) {
                message += ' The data table is not properly initialized. Please refresh the page.';
            }
            
            Swal.fire({
                icon: 'warning',
                title: 'No Data',
                text: message,
                confirmButtonColor: '#002868'
            });
            return;
        }

        $btn.prop('disabled', true).html('<i class="fas fa-spinner fa-spin mr-1"></i> Exporting...');

        var year     = $('#yearSelector').val()                          || 'All';
        var quarter  = $('#quarterFilter').val()                         || 'All';
        var areaText = $('#areaFilter option:selected').text().trim()    || 'All Areas';
        var statText = $('#statusFilter option:selected').text().trim()  || 'All Status';

        var connected    = $('.border-bottom-success h2').first().text().trim();
        var disconnected = $('.border-bottom-danger h2').first().text().trim();
        var total        = $('.border-bottom-primary h2').first().text().trim();
        var printDate    = new Date().toLocaleDateString('en-PH', { year:'numeric', month:'long', day:'numeric' });

        var wb = XLSX.utils.book_new();

        // Sheet 1 — Connectivity Data (based on PO Template)
        var ws = XLSX.utils.aoa_to_sheet(data);
        ws['!cols'] = [
            { wch: 12 }, { wch: 25 }, { wch: 15 }, { wch: 20 },
            { wch: 18 }, { wch: 20 }, { wch: 18 }, { wch: 12 }, { wch: 20 }
        ];
        XLSX.utils.book_append_sheet(wb, ws, 'Connectivity Data');

        // Sheet 2 — Summary
        var summaryData = [
            ['PHLPost — Connectivity Report'],
            ['Generated:', printDate],
            [''],
            ['FILTERS APPLIED', ''],
            ['Year',    year],
            ['Quarter', quarter],
            ['Area',    areaText],
            ['Status',  statText],
            [''],
            ['OVERALL STATISTICS', ''],
            ['Active (Connected)',      Number(connected)    || connected],
            ['Inactive (Disconnected)', Number(disconnected) || disconnected],
            ['Total Offices',           Number(total)        || total]
        ];
        var wsSummary = XLSX.utils.aoa_to_sheet(summaryData);
        wsSummary['!cols'] = [{ wch: 28 }, { wch: 24 }];
        XLSX.utils.book_append_sheet(wb, wsSummary, 'Summary');

        var filename = 'PHLPost_Connectivity_' + new Date().toISOString().slice(0,10) + '.xlsx';
        XLSX.writeFile(wb, filename);

        setTimeout(function () {
            $btn.prop('disabled', false).html('<i class="fas fa-file-excel mr-1"></i> Export Excel');
        }, 800);
    });
}

/* =====================================================
   REPORT TABLE WITH ARCHIVE FUNCTIONALITY
===================================================== */
function initializeReportTable() {
    if (!$('#postOfficeTable').length) return;

    if ($.fn.DataTable.isDataTable('#postOfficeTable')) {
        $('#postOfficeTable').DataTable().destroy();
        $('#postOfficeTable').empty();
    }

    // Read filter values
    const yearFilter    = $('#yearSelector').val()   || '';
    const quarterFilter = $('#quarterFilter').val()  || '';
    const areaFilter    = $('#areaFilter').val()     || '';
    const statusFilter  = $('#statusFilter').val()   || '';

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

    const table = $('#postOfficeTable').DataTable({
        processing: true,
        serverSide: false,
        ajax: {
            url: ajaxUrl,
            dataSrc: '',
            error: function(xhr, error, code) {
                console.error('DataTable AJAX Error:', {
                    status: xhr.status,
                    statusText: xhr.statusText,
                    response: xhr.responseText,
                    error: error,
                    code: code
                });
                
                let errorMessage = 'Failed to load post office data.';
                if (xhr.responseJSON && xhr.responseJSON.error) {
                    errorMessage = 'Server error: ' + xhr.responseJSON.message;
                } else if (xhr.status === 0) {
                    errorMessage = 'Network error. Please check your connection.';
                } else if (xhr.status === 500) {
                    errorMessage = 'Server error. Please try again later.';
                }

                if (typeof Swal !== 'undefined') {
                    Swal.fire({
                        icon: 'error',
                        title: 'Data Loading Error',
                        text: errorMessage,
                        confirmButtonText: 'OK'
                    });
                } else {
                    alert(errorMessage);
                }
            }
        },
        columns: [
            { data: null, render: (data, type, row, meta) => meta.row + 1 },
            { data: 'area', render: d => d || 'N/A' }, // From Column A: AREA
            { data: 'name', defaultContent: 'N/A' },    // From Column B: POSTAL OFFICE NAME
            { data: 'province', defaultContent: 'N/A' },// From Column J: PROVINCE
            { data: 'cityMunicipality', defaultContent: 'N/A' }, // From Column K: CITY/MUNICIPALITY
            { data: 'connectivityStatus',               // From Column Q: CONNECTIVITY STATUS
                render: function(data, type, row) {
                    let val = (data || '').toUpperCase();
                    let badge = val === 'ACTIVE' ? 'success' : 'danger';
                    let statusBadge = `<span class="badge badge-${badge}">${val}</span>`;
                    
                    if (row.newThisQuarter) {
                        statusBadge += ' <span class="badge badge-info ml-1">New This Quarter</span>';
                    }
                    
                    return statusBadge;
                }
            },
            { data: 'internetServiceProvider', defaultContent: 'N/A' },     // From Column R: INTERNET SERVICE PROVIDER
            { data: 'typeOfConnection', defaultContent: 'N/A' }, // From Column S: TYPE OF CONNECTION
            { data: 'speed', render: d => d ? d + ' Mbps' : 'N/A' }, // From Column T: SPEED(MBPS)
            { data: 'postmaster', defaultContent: 'N/A' }, // From Column C: Postmaster
            {
                data: null,
                render: (d, t, row) => {
                    const isSystemAdmin = $('body').data('is-system-admin') === true;
                    const isAreaAdmin = $('body').data('is-area-admin') === true;
                    const isAnyAdmin = $('body').data('is-any-admin') === true;

                    let buttons = `
                    <button class="btn btn-sm btn-primary view-btn" data-id="${row.id}">
                        <i class="fas fa-eye"></i>
                    </button>
                    `;
                    
                    if (isAnyAdmin) {
                        buttons += `
                        <button class="btn btn-sm btn-warning edit-btn" data-id="${row.id}">
                            <i class="fas fa-edit"></i>
                        </button>
                        `;
                    }
                    
                    // Only show Archive button for System Admin and Area Admin
                    if (isSystemAdmin || isAreaAdmin) {
                        buttons += `
                        <button class="btn btn-sm btn-archive-report" style="background:#fd7e14;color:white;"
                                data-id="${row.id}" data-name="${row.name || 'Office'}" title="Archive Office">
                            <i class="fas fa-archive"></i>
                        </button>
                        `;
                    }

                    return buttons;
                }
            }
        ],
        pageLength: 10,
        responsive: true,
        searching: false,
        order: [[1, 'asc']],
        initComplete: function () {
            // Table initialization complete
        }
    });

    // Delegated button events
    $('#postOfficeTable').on('click', 'tbody tr', function (e) { 
        // Don't trigger if clicking on buttons or links
        if ($(e.target).closest('button, a').length > 0) {
            return;
        }
        
        const row = $(this).closest('tr');
        const rowData = $('#postOfficeTable').DataTable().row(row).data();
        if (rowData && rowData.id) {
            viewOfficeFromReport(rowData.id, rowData.name || 'Office');
        }
    });

    $('#postOfficeTable').on('click', '.view-btn', function() { 
        viewOfficeFromReport($(this).data('id')); 
    });

    $('#postOfficeTable').on('click', '.edit-btn', function () { 
        editOfficeFromReport($(this).data('id'));
    });

    $('#postOfficeTable').on('click', '.btn-archive-report', function () {
        archiveOfficeFromReport($(this).data('id'), $(this).data('name'));
    });

    // Archive modal confirm button
    $('#reportConfirmArchiveBtn').on('click', function () {
        const id     = $('#reportArchiveModal').data('office-id');
        const name   = $('#reportArchiveOfficeName').text();
        const reason = $('#reportArchiveReasonInput').val().trim();
        
        $('#reportArchiveModal').modal('hide');
        performReportArchive(id, name, reason);
    });
}

function viewOfficeFromReport(id, name) {
    sessionStorage.setItem('reportReturnUrl', window.location.href);
    window.location.href = '/profile/' + id + '?source=report';
}

function editOfficeFromReport(id) {
    // Edit functionality - redirect to edit page or open edit modal
    window.location.href = '/edit/' + id;
}

function archiveOfficeFromReport(id, name) {
    $('#reportArchiveOfficeName').text(name);
    $('#reportArchiveReasonInput').val('');
    $('#reportArchiveModal').data('office-id', id);
    $('#reportArchiveModal').modal('show');
}

function performReportArchive(id, name, reason) {
    $.ajax({
        url: '/api/post-offices/' + id + '/archive',
        method: 'POST',
        data: JSON.stringify({ reason: reason }),
        contentType: 'application/json',
        success: function(response) {
            if (typeof Swal !== 'undefined') {
                Swal.fire({
                    icon: 'success',
                    title: 'Archived Successfully',
                    text: name + ' has been archived.',
                    confirmButtonColor: '#002868'
                });
            } else {
                alert(name + ' has been archived.');
            }
            // Reload the table
            $('#postOfficeTable').DataTable().ajax.reload();
        },
        error: function(xhr) {
            const errorMsg = xhr.responseJSON?.message || 'Failed to archive office. Please try again.';
            if (typeof Swal !== 'undefined') {
                Swal.fire({
                    icon: 'error',
                    title: 'Archive Failed',
                    text: errorMsg,
                    confirmButtonColor: '#002868'
                });
            } else {
                alert('Error: ' + errorMsg);
            }
        }
    });
}
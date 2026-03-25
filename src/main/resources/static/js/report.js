/**
 * report.js — Connectivity Report Page
 * Filter panel, print, and Excel export functionality
 */

$(document).ready(function () {
    initializeFilterPanel();
    initializePrint();
    initializeExportExcel();
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
        var tableRows = '';
        $('#quarterlyBreakdownTable tbody tr').each(function () {
            var cells = $(this).find('td');
            if (cells.length < 6) return;
            var isCurrent = $(this).hasClass('table-active') || $(this).hasClass('font-weight-bold');
            var rowStyle  = isCurrent ? 'background:#eef2ff;font-weight:bold;' : '';

            // Extract newly connected names with area badges
            var newlyConnHtml = cells.eq(3).find('.po-name-item').map(function() {
                var area = $(this).find('.badge').text().trim();
                var name = $(this).find('span:last').text().trim();
                return (area ? '<span style="background:#e2e8f0;border-radius:3px;padding:0 4px;font-size:10px;font-weight:700;">' + area + '</span> ' : '') + name;
            }).get().join('<br>') || cells.eq(3).find('.badge-secondary').length ? '—' : cells.eq(3).find('.badge-success').text().trim();

            var newlyDiscHtml = cells.eq(5).find('.po-name-item').map(function() {
                var area = $(this).find('.badge').text().trim();
                var name = $(this).find('span:last').text().trim();
                return (area ? '<span style="background:#e2e8f0;border-radius:3px;padding:0 4px;font-size:10px;font-weight:700;">' + area + '</span> ' : '') + name;
            }).get().join('<br>') || cells.eq(5).find('.badge-secondary').length ? '—' : cells.eq(5).find('.badge-danger').text().trim();

            tableRows += '<tr style="' + rowStyle + '">';
            tableRows += '<td>' + (cells.eq(0).text().trim() || '') + '</td>';
            tableRows += '<td>' + (cells.eq(1).text().trim() || '') + '</td>';
            tableRows += '<td>' + (cells.eq(2).text().trim() || '') + '</td>';
            tableRows += '<td>' + (cells.eq(3).find('.badge-success').text().trim() || '—') + (newlyConnHtml ? '<div style="margin-top:3px;font-size:10px;line-height:1.6;">' + newlyConnHtml + '</div>' : '') + '</td>';
            tableRows += '<td>' + (cells.eq(4).text().trim() || '') + '</td>';
            tableRows += '<td>' + (cells.eq(5).find('.badge-danger').text().trim() || '—') + (newlyDiscHtml ? '<div style="margin-top:3px;font-size:10px;line-height:1.6;">' + newlyDiscHtml + '</div>' : '') + '</td>';
            tableRows += '<td>' + (cells.eq(6).text().trim() || '') + '</td>';
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
            '<thead><tr><th>Quarter</th><th>Year</th><th>Connected</th><th>Newly Connected</th><th>Disconnected</th><th>Newly Disconnected</th><th>Status</th></tr></thead>' +
            '<tbody>' + tableRows + '</tbody>' +
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
        data.push(['Quarter', 'Year', 'Connected', 'Newly Connected', 'Disconnected', 'Newly Disconnected', 'Status']);

        var hasData = false;
        $('#quarterlyBreakdownTable tbody tr').each(function () {
            var cells = $(this).find('td');
            if (cells.length < 6) return;
            hasData = true;

            function parseNum(str) {
                var n = parseInt(str.replace(/[^0-9]/g, ''));
                return isNaN(n) ? 0 : n;
            }

            var connectedTxt    = cells.eq(2).text().trim();
            var newConnTxt      = cells.eq(3).text().trim();
            var disconnTxt      = cells.eq(4).text().trim();
            var newDisconnTxt   = cells.eq(5).text().trim();

            data.push([
                cells.eq(0).text().trim(),
                cells.eq(1).text().trim(),
                connectedTxt  === '—' ? '' : parseNum(connectedTxt),
                newConnTxt    === '—' ? '' : parseNum(newConnTxt),
                disconnTxt    === '—' ? '' : parseNum(disconnTxt),
                newDisconnTxt === '—' ? '' : parseNum(newDisconnTxt),
                cells.eq(6).text().trim()
            ]);
        });

        if (!hasData) {
            Swal.fire({
                icon: 'warning',
                title: 'No Data',
                text: 'There is no data to export for the current filters.',
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

        // Sheet 1 — Quarterly Breakdown
        var ws = XLSX.utils.aoa_to_sheet(data);
        ws['!cols'] = [
            { wch: 10 }, { wch: 8 }, { wch: 14 },
            { wch: 18 }, { wch: 16 }, { wch: 20 }, { wch: 14 }
        ];
        XLSX.utils.book_append_sheet(wb, ws, 'Quarterly Breakdown');

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

        var filename = 'connectivity-report-' + year + '-' + quarter + '.xlsx';
        XLSX.writeFile(wb, filename);

        setTimeout(function () {
            $btn.prop('disabled', false).html('<i class="fas fa-file-excel mr-1"></i> Export Excel');
        }, 800);
    });
}
/**
 * Post Office Inventory — DataTable + Filter Panel
 * Columns: # | Name | Area | City | Connection Status | Office Status | Actions
 * Edit modal handled by edit-modal.js — do NOT bind .btn-edit here.
 */

let table;

document.addEventListener('DOMContentLoaded', function () {

    if ($.fn.DataTable.isDataTable('#myTable')) {
        $('#myTable').DataTable().destroy();
    }

    // ── Initialize DataTable ─────────────────────────────────────────────────
    table = new DataTable('#myTable', {
        pageLength: 25,
        lengthMenu: [10, 25, 50, 100],
        paging:    true,
        ordering:  true,
        info:      true,
        searching: true,
        serverSide: false,

        columnDefs: [
            { targets: 0, width: '45px',  orderable: true,  className: 'dt-center' },
            { targets: 1, orderable: true },
            { targets: 2, orderable: true },
            { targets: 3, orderable: true },
            { targets: 4, orderable: true },
            { targets: 5, width: '120px', orderable: true, className: 'dt-center' },
            { targets: 6, width: '105px', orderable: true, className: 'dt-center' },
            { targets: 7, orderable: false },
            { targets: 8, width: '120px', orderable: false, className: 'dt-center', searchable: false }
        ],

        order: [[2, 'asc'], [1, 'asc']],

        language: {
            search:            '',
            searchPlaceholder: 'Quick search...',
            lengthMenu:        'Show _MENU_ entries',
            info:              'Showing _START_–_END_ of _TOTAL_ offices',
            infoEmpty:         'No offices found',
            infoFiltered:      '(filtered from _MAX_ total)',
            paginate:          { first: '«', previous: '‹', next: '›', last: '»' },
            zeroRecords:       'No matching offices found'
        },

        dom: '<"dt-length-wrap"l>rt<"dt-footer d-flex align-items-center justify-content-between mt-3"ip>',

        responsive: true,
        stateSave:  true,   // saves page number + sort order via localStorage

        drawCallback: function () {
            attachButtonListeners();
            updateSummary(this.api());
        }
    });

    // Hide DataTables default search
    document.querySelector('.dataTables_filter')?.style.setProperty('display', 'none', 'important');

    // Populate Area dropdown from table data
    populateAreaDropdown();

    // Wire filters
    initFilters();

    // ── Restore saved filter state if returning from profile ─────────────────
    const savedRaw = sessionStorage.getItem('tableFilterState');
    if (savedRaw && sessionStorage.getItem('tableFilterSource') === 'table') {
        sessionStorage.removeItem('tableFilterState');
        sessionStorage.removeItem('tableFilterSource');

        try {
            const state = JSON.parse(savedRaw);

            // Restore filter inputs
            if (state.search)     setVal('tableSearchInput',    state.search);
            if (state.area)       setVal('filterArea',          state.area);
            if (state.connStatus) setVal('filterConnStatus',    state.connStatus);
            if (state.offStatus)  setVal('filterOfficeStatus',  state.offStatus);

            // Re-apply filters
            setTimeout(function () {
                applyFilters();
                highlightSelects();

                // Restore scroll after filters applied + table redrawn
                if (state.scrollY) {
                    setTimeout(function () {
                        window.scrollTo({ top: state.scrollY, behavior: 'instant' });
                    }, 300);
                }
            }, 100);
        } catch (e) {
            console.warn('[Table] Could not restore state:', e);
        }
    }

    attachButtonListeners();
    updateSummary(table);
    console.log('[Table] Initialized.');
});

// ═══════════════════════════════════════════════════════════════
//  AREA DROPDOWN
// ═══════════════════════════════════════════════════════════════
function populateAreaDropdown() {
    const select = document.getElementById('filterArea');
    if (!select) return;

    // Add options 1 to 9 with "Area X" format
    for (let i = 1; i <= 9; i++) {
        const opt = document.createElement('option');
        opt.value = 'Area ' + i;
        opt.textContent = 'Area ' + i;
        select.appendChild(opt);
    }
}

// ═══════════════════════════════════════════════════════════════
//  FILTER INIT
// ═══════════════════════════════════════════════════════════════
function initFilters() {

    // Toggle panel
    document.getElementById('toggleFilterBody')?.addEventListener('click', function () {
        const body    = document.getElementById('filterBody');
        const chevron = document.getElementById('filterChevron');
        const hidden  = body.classList.toggle('d-none');
        chevron.classList.toggle('fa-chevron-up',  !hidden);
        chevron.classList.toggle('fa-chevron-down',  hidden);
    });

    document.getElementById('applyTableFilters')?.addEventListener('click', applyFilters);
    document.getElementById('clearTableFilters')?.addEventListener('click', clearFilters);

    // Clear search ×
    document.getElementById('clearSearchBtn')?.addEventListener('click', function () {
        document.getElementById('tableSearchInput').value = '';
        applyFilters();
    });

    // Live search debounced
    let timer;
    document.getElementById('tableSearchInput')?.addEventListener('input', function () {
        clearTimeout(timer);
        timer = setTimeout(applyFilters, 300);
    });
    document.getElementById('tableSearchInput')?.addEventListener('keydown', function (e) {
        if (e.key === 'Enter') { e.preventDefault(); applyFilters(); }
    });

    // Instant on dropdown change
    ['filterArea', 'filterConnStatus', 'filterOfficeStatus'].forEach(id => {
        document.getElementById(id)?.addEventListener('change', applyFilters);
    });
}

// ── Apply filters ─────────────────────────────────────────────────────────────
function applyFilters() {
    if (!table) return;

    const search      = (document.getElementById('tableSearchInput')?.value    || '').trim();
    const area        = (document.getElementById('filterArea')?.value           || '').trim();
    const connStatus  = (document.getElementById('filterConnStatus')?.value     || '').trim();
    const offStatus   = (document.getElementById('filterOfficeStatus')?.value   || '').trim();

    table.column(2).search(area       ? '^' + escRx(area)       + '$' : '', true, false);
    table.column(5).search(connStatus ? escRx(connStatus)              : '', true, false);
    table.column(6).search(offStatus  ? escRx(offStatus)               : '', true, false);
    table.search(search).draw();

    renderTags(search, area, connStatus, offStatus);
    highlightSelects();
}

// ── Clear filters ─────────────────────────────────────────────────────────────
function clearFilters() {
    if (!table) return;

    ['tableSearchInput', 'filterArea', 'filterConnStatus', 'filterOfficeStatus'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.value = '';
    });

    table.column(2).search('');
    table.column(5).search('');
    table.column(6).search('');
    table.search('').draw();

    renderTags('', '', '', '');
    highlightSelects();
}

// ── Render active filter pill tags ────────────────────────────────────────────
function renderTags(search, area, connStatus, offStatus) {
    const container = document.getElementById('activeFilterTags');
    const countEl   = document.getElementById('activeFilterCount');
    if (!container) return;

    container.innerHTML = '';
    let n = 0;

    function tag(css, icon, text, clearFn) {
        n++;
        const el = document.createElement('span');
        el.className = 'filter-tag-pill ' + css;
        el.innerHTML = `<i class="${icon}"></i>${escHtml(text)}<button class="tag-remove-btn" title="Remove">&times;</button>`;
        el.querySelector('.tag-remove-btn').addEventListener('click', clearFn);
        container.appendChild(el);
    }

    if (search) tag(
        'tag-search', 'fas fa-search mr-1', `"${search}"`,
        () => { document.getElementById('tableSearchInput').value = ''; applyFilters(); }
    );
    if (area) tag(
        'tag-area', 'fas fa-map-marker-alt mr-1', area,
        () => { document.getElementById('filterArea').value = ''; applyFilters(); }
    );
    if (connStatus) tag(
        connStatus === 'Active' ? 'tag-active' : 'tag-inactive',
        'fas fa-wifi mr-1',
        'Connection: ' + connStatus,
        () => { document.getElementById('filterConnStatus').value = ''; applyFilters(); }
    );
    if (offStatus) tag(
        offStatus === 'Open' ? 'tag-open' : 'tag-closed',
        offStatus === 'Open' ? 'fas fa-door-open mr-1' : 'fas fa-door-closed mr-1',
        'Office: ' + offStatus,
        () => { document.getElementById('filterOfficeStatus').value = ''; applyFilters(); }
    );

    if (countEl) {
        countEl.textContent   = n || '';
        countEl.style.display = n > 0 ? 'inline-block' : 'none';
    }
}

// ── Highlight active selects ──────────────────────────────────────────────────
function highlightSelects() {
    ['filterArea', 'filterConnStatus', 'filterOfficeStatus'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.classList.toggle('has-value', !!el.value);
    });
    const s = document.getElementById('tableSearchInput');
    if (s) s.classList.toggle('has-value', !!s.value);
}

// ── Summary text ──────────────────────────────────────────────────────────────
function updateSummary(api) {
    const el = document.getElementById('tableSummaryText');
    if (!el || !api) return;
    const info    = api.page.info();
    const visible = info.recordsDisplay;
    const total   = info.recordsTotal;
    el.textContent = visible < total
        ? `${visible} of ${total} offices`
        : `${total} offices`;
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function escRx(s)   { return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }
function escHtml(s) { return (s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
function setVal(id, val) { const el = document.getElementById(id); if (el) el.value = val; }

// ═══════════════════════════════════════════════════════════════
//  BUTTON LISTENERS (Delete only — Edit handled by edit-modal.js)
// ═══════════════════════════════════════════════════════════════
function attachButtonListeners() {
    document.querySelectorAll('.btn-delete').forEach(button => {
        const clone = button.cloneNode(true);
        button.parentNode.replaceChild(clone, button);
        clone.addEventListener('click', function () {
            handleDelete(this.dataset.officeId, this.dataset.officeName);
        });
    });
}

// ═══════════════════════════════════════════════════════════════
//  DELETE
// ═══════════════════════════════════════════════════════════════
function handleDelete(officeId, officeName) {
    Swal.fire({
        title: 'Delete Post Office?',
        html:  `Are you sure you want to delete <strong>${escHtml(officeName)}</strong>?<br>
                <small class="text-muted">This action cannot be undone.</small>`,
        icon:  'warning',
        showCancelButton:   true,
        confirmButtonColor: '#dc3545',
        cancelButtonColor:  '#6c757d',
        confirmButtonText:  '<i class="fas fa-trash mr-1"></i>Yes, Delete',
        cancelButtonText:   '<i class="fas fa-times mr-1"></i>Cancel',
        reverseButtons:     true
    }).then(result => {
        if (result.isConfirmed) performDelete(officeId, officeName);
    });
}

function performDelete(officeId, officeName) {
    Swal.fire({
        title: 'Deleting…',
        html:  `Removing <strong>${escHtml(officeName)}</strong>`,
        allowOutsideClick: false, allowEscapeKey: false, showConfirmButton: false,
        didOpen: () => Swal.showLoading()
    });

    fetch('/api/postal-office/' + officeId, { method: 'DELETE' })
        .then(r => r.json())
        .then(data => {
            if (data.success) {
                Swal.fire({ icon: 'success', title: 'Deleted!', text: `${officeName} removed.`, timer: 2000, showConfirmButton: false })
                    .then(() => location.reload());
            } else {
                Swal.fire({ icon: 'error', title: 'Failed', text: data.message || 'Delete failed.' });
            }
        })
        .catch(() => Swal.fire({ icon: 'error', title: 'Error', text: 'An error occurred.' }));
}

// ═══════════════════════════════════════════════════════════════
//  ARCHIVE
// ═══════════════════════════════════════════════════════════════
(function () {
    let pendingId = null;

    document.addEventListener('DOMContentLoaded', function () {
        document.querySelector('#myTable tbody')?.addEventListener('click', function (e) {
            const btn = e.target.closest('.btn-archive');
            if (!btn) return;
            pendingId = btn.dataset.officeId;
            document.getElementById('archiveOfficeName').textContent = btn.dataset.officeName || '';
            document.getElementById('archiveReasonInput').value = '';
            $('#archiveReasonModal').modal('show');
        });

        document.getElementById('confirmArchiveBtn')?.addEventListener('click', function () {
            if (!pendingId) return;
            const reason = document.getElementById('archiveReasonInput').value.trim();
            fetch('/api/archive/' + pendingId, {
                method:  'POST',
                headers: { 'Content-Type': 'application/json' },
                body:    JSON.stringify({ reason })
            })
            .then(r => r.json())
            .then(res => {
                $('#archiveReasonModal').modal('hide');
                if (res.success) {
                    Swal.fire({ icon: 'success', title: 'Archived!', timer: 2000, showConfirmButton: false })
                        .then(() => location.reload());
                } else {
                    Swal.fire({ icon: 'error', title: 'Failed', text: res.message || 'Archive failed.' });
                }
            })
            .catch(() => Swal.fire({ icon: 'error', title: 'Error', text: 'An error occurred.' }));
        });
    });
})();

// ── Save state before navigating to profile ───────────────────────────────────
// Called by the View button click (see table.html onclick)
function saveTableStateAndView(officeId) {
    const state = {
        search:     document.getElementById('tableSearchInput')?.value     || '',
        area:       document.getElementById('filterArea')?.value           || '',
        connStatus: document.getElementById('filterConnStatus')?.value     || '',
        offStatus:  document.getElementById('filterOfficeStatus')?.value   || '',
        scrollY:    window.scrollY
    };
    sessionStorage.setItem('tableFilterState',  JSON.stringify(state));
    sessionStorage.setItem('tableFilterSource', 'table');
    window.location.href = '/profile/' + officeId + '?source=table';
}

// ── Cleanup ───────────────────────────────────────────────────────────────────
window.addEventListener('beforeunload', function () {
    if (table && $.fn.DataTable.isDataTable('#myTable')) table.destroy();
    document.getElementById('editOfficeModal')?.remove();
});
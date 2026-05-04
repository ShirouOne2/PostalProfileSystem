/**
 * Post Office Inventory — DataTable + Filter Panel + Map
 *
 * System Admin  columns: # | Name | Area | Region | City | Connection | Office | Remarks | Actions
 * Area/User     columns: # | Postal Office | Connection Status | Speed | Remarks | Actions
 *
 * Edit modal handled by edit-modal.js — do NOT bind .btn-edit here.
 */

let table;
let map;
let markers = [];
let markerClusterGroup;

// Detect which table layout is rendered (set by Thymeleaf th:if="${isSystemAdmin}")
const IS_ADMIN = document.getElementById('myTable')
    ?.querySelector('thead th:nth-child(3)')
    ?.textContent.trim().toLowerCase().includes('area') ?? false;

// Also check if user is Area Admin by looking for the isAreaAdmin data attribute
const IS_AREA_ADMIN = document.body?.dataset?.isAreaAdmin === 'true' || false;
const IS_PRIVILEGED_USER = IS_ADMIN || IS_AREA_ADMIN;

document.addEventListener('DOMContentLoaded', function () {

    // ── Initialize Map ─────────────────────────────────────────────────
    initializeMap();

    if ($.fn.DataTable.isDataTable('#myTable')) {
        $('#myTable').DataTable().destroy();
    }

    // ── Column definitions differ by role ────────────────────────────────
    const adminColumnDefs = [
        { targets: 0, data: null, width: '45px',  orderable: false, className: 'dt-center', render: function(data, type, row, meta) {
            return meta.settings._iDisplayStart + meta.row + 1;
        }},
        { targets: 1, data: 'name', orderable: true, render: function(data, type, row, meta) {
            if (!data) return 'N/A';
            // Get office ID from the <tr> data-office-id attribute
            var table = this.api();
            var trNode = table.row(meta.row).node();
            var officeId = trNode ? trNode.getAttribute('data-office-id') : '';
            var safeName = data.replace(/'/g, "\\'");
            return '<div class="d-flex align-items-center gap-2">' +
                   '<a href="javascript:void(0)" class="office-name-link" onclick="openOfficeProfilePopup(\'' + officeId + '\', \'' + safeName + '\')">' + data + '</a>' +
                   '<button type="button" class="btn btn-sm btn-outline-primary" onclick="openOfficeProfilePopup(\'' + officeId + '\', \'' + safeName + '\')" title="View Profile">' +
                   '<i class="fas fa-eye"></i> View' +
                   '</button>' +
                   '</div>';
        }},
        { targets: 2, data: 'area', orderable: true, defaultContent: 'N/A' },   // Area
        { targets: 3, data: 'region', orderable: true, defaultContent: 'N/A' },   // Region
        { targets: 4, data: 'city', orderable: true, defaultContent: 'N/A' },   // City
        { targets: 5, data: 'connectionStatus', width: '120px', orderable: true, className: 'dt-center', defaultContent: 'N/A' },  // Connection
        { targets: 6, data: 'officeStatus', width: '105px', orderable: true, className: 'dt-center', defaultContent: 'N/A' },  // Office
        { targets: 7, data: 'remarks', orderable: false, defaultContent: 'N/A' },  // Remarks
        { targets: 8, data: null, width: '120px', orderable: false, className: 'dt-center', searchable: false } // Actions
    ];

    const userColumnDefs = [
        { targets: 0, data: null, width: '45px',  orderable: false, className: 'dt-center', render: function(data, type, row, meta) {
            return meta.row + 1;
        }},
        { targets: 1, data: 'name', orderable: true, render: function(data, type, row, meta) {
            if (!data) return 'N/A';
            var table = this.api();
            var trNode = table.row(meta.row).node();
            var officeId = trNode ? trNode.getAttribute('data-office-id') : '';
            var safeName = data.replace(/'/g, "\\'");
            return '<div class="d-flex align-items-center gap-2">' +
                   '<a href="javascript:void(0)" class="office-name-link" onclick="openOfficeProfilePopup(\'' + officeId + '\', \'' + safeName + '\')">' + data + '</a>' +
                   '<button type="button" class="btn btn-sm btn-outline-primary" onclick="openOfficeProfilePopup(\'' + officeId + '\', \'' + safeName + '\')" title="View Profile">' +
                   '<i class="fas fa-eye"></i> View' +
                   '</button>' +
                   '</div>';
        }},   // Postal Office
        { targets: 2, data: 'connectionStatus', width: '140px', orderable: true, className: 'dt-center', defaultContent: 'N/A' }, // Connection
        { targets: 3, data: 'speed', width: '120px', orderable: true, defaultContent: 'N/A' },  // Speed
        { targets: 4, data: 'remarks', orderable: false, defaultContent: 'N/A' }, // Remarks
        { targets: 5, data: null, width: '110px', orderable: false, className: 'dt-center', searchable: false } // Actions
    ];

    // ── Initialize DataTable ─────────────────────────────────────────────────
    table = new DataTable('#myTable', {
        pageLength: 25,
        lengthMenu: [10, 25, 50, 100],
        paging:    true,
        ordering:  true,
        info:      true,
        searching: true,
        serverSide: false,

        columnDefs: IS_ADMIN ? adminColumnDefs : userColumnDefs,

        // Admin: sort by Area then Name; User: sort by Name
        order: IS_ADMIN ? [[2, 'asc'], [1, 'asc']] : [[1, 'asc']],

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
        stateSave:  true,

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

    function populateAreaDropdown() {
        // Area dropdown options are already hardcoded in the HTML template
        // This function exists to prevent ReferenceError but doesn't need to do anything
        // since the options are populated via Thymeleaf in the template
    }

    function initFilters() {
        const clearBtn = document.getElementById('clearFilters');
        if (clearBtn) clearBtn.addEventListener('click', clearFilters);
        
        // Attach event listener to connectivity status filter for auto-apply
        const statusFilter = document.getElementById('statusFilter');
        if (statusFilter) {
            statusFilter.addEventListener('change', function() {
                // Auto-apply filters when connectivity status changes
                applyFilters();
            });
        }
        
        // Attach event listener to Select All checkbox
        const selectAllCheckbox = document.getElementById('selectAllAreas');
        if (selectAllCheckbox) {
            selectAllCheckbox.addEventListener('change', function() {
                const isChecked = this.checked;
                document.querySelectorAll('.area-checkbox').forEach(checkbox => {
                    checkbox.checked = isChecked;
                });
                // Auto-apply filters when select all changes
                applyFilters();
            });
        }
        
        // Attach event listeners to area checkboxes for real-time filtering
        document.querySelectorAll('.area-checkbox').forEach(checkbox => {
            checkbox.addEventListener('change', function() {
                // Update Select All checkbox state
                updateSelectAllCheckbox();
                // Auto-apply filters when checkboxes change
                applyFilters();
            });
        });
    }
    
    // Function to update Select All checkbox state based on individual checkboxes
    function updateSelectAllCheckbox() {
        const selectAllCheckbox = document.getElementById('selectAllAreas');
        const areaCheckboxes = document.querySelectorAll('.area-checkbox');
        
        if (selectAllCheckbox && areaCheckboxes.length > 0) {
            const checkedCount = document.querySelectorAll('.area-checkbox:checked').length;
            selectAllCheckbox.checked = checkedCount === areaCheckboxes.length;
            selectAllCheckbox.indeterminate = checkedCount > 0 && checkedCount < areaCheckboxes.length;
        }
    }
    
    // ── Restore saved filter state if returning from profile ─────────────────
    const savedRaw = sessionStorage.getItem('tableFilterState');
    if (savedRaw && sessionStorage.getItem('tableFilterSource') === 'table') {
        sessionStorage.removeItem('tableFilterState');
        sessionStorage.removeItem('tableFilterSource');

        try {
            const state = JSON.parse(savedRaw);

            // Restore filter inputs
            if (state.search)       setVal('tableSearchInput',    state.search);
            if (state.area)         setVal('filterArea',          state.area);
            if (state.connectivity) setVal('filterConnectivity',  state.connectivity);
            if (state.officeStatus) setVal('filterOfficeStatus',  state.officeStatus);

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
//  MAP INITIALIZATION
// ═══════════════════════════════════════════════════════════════
function initializeMap() {
    // Early exit if Leaflet not available
    if (typeof L === 'undefined') {
        console.error('Leaflet is not loaded!');
        return;
    }

    console.log('Leaflet loaded successfully, version:', L.version);

    // Performance optimizations
    const areaColors = {
        1: '#FF6B6B', 2: '#4ECDC4', 3: '#45B7D1', 4: '#FFA07A',
        5: '#98D8C8', 6: '#F7DC6F', 7: '#BB8FCE', 8: '#F8B739',
        9: '#85C1E2', default: '#95A5A6'
    };

    function getAreaColor(areaId) {
        return areaColors[areaId] || areaColors.default;
    }

    // Initialize map with performance optimizations
    map = L.map('map', {
        center: [12.8797, 121.7740],
        zoom: 5,
        minZoom: 2,
        maxZoom: 18,
        maxBounds: [[4.0, 116.0], [21.5, 127.0]],
        maxBoundsViscosity: 1.0,
        preferCanvas: true, // Better performance for many markers
        updateWhenIdle: true,
        updateWhenZooming: false
    });

    // Use lighter tile layer for better performance
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 18,
        updateWhenIdle: true
    }).addTo(map);

    markers = [];
    markerClusterGroup = L.layerGroup().addTo(map);

    // Optimized status bar
    let statusTimeout;
    function setMapStatus(msg, type) {
        if (statusTimeout) clearTimeout(statusTimeout);
        
        let el = document.getElementById('map-status-bar');
        if (!el) {
            el = document.createElement('div');
            el.id = 'map-status-bar';
            el.style.cssText = 'position:absolute;bottom:8px;left:50%;transform:translateX(-50%);' +
                'z-index:1000;background:rgba(0,0,0,0.65);color:#fff;font-size:12px;' +
                'padding:4px 12px;border-radius:20px;pointer-events:none;transition:opacity 0.3s;white-space:nowrap;';
            const mapEl = document.getElementById('map');
            if (mapEl) mapEl.style.position = 'relative', mapEl.appendChild(el);
        }
        el.textContent = msg;
        el.style.opacity = '1';
        
        if (type === 'done') {
            statusTimeout = setTimeout(() => { el.style.opacity = '0'; }, 2000);
        }
    }

    setMapStatus('Loading map data…');

    // Add debouncing for better performance
    let fetchTimeout;
    function loadPostOffices() {
        if (fetchTimeout) clearTimeout(fetchTimeout);
        
        fetchTimeout = setTimeout(() => {
            fetch('/api/post-offices')
                .then(response => {
                    if (!response.ok) throw new Error('HTTP ' + response.status);
                    return response.json();
                })
                .then(data => {
                    console.log('Loaded', data.length, 'post offices from map API');
                    console.log('Sample data:', data.slice(0, 3));
                    console.log('Available fields:', data.length > 0 ? Object.keys(data[0]) : 'No data');
                    processMapData(data);
                })
                .catch(error => {
                    console.error('Error loading post offices:', error);
                    setMapStatus('Failed to load data');
                    if (typeof Swal !== 'undefined') {
                        Swal.fire({
                            icon: 'error',
                            title: 'Failed to Load Map Data',
                            html: `<p>${error.message}</p>`,
                            confirmButtonText: 'Retry',
                            showCancelButton: true,
                            cancelButtonText: 'Close'
                        }).then(result => { 
                            if (result.isConfirmed) loadPostOffices(); 
                        });
                    }
                });
        }, 100); // Small delay to prevent rapid calls
    }

    function processMapData(data) {
        // Clear existing data
        markerClusterGroup.clearLayers();
        markers.length = 0;
        const bounds = [];
        let skippedCount = 0;

        // Process all data at once for faster loading
        for (let i = 0; i < data.length; i++) {
            const office = data[i];
            
            // All offices are shown on the map — filtering is done via the area/status filter controls
            
            const lat = parseFloat(office.lat ?? office.latitude);
            const lng = parseFloat(office.lng ?? office.longitude);

            if (isNaN(lat) || isNaN(lng)) {
                skippedCount++;
                continue;
            }

            if (lat < 4.0 || lat > 21.5 || lng < 116.0 || lng > 127.0) {
                skippedCount++;
                continue;
            }

            const marker = L.circleMarker([lat, lng], {
                radius: 8,
                fillColor: getAreaColor(office.areaId),
                color: '#fff',
                weight: 2,
                opacity: 1,
                fillOpacity: 0.8
            });

            const statusLabel  = office.connectionStatus ? 'Active' : 'Inactive';
            const badgeBg      = office.connectionStatus ? '#d4edda' : '#f8d7da';
            const badgeColor   = office.connectionStatus ? '#155724' : '#721c24';
            const nameRaw          = office.name || 'N/A';
            const addressRaw       = office.address || 'Address not available';
            const areaRaw          = office.areaId ? 'Area ' + office.areaId : 'N/A';
            const postmasterRaw    = office.postmaster || 'Not assigned';
            const employeesRaw     = (!office.noOfEmployees) ? 'Not available' : office.noOfEmployees;
            const contactPersonRaw = office.postalOfficeContactPerson || 'Not available';
            const contactNumberRaw = office.postalOfficeContactNumber || 'Not available';
            const officeId         = office.id || '';

            const coverPhotoSrc = office.coverPhotoUrl || '/images/no-image.png';
            console.log('Office ID:', office.id, 'CoverPhotoUrl:', office.coverPhotoUrl, 'Final src:', coverPhotoSrc);

            const popupContent = `
                <div style="font-family:'Segoe UI',sans-serif;font-size:12px;line-height:1.4;max-width:240px;">
                    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px;">
                        <span style="font-size:13px;font-weight:600;color:#002868;">PHLPost Station</span>
                        <span style="padding:2px 8px;border-radius:999px;background:${badgeBg};color:${badgeColor};font-size:11px;">${statusLabel}</span>
                    </div>
                    <div style="color:#1f2a44;font-weight:600;margin-bottom:4px;">${nameRaw}</div>
                    <div style="color:#4d5a73;margin-bottom:6px;">${addressRaw}</div>
                    <div style="color:#002868;font-weight:600;margin-bottom:4px;">${areaRaw}</div>
                    <div style="background:#f7f9ff;border:1px solid rgba(0,40,104,0.08);border-radius:8px;padding:6px 8px;margin-bottom:6px;">
                        <div style="margin-bottom:4px;">
                            <span style="color:#7a869a;">Postmaster</span><br>
                            <strong style="color:#002868;">${postmasterRaw}</strong>
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
                    </div>
                    <img src="${coverPhotoSrc}" onerror="this.src='/images/no-image.png'" style="width:100%;height:110px;border-radius:8px;object-fit:cover;margin-bottom:8px;">
                    <div style="display:flex;gap:6px;">
                        <button onclick="openOfficeProfilePopup('${officeId}', '${nameRaw.replace(/'/g, "\\'")}')" style="flex:1;background:#002868;color:#fff;border:none;padding:6px 12px;border-radius:6px;font-size:12px;cursor:pointer;font-weight:600;">View Profile</button>
                    </div>
                </div>
            `;

            marker.bindPopup(popupContent, { maxWidth: 260, maxHeight: 400, className: 'custom-popup' });

            // Store filter data directly on marker for reliable filtering
            marker._officeData = {
                id:       officeId,
                name:     nameRaw.toLowerCase(),
                nameRaw:  nameRaw,
                areaId:   office.areaId != null ? String(office.areaId) : '',
                areaRaw:  areaRaw,
                address:  addressRaw,
                status:   office.connectionStatus ? 'true' : 'false',
                isActive: office.connectionStatus
            };

            markerClusterGroup.addLayer(marker);
            markers.push(marker);
            bounds.push([lat, lng]);
        }

        // Fit bounds after all markers are added
        if (bounds.length > 0) {
            map.fitBounds(bounds, { padding: [20, 20] });
        }
        setMapStatus(`Showing ${data.length - skippedCount} offices${skippedCount > 0 ? ` (${skippedCount} skipped)` : ''}`, 'done');
    }

    // Initialize map filters
    initMapFilters();

    // Load initial data
    loadPostOffices();
}

// ═══════════════════════════════════════════════════════════════
//  MAP FILTERS
// ═══════════════════════════════════════════════════════════════
function initMapFilters() {
    // Try both possible search input IDs (table.html uses searchInput, dashboard.html uses tableSearchInput)
    const searchInput = document.getElementById('searchInput') || document.getElementById('tableSearchInput');
    let suggestBox = document.getElementById('mapSearchSuggestions');
    
    if (!suggestBox && searchInput) {
        suggestBox = document.createElement('div');
        suggestBox.id = 'mapSearchSuggestions';
        suggestBox.className = 'mt-1';
        suggestBox.style.cssText =
            'display:block;background:#f8f9fc;border:1px solid #e3e6f0;border-radius:8px;' +
            'max-height:150px;overflow-y:auto;padding:12px;';
        searchInput.parentElement.appendChild(suggestBox);
    }

    // Wire live search as you type
    if (searchInput) {
        searchInput.addEventListener('input', function () {
            const term = this.value.trim();
            if (term) {
                filterOffices(term);
            } else {
                showAllOffices();
            }
            filterMapMarkers(); // update map markers live
        });
    }

    function showAllOffices() {
        // Ensure suggestBox exists
        suggestBox = document.getElementById('mapSearchSuggestions');
        if (!suggestBox) return;

        // If markers aren't loaded yet, show loading message
        if (!markers || markers.length === 0) {
            suggestBox.innerHTML = '<div style="padding:10px;text-align:center;color:#8a97a8;font-size:12px;">Loading post offices...</div>';
            return;
        }

        // Show all offices
        const matches = markers
            .filter(m => m._officeData); // show all offices
        console.log('showAllOffices: Showing', matches.length, 'offices (no limit)');

        if (!matches.length) { 
            suggestBox.innerHTML = '<div style="padding:10px;text-align:center;color:#8a97a8;font-size:12px;">No post offices available</div>';
            return;
        }

        suggestBox.innerHTML = '';
        matches.forEach(function(m) {
            const d = m._officeData;
            const item = document.createElement('div');
            item.style.cssText =
                'padding:9px 14px;cursor:pointer;border-bottom:1px solid #f0f2f5;' +
                'display:flex;align-items:center;gap:10px;transition:background 0.15s;';

            // Status dot
            const dot = d.isActive
                ? '<span style="width:8px;height:8px;border-radius:50%;background:#28a745;flex-shrink:0;display:inline-block;"></span>'
                : '<span style="width:8px;height:8px;border-radius:50%;background:#dc3545;flex-shrink:0;display:inline-block;"></span>';

            item.innerHTML =
                dot +
                '<div style="min-width:0;">' +
                  '<div style="font-size:13px;color:#1f2a44;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">' +
                    d.nameRaw +
                  '</div>' +
                  '<div style="font-size:11px;color:#8a97a8;margin-top:1px;">' +
                    d.areaRaw +
                    (d.address && d.address !== 'Address not available'
                        ? ' · ' + d.address.substring(0, 40) + (d.address.length > 40 ? '…' : '')
                        : '') +
                  '</div>' +
                '</div>' +
                '<span style="margin-left:auto;font-size:10px;font-weight:600;padding:2px 7px;border-radius:10px;flex-shrink:0;' +
                  (d.isActive
                    ? 'background:#d4edda;color:#155724;'
                    : 'background:#f8d7da;color:#721c24;') + '">' +
                  (d.isActive ? 'Active' : 'Inactive') +
                '</span>';

            item.addEventListener('mouseenter', function() { this.style.background = '#f0f4ff'; });
            item.addEventListener('mouseleave', function() { this.style.background = '#fff'; });

            item.addEventListener('click', function() {
                // Find the marker for this office and locate it on the map
                const targetMarker = markers.find(m => m._officeData && m._officeData.id === d.id);
                if (targetMarker) {
                    // Center map on the selected marker with appropriate zoom
                    map.setView(targetMarker.getLatLng(), 15, {
                        animate: true,
                        duration: 1
                    });
                    
                    // Open the marker popup to highlight the location
                    targetMarker.openPopup();
                    
                    // Briefly highlight the marker with a different style
                    const originalStyle = targetMarker.options;
                    targetMarker.setStyle({
                        radius: 12,
                        fillColor: '#FFD700',
                        color: '#FF6347',
                        weight: 3,
                        opacity: 1,
                        fillOpacity: 0.9
                    });
                    
                    // Restore original style after 2 seconds
                    setTimeout(() => {
                        targetMarker.setStyle(originalStyle);
                    }, 2000);
                }
            });

            suggestBox.appendChild(item);
        });

    }

    function filterOffices(term) {
        suggestBox = document.getElementById('mapSearchSuggestions');
        if (!suggestBox) return;

        const q = (term || '').toLowerCase().trim();
        
        // Filter offices based on search term
        const matches = markers
            .filter(m => m._officeData && (!q || m._officeData.name.includes(q)));

        if (!matches.length) { 
            suggestBox.innerHTML = '<div style="padding:10px;text-align:center;color:#8a97a8;font-size:12px;">No matches found</div>';
            return;
        }

        suggestBox.innerHTML = '';
        matches.forEach(function(m) {
            const d = m._officeData;
            const item = document.createElement('div');
            item.style.cssText =
                'padding:9px 14px;cursor:pointer;border-bottom:1px solid #f0f2f5;' +
                'display:flex;align-items:center;gap:10px;transition:background 0.15s;';

            // Status dot
            const dot = d.isActive
                ? '<span style="width:8px;height:8px;border-radius:50%;background:#28a745;flex-shrink:0;display:inline-block;"></span>'
                : '<span style="width:8px;height:8px;border-radius:50%;background:#dc3545;flex-shrink:0;display:inline-block;"></span>';

            // Highlight the matching part
            const idx  = q ? d.nameRaw.toLowerCase().indexOf(q) : -1;
            let display = d.nameRaw;
            if (idx !== -1) {
                display =
                    d.nameRaw.substring(0, idx) +
                    '<strong style="color:#002868;">' + d.nameRaw.substring(idx, idx + q.length) + '</strong>' +
                    d.nameRaw.substring(idx + q.length);
            }

            item.innerHTML =
                dot +
                '<div style="min-width:0;">' +
                  '<div style="font-size:13px;color:#1f2a44;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">' +
                    display +
                  '</div>' +
                  '<div style="font-size:11px;color:#8a97a8;margin-top:1px;">' +
                    d.areaRaw +
                    (d.address && d.address !== 'Address not available'
                        ? ' · ' + d.address.substring(0, 40) + (d.address.length > 40 ? '…' : '')
                        : '') +
                  '</div>' +
                '</div>' +
                '<span style="margin-left:auto;font-size:10px;font-weight:600;padding:2px 7px;border-radius:10px;flex-shrink:0;' +
                  (d.isActive
                    ? 'background:#d4edda;color:#155724;'
                    : 'background:#f8d7da;color:#721c24;') + '">' +
                  (d.isActive ? 'Active' : 'Inactive') +
                '</span>';

            item.addEventListener('mouseenter', function() { this.style.background = '#f0f4ff'; });
            item.addEventListener('mouseleave', function() { this.style.background = '#fff'; });

            item.addEventListener('click', function() {
                // Find the marker for this office and locate it on the map
                const targetMarker = markers.find(m => m._officeData && m._officeData.id === d.id);
                if (targetMarker) {
                    // Center map on the selected marker with appropriate zoom
                    map.setView(targetMarker.getLatLng(), 15, {
                        animate: true,
                        duration: 1
                    });
                    
                    // Open the marker popup to highlight the location
                    targetMarker.openPopup();
                    
                    // Briefly highlight the marker with a different style
                    const originalStyle = targetMarker.options;
                    targetMarker.setStyle({
                        radius: 12,
                        fillColor: '#FFD700',
                        color: '#FF6347',
                        weight: 3,
                        opacity: 1,
                        fillOpacity: 0.9
                    });
                    
                    // Restore original style after 2 seconds
                    setTimeout(() => {
                        targetMarker.setStyle(originalStyle);
                    }, 2000);
                }
            });

            suggestBox.appendChild(item);
        });

    }

    // Show all offices when page loads
    setTimeout(() => {
        showAllOffices();
    }, 1000);
}

// Area filter event listeners
document.getElementById('areaFilterAdmin')?.addEventListener('change', filterMapMarkers);
document.getElementById('areaFilter')?.addEventListener('change', filterMapMarkers);

function viewArchive() {
    window.location.href = '/archive';
}

function filterMapMarkers() {
    if (!map || !markers.length) return;

    // Try both possible search input IDs
    const searchInput = document.getElementById('searchInput') || document.getElementById('tableSearchInput');
    const searchTerm   = (searchInput?.value  || '').toLowerCase().trim();
    
    // Get selected area checkboxes
    const selectedAreas = [];
    document.querySelectorAll('.area-checkbox:checked').forEach(checkbox => {
        selectedAreas.push(checkbox.value);
    });
    
    const statusFilter = (document.getElementById('statusFilter')?.value || '').trim();

    const areasWithMatches = new Set();
    const visibleBounds    = [];

    markers.forEach(function(marker, index) {
        const d = marker._officeData;
        if (!d) return;

        const matchesSearch = !searchTerm   || d.name.includes(searchTerm);
        const matchesArea   = selectedAreas.length > 0 ? selectedAreas.includes(d.areaId) : true; // If no checkboxes selected, show all areas
        // For map filtering, check the actual connection status
        const matchesStatus = !statusFilter || 
            (statusFilter === 'Active' && d.isActive === true) || 
            (statusFilter === 'Inactive' && d.isActive === false);

        const isMatch = matchesSearch && matchesArea && matchesStatus;

        if (isMatch) {
            if (!markerClusterGroup.hasLayer(marker)) {
                markerClusterGroup.addLayer(marker);
            }
            marker.setStyle({ fillOpacity: 0.85, opacity: 1 });
            areasWithMatches.add(d.areaId);
            visibleBounds.push(marker.getLatLng());
        } else {
            if (markerClusterGroup.hasLayer(marker)) {
                markerClusterGroup.removeLayer(marker);
            }
        }
    });

    // Pan/zoom map to fit visible markers
    if (visibleBounds.length > 0) {
        map.fitBounds(visibleBounds, { padding: [30, 30], maxZoom: 13 });
    }

    updateLegendVisibility(areasWithMatches);
}

function applyFilters() {
    if (!table) return;

    // Try both possible search input IDs (table.html uses searchInput, dashboard.html uses tableSearchInput)
    const searchInput  = document.getElementById('searchInput') || document.getElementById('tableSearchInput');
    const search       = (searchInput?.value  || '').trim();
    const connectivity = (document.getElementById('statusFilter')?.value || '').trim();
    const connText     = connectivity;

    if (IS_ADMIN) {
        // Admin DataTable column layout (adminColumnDefs):
        // col 0:# | col 1:Name | col 2:Area | col 3:Region | col 4:City | col 5:Conn | col 6:Office | col 7:Remarks | col 8:Actions
        // Area filter comes from the area checkboxes (same ones used by the map).
        const selectedAreaIds = [];
        document.querySelectorAll('.area-checkbox:checked').forEach(cb => selectedAreaIds.push(cb.value));
        const areaRegex = selectedAreaIds.length
            ? selectedAreaIds.map(id => '^Area ' + id + '$').join('|')
            : '';
        table.column(2).search(areaRegex, true, false);   // Area column
        table.column(5).search(connText, false, false);   // Connection Status column
    } else {
        // User DataTable column layout (userColumnDefs):
        // col 0:# | col 1:Name | col 2:Conn | col 3:Speed | col 4:Remarks | col 5:Actions
        table.column(2).search(connText, false, false);   // Connection Status column
    }

    table.search(search).draw();
    filterMapMarkers();
}

// Clear filters
function clearFilters() {
    if (!table) return;

    // Clear search input (try both possible IDs)
    const searchInput = document.getElementById('searchInput') || document.getElementById('tableSearchInput');
    if (searchInput) searchInput.value = '';

    // Clear connectivity/status filter (id="statusFilter" in table.html)
    const statusFilter = document.getElementById('statusFilter');
    if (statusFilter) statusFilter.value = '';

    // Uncheck all area checkboxes
    document.querySelectorAll('.area-checkbox').forEach(cb => cb.checked = false);
    const selectAll = document.getElementById('selectAllAreas');
    if (selectAll) { selectAll.checked = false; selectAll.indeterminate = false; }

    // Clear all DataTable column searches and global search
    table.columns().search('');
    table.search('').draw();

    // Restore all map markers
    const allBounds = [];
    markers.forEach(function(marker) {
        if (!markerClusterGroup.hasLayer(marker)) markerClusterGroup.addLayer(marker);
        // Reset marker to original style (remove yellow highlight)
        const areaColors = {
            '1': '#FF6B6B', '2': '#4ECDC4', '3': '#45B7D1',
            '4': '#FFA07A', '5': '#98D8C8', '6': '#F7DC6F',
            '7': '#BB8FCE', '8': '#F8B739', '9': '#85C1E2'
        };
        const areaColor = areaColors[marker._officeData?.areaId] || '#85C1E2';
        marker.setStyle({ 
            fillOpacity: 0.85, 
            opacity: 1,
            radius: 8,
            weight: 2,
            fillColor: areaColor,
            color: '#fff',
            fillOpacity: 0.7
        });
        allBounds.push(marker.getLatLng());
    });
    if (allBounds.length) map.fitBounds(allBounds, { padding: [20, 20] });

    // Close any open popups
    if (map) map.closePopup();

    updateLegendVisibility(new Set());
}

// ── Update legend visibility based on filtered areas ─────────────────────────────
function updateLegendVisibility(areasWithMatches) {
    const legendItems = document.querySelectorAll('#mapLegend [data-area]');
    legendItems.forEach(function(item) {
        const areaId = item.getAttribute('data-area');
        // Keep all legend items always visible without animation
        item.style.opacity = '1';
        item.style.visibility = 'visible';
    });
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
        () => { document.getElementById('searchInput').value = ''; applyFilters(); }
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
        offStatus === 'Open' ? 'tag-open' : 
        offStatus === 'Closed' ? 'tag-closed' : 
        offStatus === 'TBD' ? 'tag-tbd' : 'tag-closed',
        offStatus === 'Open' ? 'fas fa-door-open mr-1' : 
        offStatus === 'Closed' ? 'fas fa-door-closed mr-1' : 
        offStatus === 'TBD' ? 'fas fa-question-circle mr-1' : 'fas fa-door-closed mr-1',
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
    const s = document.getElementById('searchInput');
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
//  EXPORT AND PRINT FUNCTIONS
// ═══════════════════════════════════════════════════════════════
function exportToExcel() {
    if (!table) {
        Swal.fire({
            icon: 'warning',
            title: 'Table Not Ready',
            text: 'Please wait for the table to load completely.'
        });
        return;
    }

    // Show loading
    Swal.fire({
        title: 'Exporting to Excel...',
        allowOutsideClick: false,
        allowEscapeKey: false,
        showConfirmButton: false,
        didOpen: () => Swal.showLoading()
    });

    // Get current filtered data
    const data = table.rows({ filter: 'applied' }).data().toArray();
    
    if (data.length === 0) {
        Swal.close();
        Swal.fire({
            icon: 'info',
            title: 'No Data',
            text: 'There is no data to export.'
        });
        return;
    }

    // Prepare CSV content
    let csvContent = '';
    
    // Add headers based on user role
    if (IS_ADMIN) {
        csvContent = 'No.,Post Office Name,Area,Region,City/Municipality,Connection Status,Office Status,Remarks\n';
    } else {
        csvContent = 'No.,Postal Office,Connection Status,Speed,Remarks\n';
    }
    
    // Add data rows
    data.forEach((row, index) => {
        const rowData = [];
        
        if (IS_ADMIN) {
            rowData.push(
                index + 1,
                `"${row[1] || ''}"`,  // Post Office Name
                `"${row[2] || ''}"`,  // Area
                `"${row[3] || ''}"`,  // Region
                `"${row[4] || ''}"`,  // City/Municipality
                `"${row[5] || ''}"`,  // Connection Status
                `"${row[6] || ''}"`,  // Office Status
                `"${row[7] || ''}"`   // Remarks
            );
        } else {
            rowData.push(
                index + 1,
                `"${row[1] || ''}"`,  // Postal Office
                `"${row[2] || ''}"`,  // Connection Status
                `"${row[3] || ''}"`,  // Speed
                `"${row[4] || ''}"`   // Remarks
            );
        }
        
        csvContent += rowData.join(',') + '\n';
    });

    // Create blob and download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    const timestamp = new Date().toISOString().slice(0, 19).replace(/[:-]/g, '');
    const filename = `postal_offices_connectivity_report_${timestamp}.csv`;
    
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    Swal.close();
    
    Swal.fire({
        icon: 'success',
        title: 'Export Successful!',
        text: `Report exported as ${filename}`,
        timer: 2000,
        showConfirmButton: false
    });
}

function printReport() {
    if (!table) {
        Swal.fire({
            icon: 'warning',
            title: 'Table Not Ready',
            text: 'Please wait for the table to load completely.'
        });
        return;
    }

    // Get current filtered data
    const data = table.rows({ filter: 'applied' }).data().toArray();
    
    if (data.length === 0) {
        Swal.fire({
            icon: 'info',
            title: 'No Data',
            text: 'There is no data to print.'
        });
        return;
    }

    // Create print window
    const printWindow = window.open('', '_blank');
    
    // Generate HTML content for printing
    let printContent = `
        <!DOCTYPE html>
        <html>
        <head>
            <title>Postal Offices Connectivity Report</title>
            <style>
                body { font-family: Arial, sans-serif; margin: 20px; }
                h1 { color: #002868; text-align: center; margin-bottom: 30px; }
                .summary { margin-bottom: 20px; }
                .summary-item { display: inline-block; margin-right: 30px; margin-bottom: 10px; }
                .summary-label { font-weight: bold; color: #666; }
                .summary-value { font-size: 18px; font-weight: bold; color: #002868; }
                table { width: 100%; border-collapse: collapse; margin-top: 20px; }
                th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
                th { background-color: #002868; color: white; font-weight: bold; }
                tr:nth-child(even) { background-color: #f9f9f9; }
                .active { color: #28a745; font-weight: bold; }
                .inactive { color: #dc3545; font-weight: bold; }
                .open { color: #007bff; font-weight: bold; }
                .closed { color: #fd7e14; font-weight: bold; }
                .tbd { color: #6c757d; font-weight: bold; }
                .footer { margin-top: 30px; text-align: center; color: #666; font-size: 12px; }
                @media print {
                    .no-print { display: none; }
                    body { margin: 10px; }
                    h1 { font-size: 20px; }
                    table { font-size: 12px; }
                }
            </style>
        </head>
        <body>
            <h1>PHLPost - Postal Offices Connectivity Report</h1>
            
            <div class="summary">
                <div class="summary-item">
                    <span class="summary-label">Total Offices:</span>
                    <span class="summary-value">${data.length}</span>
                </div>
                <div class="summary-item">
                    <span class="summary-label">Generated:</span>
                    <span class="summary-value">${new Date().toLocaleString()}</span>
                </div>
            </div>
            
            <table>
                <thead>
                    <tr>
    `;

    // Add table headers based on user role
    if (IS_ADMIN) {
        printContent += `
                        <th>No.</th>
                        <th>Post Office Name</th>
                        <th>Area</th>
                        <th>Region</th>
                        <th>City/Municipality</th>
                        <th>Connection Status</th>
                        <th>Office Status</th>
                        <th>Remarks</th>
        `;
    } else {
        printContent += `
                        <th>No.</th>
                        <th>Postal Office</th>
                        <th>Connection Status</th>
                        <th>Speed</th>
                        <th>Remarks</th>
        `;
    }

    printContent += `
                    </tr>
                </thead>
                <tbody>
    `;

    // Add data rows
    data.forEach((row, index) => {
        printContent += '<tr>';
        
        if (IS_ADMIN) {
            printContent += `
                        <td>${index + 1}</td>
                        <td>${row[1] || ''}</td>
                        <td>${row[2] || ''}</td>
                        <td>${row[3] || ''}</td>
                        <td>${row[4] || ''}</td>
                        <td class="${row[5]?.includes('Active') ? 'active' : 'inactive'}">${row[5] || ''}</td>
                        <td class="${row[6]?.includes('Open') ? 'open' : row[6]?.includes('Closed') ? 'closed' : row[6]?.includes('TBD') ? 'tbd' : ''}">${row[6] || ''}</td>
                        <td>${row[7] || ''}</td>
            `;
        } else {
            printContent += `
                        <td>${index + 1}</td>
                        <td>${row[1] || ''}</td>
                        <td class="${row[2]?.includes('Active') ? 'active' : 'inactive'}">${row[2] || ''}</td>
                        <td>${row[3] || ''}</td>
                        <td>${row[4] || ''}</td>
            `;
        }
        
        printContent += '</tr>';
    });

    printContent += `
                </tbody>
            </table>
            
            <div class="footer">
                <p>Generated by PHLPost Postal Profile System on ${new Date().toLocaleString()}</p>
            </div>
        </body>
        </html>
    `;

    // Write content to print window
    printWindow.document.write(printContent);
    printWindow.document.close();
    
    // Wait for content to load, then print
    printWindow.onload = function() {
        printWindow.print();
        printWindow.close();
    };
}

// ── Cleanup ───────────────────────────────────────────────────────────────────
window.addEventListener('beforeunload', function () {
    if (table && $.fn.DataTable.isDataTable('#myTable')) table.destroy();
    document.getElementById('editOfficeModal')?.remove();
});
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
        { targets: 0, width: '45px',  orderable: false, className: 'dt-center', render: function(data, type, row, meta) {
            return meta.row + meta.settings._iDisplayStart + 1;
        }},
        { targets: 1, orderable: true },
        { targets: 2, orderable: true },   // Area
        { targets: 3, orderable: true },   // Region
        { targets: 4, orderable: true },   // City
        { targets: 5, width: '120px', orderable: true, className: 'dt-center' },  // Connection
        { targets: 6, width: '105px', orderable: true, className: 'dt-center' },  // Office
        { targets: 7, orderable: false },  // Remarks
        { targets: 8, width: '120px', orderable: false, className: 'dt-center', searchable: false } // Actions
    ];

    const userColumnDefs = [
        { targets: 0, width: '45px',  orderable: false, className: 'dt-center', render: function(data, type, row, meta) {
            return meta.row + meta.settings._iDisplayStart + 1;
        }},
        { targets: 1, orderable: true },   // Postal Office
        { targets: 2, width: '140px', orderable: true, className: 'dt-center' }, // Connection
        { targets: 3, width: '120px', orderable: true },  // Speed
        { targets: 4, orderable: false }, // Remarks
        { targets: 5, width: '110px', orderable: false, className: 'dt-center', searchable: false } // Actions
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
            
            // Skip markers for non-privileged users if not Area 1
            if (!IS_PRIVILEGED_USER && office.areaId != 1) {
                continue;
            }
            
            // DEBUG: Log first few offices to see available fields
            if (i < 3) {
                console.log(`Office ${i} data:`, office);
                console.log(`Office ${i} fields:`, Object.keys(office));
            }
            
            const lat = parseFloat(office.lat ?? office.latitude);
            const lng = parseFloat(office.lng ?? office.longitude);

            // DEBUG: Log coordinate extraction
            if (i < 5) {
                console.log(`Office ${i} coordinate extraction:`, {
                    'office.lat': office.lat,
                    'office.latitude': office.latitude,
                    'office.lng': office.lng,
                    'office.longitude': office.longitude,
                    'parsed lat': lat,
                    'parsed lng': lng,
                    'lat isNaN': isNaN(lat),
                    'lng isNaN': isNaN(lng)
                });
            }

            if (isNaN(lat) || isNaN(lng)) {
                console.log(`Skipping office ${i} due to invalid coordinates:`, {
                    lat: office.lat,
                    latitude: office.latitude,
                    lng: office.lng,
                    longitude: office.longitude,
                    parsedLat: lat,
                    parsedLng: lng
                });
                skippedCount++;
                continue;
            }

            if (lat < 4.0 || lat > 21.5 || lng < 116.0 || lng > 127.0) {
                console.log(`Skipping office ${i} due to out-of-bounds coordinates:`, {
                    lat: lat,
                    lng: lng,
                    name: office.name
                });
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
                        <button onclick="window.location.href='/profile/${officeId}'" style="flex:1;background:#002868;color:#fff;border:none;padding:6px 12px;border-radius:6px;font-size:12px;cursor:pointer;font-weight:600;">View Profile</button>
                    </div>
                </div>
            `;

            marker.bindPopup(popupContent, { maxWidth: 260, maxHeight: 400, className: 'custom-popup' });

            // Store filter data directly on marker for reliable filtering
            marker._officeData = {
                id:       officeId,
                name:     nameRaw.toLowerCase(),
                nameRaw:  nameRaw,
                areaId:   String(office.areaId ?? ''),
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
    // ── Autocomplete / Suggestion dropdown ───────────────────────────────────
    const searchInput = document.getElementById('searchInput');
    let suggestBox = document.getElementById('mapSearchSuggestions');

    // The suggest box is now already in the HTML, so we just need to reference it
    if (!suggestBox && searchInput) {
        suggestBox = document.createElement('div');
        suggestBox.id = 'mapSearchSuggestions';
        suggestBox.className = 'mt-2';
        suggestBox.style.cssText =
            'display:none;background:#fff;border:1px solid #d1d3e2;border-radius:8px;' +
            'box-shadow:0 2px 8px rgba(0,0,0,0.1);max-height:240px;overflow-y:auto;';
        searchInput.parentElement.appendChild(suggestBox);
    }

    function showSuggestions(term) {
        if (!suggestBox) return;
        if (!term || term.length < 2) { hideSuggestions(); return; }

        const q = term.toLowerCase();
        
        // If markers aren't loaded yet, show loading message
        if (!markers || markers.length === 0) {
            suggestBox.innerHTML = '<div style="padding:10px;text-align:center;color:#8a97a8;font-size:12px;">Loading post offices...</div>';
            suggestBox.style.display = 'block';
            return;
        }

        const matches = markers
            .filter(m => m._officeData && m._officeData.name.includes(q))
            .slice(0, 10); // max 10 results

        if (!matches.length) { 
            suggestBox.innerHTML = '<div style="padding:10px;text-align:center;color:#8a97a8;font-size:12px;">No matches found</div>';
            suggestBox.style.display = 'block';
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
            const idx  = d.nameRaw.toLowerCase().indexOf(q);
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

            item.addEventListener('mousedown', function(e) {
                // mousedown fires before blur, use preventDefault to keep focus
                e.preventDefault();
            });

            item.addEventListener('click', function() {
                hideSuggestions();
                // Show profile in modal instead of navigating
                showProfileModal(d.id, d.nameRaw);
            });

            suggestBox.appendChild(item);
        });

        // "View all matches" footer if more than 10
        const totalMatches = markers.filter(m => m._officeData && m._officeData.name.includes(q)).length;
        if (totalMatches > 10) {
            const more = document.createElement('div');
            more.style.cssText =
                'padding:7px 14px;font-size:11px;color:#8a97a8;text-align:center;' +
                'border-top:1px solid #f0f2f5;background:#fafbff;';
            more.textContent = (totalMatches - 10) + ' more results — keep typing to narrow down';
            suggestBox.appendChild(more);
        }

        suggestBox.style.display = 'block';
    }

    function hideSuggestions() {
        if (suggestBox) suggestBox.style.display = 'none';
    }

    if (searchInput) {
        searchInput.addEventListener('input', function() {
            const term = this.value.trim();
            showSuggestions(term);
            filterMapMarkers();
        });

        searchInput.addEventListener('focus', function() {
            if (this.value.trim()) showSuggestions(this.value.trim());
        });

        searchInput.addEventListener('blur', function() {
            // Small delay so click on suggestion fires first
            setTimeout(hideSuggestions, 150);
        });

        // Keyboard navigation
        searchInput.addEventListener('keydown', function(e) {
            const items = suggestBox ? suggestBox.querySelectorAll('div[style*="cursor:pointer"]') : [];
            if (!items.length) return;
            if (e.key === 'Escape') { hideSuggestions(); }
        });
    }

    // ── End autocomplete ──────────────────────────────────────────────────────

    // Search input (filter map on input — already handled above, keep for clarity)
    document.getElementById('searchInput')?.addEventListener('input', function() {
        // filterMapMarkers already called in autocomplete handler above
    });

    // Area filter
    document.getElementById('areaFilter')?.addEventListener('change', function() {
        filterMapMarkers();
    });

    // Status filter
    document.getElementById('statusFilter')?.addEventListener('change', function() {
        filterMapMarkers();
    });

    // Apply filters button
    document.getElementById('applyFilters')?.addEventListener('click', function() {
        filterMapMarkers();
    });

    // Clear filters button
    document.getElementById('clearFilters')?.addEventListener('click', function() {
        const si = document.getElementById('searchInput');
        const sg = document.getElementById('mapSearchSuggestions');
        if (si) si.value = '';
        if (sg) sg.style.display = 'none';
        document.getElementById('areaFilter').value = '';
        document.getElementById('statusFilter').value = '';

        // Restore all markers
        const allBounds = [];
        markers.forEach(function(marker) {
            if (!markerClusterGroup.hasLayer(marker)) markerClusterGroup.addLayer(marker);
            marker.setStyle({ fillOpacity: 0.85, opacity: 1 });
            allBounds.push(marker.getLatLng());
        });
        if (allBounds.length) map.fitBounds(allBounds, { padding: [20, 20] });

        updateLegendVisibility(new Set());
    });
}

function filterMapMarkers() {
    if (!map || !markers.length) return;

    const searchTerm   = (document.getElementById('searchInput')?.value  || '').toLowerCase().trim();
    const areaFilter   = (document.getElementById('areaFilter')?.value   || '').trim();   // e.g. "1"
    const statusFilter = (document.getElementById('statusFilter')?.value || '').trim();

    console.log('=== MAP FILTER DEBUG ===');
    console.log('Filter values:', { searchTerm, areaFilter, statusFilter });
    console.log('Total markers:', markers.length);

    const areasWithMatches = new Set();
    const visibleBounds    = [];
    let matchCount = 0;
    let noDataCount = 0;

    markers.forEach(function(marker, index) {
        const d = marker._officeData;
        if (!d) {
            noDataCount++;
            console.log(`Marker ${index}: NO DATA`);
            return;
        }

        const matchesSearch = !searchTerm   || d.name.includes(searchTerm);
        const matchesArea   = !areaFilter   || d.areaId === areaFilter;
        const matchesStatus = !statusFilter || d.status === statusFilter;

        const isMatch = matchesSearch && matchesArea && matchesStatus;

        if (isMatch) matchCount++;

        console.log(`Marker ${index}:`, {
            name: d.name,
            areaId: d.areaId,
            areaIdType: typeof d.areaId,
            status: d.status,
            matches: { matchesSearch, matchesArea, matchesStatus },
            isMatch,
            filterArea: areaFilter,
            filterAreaType: typeof areaFilter
        });

        if (isMatch) {
            // Add to markerClusterGroup if not already there
            if (!markerClusterGroup.hasLayer(marker)) {
                markerClusterGroup.addLayer(marker);
            }
            marker.setStyle({ fillOpacity: 0.85, opacity: 1 });
            areasWithMatches.add(d.areaId);
            visibleBounds.push(marker.getLatLng());
        } else {
            // Remove from markerClusterGroup
            if (markerClusterGroup.hasLayer(marker)) {
                markerClusterGroup.removeLayer(marker);
            }
        }
    });

    // BONUS: Add selected area to matches for legend highlighting
    if (areaFilter) {
        areasWithMatches.add(areaFilter);
    }

    // Pan/zoom map to fit visible markers
    if (visibleBounds.length > 0) {
        map.fitBounds(visibleBounds, { padding: [30, 30], maxZoom: 13 });
    }

    console.log('=== FILTER SUMMARY ===');
    console.log('Total markers processed:', markers.length);
    console.log('Markers with no data:', noDataCount);
    console.log('Markers that match filter:', matchCount);
    console.log('Visible markers on map:', visibleBounds.length);
    console.log('Areas with matches:', Array.from(areasWithMatches));

    updateLegendVisibility(areasWithMatches);
}

function updateLegendVisibility(areasWithMatches) {
    const hasActiveFilters =
        document.getElementById('searchInput')?.value  ||
        document.getElementById('areaFilter')?.value   ||
        document.getElementById('statusFilter')?.value;

    // Legend items have data-area="1" .. data-area="9"
    const legendItems = document.querySelectorAll('#mapLegend [data-area]');

    legendItems.forEach(function(item) {
        const areaNum = item.getAttribute('data-area');

        if (!hasActiveFilters) {
            // No filters active - show all legends normally
            item.style.opacity    = '1';
            item.style.fontWeight = '';
        } else if (areasWithMatches.has(areaNum)) {
            // This area has matching markers - show prominently
            item.style.opacity    = '1';
            item.style.fontWeight = '700';
        } else {
            // This area has no matching markers - dim it
            item.style.opacity    = '0.2';
            item.style.fontWeight = '';
        }
    });

    // Debug logging to help troubleshoot
    console.log('Legend visibility update:', {
        hasActiveFilters,
        areasWithMatches: Array.from(areasWithMatches),
        areaFilterValue: document.getElementById('areaFilter')?.value
    });
}

// ═══════════════════════════════════════════════════════════════
//  AREA DROPDOWN
// ═══════════════════════════════════════════════════════════════
function populateAreaDropdown() {
    // Populate table filter area dropdown
    const tableSelect = document.getElementById('filterArea');
    if (tableSelect) {
        // Only add options if not already populated by Thymeleaf
        if (tableSelect.options.length <= 1) {
            for (let i = 1; i <= 9; i++) {
                const opt = document.createElement('option');
                opt.value = 'Area ' + i;   // value must match the text in column 2
                opt.textContent = 'Area ' + i;
                tableSelect.appendChild(opt);
            }
        }
    }

    // Populate map filter area dropdown
    const mapSelect = document.getElementById('areaFilter');
    if (mapSelect) {
        // Clear first (avoid duplicates)
        mapSelect.innerHTML = '';

        // Check user role - System Admin sees all areas, others see only Area 1
        if (IS_ADMIN) {
            // System Admin: All Areas + Area 1-9
            const allOpt = document.createElement('option');
            allOpt.value = '';
            allOpt.textContent = 'All Areas';
            mapSelect.appendChild(allOpt);

            for (let i = 1; i <= 9; i++) {
                const opt = document.createElement('option');
                opt.value = String(i); // IMPORTANT
                opt.textContent = 'Area ' + i;
                mapSelect.appendChild(opt);
            }
        } else {
            // Area Admin and regular users: Only Area 1
            const opt = document.createElement('option');
            opt.value = '1';
            opt.textContent = 'Area 1';
            mapSelect.appendChild(opt);
        }
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

    // Export Excel and Print Report buttons
    document.getElementById('exportExcelBtn')?.addEventListener('click', exportToExcel);
    document.getElementById('printReportBtn')?.addEventListener('click', printReport);
    document.getElementById('viewArchiveBtn')?.addEventListener('click', viewArchive);
}

// ── View Archive Function ─────────────────────────────────────────────────────
function viewArchive() {
    window.location.href = '/archive';
}

// ── Apply filters ─────────────────────────────────────────────────────────────
function applyFilters() {
    if (!table) return;

    const search      = (document.getElementById('tableSearchInput')?.value    || '').trim();
    const area        = (document.getElementById('filterArea')?.value           || '').trim();
    const connStatus  = (document.getElementById('filterConnStatus')?.value     || '').trim();
    const offStatus   = (document.getElementById('filterOfficeStatus')?.value   || '').trim();

    if (IS_ADMIN) {
        // Admin layout: # | Name | Area(2) | Region(3) | City(4) | Conn(5) | Office(6) | Remarks(7) | Actions(8)
        table.column(2).search(area       ? '^' + escRx(area)      + '$' : '', true, false);
        table.column(5).search(connStatus ? escRx(connStatus)           : '', true, false);
        table.column(6).search(offStatus  ? escRx(offStatus)            : '', true, false);
    } else {
        // User layout: # | Name(1) | Conn(2) | Speed(3) | Remarks(4) | Actions(5)
        table.column(2).search(connStatus ? escRx(connStatus) : '', true, false);
        // clear columns that don't exist in user layout
        table.column(0).search('');
    }

    table.search(search).draw();

    renderTags(search, area, connStatus, offStatus);
    highlightSelects();
}

// ── Clear filters ─────────────────────────────────────────────────────────────
function clearFilters() {
    if (!table) return;

    document.getElementById('tableSearchInput').value = '';
    document.getElementById('filterConnStatus').value = '';

    if (IS_ADMIN) {
        const areaEl = document.getElementById('filterArea');
        const offEl  = document.getElementById('filterOfficeStatus');
        if (areaEl) areaEl.value = '';
        if (offEl)  offEl.value  = '';
        table.column(2).search('');
        table.column(5).search('');
        table.column(6).search('');
    } else {
        table.column(2).search('');
    }

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

// ── Profile Modal Functions ───────────────────────────────────────────────────────
function showProfileModal(officeId, officeName) {
    const modal = document.getElementById('profileModal');
    const modalBody = document.getElementById('profileModalBody');
    const viewFullBtn = document.getElementById('viewFullProfileBtn');
    
    // Set up the "View Full Profile" button
    viewFullBtn.onclick = function() {
        window.location.href = '/profile/' + officeId + '?source=table';
    };
    
    // Show loading state
    modalBody.innerHTML = `
        <div class="text-center py-4">
            <i class="fas fa-spinner fa-spin fa-2x text-primary"></i>
            <p class="text-muted mt-2">Loading profile for ${officeName}...</p>
        </div>
    `;
    
    // Show the modal
    $(modal).modal('show');
    
    // Load the profile data
    fetchProfileData(officeId);
}

function fetchProfileData(officeId) {
    // Use the existing edit endpoint which is known to work
    fetch(`/api/postal-office/${officeId}`)
        .then(response => {
            if (!response.ok) throw new Error('Failed to load profile');
            return response.json();
        })
        .then(data => {
            // Normalise field names: edit endpoint returns areaId, not area text
            data.area = data.areaId ? 'Area ' + data.areaId : null;
            // Build cover photo URL from office ID
            data.coverPhotoUrl = `/api/postal-office/${officeId}/cover-photo`;
            renderProfileInModal(data, officeId);
        })
        .catch(error => {
            console.error('Error loading profile:', error);
            document.getElementById('profileModalBody').innerHTML = `
                <div class="text-center py-4">
                    <i class="fas fa-exclamation-triangle fa-2x text-warning"></i>
                    <p class="text-muted mt-2">Failed to load profile data</p>
                    <button class="btn btn-primary btn-sm" onclick="window.location.href='/profile/${officeId}'">
                        <i class="fas fa-external-link-alt mr-1"></i>Open Full Profile
                    </button>
                </div>
            `;
        });
}

function renderProfileInModal(data, officeId) {
    const modalBody = document.getElementById('profileModalBody');
    
    const statusBadge = data.connectionStatus 
        ? '<span class="badge badge-success"><i class="fas fa-check-circle mr-1"></i>Active</span>'
        : '<span class="badge badge-danger"><i class="fas fa-times-circle mr-1"></i>Inactive</span>';
    
    const officeStatusBadge = data.officeStatus === 'OPEN' 
        ? '<span class="badge badge-open"><i class="fas fa-door-open mr-1"></i>Open</span>'
        : data.officeStatus === 'CLOSED' 
        ? '<span class="badge badge-closed"><i class="fas fa-door-closed mr-1"></i>Closed</span>'
        : '<span class="badge badge-secondary">—</span>';
    
    const coverPhoto = data.coverPhotoUrl || '/images/no-image.png';
    
    modalBody.innerHTML = `
        <div class="row">
            <div class="col-md-4">
                <img src="${coverPhoto}" onerror="this.src='/images/no-image.png'" 
                     class="img-fluid rounded" alt="Cover Photo">
            </div>
            <div class="col-md-8">
                <h4 class="font-weight-bold text-primary mb-3">${data.name || 'N/A'}</h4>
                
                <div class="row mb-3">
                    <div class="col-6">
                        <small class="text-muted d-block">Connection Status</small>
                        ${statusBadge}
                    </div>
                    <div class="col-6">
                        <small class="text-muted d-block">Office Status</small>
                        ${officeStatusBadge}
                    </div>
                </div>
                
                <div class="mb-3">
                    <small class="text-muted d-block">Address</small>
                    <strong>${data.address || 'N/A'}</strong>
                </div>
                
                <div class="row">
                    <div class="col-6">
                        <small class="text-muted d-block">Area</small>
                        <strong>${data.area || 'N/A'}</strong>
                    </div>
                    <div class="col-6">
                        <small class="text-muted d-block">ZIP Code</small>
                        <strong>${data.zipCode || 'N/A'}</strong>
                    </div>
                </div>
            </div>
        </div>
        
        <div class="row mt-4">
            <div class="col-md-6">
                <h6 class="font-weight-bold text-muted mb-3">Contact Information</h6>
                <div class="mb-2">
                    <small class="text-muted">Postmaster:</small><br>
                    <strong>${data.postmaster || 'Not assigned'}</strong>
                </div>
                <div class="mb-2">
                    <small class="text-muted">Contact Person:</small><br>
                    <strong>${data.postalOfficeContactPerson || 'Not available'}</strong>
                </div>
                <div class="mb-2">
                    <small class="text-muted">Contact Number:</small><br>
                    <strong>${data.postalOfficeContactNumber || 'Not available'}</strong>
                </div>
            </div>
            <div class="col-md-6">
                <h6 class="font-weight-bold text-muted mb-3">Operations</h6>
                <div class="mb-2">
                    <small class="text-muted">Number of Employees:</small><br>
                    <strong>${data.noOfEmployees || 'Not available'}</strong>
                </div>
                <div class="mb-2">
                    <small class="text-muted">Internet Speed:</small><br>
                    <strong>${data.speed || 'Not available'}</strong>
                </div>
                <div class="mb-2">
                    <small class="text-muted">Remarks:</small><br>
                    <strong>${data.remarks || 'No remarks'}</strong>
                </div>
            </div>
        </div>
    `;
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
                        <td class="${row[6]?.includes('Open') ? 'open' : row[6]?.includes('Closed') ? 'closed' : ''}">${row[6] || ''}</td>
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
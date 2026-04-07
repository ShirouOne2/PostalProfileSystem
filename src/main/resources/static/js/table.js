/* Table Page JavaScript - Map and Search Functionality */

(function() {
    'use strict';

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
            return meta.settings._iDisplayStart + meta.row + 1;
        }},
        { targets: 1, orderable: true, render: function(data, type, row, meta) {
            if (!data) return 'N/A';
            // Get office ID from the <tr> data-office-id attribute
            var trNode = meta.settings.aoData[meta.row].nTr;
            var officeId = trNode ? trNode.getAttribute('data-office-id') : '';
            var safeName = data.replace(/'/g, "\\'");
            return '<a href="javascript:void(0)" class="office-name-link" onclick="openOfficeProfilePopup(\'' + officeId + '\', \'' + safeName + '\')">' + data + '</a>';
        }},
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
            return meta.row + 1;
        }},
        { targets: 1, orderable: true, render: function(data, type, row, meta) {
            if (!data) return 'N/A';
            var trNode = meta.settings.aoData[meta.row].nTr;
            var officeId = trNode ? trNode.getAttribute('data-office-id') : '';
            var safeName = data.replace(/'/g, "\\'");
            return '<a href="javascript:void(0)" class="office-name-link" onclick="openOfficeProfilePopup(\'' + officeId + '\', \'' + safeName + '\')">' + data + '</a>';
        }},   // Postal Office
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
    let map;
    let markers = [];
    let currentFilter = {
        area: '',
        status: '',
        search: ''
    };

    // Area colors for map markers
    const areaColors = {
        1: '#FF6B6B',
        2: '#4ECDC4', 
        3: '#45B7D1',
        4: '#FFA07A',
        5: '#98D8C8',
        6: '#F7DC6F',
        7: '#BB8FCE',
        8: '#F8B739',
        9: '#85C1E2'
    };

    // Initialize map when page loads
    document.addEventListener('DOMContentLoaded', function() {
        initMap();
        setupEventListeners();
        loadOffices();
    });

    function initMap() {
        // Initialize Leaflet map centered on Philippines
        map = L.map('map').setView([12.8797, 121.7740], 6);

        // Add tile layer
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap contributors',
            maxZoom: 18
        }).addTo(map);
    }

    function setupEventListeners() {
        // Search input
        const searchInput = document.getElementById('searchInput');
        const suggestionsBox = document.getElementById('mapSearchSuggestions');

        searchInput.addEventListener('input', debounce(function() {
            const query = this.value.trim();
            if (query.length > 0) {
                showSearchSuggestions(query);
            } else {
                hideSuggestions();
            }
        }, 300));

        searchInput.addEventListener('focus', function() {
            if (this.value.trim().length > 0) {
                showSearchSuggestions(this.value.trim());
            }
        });

        // Hide suggestions when clicking outside
        document.addEventListener('click', function(e) {
            if (!e.target.closest('#searchInput') && !e.target.closest('#mapSearchSuggestions')) {
                hideSuggestions();
            }
        });

        // Filter controls
        document.getElementById('applyFilters')?.addEventListener('click', applyFilters);
        document.getElementById('clearFilters')?.addEventListener('click', clearFilters);
        document.getElementById('areaFilter')?.addEventListener('change', applyFilters);
        document.getElementById('statusFilter')?.addEventListener('change', applyFilters);
    }

    function loadOffices() {
        console.log('[Table.js] Loading offices...');
        
        // Fetch office data from API
        fetch('/api/post-offices')
            .then(response => {
                console.log('[Table.js] Response status:', response.status);
                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }
                return response.json();
            })
            .then(data => {
                console.log('[Table.js] Successfully loaded', data.length, 'offices');
                displayOfficesOnMap(data);
                populateAreaFilter(data);
            })
            .catch(error => {
                console.error('[Table.js] Error loading offices:', error);
                console.error('[Table.js] Error details:', {
                    message: error.message,
                    stack: error.stack
                });
                
                // Show more specific error message
                let errorMessage = 'Failed to load post office data';
                if (error.message.includes('404')) {
                    errorMessage = 'Post office API endpoint not found (404)';
                } else if (error.message.includes('500')) {
                    errorMessage = 'Server error when loading post offices (500)';
                } else if (error.message.includes('Failed to fetch')) {
                    errorMessage = 'Network error - check server connection';
                }
                
                Swal.fire('Error', errorMessage, 'error');
            });
    }

    function displayOfficesOnMap(offices) {
        // Clear existing markers
        markers.forEach(marker => map.removeLayer(marker));
        markers = [];

        // Filter offices based on current filters
        const filteredOffices = offices.filter(office => {
            const matchesArea = !currentFilter.area || office.area === currentFilter.area;
            const matchesStatus = !currentFilter.status || 
                (currentFilter.status === 'true' && office.connectionStatus) ||
                (currentFilter.status === 'false' && !office.connectionStatus);
            const matchesSearch = !currentFilter.search || 
                office.name.toLowerCase().includes(currentFilter.search.toLowerCase());
            
            return matchesArea && matchesStatus && matchesSearch;
        });

        // Add markers for filtered offices
        filteredOffices.forEach(office => {
            if (office.latitude && office.longitude) {
                const marker = L.marker([office.latitude, office.longitude])
                    .addTo(map)
                    .bindPopup(`
                        <div style="min-width: 200px;">
                            <h6 style="margin: 0 0 8px 0; color: #002868;">${office.name}</h6>
                            <p style="margin: 4px 0; font-size: 12px;">
                                <strong>Area:</strong> ${office.area || 'N/A'}<br>
                                <strong>Status:</strong> 
                                <span class="badge ${office.connectionStatus ? 'badge-success' : 'badge-danger'}">
                                    ${office.connectionStatus ? 'Connected' : 'Disconnected'}
                                </span><br>
                                <strong>Office:</strong> ${office.officeStatus || 'N/A'}
                            </p>
                            <button class="btn btn-sm btn-primary" onclick="viewOfficeDetails(${office.id})">
                                <i class="fas fa-eye mr-1"></i>View Details
                            </button>
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
                    `);

                // Set marker color based on area
                const areaId = parseInt(office.area?.replace('Area ', '')) || 1;
                const color = areaColors[areaId] || '#FF6B6B';
                
                marker.setIcon(L.divIcon({
                    className: 'custom-marker',
                    html: `<div style="background-color: ${color}; width: 12px; height: 12px; border-radius: 50%; border: 2px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);"></div>`,
                    iconSize: [12, 12],
                    iconAnchor: [6, 6]
                }));

                markers.push(marker);
            }
        });

        // Fit map to show all markers
        if (markers.length > 0) {
            const group = new L.featureGroup(markers);
            map.fitBounds(group.getBounds().pad(0.1));
        }
    }

    function populateAreaFilter(offices) {
        const areaFilter = document.getElementById('areaFilter');
        if (!areaFilter) return;

        // Clear existing options
        areaFilter.innerHTML = '<option value="">All Areas</option>';

        // Get unique areas
        const areas = [...new Set(offices.map(o => o.area).filter(Boolean))];
        
        // Add area options
        areas.forEach(area => {
            const option = document.createElement('option');
            option.value = area;
            option.textContent = area;
            areaFilter.appendChild(option);
        });
    }

    function showSuggestions(term) {
        if (!suggestBox) return;

        const q = (term || '').toLowerCase().trim();

        // If markers aren't loaded yet, show loading message
        if (!markers || markers.length === 0) {
            suggestBox.innerHTML = '<div style="padding:10px;text-align:center;color:#8a97a8;font-size:12px;">Loading post offices...</div>';
            suggestBox.style.display = 'block';
            return;
        }

        // Show all offices when empty, otherwise filter by term
        const matches = markers
            .filter(m => m._officeData && (!q || m._officeData.name.includes(q)))
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

            // Highlight the matching part (only if there's a search term)
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

            item.addEventListener('mousedown', function(e) {
                // mousedown fires before blur, use preventDefault to keep focus
                e.preventDefault();
            });

            item.addEventListener('click', function() {
                hideSuggestions();
    function showSearchSuggestions(query) {
        const suggestionsBox = document.getElementById('mapSearchSuggestions');
        
        fetch(`/api/post-offices/search?q=${encodeURIComponent(query)}`)
            .then(response => response.json())
            .then(data => {
                suggestionsBox.innerHTML = '';
                
                if (data.length === 0) {
                    suggestionsBox.innerHTML = '<div class="p-2 text-muted">No results found</div>';
                } else {
                    data.slice(0, 5).forEach(office => {
                        const item = document.createElement('div');
                        item.className = 'suggestion-item p-2 border-bottom';
                        item.style.cursor = 'pointer';
                        item.innerHTML = `
                            <i class="fas fa-map-marker-alt mr-2 text-primary"></i>
                            <strong>${office.name}</strong>
                            <small class="text-muted">(${office.area})</small>
                        `;
                        item.addEventListener('click', () => {
                            document.getElementById('searchInput').value = office.name;
                            hideSuggestions();
                            focusOnOffice(office);
                        });
                        suggestionsBox.appendChild(item);
                    });
                }
                
                // Open profile popup after short delay for map animation
                setTimeout(() => openOfficeProfilePopup(d.id, d.nameRaw), 300);
            });

            suggestBox.appendChild(item);
        });

        // "View all matches" footer if more than 10
        const totalMatches = markers.filter(m => m._officeData && (!q || m._officeData.name.includes(q))).length;
        if (totalMatches > 10) {
            const more = document.createElement('div');
            more.style.cssText =
                'padding:7px 14px;font-size:11px;color:#8a97a8;text-align:center;' +
                'border-top:1px solid #f0f2f5;background:#fafbff;';
            more.textContent = (totalMatches - 10) + ' more results — keep typing to narrow down';
            suggestBox.appendChild(more);
        }

        suggestBox.style.display = 'block';
                suggestionsBox.style.display = 'block';
            })
            .catch(error => {
                console.error('Error fetching suggestions:', error);
            });
    }

    function hideSuggestions() {
        document.getElementById('mapSearchSuggestions').style.display = 'none';
    }

    if (searchInput) {
        searchInput.addEventListener('input', function() {
            const term = this.value.trim();
            showSuggestions(term);
            filterMapMarkers();
        });

        searchInput.addEventListener('focus', function() {
            showSuggestions(this.value.trim());
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

    // Area filter — listen to both IDs since IS_ADMIN may not be resolved
    // at the time initMapFilters() runs (it depends on a DOM query).
    document.getElementById('areaFilterAdmin')?.addEventListener('change', filterMapMarkers);
    document.getElementById('areaFilter')?.addEventListener('change', filterMapMarkers);

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
        const areaFilterElement = document.getElementById('areaFilterAdmin') || document.getElementById('areaFilter');
        if (areaFilterElement) areaFilterElement.value = '';
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
    // Read from whichever area dropdown is present in the DOM (admin or non-admin)
    const areaAdminEl  = document.getElementById('areaFilterAdmin');
    const areaEl       = document.getElementById('areaFilter');
    const areaFilter   = ((areaAdminEl?.value || areaEl?.value) || '').trim();
    const statusFilter = (document.getElementById('statusFilter')?.value || '').trim();

    console.log('=== MAP FILTER DEBUG ===');
    console.log('Filter values:', { searchTerm, areaFilter, statusFilter });
    console.log('Total markers:', markers.length);

    const areasWithMatches = new Set();
    const visibleBounds    = [];
    let matchCount = 0;

    markers.forEach(function(marker, index) {
        const d = marker._officeData;
        if (!d) return;

        const matchesSearch = !searchTerm   || d.name.includes(searchTerm);
        const matchesArea   = !areaFilter   || d.areaId === areaFilter;
        const matchesStatus = !statusFilter || d.status === statusFilter;

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
    function focusOnOffice(office) {
        if (office.latitude && office.longitude) {
            map.setView([office.latitude, office.longitude], 12);
            
            // Find and open the marker popup
            const marker = markers.find(m => {
                const pos = m.getLatLng();
                return Math.abs(pos.lat - office.latitude) < 0.0001 && 
                       Math.abs(pos.lng - office.longitude) < 0.0001;
            });
            
            if (marker) {
                marker.openPopup();
            }
        }
    }

    updateLegendVisibility(areasWithMatches);
}

function updateLegendVisibility(areasWithMatches) {
    const hasActiveFilters =
        document.getElementById('searchInput')?.value  ||
        document.getElementById('areaFilterAdmin')?.value ||
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

}

// ═══════════════════════════════════════════════════════════════
//  AREA DROPDOWN
// ═══════════════════════════════════════════════════════════════
function populateAreaDropdown() {
    // Thymeleaf already rendered the dropdowns with correct values server-side.
    // Do NOT overwrite them — just leave them as-is.
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

    document.getElementById('applyFilters')?.addEventListener('click', applyFilters);
    document.getElementById('clearFilters')?.addEventListener('click', clearFilters);

    // Clear search ×
    document.getElementById('clearSearchBtn')?.addEventListener('click', function () {
        document.getElementById('searchInput').value = '';
        applyFilters();
    });

    // Live search debounced
    let timer;
    document.getElementById('searchInput')?.addEventListener('input', function () {
        clearTimeout(timer);
        timer = setTimeout(applyFilters, 300);
    });
    document.getElementById('searchInput')?.addEventListener('keydown', function (e) {
        if (e.key === 'Enter') { e.preventDefault(); applyFilters(); }
    });

    // Instant on dropdown change - use correct IDs from HTML
    ['areaFilterAdmin', 'areaFilter', 'statusFilter'].forEach(id => {
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

    const search = (document.getElementById('searchInput')?.value || '').trim();
    
    // Get area filter based on user role
    const areaFilterElement = document.getElementById('areaFilterAdmin') || document.getElementById('areaFilter');
    const area = (areaFilterElement?.value || '').trim();
    
    const status = (document.getElementById('statusFilter')?.value || '').trim();

    if (IS_ADMIN) {
        // Admin layout: # | Name | Area(2) | Region(3) | City(4) | Conn(5) | Office(6) | Remarks(7) | Actions(8)
        table.column(2).search(area ? '^' + escRx(area) + '$' : '', true, false);
        table.column(5).search(status ? (status === 'true' ? 'Active' : 'Inactive') : '', true, false);
    } else {
        // User layout: # | Name(1) | Conn(2) | Speed(3) | Remarks(4) | Actions(5)
        table.column(2).search(status ? (status === 'true' ? 'Active' : 'Inactive') : '', true, false);
    }

    table.search(search).draw();

    // Also filter the map markers
    filterMapMarkers();

    // Skip renderTags and highlightSelects since those elements don't exist in table.html
}

// ── Clear filters ─────────────────────────────────────────────────────────────
function clearFilters() {
    if (!table) return;

    document.getElementById('searchInput').value = '';
    
    // Clear area filter based on user role
    const areaFilterElement = document.getElementById('areaFilterAdmin') || document.getElementById('areaFilter');
    if (areaFilterElement) areaFilterElement.value = '';
    
    document.getElementById('statusFilter').value = '';

    if (IS_ADMIN) {
        // Admin layout: clear area and connection columns
        table.column(2).search('');  // Area column
        table.column(5).search('');  // Connection column
    } else {
        // User layout: clear connection column
        table.column(2).search('');  // Connection column
    }

    table.search('').draw();

    // Skip renderTags and highlightSelects since those elements don't exist in table.html
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

// ── Open profile as popup (replaces full-page navigation) ────────────────────
function saveTableStateAndView(officeId) {
    window.open('/profile-popup/' + officeId, '_blank');
}

// ── Unified Office Profile Popup ──────────────────────────────────────────────
function openOfficeProfilePopup(officeId, officeName) {
    // Remove any existing popup first
    $('#officeProfileModal').remove();

    // Build modal with loading state
    $('body').append(`
        <div class="modal fade" id="officeProfileModal" tabindex="-1" role="dialog" aria-hidden="true">
            <div class="modal-dialog modal-xl modal-dialog-centered" role="document">
                <div class="modal-content" style="border-radius:12px;overflow:hidden;">
                    <div class="modal-header" style="background:linear-gradient(135deg,#002868,#1a3a7a);color:#fff;padding:16px 20px;">
                        <h5 class="modal-title font-weight-bold">
                            <i class="fas fa-building mr-2"></i>
                            <span id="popupOfficeName">${officeName || 'Post Office Profile'}</span>
                        </h5>
                        <button type="button" class="close text-white" data-dismiss="modal"><span>&times;</span></button>
                    </div>
                    <div class="modal-body p-0" id="officeProfileModalBody">
                        <div class="text-center py-5">
                            <i class="fas fa-spinner fa-spin fa-2x text-primary"></i>
                            <p class="text-muted mt-3">Loading profile...</p>
                        </div>
                    </div>
                    <div class="modal-footer" style="background:#f8f9fa;">
                        <button type="button" class="btn btn-secondary" data-dismiss="modal">
                            <i class="fas fa-times mr-1"></i>Close
                        </button>
                        <button type="button" class="btn btn-primary" id="popupViewFullBtn"
                                onclick="window.location.href='/profile/${officeId}'">
                            <i class="fas fa-external-link-alt mr-1"></i>View Full Profile
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `);

    $('#officeProfileModal').modal('show');
    $('#officeProfileModal').on('hidden.bs.modal', function () { $(this).remove(); });

    // Fetch full profile data
    fetch(`/api/postal-office/${officeId}`)
        .then(r => { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
        .then(data => renderOfficePopup(data, officeId))
        .catch((err) => {
            console.error('[Profile Popup] fetch error:', err);
            const body = document.getElementById('officeProfileModalBody');
            if (body) body.innerHTML = `
                <div class="text-center py-5">
                    <i class="fas fa-exclamation-triangle fa-2x text-warning mb-3"></i>
                    <p class="text-muted">Failed to load profile data.</p>
                    <a href="/profile/${officeId}" class="btn btn-primary btn-sm">
                        <i class="fas fa-external-link-alt mr-1"></i>Open Full Profile
                    </a>
                </div>`;
        });
}

function renderOfficePopup(data, officeId) {
    const area      = data.areaId ? 'Area ' + data.areaId : 'N/A';
    const connBadge = data.connectionStatus
        ? '<span class="badge badge-success px-3 py-2"><i class="fas fa-wifi mr-1"></i>Active</span>'
        : '<span class="badge badge-danger px-3 py-2"><i class="fas fa-wifi mr-1"></i>Inactive</span>';
    const officeBadge = data.officeStatus === 'OPEN'
        ? '<span class="badge badge-info px-3 py-2"><i class="fas fa-door-open mr-1"></i>Open</span>'
        : data.officeStatus === 'CLOSED'
        ? '<span class="badge badge-warning px-3 py-2"><i class="fas fa-door-closed mr-1"></i>Closed</span>'
        : '<span class="badge badge-secondary px-3 py-2">—</span>';

    const coverPhoto = `/api/postal-office/${officeId}/cover-photo`;

    document.getElementById('popupOfficeName').textContent = data.name || 'Post Office Profile';

    document.getElementById('officeProfileModalBody').innerHTML = `
        <!-- Cover Photo Banner -->
        <div style="height:180px;overflow:hidden;position:relative;background:#1a3a7a;">
            <img src="${coverPhoto}" onerror="this.style.display='none'"
                 style="width:100%;height:100%;object-fit:cover;opacity:0.7;">
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

function infoRow(icon, label, value) {
    const val = (value !== null && value !== undefined && value !== '') ? value : '—';
    return `
        <div class="mb-2 d-flex align-items-start" style="font-size:13px;">
            <i class="${icon} text-muted mr-2 mt-1" style="width:14px;flex-shrink:0;"></i>
            <div>
                <span class="text-muted" style="font-size:11px;display:block;">${label}</span>
                <strong>${val}</strong>
            </div>
        </div>`;
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
    function applyFilters() {
        currentFilter.area = document.getElementById('areaFilter')?.value || '';
        currentFilter.status = document.getElementById('statusFilter')?.value || '';
        currentFilter.search = document.getElementById('searchInput')?.value.trim() || '';
        
        loadOffices(); // Reload with filters
    }

    function clearFilters() {
        document.getElementById('areaFilter').value = '';
        document.getElementById('statusFilter').value = '';
        document.getElementById('searchInput').value = '';
        
        currentFilter = { area: '', status: '', search: '' };
        loadOffices(); // Reload without filters
    }

    function viewOfficeDetails(officeId) {
        window.location.href = `/profile/${officeId}`;
    }

    // Debug function to check API status
    function debugApiStatus() {
        console.log('[Table.js] Debugging API status...');
        fetch('/api/post-offices/debug')
            .then(response => response.json())
            .then(data => {
                console.log('[Table.js] Debug info:', data);
                if (data.offices_with_coordinates_count === 0) {
                    console.warn('[Table.js] No offices with coordinates found in database');
                }
            })
            .catch(error => {
                console.error('[Table.js] Debug API call failed:', error);
            });
    }

    // Call debug function on page load
    setTimeout(debugApiStatus, 1000);

    // Utility function for debouncing
    function debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

})();

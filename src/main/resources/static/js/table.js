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

function applyFilters() {
    if (!table) return;

    // Try both possible search input IDs (table.html uses searchInput, dashboard.html uses tableSearchInput)
    const searchInput  = document.getElementById('searchInput') || document.getElementById('tableSearchInput');
    const search       = (searchInput?.value  || '').trim();
    const connectivity = (document.getElementById('statusFilter')?.value || '').trim();
    const connText     = connectivity === 'true' ? 'Active' : connectivity === 'false' ? 'Inactive' : '';

    if (IS_ADMIN) {
        // Admin DataTable column layout (adminColumnDefs):
        // col 0:# | col 1:Name | col 2:Area | col 3:Region | col 4:City | col 5:Conn | col 6:Office | col 7:Remarks | col 8:Actions
        // Area filter comes from the area checkboxes (same ones used by the map).
        const selectedAreaIds = [];
        document.querySelectorAll('.area-checkbox:checked').forEach(cb => selectedAreaIds.push(cb.value));
        const areaRegex = selectedAreaIds.length
            ? selectedAreaIds.map(id => 'Area\\s+' + id + '\\b').join('|')
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
            })
            .catch(error => {
                console.error('[Table.js] Debug API call failed:', error);
            });
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

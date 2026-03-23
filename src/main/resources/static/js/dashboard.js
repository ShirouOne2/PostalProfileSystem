// Dashboard JavaScript
// Handles map initialization, data loading, and filtering

document.addEventListener('DOMContentLoaded', function() {
    console.log('Dashboard initializing...');

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
    const map = L.map('map', {
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

    const markers = [];
    const markerClusterGroup = L.layerGroup().addTo(map);

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

        // Process data in chunks for better performance
        const chunkSize = 50;
        let currentChunk = 0;
        
        function processChunk() {
            const start = currentChunk * chunkSize;
            const end = Math.min(start + chunkSize, data.length);
            
            for (let i = start; i < end; i++) {
                const office = data[i];
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

                const statusLabel  = office.status ? 'Active' : 'Inactive';
                const badgeBg      = office.status ? '#d4edda' : '#f8d7da';
                const badgeColor   = office.status ? '#155724' : '#721c24';
                const nameRaw          = office.name || 'N/A';
                const addressRaw       = office.address || 'Address not available';
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
                        <img src="${coverPhotoSrc}" onerror="this.src='/images/no-image.png'" style="width:100%;height:110px;border-radius:8px;object-fit:cover;margin-bottom:6px;" />
                        <div style="display:flex;gap:4px;">
                            <button onclick="window.location.href='/postal-office/view/${officeId}'" style="flex:1;padding:6px;background:#007bff;color:white;border:none;border-radius:4px;cursor:pointer;font-size:11px;font-weight:600;">
                                <i class="fas fa-eye"></i> View
                            </button>
                        </div>
                    </div>
                `;

                marker.bindPopup(popupContent, { maxWidth: 260, className: 'custom-popup' });
                marker.officeData = office;
                markerClusterGroup.addLayer(marker);
                markers.push(marker);
                bounds.push([lat, lng]);
            }
            
            currentChunk++;
            
            if (currentChunk * chunkSize < data.length) {
                // Process next chunk with requestAnimationFrame for smooth UI
                requestAnimationFrame(processChunk);
            } else {
                // Finished processing all data
                if (bounds.length) map.fitBounds(bounds, { padding: [50, 50] });

                const areas = [...new Set(data.map(o => o.areaId).filter(id => id != null))].length;
                document.getElementById('coverageAreas') && (document.getElementById('coverageAreas').textContent = areas);

                const skippedNote = skippedCount > 0 ? ` (${skippedCount} skipped)` : '';
                setMapStatus(`${data.length} offices loaded${skippedNote}`, 'done');
            }
        }
        
        // Start processing
        requestAnimationFrame(processChunk);
    }

    function applyFilters() {
        const searchTerm  = document.getElementById('searchInput')?.value.toLowerCase().trim() || '';
        const areaFilter  = document.getElementById('areaFilter')?.value;
        const statusFilter = document.getElementById('statusFilter')?.value;

        // Clear layers first for better performance
        markerClusterGroup.clearLayers();
        let visibleCount = 0;

        // Use for loop instead of forEach for better performance
        const markersLength = markers.length;
        for (let i = 0; i < markersLength; i++) {
            const marker = markers[i];
            const office = marker.officeData;
            
            // Optimized string comparison
            const matchesSearch = !searchTerm || (office.name && office.name.toLowerCase().includes(searchTerm));
            const matchesArea   = !areaFilter  || (office.areaId && office.areaId.toString() === areaFilter);
            const matchesStatus = !statusFilter || office.status.toString() === statusFilter;

            if (matchesSearch && matchesArea && matchesStatus) {
                markerClusterGroup.addLayer(marker);
                visibleCount++;
            }
        }

        setMapStatus(`Showing ${visibleCount} of ${markersLength} offices`, 'done');
    }

    function clearFilters() {
        document.getElementById('searchInput')  && (document.getElementById('searchInput').value  = '');
        document.getElementById('areaFilter')   && (document.getElementById('areaFilter').value   = '');
        document.getElementById('statusFilter') && (document.getElementById('statusFilter').value = '');

        markerClusterGroup.clearLayers();
        markers.forEach(marker => markerClusterGroup.addLayer(marker));

        setMapStatus(`Showing all ${markers.length} offices`, 'done');
    }

    function attachEventListeners() {
        const applyBtn   = document.getElementById('applyFilters');
        const clearBtn   = document.getElementById('clearFilters');
        const searchInput = document.getElementById('searchInput');

        if (applyBtn)    applyBtn.addEventListener('click',   e => { e.preventDefault(); applyFilters(); });
        if (clearBtn)    clearBtn.addEventListener('click',   e => { e.preventDefault(); clearFilters(); });
        if (searchInput) searchInput.addEventListener('keypress', e => { if (e.key === 'Enter') { e.preventDefault(); applyFilters(); } });

        console.log('Event listeners attached successfully');
    }

    // Start loading
    loadPostOffices();
    attachEventListeners();
    console.log('Dashboard initialization complete');

    // ── Cleanup on navigation ────────────────────────────────────────────────
    // NOTE: We intentionally do NOT call map.remove() here.
    // Calling map.remove() on beforeunload destroys the Leaflet instance so
    // that when the browser navigates back (bfcache / history), the map div
    // exists in the DOM but the JS instance is gone and nothing re-initializes.
    // The browser already cleans up resources on full page unload; no manual
    // teardown is needed for a standard server-rendered Spring MVC app.
});

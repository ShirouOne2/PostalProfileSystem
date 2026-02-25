// Dashboard JavaScript
// Handles map initialization, data loading, and filtering

document.addEventListener('DOMContentLoaded', function() {
    console.log('Dashboard initializing...');

    // Ensure Leaflet and SweetAlert2 are loaded
    if (typeof L === 'undefined') {
        console.error('Leaflet is not loaded!');
        Swal.fire({
            icon: 'error',
            title: 'Map Library Error',
            text: 'Map library failed to load. Please refresh the page.',
            confirmButtonText: 'Refresh Page',
            confirmButtonColor: '#3085d6'
        }).then(() => location.reload());
        return;
    }

    console.log('Leaflet loaded successfully, version:', L.version);

    // Define color palette for areas 1-9
    const areaColors = {
        1: '#FF6B6B',
        2: '#4ECDC4',
        3: '#45B7D1',
        4: '#FFA07A',
        5: '#98D8C8',
        6: '#F7DC6F',
        7: '#BB8FCE',
        8: '#F8B739',
        9: '#85C1E2',
        default: '#95A5A6'
    };

    function getAreaColor(areaId) {
        return areaColors[areaId] || areaColors.default;
    }

    // Initialize map
    const map = L.map('map', {
        center: [11.0, 122.0],
        zoom: 6,
        minZoom: 5,
        maxZoom: 18,
        maxBounds: [
            [4.0, 116.0],
            [21.5, 127.0]
        ],
        maxBoundsViscosity: 1.0
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 18
    }).addTo(map);

    // Marker storage
    const markers = [];
    const markerClusterGroup = L.layerGroup().addTo(map);

    // Show loading indicator
    Swal.fire({
        title: 'Loading Map Data...',
        text: 'Please wait while we load post office locations',
        allowOutsideClick: false,
        allowEscapeKey: false,
        didOpen: () => Swal.showLoading()
    });

    // Fetch post offices
    fetch('/api/post-offices')
        .then(response => {
            if (!response.ok) throw new Error('HTTP ' + response.status);
            return response.json();
        })
        .then(data => {
            console.log('Loaded', data.length, 'post offices');

            // Reset markers
            markerClusterGroup.clearLayers();
            markers.length = 0;
            const bounds = [];
            let skippedCount = 0;

            data.forEach(office => {
                // Debug: Log the office object to see available fields
                console.log('Office data:', office);

                const lat = parseFloat(office.lat);
                const lng = parseFloat(office.lng);

                // Skip invalid coordinates
                if (isNaN(lat) || isNaN(lng)) {
                    console.warn('Invalid coordinates for:', office.name);
                    skippedCount++;
                    return;
                }

                // Circle marker
                const marker = L.circleMarker([lat, lng], {
                    radius: 8,
                    fillColor: getAreaColor(office.areaId),
                    color: '#fff',
                    weight: 2,
                    opacity: 1,
                    fillOpacity: 0.8
                });

                // Helper: build popup HTML from office data object
                function buildPopupContent(o) {
                    const sLabel   = o.status ? 'Active' : 'Inactive';
                    const sBg      = o.status ? '#d4edda' : '#f8d7da';
                    const sColor   = o.status ? '#155724' : '#721c24';
                    const name     = o.name || 'N/A';
                    const address  = o.address || 'Address not available';
                    const pm       = o.postmaster || 'Not assigned';
                    const emp      = (!o.noOfEmployees) ? 'Not available' : o.noOfEmployees;
                    const cp       = o.postalOfficeContactPerson || 'Not available';
                    const cn       = o.postalOfficeContactNumber || 'Not available';
                    const oid      = o.id || '';
                    const cover    = o.coverPhoto    || '/images/no-image.png';
                    const profile  = o.profilePicture || '/images/no-image.png';

                    return `
                        <div style="font-family:'Segoe UI',sans-serif;font-size:12px;line-height:1.4;max-width:240px;">
                            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px;">
                                <span style="font-size:13px;font-weight:600;color:#002868;">PHLPost Station</span>
                                <span style="padding:2px 8px;border-radius:999px;background:${sBg};color:${sColor};font-size:11px;">${sLabel}</span>
                            </div>
                            <div style="color:#1f2a44;font-weight:600;margin-bottom:4px;">${name}</div>
                            <div style="color:#4d5a73;margin-bottom:6px;">${address}</div>
                            <div style="background:#f7f9ff;border:1px solid rgba(0,40,104,0.08);border-radius:8px;padding:6px 8px;margin-bottom:6px;">
                                <div style="margin-bottom:4px;"><span style="color:#7a869a;">Postmaster</span><br><strong style="color:#002868;">${pm}</strong></div>
                                <div style="margin-bottom:4px;"><span style="color:#7a869a;">Employees</span><br><strong style="color:#002868;">${emp}</strong></div>
                                <div style="margin-bottom:4px;">
                                    <span style="color:#7a869a;">Contact</span><br>
                                    <strong style="color:#002868;">${cp}</strong><br>
                                    <span style="color:#4d5a73;">${cn}</span>
                                </div>
                            </div>
                            <img src="${cover}" onerror="this.src='/images/no-image.png'"
                                 style="width:100%;height:110px;object-fit:cover;border-radius:8px;margin-bottom:6px;" />
                            <div style="display:flex;gap:4px;">
                                <button onclick="window.location.href='/postal-office/view/${oid}'"
                                        style="flex:1;padding:6px;background:#007bff;color:white;border:none;border-radius:4px;cursor:pointer;font-size:11px;font-weight:600;text-align:center;">
                                    <i class="fas fa-eye"></i> View
                                </button>
                            </div>
                        </div>`;
                }

                // Bind popup — refresh from API every time it opens so images are always fresh
                marker.on('click', function() {
                    const m = this;
                    m.openPopup();
                    fetch('/api/postal-office/' + office.id)
                        .then(r => r.ok ? r.json() : Promise.reject())
                        .then(fresh => {
                            m.officeData = Object.assign(m.officeData, fresh);
                            m.setPopupContent(buildPopupContent(m.officeData));
                        })
                        .catch(() => { /* keep existing content */ });
                });

                marker.bindPopup(buildPopupContent(office), {
                    maxWidth: 260,
                    className: 'custom-popup'
                });

                // Store data for filtering
                marker.officeData = office;

                // Add marker to cluster group and array
                markerClusterGroup.addLayer(marker);
                markers.push(marker);

                bounds.push([lat, lng]);
            });

            // Fit map to markers
            if (bounds.length) map.fitBounds(bounds, { padding: [50, 50] });

            // Update statistics
            const total = data.length;
            const active = data.filter(o => o.status === true).length;
            const inactive = total - active;
            const areas = [...new Set(data.map(o => o.areaId).filter(id => id != null))].length;

            document.getElementById('totalOffices') && (document.getElementById('totalOffices').textContent = total);
            document.getElementById('activeOffices') && (document.getElementById('activeOffices').textContent = active);
            document.getElementById('inactiveOffices') && (document.getElementById('inactiveOffices').textContent = inactive);
            document.getElementById('coverageAreas') && (document.getElementById('coverageAreas').textContent = areas);

            Swal.close();

            // Show success toast
            Swal.mixin({
                toast: true,
                position: 'top-end',
                showConfirmButton: false,
                timer: 3000,
                timerProgressBar: true
            }).fire({
                icon: 'success',
                title: `Loaded ${total} post offices successfully!`
            });

            if (skippedCount > 0) {
                Swal.mixin({ toast: true, position: 'top-end', showConfirmButton: false, timer: 3000 })
                    .fire({
                        icon: 'warning',
                        title: `${skippedCount} offices skipped due to invalid coordinates`
                    });
            }
        })
        .catch(error => {
            console.error('Error loading post offices:', error);
            Swal.fire({
                icon: 'error',
                title: 'Failed to Load Data',
                html: `<p>${error.message}</p>`,
                confirmButtonText: 'Retry',
                showCancelButton: true,
                cancelButtonText: 'Close'
            }).then(result => {
                if (result.isConfirmed) location.reload();
            });
        });

    // Filter functions
    function applyFilters() {
        const searchTerm = document.getElementById('searchInput')?.value.toLowerCase().trim() || '';
        const areaFilter = document.getElementById('areaFilter')?.value;
        const statusFilter = document.getElementById('statusFilter')?.value;

        console.log('Applying filters:', { searchTerm, areaFilter, statusFilter });

        markerClusterGroup.clearLayers();

        let visibleCount = 0;
        markers.forEach(marker => {
            const office = marker.officeData;
            const matchesSearch = !searchTerm || (office.name && office.name.toLowerCase().includes(searchTerm));
            const matchesArea = !areaFilter || (office.areaId && office.areaId.toString() === areaFilter);
            const matchesStatus = !statusFilter || office.status.toString() === statusFilter;

            if (matchesSearch && matchesArea && matchesStatus) {
                markerClusterGroup.addLayer(marker);
                visibleCount++;
            }
        });

        Swal.mixin({ 
            toast: true, 
            position: 'top-end', 
            showConfirmButton: false, 
            timer: 2000, 
            timerProgressBar: true 
        }).fire({ 
            icon: 'info', 
            title: `Showing ${visibleCount} of ${markers.length} offices` 
        });
    }

    function clearFilters() {
        console.log('Clearing filters');
        document.getElementById('searchInput') && (document.getElementById('searchInput').value = '');
        document.getElementById('areaFilter') && (document.getElementById('areaFilter').value = '');
        document.getElementById('statusFilter') && (document.getElementById('statusFilter').value = '');

        markerClusterGroup.clearLayers();
        markers.forEach(marker => markerClusterGroup.addLayer(marker));

        Swal.mixin({ 
            toast: true, 
            position: 'top-end', 
            showConfirmButton: false, 
            timer: 2000, 
            timerProgressBar: true 
        }).fire({ 
            icon: 'success', 
            title: 'Filters cleared - showing all offices' 
        });
    }

    // Event listeners - ensure they're attached after DOM is loaded
    function attachEventListeners() {
        const applyBtn = document.getElementById('applyFilters');
        const clearBtn = document.getElementById('clearFilters');
        const searchInput = document.getElementById('searchInput');

        if (applyBtn) {
            applyBtn.addEventListener('click', function(e) {
                e.preventDefault();
                console.log('Apply Filters button clicked');
                applyFilters();
            });
        } else {
            console.error('Apply Filters button not found!');
        }

        if (clearBtn) {
            clearBtn.addEventListener('click', function(e) {
                e.preventDefault();
                console.log('Clear Filters button clicked');
                clearFilters();
            });
        } else {
            console.error('Clear Filters button not found!');
        }

        if (searchInput) {
            searchInput.addEventListener('keypress', function(e) {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    console.log('Enter key pressed in search');
                    applyFilters();
                }
            });
        }

        console.log('Event listeners attached successfully');
    }

    // Call after DOM is loaded
    attachEventListeners();

    console.log('Dashboard initialization complete');
});
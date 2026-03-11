// Dashboard JavaScript
// Handles map initialization, data loading, and filtering

document.addEventListener('DOMContentLoaded', function() {
    console.log('Dashboard initializing...');

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

    const areaColors = {
        1: '#FF6B6B', 2: '#4ECDC4', 3: '#45B7D1', 4: '#FFA07A',
        5: '#98D8C8', 6: '#F7DC6F', 7: '#BB8FCE', 8: '#F8B739',
        9: '#85C1E2', default: '#95A5A6'
    };

    function getAreaColor(areaId) {
        return areaColors[areaId] || areaColors.default;
    }

    const map = L.map('map', {
        center: [12.8797, 121.7740],
        zoom: 5,
        minZoom: 2,
        maxZoom: 18,
        maxBounds: [[4.0, 116.0], [21.5, 127.0]],
        maxBoundsViscosity: 1.0
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 18
    }).addTo(map);

    const markers = [];
    const markerClusterGroup = L.layerGroup().addTo(map);

    Swal.fire({
        title: 'Loading Map Data...',
        text: 'Please wait while we load post office locations',
        allowOutsideClick: false,
        allowEscapeKey: false,
        didOpen: () => Swal.showLoading()
    });

    fetch('/api/post-offices')
        .then(response => {
            if (!response.ok) throw new Error('HTTP ' + response.status);
            return response.json();
        })
        .then(data => {
            console.log('Loaded', data.length, 'post offices from map API');

            markerClusterGroup.clearLayers();
            markers.length = 0;
            const bounds = [];
            let skippedCount = 0;

            data.forEach(office => {
                const lat = parseFloat(office.lat ?? office.latitude);
                const lng = parseFloat(office.lng ?? office.longitude);

                if (isNaN(lat) || isNaN(lng)) {
                    skippedCount++;
                    return;
                }

                if (lat < 4.0 || lat > 21.5 || lng < 116.0 || lng > 127.0) {
                    skippedCount++;
                    return;
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

                // ✅ FIX: Use URL string, not raw bytes
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
            });

            if (bounds.length) map.fitBounds(bounds, { padding: [50, 50] });

            const areas = [...new Set(data.map(o => o.areaId).filter(id => id != null))].length;
            document.getElementById('coverageAreas') && (document.getElementById('coverageAreas').textContent = areas);

            Swal.close();

            Swal.mixin({
                toast: true, position: 'top-end',
                showConfirmButton: false, timer: 3000, timerProgressBar: true
            }).fire({ icon: 'success', title: `Loaded ${data.length} post offices on map!` });

            if (skippedCount > 0) {
                Swal.mixin({ toast: true, position: 'top-end', showConfirmButton: false, timer: 3000 })
                    .fire({ icon: 'warning', title: `${skippedCount} offices skipped (no coordinates)` });
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
            }).then(result => { if (result.isConfirmed) location.reload(); });
        });

    function applyFilters() {
        const searchTerm  = document.getElementById('searchInput')?.value.toLowerCase().trim() || '';
        const areaFilter  = document.getElementById('areaFilter')?.value;
        const statusFilter = document.getElementById('statusFilter')?.value;

        markerClusterGroup.clearLayers();
        let visibleCount = 0;

        markers.forEach(marker => {
            const office = marker.officeData;
            const matchesSearch = !searchTerm || (office.name && office.name.toLowerCase().includes(searchTerm));
            const matchesArea   = !areaFilter  || (office.areaId && office.areaId.toString() === areaFilter);
            const matchesStatus = !statusFilter || office.status.toString() === statusFilter;

            if (matchesSearch && matchesArea && matchesStatus) {
                markerClusterGroup.addLayer(marker);
                visibleCount++;
            }
        });

        Swal.mixin({ toast: true, position: 'top-end', showConfirmButton: false, timer: 2000, timerProgressBar: true })
            .fire({ icon: 'info', title: `Showing ${visibleCount} of ${markers.length} offices` });
    }

    function clearFilters() {
        document.getElementById('searchInput')  && (document.getElementById('searchInput').value  = '');
        document.getElementById('areaFilter')   && (document.getElementById('areaFilter').value   = '');
        document.getElementById('statusFilter') && (document.getElementById('statusFilter').value = '');

        markerClusterGroup.clearLayers();
        markers.forEach(marker => markerClusterGroup.addLayer(marker));

        Swal.mixin({ toast: true, position: 'top-end', showConfirmButton: false, timer: 2000, timerProgressBar: true })
            .fire({ icon: 'success', title: 'Filters cleared - showing all offices' });
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

    attachEventListeners();
    console.log('Dashboard initialization complete');
});
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
        center: [12.8797, 121.7740],
        zoom: 5,
        minZoom: 2,
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

                // Bind popup
                const statusBadge = office.status
                    ? '<span class="status-badge status-active">Active</span>'
                    : '<span class="status-badge status-inactive">Inactive</span>';

                const areaBadge = office.areaId
                    ? `<span class="area-badge" style="background-color: ${getAreaColor(office.areaId)}">Area ${office.areaId}</span>`
                    : '<span class="area-badge area-unknown">Area N/A</span>';

                marker.bindPopup(
                    `<h6>${office.name}</h6>` +
                    `<p><strong>Area:</strong> ${areaBadge}</p>` +
                    `<p><strong>Status:</strong> ${statusBadge}</p>`
                );

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

        markerClusterGroup.clearLayers();

        let visibleCount = 0;
        markers.forEach(marker => {
            const office = marker.officeData;
            const matchesSearch = !searchTerm || office.name.toLowerCase().includes(searchTerm);
            const matchesArea = !areaFilter || (office.areaId && office.areaId.toString() === areaFilter);
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
        document.getElementById('searchInput') && (document.getElementById('searchInput').value = '');
        document.getElementById('areaFilter') && (document.getElementById('areaFilter').value = '');
        document.getElementById('statusFilter') && (document.getElementById('statusFilter').value = '');

        markerClusterGroup.clearLayers();
        markers.forEach(marker => markerClusterGroup.addLayer(marker));

        Swal.mixin({ toast: true, position: 'top-end', showConfirmButton: false, timer: 2000, timerProgressBar: true })
            .fire({ icon: 'success', title: 'Filters cleared - showing all offices' });
    }

    // Event listeners
    document.getElementById('applyFilters')?.addEventListener('click', applyFilters);
    document.getElementById('clearFilters')?.addEventListener('click', clearFilters);
    document.getElementById('searchInput')?.addEventListener('keypress', e => {
        if (e.key === 'Enter') applyFilters();
    });

    console.log('Dashboard initialization complete');
});

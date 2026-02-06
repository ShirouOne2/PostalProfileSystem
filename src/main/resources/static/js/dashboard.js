// Dashboard JavaScript
// Handles map initialization, data loading, and filtering

document.addEventListener('DOMContentLoaded', function() {
    console.log('Dashboard initializing...');
    
    // Check if Leaflet is loaded
    if (typeof L === 'undefined') {
        console.error('Leaflet is not loaded!');
        alert('Map library failed to load. Please refresh the page.');
        return;
    }
    
    console.log('Leaflet loaded successfully, version:', L.version);
    
    // Initialize the map centered on Philippines
    var map = L.map('map', {
        center: [12.8797, 121.7740],
        zoom: 5,
        minZoom: 2,
        maxZoom: 18,
        // Snap back to Philippines bounds when dragging outside
        maxBounds: [
            [4.0, 116.0],  // Southwest coordinates
            [21.5, 127.0]  // Northeast coordinates
        ],
        maxBoundsViscosity: 1.0
    });
    
    // Add OpenStreetMap tiles
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 18
    }).addTo(map);
    
    // Storage for markers
    var markers = [];
    var markerClusterGroup = L.layerGroup().addTo(map);
    
    // Load post offices from API
    console.log('Fetching post offices from /api/post-offices...');
    
    fetch('/api/post-offices')
        .then(response => {
            console.log('API Response status:', response.status);
            if (!response.ok) {
                throw new Error('HTTP ' + response.status);
            }
            return response.json();
        })
        .then(data => {
            console.log('Loaded', data.length, 'post offices');
            console.log('Sample data:', data.slice(0, 2));
            
            // Clear existing markers
            markerClusterGroup.clearLayers();
            markers = [];
            
            var bounds = [];
            var addedCount = 0;
            var skippedCount = 0;
            
            // Add markers for each post office
            data.forEach(function(office) {
                var lat = parseFloat(office.lat);
                var lng = parseFloat(office.lng);
                
                // Validate coordinates
                if (isNaN(lat) || isNaN(lng)) {
                    console.warn('Invalid coordinates for:', office.name);
                    skippedCount++;
                    return;
                }
                
                // Create circle marker with color based on status
                var marker = L.circleMarker([lat, lng], {
                    radius: 8,
                    fillColor: office.status ? '#28a745' : '#dc3545',
                    color: '#ffffff',
                    weight: 2,
                    opacity: 1,
                    fillOpacity: 0.9
                });
                
                // Create status badge
                var statusBadge = office.status ? 
                    '<span class="status-badge status-active">Active</span>' : 
                    '<span class="status-badge status-inactive">Inactive</span>';
                
                // Bind popup with office information
                marker.bindPopup(
                    '<h6>' + office.name + '</h6>' +
                    '<p><strong>Status:</strong> ' + statusBadge + '</p>' +
                    '<p><strong>Area ID:</strong> ' + (office.areaId || 'N/A') + '</p>'
                );
                
                // Store office data with marker for filtering
                marker.officeData = office;
                markers.push(marker);
                markerClusterGroup.addLayer(marker);
                
                // Add to bounds for auto-zoom
                bounds.push([lat, lng]);
                addedCount++;
            });
            
            console.log('Added', addedCount, 'markers');
            if (skippedCount > 0) {
                console.warn('Skipped', skippedCount, 'offices due to invalid coordinates');
            }
            
            // Fit map to show all markers
            if (bounds.length > 0) {
                map.fitBounds(bounds, { padding: [50, 50] });
            }
            
            // Update statistics
            var total = data.length;
            var active = data.filter(o => o.status === true).length;
            var inactive = total - active;
            var areas = [...new Set(data.map(o => o.areaId).filter(id => id != null))].length;
            
            document.getElementById('totalOffices').textContent = total;
            document.getElementById('activeOffices').textContent = active;
            document.getElementById('inactiveOffices').textContent = inactive;
            document.getElementById('coverageAreas').textContent = areas;
            
            console.log('Dashboard loaded successfully!');
            console.log('Statistics:', { total, active, inactive, areas });
        })
        .catch(error => {
            console.error('Error loading post offices:', error);
            alert('Failed to load post office data: ' + error.message + '\n\nPlease check:\n1. Is the server running?\n2. Is the API endpoint correct?\n3. Check browser console for details.');
        });
    
    // Filter functions
    function applyFilters() {
        var searchTerm = document.getElementById('searchInput').value.toLowerCase().trim();
        var areaFilter = document.getElementById('areaFilter').value;
        var statusFilter = document.getElementById('statusFilter').value;
        
        console.log('Applying filters:', { searchTerm, areaFilter, statusFilter });
        
        // Clear current markers
        markerClusterGroup.clearLayers();
        
        var visibleCount = 0;
        
        // Re-add markers that match filters
        markers.forEach(function(marker) {
            var office = marker.officeData;
            
            var matchesSearch = !searchTerm || office.name.toLowerCase().includes(searchTerm);
            var matchesArea = !areaFilter || (office.areaId && office.areaId.toString() === areaFilter);
            var matchesStatus = !statusFilter || office.status.toString() === statusFilter;
            
            if (matchesSearch && matchesArea && matchesStatus) {
                markerClusterGroup.addLayer(marker);
                visibleCount++;
            }
        });
        
        console.log('Filtered:', visibleCount, 'of', markers.length, 'markers visible');
    }
    
    function clearFilters() {
        console.log('Clearing all filters...');
        
        // Reset filter inputs
        document.getElementById('searchInput').value = '';
        document.getElementById('areaFilter').value = '';
        document.getElementById('statusFilter').value = '';
        
        // Re-add all markers
        markerClusterGroup.clearLayers();
        markers.forEach(function(marker) {
            markerClusterGroup.addLayer(marker);
        });
        
        console.log('All filters cleared');
    }
    
    // Event listeners for filter buttons
    document.getElementById('applyFilters').addEventListener('click', applyFilters);
    document.getElementById('clearFilters').addEventListener('click', clearFilters);
    
    // Allow Enter key to apply filters in search box
    document.getElementById('searchInput').addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            applyFilters();
        }
    });
    
    console.log('Dashboard initialization complete');
});
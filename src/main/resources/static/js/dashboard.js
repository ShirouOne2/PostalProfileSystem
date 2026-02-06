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
    
    // Color scheme for areas 1-9
    var areaColors = {
        1: '#FF6B6B',  // Red
        2: '#4ECDC4',  // Teal
        3: '#45B7D1',  // Blue
        4: '#FFA07A',  // Light Salmon
        5: '#98D8C8',  // Mint
        6: '#F7DC6F',  // Yellow
        7: '#BB8FCE',  // Purple
        8: '#85C1E2',  // Sky Blue
        9: '#F8B88B'   // Peach
    };
    
    // Function to get color for an area
    function getAreaColor(areaId) {
        return areaColors[areaId] || '#6c757d'; // Default gray for unknown areas
    }
    
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
                
                // Get color based on area
                var pinColor = getAreaColor(office.areaId);
                
                // Create circle marker with color based on area
                // If inactive, make it semi-transparent
                var marker = L.circleMarker([lat, lng], {
                    radius: 8,
                    fillColor: pinColor,
                    color: '#ffffff',
                    weight: 2,
                    opacity: office.status ? 1 : 0.5,
                    fillOpacity: office.status ? 0.9 : 0.4
                });
                
                // Create status badge
                var statusBadge = office.status ? 
                    '<span class="badge bg-success">Active</span>' : 
                    '<span class="badge bg-danger">Inactive</span>';
                
                // Create area badge with color
                var areaBadge = office.areaId ? 
                    '<span class="badge" style="background-color: ' + pinColor + ';">Area ' + office.areaId + '</span>' : 
                    '<span class="badge bg-secondary">No Area</span>';
                
                // Bind popup with office information
                marker.bindPopup(
                    '<div style="min-width: 200px;">' +
                    '<h6 class="mb-2">' + office.name + '</h6>' +
                    '<p class="mb-1"><strong>Status:</strong> ' + statusBadge + '</p>' +
                    '<p class="mb-1"><strong>Area:</strong> ' + areaBadge + '</p>' +
                    '<p class="mb-0 text-muted small"><strong>Coordinates:</strong> ' + lat.toFixed(4) + ', ' + lng.toFixed(4) + '</p>' +
                    '</div>'
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
        var filteredBounds = [];
        
        // Re-add markers that match filters
        markers.forEach(function(marker) {
            var office = marker.officeData;
            
            // Search filter: matches if search is empty OR office name contains search term
            var matchesSearch = !searchTerm || office.name.toLowerCase().includes(searchTerm);
            
            // Area filter: matches if area filter is empty OR office areaId exactly matches selected area
            var matchesArea = !areaFilter || (office.areaId && office.areaId.toString() === areaFilter);
            
            // Status filter: matches if status filter is empty OR office status matches selected status
            var matchesStatus = !statusFilter || office.status.toString() === statusFilter;
            
            // Only show marker if ALL filters match
            if (matchesSearch && matchesArea && matchesStatus) {
                markerClusterGroup.addLayer(marker);
                visibleCount++;
                
                // Add to bounds for re-centering map
                var latlng = marker.getLatLng();
                filteredBounds.push([latlng.lat, latlng.lng]);
            }
        });
        
        // If markers are visible, fit map to show them
        if (filteredBounds.length > 0) {
            map.fitBounds(filteredBounds, { padding: [50, 50] });
        }
        
        console.log('Filtered:', visibleCount, 'of', markers.length, 'markers visible');
        
        // Show message if no results
        if (visibleCount === 0) {
            alert('No post offices match the current filters.');
        }
    }
    
    function clearFilters() {
        console.log('Clearing all filters...');
        
        // Reset filter inputs
        document.getElementById('searchInput').value = '';
        document.getElementById('areaFilter').value = '';
        document.getElementById('statusFilter').value = '';
        
        // Re-add all markers
        markerClusterGroup.clearLayers();
        var allBounds = [];
        
        markers.forEach(function(marker) {
            markerClusterGroup.addLayer(marker);
            var latlng = marker.getLatLng();
            allBounds.push([latlng.lat, latlng.lng]);
        });
        
        // Fit map to show all markers
        if (allBounds.length > 0) {
            map.fitBounds(allBounds, { padding: [50, 50] });
        }
        
        console.log('All filters cleared - showing all', markers.length, 'markers');
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
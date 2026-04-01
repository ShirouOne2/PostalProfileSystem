/* Table Page JavaScript - Map and Search Functionality */

(function() {
    'use strict';

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
                
                suggestionsBox.style.display = 'block';
            })
            .catch(error => {
                console.error('Error fetching suggestions:', error);
            });
    }

    function hideSuggestions() {
        document.getElementById('mapSearchSuggestions').style.display = 'none';
    }

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

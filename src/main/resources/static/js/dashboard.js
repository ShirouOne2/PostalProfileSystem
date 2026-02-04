// Dashboard JavaScript - Converted from PHP to Java Spring Boot
let leafletMap;
let markers = [];
let mapData = [];
let leafletMapInitialized = false;

// Toggle sidebar function
function toggleSidebar() {
    const sidebar = document.querySelector('.sidebar-wrapper');
    const pageContainer = document.querySelector('.page-container');
    const logoBar = document.querySelector('.logo-bar');
    
    if (sidebar.classList.contains('collapsed')) {
        sidebar.classList.remove('collapsed');
        pageContainer.classList.remove('sidebar-collapsed');
        logoBar.classList.remove('sidebar-collapsed');
    } else {
        sidebar.classList.add('collapsed');
        pageContainer.classList.add('sidebar-collapsed');
        logoBar.classList.add('sidebar-collapsed');
    }
    
    // Resize map after sidebar toggle
    if (leafletMap) {
        setTimeout(() => {
            leafletMap.invalidateSize();
        }, 300);
    }
}

// Area color mapping matching PHP version
const areaColorMap = {
    '1': '#d7263d',
    '2': '#f46036', 
    '3': '#2fbf71',
    '4': '#1b98e0',
    '5': '#c492b1',
    '6': '#ffaf00',
    '7': '#7f2982',
    '8': '#0f7173',
    '9': '#f25f5c'
};

// Initialize on page load
$(document).ready(function() {
    // Sidebar dropdown toggle
    $(".sidebar-dropdown > a").click(function (e) {
        e.preventDefault();
        $(".sidebar-submenu").slideUp(200);
        if ($(this).parent().hasClass("active")) {
            $(".sidebar-dropdown").removeClass("active");
            $(this).parent().removeClass("active");
        } else {
            $(".sidebar-dropdown").removeClass("active");
            $(this).next(".sidebar-submenu").slideDown(200);
            $(this).parent().addClass("active");
        }
    });

    $(document).on('click', '.logout-confirm', function () {
        showPageLoader('Logging out...');
    });

    // Initialize map immediately if dashboard container is active
    if ($('#dashboard-container').hasClass('active') && $('#leafletMap').length && !leafletMapInitialized) {
        console.log('Dashboard container active, initializing map...');
        setTimeout(function() {
            initializeMap();
        }, 100);
    } else {
        console.log('Map initialization conditions:', {
            dashboardActive: $('#dashboard-container').hasClass('active'),
            mapElementExists: $('#leafletMap').length,
            mapInitialized: leafletMapInitialized
        });
    }
    
    // Force immediate map initialization after DOM is ready
    $(document).ready(function() {
        console.log('DOM ready, checking map...');
        if ($('#leafletMap').length && !leafletMapInitialized) {
            console.log('DOM ready, forcing map initialization...');
            setTimeout(function() {
                if (!leafletMapInitialized) {
                    console.log('Attempting map initialization from DOM ready...');
                    initializeMap();
                }
            }, 200);
        }
    });
    
    // Additional trigger after jQuery is fully loaded
    setTimeout(function() {
        if ($('#leafletMap').length && !leafletMapInitialized) {
            console.log('jQuery loaded, forcing map initialization...');
            initializeMap();
        }
    }, 1000);
    
    // Also try to initialize map after window is fully loaded
    $(window).on('load', function() {
        if ($('#dashboard-container').hasClass('active') && $('#leafletMap').length && !leafletMapInitialized) {
            console.log('Window loaded, attempting map initialization...');
            setTimeout(function() {
                if (!leafletMapInitialized) {
                    initializeMap();
                }
            }, 500);
        }
    });
    
    // Final fallback - try to initialize map after 2 seconds
    setTimeout(function() {
        if ($('#dashboard-container').hasClass('active') && $('#leafletMap').length && !leafletMapInitialized) {
            console.log('Final fallback: forcing map initialization...');
            initializeMap();
        }
    }, 2000);
    
    // Set DASHBOARD menu as active on page load
    $('.sidebar-menu .nav-link-toggle').removeClass('active');
    $("#show-dashboard").addClass('active');
});

function initializeMap() {
    console.log('Initializing map...');
    
    // Only initialize if map element exists
    if (!$('#leafletMap').length) {
        console.log('Map element not found');
        return;
    }
    
    console.log('Map element found, proceeding with initialization...');
    
    if (leafletMapInitialized && leafletMap) {
        console.log('Map already initialized, invalidating size...');
        setTimeout(() => {
            leafletMap.invalidateSize();
        }, 300);
        return;
    }

    // Philippines bounds (approximate)
    const phBounds = [[4.2, 116.9], [21.1, 126.6]];
    
    console.log('Creating Leaflet map...');
    
    try {
        leafletMap = L.map('leafletMap', {
            minZoom: 5,
            maxZoom: 18,
            zoomControl: true,
            maxBounds: phBounds,
            maxBoundsViscosity: 1.0,
            dragging: true,
            touchZoom: true,
            doubleClickZoom: true,
            scrollWheelZoom: true,
            boxZoom: true,
            keyboard: true,
            tap: true
        }).setView([12.8797, 121.7740], 6);

        console.log('Adding tile layer...');
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; OpenStreetMap contributors',
            maxZoom: 18
        }).addTo(leafletMap);

        // Invalidate size after a short delay to ensure container is fully rendered
        setTimeout(() => {
            if (leafletMap) {
                leafletMap.invalidateSize();
                console.log('Map size invalidated');
            }
        }, 100);

        // Load data from Java API endpoints
        console.log('Loading map data...');
        loadMapData();
        loadStatistics();
        setupEventListeners();
        
        leafletMapInitialized = true;
        console.log('Map initialized successfully!');
        
        // Force map to be visible and properly sized
        setTimeout(() => {
            if (leafletMap) {
                leafletMap.invalidateSize();
                $('#leafletMap').show().css('visibility', 'visible');
                console.log('Map forced to be visible');
            }
        }, 500);
        
    } catch (error) {
        console.error('Error initializing map:', error);
        $('#leafletMap').html('<div style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); text-align: center; color: red;"><i class="fas fa-exclamation-triangle"></i><p>Map failed to load</p></div>');
    }
}

function loadMapData() {
    showPageLoader('Loading map data...');
    
    // Fetch map data and areas in parallel
    Promise.all([
        fetch('/dashboard/api/map-data')
            .then(response => {
                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }
                return response.json();
            }),
        fetch('/dashboard/api/areas')
            .then(response => {
                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }
                return response.json();
            })
            .catch(error => {
                console.warn('Failed to load areas:', error);
                return [];
            })
    ])
    .then(([data, allAreas]) => {
        if (!Array.isArray(data)) {
            console.error('Invalid map data format:', data);
            throw new Error('Invalid map data format');
        }
        
        mapData = data;
        console.log('Loaded', mapData.length, 'post offices');
        
        addMarkersToMap();
        populateAreaDropdown(allAreas);
        createAreaLegend();
        hidePageLoader();
    })
    .catch(error => {
        console.error('Error loading map data:', error);
        hidePageLoader();
        Swal.fire({
            icon: 'error',
            title: 'Map Loading Error',
            text: 'Failed to load map data. Please refresh the page.',
            confirmButtonText: 'Refresh'
        }).then((result) => {
            if (result.isConfirmed) {
                location.reload();
            }
        });
    });
}

function addMarkersToMap() {
    if (!leafletMap) {
        console.error('Map not initialized');
        return;
    }
    
    // Clear existing markers
    markers.forEach(markerObj => {
        if (markerObj.marker && leafletMap.hasLayer(markerObj.marker)) {
            leafletMap.removeLayer(markerObj.marker);
        }
    });
    markers = [];

    let validMarkers = 0;
    mapData.forEach((office, index) => {
        if (office.latitude && office.longitude && 
            !isNaN(office.latitude) && !isNaN(office.longitude)) {
            
            // Extract area number for color mapping
            const areaLower = String(office.area || '').toLowerCase().trim();
            const areaMatch = areaLower.match(/(\d+)/);
            const areaKey = areaMatch ? areaMatch[1] : areaLower;
            const areaColor = areaColorMap[areaKey] || '#3388ff';
            
            try {
                // Create circle marker like PHP version
                const marker = L.circleMarker([office.latitude, office.longitude], {
                    radius: 8,
                    fillColor: areaColor,
                    color: '#ffffff',
                    weight: 2,
                    opacity: 1,
                    fillOpacity: 0.9
                })
                .addTo(leafletMap)
                .bindPopup(generatePopupHTML(office));
                
                markers.push({ 
                    marker, 
                    name: (office.postalOffice || '').toLowerCase(), 
                    area: areaKey, 
                    lat: office.latitude, 
                    lng: office.longitude, 
                    data: office 
                });
                
                validMarkers++;
            } catch (error) {
                console.error(`Error adding marker for office ${index}:`, error, office);
            }
        } else {
            console.warn(`Invalid coordinates for office ${office.postalOffice}:`, {
                lat: office.latitude,
                lng: office.longitude
            });
        }
    });
    
    console.log(`Added ${validMarkers} valid markers out of ${mapData.length} offices`);
    
    // Fit map to show all markers if there are any
    if (validMarkers > 0) {
        const group = new L.featureGroup(markers.map(m => m.marker));
        leafletMap.fitBounds(group.getBounds().pad(0.1));
    }
}

// Duplicate createAreaLegend function removed - using the enhanced one at line 1278

function loadStatistics() {
        // Statistics cards were moved to table.html, so this function is no longer needed for dashboard
    // Keeping function to prevent errors, but it doesn't do anything on dashboard page
    console.log('Statistics loading skipped - cards moved to table page');
}

function setupEventListeners() {
    // Area filter - check if element exists
    const areaDropdown = document.getElementById('areaDropdown');
    if (areaDropdown) {
        areaDropdown.addEventListener('change', filterMarkers);
    }
    
    // Connectivity filter - check if element exists
    const connectivityDropdown = document.getElementById('connectivityDropdown');
    if (connectivityDropdown) {
        connectivityDropdown.addEventListener('change', filterMarkers);
    }
    
    // Search with autocomplete
    const searchInput = document.getElementById('officeInput');
    if (searchInput) {
        searchInput.addEventListener('input', function() {
            const query = this.value;
            if (query.length >= 2) {
                performSearch(query);
            } else {
                clearSearchResults();
            }
            filterMarkers();
        });
    }
    
    // Handle search selection
    // ... rest of the search handling code
}

function filterMarkers() {
    const areaDropdown = document.getElementById('areaDropdown');
    const searchInput = document.getElementById('officeInput');
    const connectivityDropdown = document.getElementById('connectivityDropdown');

    if (!leafletMap) {
        return;
    }
    
    // Get filter values safely
    const selectedArea = areaDropdown ? areaDropdown.value : '';
    const connectivityFilter = connectivityDropdown ? connectivityDropdown.value : '';

    let areaValue = '';
    if (areaDropdown && areaDropdown.value) {
        // Get area filter value, clean to be just the number if it's in "Area X" format
        const dropdownRawValue = String(areaDropdown.value).toLowerCase().trim();
        const areaMatch = dropdownRawValue.match(/(\d+)/);
        if (areaMatch) {
            areaValue = areaMatch[1];
        } else if (dropdownRawValue === '') {
            areaValue = ''; // Show All Areas
        } else {
            areaValue = dropdownRawValue; // Use as is if it's not "Area X" format but also not empty
        }
    }
    
    const searchQuery = searchInput ? searchInput.value.toLowerCase() : '';
    let visibleMarkers = [];

    markers.forEach(({ marker, name, area, data }) => {
        // Ensure marker's area is also a string for comparison
        const markerAreaString = String(area || '').trim();
        
        // Exact match for area - only show if areas match exactly, or if "Show All" is selected
        const matchArea = !areaValue || (markerAreaString === areaValue);
        
        const address = (data && data.addressLine) ? data.addressLine.toLowerCase() : '';
        const matchSearch = !searchQuery ||
            name.includes(searchQuery) ||
            markerAreaString.includes(searchQuery) ||
            address.includes(searchQuery);
            
        const matchConnectivity = !connectivityFilter || 
            (data && data.connectivityStatus === connectivityFilter);

        if (matchArea && matchSearch && matchConnectivity) {
            if (!leafletMap.hasLayer(marker)) {
                marker.addTo(leafletMap);
            }
            visibleMarkers.push({ marker, name, area, data });
        } else if (leafletMap.hasLayer(marker)) {
            leafletMap.removeLayer(marker);
        }
    });
    
    // Auto-open popup if there's search text
    if (searchQuery && visibleMarkers.length > 0) {
        // Check for exact match first
        let exactMatch = visibleMarkers.find(markerObj => 
            markerObj.name.toLowerCase() === searchQuery
        );
        
        // If exact match found, open its popup and center map
        if (exactMatch) {
            exactMatch.marker.openPopup();
            if (exactMatch.data && exactMatch.data.latitude && exactMatch.data.longitude) {
                leafletMap.setView([exactMatch.data.latitude, exactMatch.data.longitude], 15);
            }
        }
        // If only one result and it contains the search text, open its popup
        else if (visibleMarkers.length === 1) {
            visibleMarkers[0].marker.openPopup();
            if (visibleMarkers[0].data && visibleMarkers[0].data.latitude && visibleMarkers[0].data.longitude) {
                leafletMap.setView([visibleMarkers[0].data.latitude, visibleMarkers[0].data.longitude], 15);
            }
        }
    }
}

// Duplicate toggleSidebar function removed - using the one at line 8

function showDashboard() {
    // Update active state
    document.querySelectorAll('.nav-link').forEach(link => link.classList.remove('active'));
    event.target.closest('.nav-link').classList.add('active');
    
    // Show dashboard content (already visible)
    window.location.hash = '#dashboard';
}

function showDataTable() {
    // Add smooth transition effect
    document.body.style.opacity = '0.7';
    setTimeout(() => {
        window.location.href = '/table';
    }, 200);
}

function showAnalytics() {
    Swal.fire('Coming Soon', 'Analytics feature is under development', 'info');
}

function showSettings() {
    Swal.fire('Coming Soon', 'Settings feature is under development', 'info');
}

function showLoading() {
    let loadingOverlay = document.getElementById('loadingOverlay');
    if (!loadingOverlay) {
        // Create loading overlay if it doesn't exist
        loadingOverlay = document.createElement('div');
        loadingOverlay.id = 'loadingOverlay';
        loadingOverlay.className = 'loading-overlay';
        loadingOverlay.innerHTML = `
            <div class="loading-spinner">
                <div class="spinner-border" role="status">
                    <span class="sr-only">Loading...</span>
                </div>
            </div>
        `;
        loadingOverlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.5);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 9999;
        `;
        
        // Add CSS for spinner if not already present
        if (!document.getElementById('loadingOverlayStyles')) {
            const style = document.createElement('style');
            style.id = 'loadingOverlayStyles';
            style.textContent = `
                .loading-overlay .spinner-border {
                    width: 3rem;
                    height: 3rem;
                    border-width: 0.3em;
                }
                .loading-overlay.show {
                    opacity: 1;
                    visibility: visible;
                    transition: opacity 0.3s ease;
                }
                .loading-overlay:not(.show) {
                    opacity: 0;
                    visibility: hidden;
                    transition: opacity 0.3s ease;
                }
            `;
            document.head.appendChild(style);
        }
        
        document.body.appendChild(loadingOverlay);
    }
    loadingOverlay.classList.add('show');
}

function hideLoading() {
    const loadingOverlay = document.getElementById('loadingOverlay');
    if (loadingOverlay) {
        loadingOverlay.classList.remove('show');
    }
}

// Search functionality
function performSearch(query) {
    fetch(`/dashboard/api/search?q=${encodeURIComponent(query)}`)
        .then(response => response.json())
        .then(data => {
            displaySearchResults(data);
        })
        .catch(error => {
            console.error('Error searching:', error);
        });
}

function displaySearchResults(results) {
    const searchInput = document.getElementById('officeInput');
    
    // Remove existing datalist if exists
    let datalist = document.getElementById('officeList');
    if (!datalist) {
        datalist = document.createElement('datalist');
        datalist.id = 'officeList';
        searchInput.parentNode.appendChild(datalist);
    }
    
    // Clear existing options
    datalist.innerHTML = '';
    
    // Add new options
    results.forEach(office => {
        const option = document.createElement('option');
        option.value = office.postalOffice;
        option.textContent = `${office.postalOffice} - ${office.area}`;
        datalist.appendChild(option);
    });
}

function clearSearchResults() {
    const datalist = document.getElementById('officeList');
    if (datalist) {
        datalist.innerHTML = '';
    }
}

// Profile modal functionality
function showProfileModal(postOfficeId) {
    showLoading();
    
    fetch(`/profile/api/details/${postOfficeId}`)
        .then(response => response.json())
        .then(data => {
            if (data.error) {
                Swal.fire('Error', data.error, 'error');
                return;
            }
            
            displayProfileContent(data);
            $('#profileModal').modal('show');
            hideLoading();
        })
        .catch(error => {
            console.error('Error loading profile:', error);
            Swal.fire('Error', 'Failed to load profile data', 'error');
            hideLoading();
        });
}

function displayProfileContent(postOffice) {
    const profileContent = document.getElementById('profileContent');
    
    // Helper function to get correct image path
    const getImagePath = (imagePath, isProfile = false) => {
        if (!imagePath || imagePath === 'no-image.png') return '/images/no-image.png';
        
        // If path already starts with /uploads/, use it directly
        if (imagePath.startsWith('/uploads/')) {
            return imagePath;
        }
        
        // Handle old format (filename only) - add /uploads/ and subdirectory
        const subdirectory = isProfile ? 'profiles' : 'covers';
        return `/uploads/${subdirectory}/${imagePath}`;
    };
    
    const profileHtml = `
        <div class="profile-header">
            <div class="cover-photo" style="background-image: url('${getImagePath(postOffice.coverPhotoPath || postOffice.imagePath)}'); height: 180px; max-height: 200px; width: 100%; background-size: cover; background-position: center; border-radius: 8px 8px 0 0; overflow: hidden;"></div>
            <div class="profile-picture text-center" style="margin-top: -50px;">
                <img src="${getImagePath(postOffice.imagePath, true)}" 
                     style="width: 100px; height: 100px; border-radius: 50%; border: 4px solid white; box-shadow: 0 4px 8px rgba(0,0,0,0.2);"
                     onerror="this.src='/images/no-image.png'">
                <h4 class="mt-3">${postOffice.postalOffice}</h4>
                <p class="text-muted">${postOffice.area}</p>
            </div>
        </div>
        
        <div class="profile-body p-4">
            <div class="row">
                <div class="col-md-6">
                    <h6><i class="fas fa-info-circle"></i> Basic Information</h6>
                    <table class="table table-sm">
                        <tr><td>Postmaster:</td><td>${postOffice.postmaster || 'N/A'}</td></tr>
                        <tr><td>Employees:</td><td>${postOffice.employees || 'N/A'}</td></tr>
                        <tr><td>Postal Tellers:</td><td>${postOffice.noOfPostalTeller || 'N/A'}</td></tr>
                        <tr><td>Letter Carriers:</td><td>${postOffice.noOfLetterCarriers || 'N/A'}</td></tr>
                    </table>
                </div>
                <div class="col-md-6">
                    <h6><i class="fas fa-map-marker-alt"></i> Location</h6>
                    <table class="table table-sm">
                        <tr><td>Region:</td><td>${postOffice.region || 'N/A'}</td></tr>
                        <tr><td>Province:</td><td>${postOffice.province || 'N/A'}</td></tr>
                        <tr><td>City:</td><td>${postOffice.city || 'N/A'}</td></tr>
                        <tr><td>Barangay:</td><td>${postOffice.barangay || 'N/A'}</td></tr>
                        <tr><td>ZIP Code:</td><td>${postOffice.zipCode || 'N/A'}</td></tr>
                    </table>
                </div>
            </div>
            
            <div class="row mt-3">
                <div class="col-md-6">
                    <h6><i class="fas fa-wifi"></i> Connectivity</h6>
                    <table class="table table-sm">
                        <tr><td>Status:</td><td><span class="badge badge-${(postOffice.connectivityStatus === 'Connected' || postOffice.connectivityStatus === 'Active') ? 'success' : (postOffice.connectivityStatus === 'Disconnected' || postOffice.connectivityStatus === 'Inactive') ? 'danger' : (postOffice.connectivityStatus === 'Pending' ? 'warning' : (postOffice.connectivityStatus === 'Under Maintenance' ? 'info' : 'secondary'))}">${postOffice.connectivityStatus || 'N/A'}</span></td></tr>
                        <tr><td>ISP:</td><td>${postOffice.internetServiceProvider || 'N/A'}</td></tr>
                        <tr><td>Speed:</td><td>${postOffice.speed || 'N/A'} Mbps</td></tr>
                        <tr><td>Static IP:</td><td>${postOffice.staticIpAddress || 'N/A'}</td></tr>
                    </table>
                </div>
                <div class="col-md-6">
                    <h6><i class="fas fa-phone"></i> Contact Information</h6>
                    <table class="table table-sm">
                        <tr><td>Contact Person:</td><td>${postOffice.postalOfficeContactPerson || 'N/A'}</td></tr>
                        <tr><td>Contact Number:</td><td>${postOffice.contactNumber || 'N/A'}</td></tr>
                        <tr><td>ISP Contact:</td><td>${postOffice.ispContactPerson || 'N/A'}</td></tr>
                        <tr><td>ISP Phone:</td><td>${postOffice.ispContactNumber || 'N/A'}</td></tr>
                    </table>
                </div>
            </div>
            
            <div class="text-center mt-3">
                <a href="/profile?name=${encodeURIComponent(postOffice.postalOffice)}" class="btn btn-primary" target="_blank">
                    <i class="fas fa-external-link-alt"></i> View Full Profile
                </a>
            </div>
        </div>
    `;
    
    profileContent.innerHTML = profileHtml;
}

// Utility functions from PHP version
function formatSpeed(value) {
    if (value === null || value === undefined) {
        return 'N/A';
    }
    const cleaned = String(value).trim();
    if (cleaned === '' || cleaned.toLowerCase() === 'n/a') {
        return 'N/A';
    }
    // If it already has a unit, keep it as-is
    if (/mbps|kbps|gbps|bps/i.test(cleaned)) {
        return cleaned;
    }
    const match = cleaned.match(/[\d.]+/);
    const numeric = match ? parseFloat(match[0]) : NaN;
    if (isNaN(numeric) || numeric <= 0) {
        return 'N/A';
    }
    return `${numeric} Mbps`;
}

function updateLoaderText(message) {
    var textEl = document.getElementById('loaderStatusText') || document.querySelector('.loader-text');
    if (textEl) {
        textEl.textContent = message || 'Loading...';
    }
}

function showPageLoader(message) {
    var loader = document.getElementById('pageLoader');
    if (!loader) {
        // Create loader if it doesn't exist
        loader = document.createElement('div');
        loader.id = 'pageLoader';
        loader.className = 'page-loader';
        loader.innerHTML = `
            <div class="loader-bar">
                <span></span><span></span><span></span><span></span><span></span>
            </div>
            <div class="loader-text" id="loaderStatusText">Loading...</div>
        `;
        document.body.appendChild(loader);
    }
    updateLoaderText(message || 'Loading...');
    loader.classList.remove('hidden');
}

function hidePageLoader() {
    var loader = document.getElementById('pageLoader');
    if (loader) {
        loader.classList.add('hidden');
        updateLoaderText('Loading...');
    }
}

// Make functions globally available
window.showPageLoader = showPageLoader;
window.hidePageLoader = hidePageLoader;
window.updateMarkerPopup = updateMarkerPopup;
window.refreshMapMarkers = refreshMapMarkers;
window.showOnlyArea = showOnlyArea;

// Helper function to generate popup HTML matching PHP version
function generatePopupHTML(office) {
    let statusLabel = office.connectivityStatus || 'Unknown';
    
    // Handle N/A or empty status
    if (!statusLabel || statusLabel === 'N/A' || statusLabel.trim() === '') {
        statusLabel = 'Unknown';
    }
    
    const statusLower = statusLabel.toLowerCase().trim();
    
    // Check for active/connected status (green badge)
    const isActiveStatus = statusLower === 'active' || 
                          statusLower.includes('active') || 
                          statusLower === 'connected' || 
                          statusLower.includes('connected');
    
    // Check for inactive/disconnected status (red badge)
    const isInactiveStatus = statusLower === 'inactive' || 
                            statusLower.includes('inactive') || 
                            statusLower === 'disconnected' || 
                            statusLower.includes('disconnected') ||
                            statusLower === 'unknown' ||
                            statusLower === 'n/a';
    
    // Check for pending status (yellow badge)
    const isPendingStatus = statusLower === 'pending' || 
                           statusLower.includes('pending');
    
    // Check for under maintenance status (blue badge)
    const isMaintenanceStatus = statusLower === 'under maintenance' || 
                               statusLower.includes('under maintenance');
    
    // Determine badge color
    let badgeBg, badgeColor;
    if (isPendingStatus) {
        badgeBg = '#fff3cd';
        badgeColor = '#856404';
    } else if (isMaintenanceStatus) {
        badgeBg = '#d1ecf1';
        badgeColor = '#0c5460';
    } else if (isActiveStatus && !isInactiveStatus) {
        badgeBg = '#d1e7dd';
        badgeColor = '#198754';
    } else {
        badgeBg = '#f8d7da';
        badgeColor = '#dc3545';
    }
    
    // Helper function to get correct image path
    const getImagePath = (imagePath, isProfile = false) => {
        if (!imagePath || imagePath === 'no-image.png') return '/images/no-image.png';
        
        // If path already starts with /uploads/, use it directly
        if (imagePath.startsWith('/uploads/')) {
            return imagePath;
        }
        
        // If path already includes subdirectory (covers/ or profiles/), just add /uploads/
        if (imagePath.includes('/')) {
            return `/uploads/${imagePath}`;
        }
        
        // Handle old format (filename only) - add /uploads/ and subdirectory
        const subdirectory = isProfile ? 'profiles' : 'covers';
        return `/uploads/${subdirectory}/${imagePath}`;
    };
    
    // Get cover photo source
    const coverPhotoSrc = getImagePath(office.coverPhotoPath || office.imagePath);
    
    console.log('Popup - Original coverPhotoPath:', office.coverPhotoPath || office.imagePath);
    console.log('Popup - Processed coverPhotoSrc:', coverPhotoSrc);
    
    return `
        <div style="font-family:'Segoe UI',sans-serif;font-size:12px;line-height:1.5;max-width:350px;">
            <!-- Cover Photo -->
            <div class="popup-cover-photo" style="height: 120px; overflow: hidden; border-radius: 8px 8px 0 0; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);">
                <img src="${coverPhotoSrc}" 
                     style="width: 100%; height: 100%; object-fit: cover; display: block;"
                     alt="${office.postalOffice} Cover Photo"
                     onerror="this.style.display='none';">
            </div>
            
            <div style="text-align: center; padding: 10px; background: #f8f9fa; border-bottom: 1px solid #dee2e6;">
                <h6 style="margin: 0; color: #002868; font-weight: 600;">Post Office Profile</h6>
            </div>
            
            <div style="padding: 15px; background: white; border-radius: 0 0 8px 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
                <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
                    <span style="font-size:14px;font-weight:600;color:#002868;">${office.postalOffice || 'N/A'}</span>
                    <span style="padding:3px 8px;border-radius:999px;background:${badgeBg};color:${badgeColor};font-size:11px;">${statusLabel}</span>
                </div>
                <div style="color:#1f2a44;font-weight:600;margin-bottom:8px;">${office.addressLine || 'N/A'}</div>
                <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;background:#f7f9ff;border:1px solid rgba(0,40,104,0.08);border-radius:8px;padding:8px;">
                    <div>
                        <span style="color:#7a869a;">Postmaster</span><br>
                    <strong style="color:#002868;">${office.postmaster || 'N/A'}</strong>
                </div>
                <div>
                    <span style="color:#7a869a;">Employees</span><br>
                    <strong style="color:#002868;">${office.employees || 'N/A'}</strong>
                </div>
                <div>
                    <span style="color:#7a869a;">Speed</span><br>
                    <strong style="color:#002868;">${formatSpeed(office.speed)}</strong>
                </div>
                <div style="grid-column: span 2;">
                    <span style="color:#7a869a;">Contact</span><br>
                    <strong style="color:#002868;">${office.postalOfficeContactPerson || 'N/A'}</strong><br>
                    <span style="color:#4d5a73;">${office.contactNumber || 'N/A'}</span>
                </div>
            </div>
            <button class="btn btn-sm btn-primary" onclick="showProfileModal(${office.id})" style="width:100%;padding:8px;background:#007bff;color:white;border:none;border-radius:4px;cursor:pointer;font-size:11px;font-weight:600;text-decoration:none;display:inline-block;text-align:center;margin-top:8px;">
                <i class="fas fa-eye"></i> View Profile Timeline
            </button>
            </div>
        </div>`;
}

// Function to refresh a specific image with cache-busting (call only when needed)
function refreshImageWithTimestamp(imgElement, newImagePath) {
    if (imgElement) {
        const timestamp = Date.now();
        const imagePath = newImagePath || imgElement.src.split('?')[0]; // Remove existing timestamp
        imgElement.src = `${imagePath}?t=${timestamp}`;
    }
}

// Function to refresh all images for a specific post office (call after upload)
function refreshPostOfficeImages(postOfficeId, newImagePath) {
    // Find all markers for this post office and refresh their images
    markers.forEach(markerObj => {
        if (markerObj.data.id === postOfficeId) {
            // Update the data first
            if (newImagePath) {
                markerObj.data.imagePath = newImagePath;
                markerObj.data.coverPhotoPath = newImagePath;
            }
            
            // Regenerate popup with fresh image (this will use the updated data)
            const popupContent = generatePopupHTML(markerObj.data);
            markerObj.marker.setPopupContent(popupContent);
            
            // If popup is currently open, refresh it to show new image
            if (markerObj.marker.isPopupOpen()) {
                markerObj.marker.closePopup();
                setTimeout(() => {
                    markerObj.marker.openPopup();
                }, 100);
            }
        }
    });
}

// Function to populate area dropdown
function populateAreaDropdown(allAreas) {
    const areaDropdown = document.getElementById('areaDropdown');
    if (!areaDropdown) return;
    
    // Clear existing options except the first one
    while (areaDropdown.children.length > 1) {
        areaDropdown.removeChild(areaDropdown.lastChild);
    }
    
    // Add areas from database
    const seenAreas = new Map();
    
    // Ensure areas 1-9 are always in the dropdown
    for (let i = 1; i <= 9; i++) {
        const areaKey = String(i);
        if (!seenAreas.has(areaKey)) {
            seenAreas.set(areaKey, `Area ${i}`);
        }
    }
    
    // Add areas from database
    if (Array.isArray(allAreas)) {
        allAreas.forEach(areaRaw => {
            if (areaRaw) {
                const areaLower = String(areaRaw).toLowerCase().trim();
                const areaMatch = areaLower.match(/(\d+)/);
                const areaKey = areaMatch ? areaMatch[1] : areaLower;
                if (areaKey && areaKey !== '') {
                    if (!seenAreas.has(areaKey)) {
                        seenAreas.set(areaKey, areaRaw);
                    }
                }
            }
        });
    }
    
    // Sort areas numerically and add to dropdown
    const sortedAreas = Array.from(seenAreas.entries()).sort((a, b) => {
        const numA = parseInt(a[0]) || 0;
        const numB = parseInt(b[0]) || 0;
        return numA - numB;
    });
    
    sortedAreas.forEach(([areaKey, areaRaw]) => {
        const areaOption = document.createElement('option');
        areaOption.value = areaKey;
        areaOption.textContent = areaRaw || `area ${areaKey}`;
        areaDropdown.appendChild(areaOption);
    });
}

// Function to view detailed post office information
function viewDetails(postOfficeId) {
    showPageLoader('Loading post office details...');
    
    // Fetch detailed information via API
    fetch(`/profile/api/details/${postOfficeId}`)
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            return response.json();
        })
        .then(data => {
            if (data.error) {
                throw new Error(data.error);
            }
            
            // Create modal with detailed information matching PHP template
            const modalHtml = createDetailsModal(data);
            
            // Remove existing modal if present
            const existingModal = document.getElementById('postOfficeDetailsModal');
            if (existingModal) {
                existingModal.remove();
            }
            
            // Add modal to body
            document.body.insertAdjacentHTML('beforeend', modalHtml);
            
            // Show modal
            const modal = new bootstrap.Modal(document.getElementById('postOfficeDetailsModal'));
            modal.show();
            
            hidePageLoader();
        })
        .catch(error => {
            console.error('Error loading post office details:', error);
            hidePageLoader();
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: error.message || 'Failed to load post office details'
            });
        });
}

// Function to create the details modal HTML matching PHP template
function createDetailsModal(postOffice) {
    const timestamp = new Date().getTime();
    
    // Helper function to get correct image path
    const getImagePath = (imagePath, isProfile = false) => {
        if (!imagePath || imagePath === 'no-image.png') return '/images/no-image.png';
        
        // If path already starts with /uploads/, use it directly
        if (imagePath.startsWith('/uploads/')) {
            return imagePath;
        }
        
        // Handle old format (filename only) - add /uploads/ and subdirectory
        const subdirectory = isProfile ? 'profiles' : 'covers';
        return `/uploads/${subdirectory}/${imagePath}`;
    };
    
    const coverImagePath = getImagePath(postOffice.coverPhotoPath || postOffice.imagePath);
    const profileImagePath = getImagePath(postOffice.imagePath, true);
    
    return `
        <div class="modal fade" id="postOfficeDetailsModal" tabindex="-1" role="dialog" aria-labelledby="postOfficeDetailsModalLabel" aria-hidden="true">
            <div class="modal-dialog modal-xl" role="document">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title" id="postOfficeDetailsModalLabel">
                            <i class="fas fa-building"></i> ${postOffice.postalOffice || 'Post Office Details'}
                        </h5>
                        <button type="button" class="close" data-dismiss="modal" aria-label="Close">
                            <span aria-hidden="true">&times;</span>
                        </button>
                    </div>
                    <div class="modal-body" style="max-height: 80vh; overflow-y: auto;">
                        <div class="cover-photo-container">
                            <div class="profile-modal-cover-photo" style="background-image: url('${coverImagePath}?t=${timestamp}'); background-size: cover; background-position: center; background-repeat: no-repeat; width: 100%;"></div>
                        </div>

                        <div class="profile-section">
                            <div class="profile-header-wrapper">
                                <div class="profile-picture-container">
                                    <div class="profile-picture-wrapper">
                                        <img src="${profileImagePath}?t=${timestamp}" 
                                             class="profile-picture" 
                                             style="width: 100px; height: 100px; border-radius: 50%; border: 4px solid white; box-shadow: 0 4px 8px rgba(0,0,0,0.2); margin-top: -50px;"
                                             onerror="this.src='/images/no-image.png?t=' + Date.now()">
                                    </div>
                                </div>
                            </div>

                            <div class="profile-info-section">
                                <h1 class="profile-name">${postOffice.postalOffice || 'N/A'}</h1>
                            </div>

                            <div class="profile-tabs">
                                <a href="#" class="tab-item active">
                                    <i class="fas fa-info-circle"></i> About
                                </a>
                            </div>

                            <!-- Basic Information -->
                            <div class="info-card" style="background: white; border-radius: 8px; padding: 20px; margin-bottom: 20px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                                <div class="card-header" style="font-size: 18px; font-weight: bold; margin-bottom: 15px; color: #007bff;">
                                    <i class="fas fa-info-circle"></i> Basic Information
                                </div>

                                <div class="info-row" style="display: flex; align-items: center; margin-bottom: 10px; padding: 8px 0; border-bottom: 1px solid #f0f0f0;">
                                    <div class="info-icon" style="margin-right: 15px; color: #007bff;">
                                        <i class="fas fa-map-marked-alt"></i>
                                    </div>
                                    <div class="info-content" style="flex: 1;">
                                        <div class="info-label" style="font-size: 12px; color: #666; margin-bottom: 2px;">Area</div>
                                        <div class="info-value" style="font-weight: 600;">${postOffice.area || 'N/A'}</div>
                                    </div>
                                </div>

                                <div class="info-row" style="display: flex; align-items: center; margin-bottom: 10px; padding: 8px 0; border-bottom: 1px solid #f0f0f0;">
                                    <div class="info-icon" style="margin-right: 15px; color: #007bff;">
                                        <i class="fas fa-building"></i>
                                    </div>
                                    <div class="info-content" style="flex: 1;">
                                        <div class="info-label" style="font-size: 12px; color: #666; margin-bottom: 2px;">Postal Office Name</div>
                                        <div class="info-value" style="font-weight: 600;">${postOffice.postalOffice || 'N/A'}</div>
                                    </div>
                                </div>

                                <div class="info-row" style="display: flex; align-items: center; margin-bottom: 10px; padding: 8px 0; border-bottom: 1px solid #f0f0f0;">
                                    <div class="info-icon" style="margin-right: 15px; color: #007bff;">
                                        <i class="fas fa-user-tie"></i>
                                    </div>
                                    <div class="info-content" style="flex: 1;">
                                        <div class="info-label" style="font-size: 12px; color: #666; margin-bottom: 2px;">Postmaster</div>
                                        <div class="info-value" style="font-weight: 600;">${postOffice.postmaster || 'N/A'}</div>
                                    </div>
                                </div>

                                <div class="info-row" style="display: flex; align-items: center; margin-bottom: 10px; padding: 8px 0; border-bottom: 1px solid #f0f0f0;">
                                    <div class="info-icon" style="margin-right: 15px; color: #007bff;">
                                        <i class="fas fa-users"></i>
                                    </div>
                                    <div class="info-content" style="flex: 1;">
                                        <div class="info-label" style="font-size: 12px; color: #666; margin-bottom: 2px;">Employees</div>
                                        <div class="info-value" style="font-weight: 600;">${postOffice.employees || 'N/A'}</div>
                                    </div>
                                </div>

                                <div class="info-row" style="display: flex; align-items: center; margin-bottom: 10px; padding: 8px 0; border-bottom: 1px solid #f0f0f0;">
                                    <div class="info-icon" style="margin-right: 15px; color: #007bff;">
                                        <i class="fas fa-user-cog"></i>
                                    </div>
                                    <div class="info-content" style="flex: 1;">
                                        <div class="info-label" style="font-size: 12px; color: #666; margin-bottom: 2px;">No. Of Postal Teller</div>
                                        <div class="info-value" style="font-weight: 600;">${postOffice.noOfPostalTeller || 'N/A'}</div>
                                    </div>
                                </div>

                                <div class="info-row" style="display: flex; align-items: center; margin-bottom: 10px; padding: 8px 0;">
                                    <div class="info-icon" style="margin-right: 15px; color: #007bff;">
                                        <i class="fas fa-mail-bulk"></i>
                                    </div>
                                    <div class="info-content" style="flex: 1;">
                                        <div class="info-label" style="font-size: 12px; color: #666; margin-bottom: 2px;">No. Of Letter Carriers</div>
                                        <div class="info-value" style="font-weight: 600;">${postOffice.noOfLetterCarriers || 'N/A'}</div>
                                    </div>
                                </div>
                            </div>

                            <!-- Location Information -->
                            <div class="info-card" style="background: white; border-radius: 8px; padding: 20px; margin-bottom: 20px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                                <div class="card-header" style="font-size: 18px; font-weight: bold; margin-bottom: 15px; color: #28a745;">
                                    <i class="fas fa-map-marked-alt"></i> Location Information
                                </div>

                                <div class="info-row" style="display: flex; align-items: center; margin-bottom: 10px; padding: 8px 0; border-bottom: 1px solid #f0f0f0;">
                                    <div class="info-icon" style="margin-right: 15px; color: #28a745;">
                                        <i class="fas fa-map"></i>
                                    </div>
                                    <div class="info-content" style="flex: 1;">
                                        <div class="info-label" style="font-size: 12px; color: #666; margin-bottom: 2px;">Region</div>
                                        <div class="info-value" style="font-weight: 600;">${postOffice.region || 'N/A'}</div>
                                    </div>
                                </div>

                                <div class="info-row" style="display: flex; align-items: center; margin-bottom: 10px; padding: 8px 0; border-bottom: 1px solid #f0f0f0;">
                                    <div class="info-icon" style="margin-right: 15px; color: #28a745;">
                                        <i class="fas fa-map-pin"></i>
                                    </div>
                                    <div class="info-content" style="flex: 1;">
                                        <div class="info-label" style="font-size: 12px; color: #666; margin-bottom: 2px;">Province</div>
                                        <div class="info-value" style="font-weight: 600;">${postOffice.province || 'N/A'}</div>
                                    </div>
                                </div>

                                <div class="info-row" style="display: flex; align-items: center; margin-bottom: 10px; padding: 8px 0; border-bottom: 1px solid #f0f0f0;">
                                    <div class="info-icon" style="margin-right: 15px; color: #28a745;">
                                        <i class="fas fa-city"></i>
                                    </div>
                                    <div class="info-content" style="flex: 1;">
                                        <div class="info-label" style="font-size: 12px; color: #666; margin-bottom: 2px;">City</div>
                                        <div class="info-value" style="font-weight: 600;">${postOffice.city || 'N/A'}</div>
                                    </div>
                                </div>

                                <div class="info-row" style="display: flex; align-items: center; margin-bottom: 10px; padding: 8px 0; border-bottom: 1px solid #f0f0f0;">
                                    <div class="info-icon" style="margin-right: 15px; color: #28a745;">
                                        <i class="fas fa-map-marker-alt"></i>
                                    </div>
                                    <div class="info-content" style="flex: 1;">
                                        <div class="info-label" style="font-size: 12px; color: #666; margin-bottom: 2px;">Barangay</div>
                                        <div class="info-value" style="font-weight: 600;">${postOffice.barangay || 'N/A'}</div>
                                    </div>
                                </div>

                                <div class="info-row" style="display: flex; align-items: center; margin-bottom: 10px; padding: 8px 0; border-bottom: 1px solid #f0f0f0;">
                                    <div class="info-icon" style="margin-right: 15px; color: #28a745;">
                                        <i class="fas fa-mail-bulk"></i>
                                    </div>
                                    <div class="info-content" style="flex: 1;">
                                        <div class="info-label" style="font-size: 12px; color: #666; margin-bottom: 2px;">Zip Code</div>
                                        <div class="info-value" style="font-weight: 600;">${postOffice.zipCode || 'N/A'}</div>
                                    </div>
                                </div>

                                <div class="info-row" style="display: flex; align-items: center; margin-bottom: 10px; padding: 8px 0; border-bottom: 1px solid #f0f0f0;">
                                    <div class="info-icon" style="margin-right: 15px; color: #28a745;">
                                        <i class="fas fa-road"></i>
                                    </div>
                                    <div class="info-content" style="flex: 1;">
                                        <div class="info-label" style="font-size: 12px; color: #666; margin-bottom: 2px;">Address Line</div>
                                        <div class="info-value" style="font-weight: 600;">${postOffice.addressLine || 'N/A'}</div>
                                    </div>
                                </div>

                                <div class="info-row" style="display: flex; align-items: center; margin-bottom: 10px; padding: 8px 0; border-bottom: 1px solid #f0f0f0;">
                                    <div class="info-icon" style="margin-right: 15px; color: #28a745;">
                                        <i class="fas fa-globe"></i>
                                    </div>
                                    <div class="info-content" style="flex: 1;">
                                        <div class="info-label" style="font-size: 12px; color: #666; margin-bottom: 2px;">Latitude</div>
                                        <div class="info-value" style="font-weight: 600;">${postOffice.latitude || 'N/A'}</div>
                                    </div>
                                </div>

                                <div class="info-row" style="display: flex; align-items: center; margin-bottom: 10px; padding: 8px 0; border-bottom: 1px solid #f0f0f0;">
                                    <div class="info-icon" style="margin-right: 15px; color: #28a745;">
                                        <i class="fas fa-globe"></i>
                                    </div>
                                    <div class="info-content" style="flex: 1;">
                                        <div class="info-label" style="font-size: 12px; color: #666; margin-bottom: 2px;">Longitude</div>
                                        <div class="info-value" style="font-weight: 600;">${postOffice.longitude || 'N/A'}</div>
                                    </div>
                                </div>

                                <div class="info-row" style="display: flex; align-items: center; margin-bottom: 10px; padding: 8px 0;">
                                    <div class="info-icon" style="margin-right: 15px; color: #28a745;">
                                        <i class="fas fa-plug"></i>
                                    </div>
                                    <div class="info-content" style="flex: 1;">
                                        <div class="info-label" style="font-size: 12px; color: #666; margin-bottom: 2px;">Classification</div>
                                        <div class="info-value" style="font-weight: 600;">${postOffice.classification || 'N/A'}</div>
                                    </div>
                                </div>
                            </div>

                            <!-- Connectivity Information -->
                            <div class="info-card" style="background: white; border-radius: 8px; padding: 20px; margin-bottom: 20px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                                <div class="card-header" style="font-size: 18px; font-weight: bold; margin-bottom: 15px; color: #17a2b8;">
                                    <i class="fas fa-wifi"></i> Connectivity Information
                                </div>

                                <div class="info-row" style="display: flex; align-items: center; margin-bottom: 10px; padding: 8px 0; border-bottom: 1px solid #f0f0f0;">
                                    <div class="info-icon" style="margin-right: 15px; color: #17a2b8;">
                                        <i class="fas fa-signal"></i>
                                    </div>
                                    <div class="info-content" style="flex: 1;">
                                        <div class="info-label" style="font-size: 12px; color: #666; margin-bottom: 2px;">Connectivity Status</div>
                                        <div class="info-value" style="font-weight: 600;">
                                            <span class="badge ${(postOffice.connectivityStatus === 'Connected' || postOffice.connectivityStatus === 'Active') ? 'badge-success' : (postOffice.connectivityStatus === 'Disconnected' || postOffice.connectivityStatus === 'Inactive') ? 'badge-danger' : (postOffice.connectivityStatus === 'Pending' ? 'badge-warning' : (postOffice.connectivityStatus === 'Under Maintenance' ? 'badge-info' : 'badge-secondary'))}">
                                                ${postOffice.connectivityStatus || 'N/A'}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                <div class="info-row" style="display: flex; align-items: center; margin-bottom: 10px; padding: 8px 0; border-bottom: 1px solid #f0f0f0;">
                                    <div class="info-icon" style="margin-right: 15px; color: #17a2b8;">
                                        <i class="fas fa-network-wired"></i>
                                    </div>
                                    <div class="info-content" style="flex: 1;">
                                        <div class="info-label" style="font-size: 12px; color: #666; margin-bottom: 2px;">Internet Service Provider</div>
                                        <div class="info-value" style="font-weight: 600;">${postOffice.internetServiceProvider || 'N/A'}</div>
                                    </div>
                                </div>

                                <div class="info-row" style="display: flex; align-items: center; margin-bottom: 10px; padding: 8px 0; border-bottom: 1px solid #f0f0f0;">
                                    <div class="info-icon" style="margin-right: 15px; color: #17a2b8;">
                                        <i class="fas fa-ethernet"></i>
                                    </div>
                                    <div class="info-content" style="flex: 1;">
                                        <div class="info-label" style="font-size: 12px; color: #666; margin-bottom: 2px;">Type of Connection</div>
                                        <div class="info-value" style="font-weight: 600;">${postOffice.typeOfConnection || 'N/A'}</div>
                                    </div>
                                </div>

                                <div class="info-row" style="display: flex; align-items: center; margin-bottom: 10px; padding: 8px 0; border-bottom: 1px solid #f0f0f0;">
                                    <div class="info-icon" style="margin-right: 15px; color: #17a2b8;">
                                        <i class="fas fa-cable-car"></i>
                                    </div>
                                    <div class="info-content" style="flex: 1;">
                                        <div class="info-label" style="font-size: 12px; color: #666; margin-bottom: 2px;">Is Wired</div>
                                        <div class="info-value" style="font-weight: 600;">
                                            <span class="badge ${postOffice.isWired === 'Yes' ? 'badge-primary' : 'badge-secondary'}">
                                                ${postOffice.isWired || 'N/A'}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                <div class="info-row" style="display: flex; align-items: center; margin-bottom: 10px; padding: 8px 0; border-bottom: 1px solid #f0f0f0;">
                                    <div class="info-icon" style="margin-right: 15px; color: #17a2b8;">
                                        <i class="fas fa-share-alt"></i>
                                    </div>
                                    <div class="info-content" style="flex: 1;">
                                        <div class="info-label" style="font-size: 12px; color: #666; margin-bottom: 2px;">Is Shared</div>
                                        <div class="info-value" style="font-weight: 600;">
                                            <span class="badge ${postOffice.isShared === 'Yes' ? 'badge-warning' : 'badge-secondary'}">
                                                ${postOffice.isShared || 'N/A'}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                <div class="info-row" style="display: flex; align-items: center; margin-bottom: 10px; padding: 8px 0; border-bottom: 1px solid #f0f0f0;">
                                    <div class="info-icon" style="margin-right: 15px; color: #17a2b8;">
                                        <i class="fas fa-gift"></i>
                                    </div>
                                    <div class="info-content" style="flex: 1;">
                                        <div class="info-label" style="font-size: 12px; color: #666; margin-bottom: 2px;">Is Free</div>
                                        <div class="info-value" style="font-weight: 600;">
                                            <span class="badge ${postOffice.isFree === 'Yes' ? 'badge-success' : 'badge-secondary'}">
                                                ${postOffice.isFree || 'N/A'}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                <div class="info-row" style="display: flex; align-items: center; margin-bottom: 10px; padding: 8px 0; border-bottom: 1px solid #f0f0f0;">
                                    <div class="info-icon" style="margin-right: 15px; color: #17a2b8;">
                                        <i class="fas fa-tachometer-alt"></i>
                                    </div>
                                    <div class="info-content" style="flex: 1;">
                                        <div class="info-label" style="font-size: 12px; color: #666; margin-bottom: 2px;">Speed (Mbps)</div>
                                        <div class="info-value" style="font-weight: 600;">${formatSpeed(postOffice.speed)}</div>
                                    </div>
                                </div>

                                <div class="info-row" style="display: flex; align-items: center; margin-bottom: 10px; padding: 8px 0;">
                                    <div class="info-icon" style="margin-right: 15px; color: #17a2b8;">
                                        <i class="fas fa-server"></i>
                                    </div>
                                    <div class="info-content" style="flex: 1;">
                                        <div class="info-label" style="font-size: 12px; color: #666; margin-bottom: 2px;">Static IP Address</div>
                                        <div class="info-value" style="font-weight: 600;">${postOffice.staticIpAddress || 'N/A'}</div>
                                    </div>
                                </div>
                            </div>

                            <!-- Contact Information -->
                            <div class="info-card" style="background: white; border-radius: 8px; padding: 20px; margin-bottom: 20px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                                <div class="card-header" style="font-size: 18px; font-weight: bold; margin-bottom: 15px; color: #ffc107;">
                                    <i class="fas fa-phone"></i> Contact Information
                                </div>

                                <div class="info-row" style="display: flex; align-items: center; margin-bottom: 10px; padding: 8px 0; border-bottom: 1px solid #f0f0f0;">
                                    <div class="info-icon" style="margin-right: 15px; color: #ffc107;">
                                        <i class="fas fa-user"></i>
                                    </div>
                                    <div class="info-content" style="flex: 1;">
                                        <div class="info-label" style="font-size: 12px; color: #666; margin-bottom: 2px;">Postal Office Contact Person</div>
                                        <div class="info-value" style="font-weight: 600;">${postOffice.postalOfficeContactPerson || 'N/A'}</div>
                                    </div>
                                </div>

                                <div class="info-row" style="display: flex; align-items: center; margin-bottom: 10px; padding: 8px 0; border-bottom: 1px solid #f0f0f0;">
                                    <div class="info-icon" style="margin-right: 15px; color: #ffc107;">
                                        <i class="fas fa-phone"></i>
                                    </div>
                                    <div class="info-content" style="flex: 1;">
                                        <div class="info-label" style="font-size: 12px; color: #666; margin-bottom: 2px;">Postal Office Contact Number</div>
                                        <div class="info-value" style="font-weight: 600;">${postOffice.contactNumber || 'N/A'}</div>
                                    </div>
                                </div>

                                <div class="info-row" style="display: flex; align-items: center; margin-bottom: 10px; padding: 8px 0; border-bottom: 1px solid #f0f0f0;">
                                    <div class="info-icon" style="margin-right: 15px; color: #ffc107;">
                                        <i class="fas fa-user-tie"></i>
                                    </div>
                                    <div class="info-content" style="flex: 1;">
                                        <div class="info-label" style="font-size: 12px; color: #666; margin-bottom: 2px;">ISP Contact Person</div>
                                        <div class="info-value" style="font-weight: 600;">${postOffice.ispContactPerson || 'N/A'}</div>
                                    </div>
                                </div>

                                <div class="info-row" style="display: flex; align-items: center; margin-bottom: 10px; padding: 8px 0;">
                                    <div class="info-icon" style="margin-right: 15px; color: #ffc107;">
                                        <i class="fas fa-phone-alt"></i>
                                    </div>
                                    <div class="info-content" style="flex: 1;">
                                        <div class="info-label" style="font-size: 12px; color: #666; margin-bottom: 2px;">ISP Contact Number</div>
                                        <div class="info-value" style="font-weight: 600;">${postOffice.ispContactNumber || 'N/A'}</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-dismiss="modal">Close</button>
                        <button type="button" class="btn btn-primary" onclick="printModalContent()">
                            <i class="fas fa-print"></i> Print Details
                        </button>
                        <a href="/profile?name=${encodeURIComponent(postOffice.postalOffice)}" class="btn btn-info" target="_blank">
                            <i class="fas fa-external-link-alt"></i> View Full Profile
                        </a>
                    </div>
                </div>
            </div>
        </div>
    `;
}

// Function to print modal content
function printModalContent() {
    const modalContent = document.querySelector('#postOfficeDetailsModal .modal-body').innerHTML;
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>Post Office Details</title>
            <link rel="stylesheet" href="https://maxcdn.bootstrapcdn.com/bootstrap/4.0.0/css/bootstrap.min.css">
            <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/5.15.4/css/all.min.css">
            <style>
                body { padding: 20px; font-family: Arial, sans-serif; }
                .info-card { margin-bottom: 20px; page-break-inside: avoid; border: 1px solid #ddd; padding: 15px; }
                .card-header { font-size: 16px; font-weight: bold; margin-bottom: 10px; color: #007bff; }
                .info-row { margin-bottom: 8px; display: flex; align-items: center; }
                .info-icon { margin-right: 10px; color: #007bff; width: 20px; }
                .info-label { font-size: 12px; color: #666; margin-bottom: 2px; }
                .info-value { font-weight: 600; }
                .profile-name { font-size: 24px; font-weight: bold; text-align: center; margin-bottom: 20px; }
                .cover-photo { height: 150px; background-size: cover; background-position: center; margin-bottom: 20px; }
                .profile-picture { width: 80px; height: 80px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.2); }
                @media print {
                    .no-print { display: none; }
                    body { margin: 10mm; }
                }
            </style>
        </head>
        <body>
            ${modalContent}
        </body>
        </html>
    `);
    printWindow.document.close();
    printWindow.print();
}

// Duplicate generatePopupHTML function removed - using the enhanced one at line 675

function createAreaLegend() {
    const legendContainer = document.getElementById('areaLegend');
    if (!legendContainer) {
        // Retry after a short delay if element doesn't exist yet
        setTimeout(() => {
            const retryContainer = document.getElementById('areaLegend');
            if (retryContainer) {
                createAreaLegend();
            }
        }, 100);
        return;
    }
    
    legendContainer.innerHTML = '';
    
    // Add "Show All" option
    const showAllCol = document.createElement('div');
    showAllCol.className = 'col-12 mb-2';
    showAllCol.innerHTML = `
        <div class="d-flex align-items-center area-legend-item" style="cursor: pointer; padding: 6px; border-radius: 4px; transition: background-color 0.2s; border: 1px solid #dee2e6;" data-area="">
            <div style="width:20px;height:20px;background:#6c757d;border-radius:50%;border:2px solid #fff;box-shadow:0 0 0 1px rgba(0,0,0,0.1);margin-right:8px;"></div>
            <small style="font-weight:500;">Show All Areas</small>
        </div>
    `;
    
    // Add click event listener for "Show All"
    const showAllItem = showAllCol.querySelector('.area-legend-item');
    showAllItem.addEventListener('click', function() {
        const areaDropdown = document.getElementById('areaDropdown');
        
        if (areaDropdown) {
            areaDropdown.value = '';
            filterMarkers();
            updateLegendHighlight('');
        }
    });
    
    // Add hover effect for "Show All"
    showAllItem.addEventListener('mouseenter', function() {
        if (this.style.backgroundColor !== 'rgba(0,123,255,0.1)') {
            this.style.backgroundColor = 'rgba(0,0,0,0.05)';
        }
    });
    
    showAllItem.addEventListener('mouseleave', function() {
        if (this.style.backgroundColor !== 'rgba(0,123,255,0.1)') {
            this.style.backgroundColor = 'transparent';
        }
    });
    
    legendContainer.appendChild(showAllCol);
    
    // Add area options
    for (let i = 1; i <= 9; i++) {
        const areaKey = String(i);
        const color = areaColorMap[areaKey] || '#3388ff';
        const col = document.createElement('div');
        col.className = 'col-6 col-md-4 mb-2';
        col.innerHTML = `
            <div class="d-flex align-items-center area-legend-item" style="cursor: pointer; padding: 4px; border-radius: 4px; transition: background-color 0.2s;" data-area="${areaKey}">
                <div style="width:20px;height:20px;background:${color};border-radius:50%;border:2px solid #fff;box-shadow:0 0 0 1px rgba(0,0,0,0.1);margin-right:8px;"></div>
                <small style="font-weight:500;">Area ${i}</small>
            </div>
        `;
        
        // Add click event listener to filter markers by area
        const legendItem = col.querySelector('.area-legend-item');
        legendItem.addEventListener('click', function() {
            const areaValue = this.getAttribute('data-area');
            const areaDropdown = document.getElementById('areaDropdown');
            
            if (areaDropdown) {
                areaDropdown.value = areaValue;
                filterMarkers();
                updateLegendHighlight(areaValue);
                areaDropdown.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        });
        
        // Add hover effect
        legendItem.addEventListener('mouseenter', function() {
            if (this.style.backgroundColor !== 'rgba(0,123,255,0.1)') {
                this.style.backgroundColor = 'rgba(0,0,0,0.05)';
            }
        });
        
        legendItem.addEventListener('mouseleave', function() {
            if (this.style.backgroundColor !== 'rgba(0,123,255,0.1)') {
                this.style.backgroundColor = 'transparent';
            }
        });
        
        legendContainer.appendChild(col);
    }
    
    // Initial highlight based on dropdown selection
    const initialArea = document.getElementById('areaDropdown')?.value || '';
    updateLegendHighlight(initialArea);
}

// Function to update legend highlighting based on selected area
function updateLegendHighlight(selectedArea) {
    document.querySelectorAll('.area-legend-item').forEach(item => {
        const itemArea = item.getAttribute('data-area');
        if (itemArea === selectedArea) {
            item.style.backgroundColor = 'rgba(0,123,255,0.1)';
        } else {
            item.style.backgroundColor = 'transparent';
        }
    });
}

// Function to filter to show only a specific area
function showOnlyArea(areaNumber) {
    const areaDropdown = document.getElementById('areaDropdown');
    if (areaDropdown) {
        areaDropdown.value = areaNumber;
        filterMarkers();
        updateLegendHighlight(areaNumber);
        areaDropdown.scrollIntoView({ behavior: 'smooth', block: 'center' });
        console.log(`Showing only Area ${areaNumber} markers`);
    }
}

// Function to update marker popup content (optimized version)
function updateMarkerPopup(postOfficeId, updatedData) {
    if (!markers || markers.length === 0) {
        console.warn('No markers available to update');
        return;
    }
    
    const markerObj = markers.find(m => m.data.id === postOfficeId);
    if (!markerObj) {
        console.warn('Marker not found for post office:', postOfficeId);
        return;
    }
    
    // Update the marker data with new information
    if (updatedData) {
        Object.assign(markerObj.data, updatedData);
    }
    
    // Only regenerate popup if there are actual changes to display
    const popupContent = generatePopupHTML(markerObj.data);
    markerObj.marker.setPopupContent(popupContent);
    
    // If popup is open, refresh it to show updated content
    if (markerObj.marker.isPopupOpen()) {
        markerObj.marker.closePopup();
        setTimeout(() => {
            markerObj.marker.openPopup();
        }, 100);
    }
    
    console.log('Marker popup updated for post office:', postOfficeId);
}

// Function to refresh all markers from API (after edit)
function refreshMapMarkers() {
    if (!leafletMap || !leafletMapInitialized) {
        return;
    }
    
    // Remove all existing markers
    markers.forEach(({ marker }) => {
        if (leafletMap.hasLayer(marker)) {
            leafletMap.removeLayer(marker);
        }
    });
    markers = [];
    
    // Reload markers using filtered endpoint
    loadMapData();
}

// Global handler for Data Table menu click - shows loader before navigation
$(document).ready(function() {
    // Handle Data Table link click from any page
    $(document).on('click', '#show-data-table', function(e) {
        // Check if we're already on table page
        var currentPage = window.location.pathname;
        var isOnTablePage = currentPage.includes('/post-office/table');
        
        // Always show loading bars when clicking data table menu
        // Show page loader (full screen)
        if (typeof showPageLoader === 'function') {
            showPageLoader('Loading Data Table...');
        } else {
            // Fallback: create and show loader
            var loader = document.getElementById('pageLoader');
            if (loader) {
                var textEl = document.getElementById('loaderStatusText');
                if (textEl) {
                    textEl.textContent = 'Loading Data Table...';
                }
                loader.classList.remove('hidden');
            }
        }
        
        // If not on table page, navigate to it
        if (!isOnTablePage) {
            // Navigation will happen via href, loader will persist until page loads
        } else {
            // Already on table page - refresh
            e.preventDefault();
            // setTimeout(() => {
            //     location.reload(); // Commented out to prevent auto-refresh
            // }, 100);
            console.log('Already on table page - auto-refresh disabled');
        }
    });

    // Handle MAP link click from any page
    $(document).on('click', '#show-map', function(e) {
        // Check if we're already on map page
        var currentPage = window.location.pathname;
        var isOnMapPage = currentPage.includes('/map');
        
        // Always show loading bars when clicking map menu
        // Show page loader (full screen)
        if (typeof showPageLoader === 'function') {
            showPageLoader('Loading Map...');
        } else {
            // Fallback: create and show loader
            var loader = document.getElementById('pageLoader');
            if (loader) {
                var textEl = document.getElementById('loaderStatusText');
                if (textEl) {
                    textEl.textContent = 'Loading Map...';
                }
                loader.classList.remove('hidden');
            }
        }
        
        // If not on map page, navigate to it
        if (!isOnMapPage) {
            // Navigation will happen via href, loader will persist until page loads
        } else {
            // Already on map page - refresh
            e.preventDefault();
            console.log('Already on map page');
        }
    });

    // Handle QUARTERS link click from any page
    $(document).on('click', '#show-quarters', function(e) {
        // Check if we're already on quarters page
        var currentPage = window.location.pathname;
        var isOnQuartersPage = currentPage.includes('/quarters');
        
        // Always show loading bars when clicking quarters menu
        // Show page loader (full screen)
        if (typeof showPageLoader === 'function') {
            showPageLoader('Loading Quarters...');
        } else {
            // Fallback: create and show loader
            var loader = document.getElementById('pageLoader');
            if (loader) {
                var textEl = document.getElementById('loaderStatusText');
                if (textEl) {
                    textEl.textContent = 'Loading Quarters...';
                }
                loader.classList.remove('hidden');
            }
        }
        
        // If not on quarters page, navigate to it
        if (!isOnQuartersPage) {
            // Navigation will happen via href, loader will persist until page loads
        } else {
            // Already on quarters page - refresh
            e.preventDefault();
            console.log('Already on quarters page');
        }
    });
});

// Fallback: Hide loader after maximum wait time
setTimeout(function() {
    hidePageLoader();
}, 5000);

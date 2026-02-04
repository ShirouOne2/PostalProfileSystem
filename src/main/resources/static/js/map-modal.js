// Map Modal JavaScript
let leafletMap;
let markers = [];
let mapData = [];

// Initialize map when page loads
$(document).ready(function() {
    initializeMap();
    loadMapData();
});

function initializeMap() {
    // Initialize Leaflet map
    leafletMap = L.map('leafletMap').setView([12.8797, 121.7740], 6); // Philippines center

    // Add tile layer
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors'
    }).addTo(leafletMap);
}

function loadMapData() {
    // Show loading
    Swal.showLoading();
    
    fetch('/dashboard/api/map-data')
        .then(response => response.json())
        .then(data => {
            mapData = data;
            addMarkersToMap();
            populateOfficeList();
            populateAreaDropdown();
            createAreaLegend();
            Swal.close();
        })
        .catch(error => {
            console.error('Error loading map data:', error);
            Swal.close();
            Swal.fire('Error', 'Failed to load map data', 'error');
        });
}

function addMarkersToMap() {
    // Clear existing markers
    markers.forEach(marker => leafletMap.removeLayer(marker));
    markers = [];

    // Color palette for areas
    const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD', '#98D8C8', '#F7DC6F'];
    const areaColors = {};
    
    mapData.forEach((office, index) => {
        if (!areaColors[office.area]) {
            areaColors[office.area] = colors[Object.keys(areaColors).length % colors.length];
        }
    });

    mapData.forEach(office => {
        if (office.latitude && office.longitude) {
            const color = areaColors[office.area] || '#667eea';
            
            // Create custom icon
            const icon = L.divIcon({
                html: `<div class="custom-marker-icon" style="background: ${color};"></div>`,
                iconSize: [12, 12],
                className: 'custom-marker'
            });

            const marker = L.marker([office.latitude, office.longitude], { icon: icon })
                .addTo(leafletMap)
                .bindPopup(`
                    <div class="popup-content">
                        <h6>${office.name}</h6>
                        <p><strong>Area:</strong> ${office.area}</p>
                        <p><strong>Address:</strong> ${office.address}</p>
                        <p><strong>City:</strong> ${office.city}</p>
                        <p><strong>Status:</strong> <span class="badge badge-${(office.connectivityStatus === 'Connected' || office.connectivityStatus === 'Active') ? 'success' : (office.connectivityStatus === 'Disconnected' || office.connectivityStatus === 'Inactive') ? 'danger' : (office.connectivityStatus === 'Pending' ? 'warning' : (office.connectivityStatus === 'Under Maintenance' ? 'info' : 'secondary'))}">${office.connectivityStatus}</span></p>
                        <p><strong>Contact:</strong> ${office.contactPerson}</p>
                        <p><strong>Phone:</strong> ${office.contactNumber}</p>
                        <button class="btn btn-sm btn-primary" onclick="showProfile(${office.id})">
                            <i class="fas fa-user-circle"></i> View Profile
                        </button>
                    </div>
                `);
            
            markers.push(marker);
        }
    });

    // Fit map to show all markers
    if (markers.length > 0) {
        const group = new L.featureGroup(markers);
        leafletMap.fitBounds(group.getBounds().pad(0.1));
    }
}

function populateOfficeList() {
    const officeList = document.getElementById('officeList');
    officeList.innerHTML = '';
    
    mapData.forEach(office => {
        const option = document.createElement('option');
        option.value = office.name;
        option.textContent = `${office.name} - ${office.area}`;
        officeList.appendChild(option);
    });
}

function populateAreaDropdown() {
    const areas = [...new Set(mapData.map(office => office.area))];
    const areaDropdown = document.getElementById('areaDropdown');
    
    areas.forEach(area => {
        const option = document.createElement('option');
        option.value = area;
        option.textContent = area;
        areaDropdown.appendChild(option);
    });
    
    // Show area filter if there are areas
    if (areas.length > 0) {
        document.getElementById('areaFilterContainer').style.display = 'block';
    }
}

function createAreaLegend() {
    const areas = [...new Set(mapData.map(office => office.area))];
    const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD', '#98D8C8', '#F7DC6F'];
    
    const legendHtml = areas.map((area, index) => `
        <div class="col-md-3 col-sm-6 mb-2">
            <div class="d-flex align-items-center">
                <div class="area-legend-color" style="background: ${colors[index % colors.length]};"></div>
                <small>${area}</small>
            </div>
        </div>
    `).join('');
    
    document.getElementById('areaLegend').innerHTML = legendHtml;
}

function showProfile(officeId) {
    fetch(`/dashboard/api/post-office/${officeId}`)
        .then(response => response.json())
        .then(office => {
            // Helper function to get correct image path
            const getImagePath = (imagePath, isProfile = false) => {
                if (!imagePath || imagePath === 'no-image.png') return '/images/no-image.png';
                // Handle both old format (filename only) and new format (covers/filename or profiles/filename)
                if (imagePath.includes('/')) {
                    return `/uploads/${imagePath}`;
                } else {
                    // Use appropriate subdirectory based on image type
                    const subdirectory = isProfile ? 'profiles' : 'covers';
                    return `/uploads/${subdirectory}/${imagePath}`;
                }
            };
            
            const profileContent = `
                <div class="container-fluid">
                    <div class="row">
                        <div class="col-md-4">
                            <div class="text-center p-3">
                                ${office.imagePath ? 
                                    `<img src="${getImagePath(office.imagePath, true)}" class="img-fluid rounded" alt="${office.postalOffice}">` : 
                                    `<div class="bg-secondary rounded d-flex align-items-center justify-content-center profile-image-placeholder">
                                        <i class="fas fa-building fa-3x text-white"></i>
                                    </div>`
                                }
                                <h5 class="mt-3">${office.postalOffice}</h5>
                                <p class="text-muted">${office.area}</p>
                            </div>
                        </div>
                        <div class="col-md-8">
                            <div class="p-3">
                                <h6>Basic Information</h6>
                                <table class="table table-sm">
                                    <tr><td><strong>Area:</strong></td><td>${office.area}</td></tr>
                                    <tr><td><strong>Region:</strong></td><td>${office.region || 'N/A'}</td></tr>
                                    <tr><td><strong>Province:</strong></td><td>${office.province || 'N/A'}</td></tr>
                                    <tr><td><strong>City:</strong></td><td>${office.city || 'N/A'}</td></tr>
                                    <tr><td><strong>Barangay:</strong></td><td>${office.barangay || 'N/A'}</td></tr>
                                    <tr><td><strong>ZIP Code:</strong></td><td>${office.zipCode || 'N/A'}</td></tr>
                                    <tr><td><strong>Address:</strong></td><td>${office.addressLine}</td></tr>
                                </table>
                                
                                <h6>Contact Information</h6>
                                <table class="table table-sm">
                                    <tr><td><strong>Contact Person:</strong></td><td>${office.postalOfficeContactPerson || 'N/A'}</td></tr>
                                    <tr><td><strong>Contact Number:</strong></td><td>${office.contactNumber || 'N/A'}</td></tr>
                                    <tr><td><strong>Postmaster:</strong></td><td>${office.postmaster || 'N/A'}</td></tr>
                                    <tr><td><strong>Employees:</strong></td><td>${office.employees || 'N/A'}</td></tr>
                                </table>
                                
                                <h6>Connectivity Information</h6>
                                <table class="table table-sm">
                                    <tr><td><strong>Status:</strong></td><td><span class="badge badge-${(office.connectivityStatus === 'Connected' || office.connectivityStatus === 'Active') ? 'success' : (office.connectivityStatus === 'Disconnected' || office.connectivityStatus === 'Inactive') ? 'danger' : (office.connectivityStatus === 'Pending' ? 'warning' : (office.connectivityStatus === 'Under Maintenance' ? 'info' : 'secondary'))}">${office.connectivityStatus || 'N/A'}</span></td></tr>
                                    <tr><td><strong>ISP:</strong></td><td>${office.internetServiceProvider || 'N/A'}</td></tr>
                                    <tr><td><strong>Speed:</strong></td><td>${office.speed || 'N/A'}</td></tr>
                                    <tr><td><strong>Static IP:</strong></td><td>${office.staticIpAddress || 'N/A'}</td></tr>
                                </table>
                                
                                ${office.latitude && office.longitude ? `
                                <h6>Location</h6>
                                <p><strong>Coordinates:</strong> ${office.latitude}, ${office.longitude}</p>
                                ` : ''}
                            </div>
                        </div>
                    </div>
                </div>
            `;
            
            document.getElementById('profileContent').innerHTML = profileContent;
            $('#profileModal').modal('show');
        })
        .catch(error => {
            console.error('Error loading profile:', error);
            Swal.fire('Error', 'Failed to load profile', 'error');
        });
}

// Event listeners
document.getElementById('officeInput').addEventListener('input', function() {
    const searchValue = this.value.toLowerCase();
    const matchingOffice = mapData.find(office => 
        office.name.toLowerCase().includes(searchValue)
    );
    
    if (matchingOffice && matchingOffice.latitude && matchingOffice.longitude) {
        leafletMap.setView([matchingOffice.latitude, matchingOffice.longitude], 12);
        
        // Open the popup for the matching office
        markers.forEach((marker, index) => {
            const office = mapData[index];
            if (office.id === matchingOffice.id) {
                marker.openPopup();
            }
        });
    }
});

document.getElementById('searchInput').addEventListener('input', function() {
    const searchValue = this.value.toLowerCase();
    let visibleMarkers = [];
    let visibleOffices = [];
    
    markers.forEach((marker, index) => {
        const office = mapData[index];
        const matches = office.name.toLowerCase().includes(searchValue) ||
                        office.area.toLowerCase().includes(searchValue) ||
                        (office.address && office.address.toLowerCase().includes(searchValue));
        
        if (matches) {
            marker.addTo(leafletMap);
            visibleMarkers.push(marker);
            visibleOffices.push(office);
        } else {
            leafletMap.removeLayer(marker);
        }
    });
    
    // Auto-open popup if there's search text
    if (searchValue && visibleMarkers.length > 0) {
        // Check for exact match first
        let exactMatchIndex = visibleOffices.findIndex(office => 
            office.name.toLowerCase() === searchValue
        );
        
        // If exact match found, open its popup and center map
        if (exactMatchIndex !== -1) {
            const exactOffice = visibleOffices[exactMatchIndex];
            visibleMarkers[exactMatchIndex].openPopup();
            if (exactOffice.latitude && exactOffice.longitude) {
                leafletMap.setView([exactOffice.latitude, exactOffice.longitude], 15);
            }
        }
        // If only one result and it contains the search text, open its popup
        else if (visibleMarkers.length === 1) {
            visibleMarkers[0].openPopup();
            const singleOffice = visibleOffices[0];
            if (singleOffice.latitude && singleOffice.longitude) {
                leafletMap.setView([singleOffice.latitude, singleOffice.longitude], 15);
            }
        }
    }
});

document.getElementById('areaDropdown').addEventListener('change', function() {
    const selectedArea = this.value;
    
    markers.forEach((marker, index) => {
        const office = mapData[index];
        const matches = !selectedArea || office.area === selectedArea;
        
        if (matches) {
            marker.addTo(leafletMap);
        } else {
            leafletMap.removeLayer(marker);
        }
    });
});

// Utility functions
function showLoading() {
    Swal.showLoading();
}

function hideLoading() {
    Swal.close();
}

function showError(message) {
    Swal.fire('Error', message, 'error');
}

function showSuccess(message) {
    Swal.fire('Success', message, 'success');
}

// Export functions for external use
window.mapModalFunctions = {
    showProfile: showProfile,
    loadMapData: loadMapData,
    initializeMap: initializeMap
};

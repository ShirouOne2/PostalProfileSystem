let postOfficeTable;
let leafletMap;
let markers = [];

// Fallback showProfileModal function if not already defined
if (typeof showProfileModal === 'undefined') {
    function showProfileModal(postOfficeId) {
        console.log('showProfileModal called with ID:', postOfficeId);
        
        // Check if modal elements exist
        if ($('#profileViewModal').length === 0) {
            console.warn('Profile modal not found in DOM');
            Swal.fire({
                icon: 'warning',
                title: 'Profile View',
                text: 'Profile view is not available on this page. Please navigate to the main table to view profiles.',
                confirmButtonColor: '#3085d6'
            });
            return;
        }
        
        // Call the original function if it exists, or implement basic functionality
        if (typeof window.showProfileModal === 'function') {
            window.showProfileModal(postOfficeId);
        } else {
            // Basic implementation
            Swal.fire({
                icon: 'info',
                title: 'Profile View',
                text: `Loading profile for Post Office ID: ${postOfficeId}`,
                confirmButtonColor: '#3085d6'
            });
        }
    }
}

$(document).ready(function() {
    initializeDataTable();
    setupEventListeners();
    initializeMap();
    readURLParameters();
    
    // Don't auto-select current quarter - keep "All Quarters" as default
    // if (!$('#quarterFilter').val()) {
    //     const currentQuarter = getCurrentQuarter();
    //     $('#quarterFilter').val(currentQuarter);
    //     console.log('Auto-selected current quarter:', currentQuarter);
    // }
});

function readURLParameters() {
    const urlParams = new URLSearchParams(window.location.search);
    
    // Set year from URL or default to current year
    const year = urlParams.get('year');
    if (year) {
        $('#yearSelector').val(year);
    }
    
    // Set area filter from URL
    const areaFilter = urlParams.get('areaFilter');
    if (areaFilter) {
        $('#areaFilter').val(areaFilter);
    }
    
    // Set quarter filter from URL
    const quarterFilter = urlParams.get('quarterFilter');
    if (quarterFilter) {
        $('#quarterFilter').val(quarterFilter);
    }
    
    // Set status filter from URL
    const statusFilter = urlParams.get('statusFilter');
    if (statusFilter) {
        $('#statusFilter').val(statusFilter);
    }
}

function initializeDataTable() {
    postOfficeTable = $('#postOfficeTable').DataTable({
        responsive: true,
        pageLength: 25,
        lengthMenu: [[10, 25, 50, 100, -1], [10, 25, 50, 100, "All"]],
        ordering: true,
        searching: true,
        info: true,
        autoWidth: false,
        columnDefs: [{
            targets: '_all',
            defaultContent: '-'
        }],
        language: {
            search: "Search:",
            lengthMenu: "Show _MENU_ entries",
            info: "Showing _START_ to _END_ of _TOTAL_ entries",
            emptyTable: "NO RECORDS FOUND MATCHING YOUR SEARCH.",
            paginate: {
                first: "First",
                last: "Last",
                next: "Next",
                previous: "Previous"
            }
        },
        ajax: {
            url: '/quarters/api/post-offices',
            data: function(d) {
                d.year = $('#yearSelector').val();
                d.quarterFilter = $('#quarterFilter').val();
                d.statusFilter = $('#statusFilter').val();
                d.areaFilter = $('#areaFilter').val(); // Use areaFilter to match controller parameter
                try {
                    console.log('Sending AJAX request with data:', d);
                } catch (e) {
                    console.log('Error logging AJAX data:', e.message);
                }
                return d;
            },
            dataSrc: function(json) {
                try {
                    console.log('Received response:', json);
                    if (json && json.success === false) {
                        console.error('API Error:', json.error);
                        // Show error message to user
                        if (typeof Swal !== 'undefined') {
                            Swal.fire({
                                icon: 'error',
                                title: 'Data Loading Error',
                                text: json.error || 'Failed to load post offices data'
                            });
                        }
                        return []; // Return empty array to prevent DataTables error
                    }
                } catch (e) {
                    console.log('Error logging DataTables response:', e.message);
                }
                return json.data || [];
            },
            error: function(xhr, status, error) {
                console.error('AJAX Error:', status, error);
                console.error('Response Text:', xhr.responseText);
                if (typeof Swal !== 'undefined') {
                    Swal.fire({
                        icon: 'error',
                        title: 'Network Error',
                        text: 'Failed to load post offices data. Please check your connection and try again.'
                    });
                }
            }
        },
        columns: [
            { 
                data: null,
                render: function(data, type, row, meta) {
                    return meta.row + 1;
                }
            },
            { data: 'area' },
            { data: 'postalOffice' },
            { data: 'province' },
            { 
                data: 'dateConnected',
                render: function(data) {
                    return data ? new Date(data).toLocaleDateString() : '-';
                }
            },
            { 
                data: 'dateNotConnected',
                render: function(data) {
                    return data ? new Date(data).toLocaleDateString() : '-';
                }
            },
            { data: 'speed' },
            { 
                data: 'connectivityStatus',
                render: function(data) {
                    if (!data) return '<span class="badge badge-secondary">Unknown</span>';
                    
                    const status = data.toLowerCase().trim();
                    let badgeClass = 'badge-secondary'; // default
                    let displayText = data;
                    
                    if (status === 'connected' || status === 'active') {
                        badgeClass = 'badge-success';
                    } else if (status === 'disconnected' || status === 'inactive') {
                        badgeClass = 'badge-danger';
                    } else if (status === 'pending') {
                        badgeClass = 'badge-warning';
                    } else if (status === 'under maintenance') {
                        badgeClass = 'badge-info';
                    }
                    
                    return '<span class="badge ' + badgeClass + '">' + displayText + '</span>';
                }
            },
            { data: 'remarks' },
            {
                data: null,
                render: function(data, type, row) {
                    return `
                        <button class="btn btn-sm btn-primary" onclick="editPostOffice(${row.id})">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn btn-sm btn-info" onclick="showProfileModal(${row.id})">
                            <i class="fas fa-eye"></i>
                        </button>
                    `;
                }
            }
        ]
    });
}

function setupEventListeners() {
    // Area filter change
    $('#areaFilter').on('change', function() {
        console.log('Area filter changed to:', $(this).val());
        updateURL();
        reloadTable();
    });

    // Year selector change
    $('#yearSelector').on('change', function() {
        updateURL();
        reloadTable();
    });

    // Quarter filter change
    $('#quarterFilter').on('change', function() {
        const selectedQuarter = $(this).val();
        console.log('Quarter filter changed to:', selectedQuarter);
        
        // Add visual indicator
        if (selectedQuarter) {
            $(this).addClass('border-success');
        } else {
            $(this).removeClass('border-success');
        }
        
        updateURL();
        reloadTable();
    });

    // Status filter change
    $('#statusFilter').on('change', function() {
        updateURL();
        reloadTable();
    });

    // Clickable summary cards
    $('.clickable-card').on('click', function() {
        const filter = $(this).data('filter');
        const year = $(this).data('year');
        const quarterFilter = $(this).data('quarter') || $('#quarterFilter').val();
        
        // Update filters
        if (filter === 'connected') {
            $('#statusFilter').val('active');
        } else if (filter === 'disconnected') {
            $('#statusFilter').val('inactive');
        } else {
            $('#statusFilter').val('');
        }
        
        if (quarterFilter) {
            $('#quarterFilter').val(quarterFilter);
        }
        
        $('#yearSelector').val(year);
        
        updateURL();
        reloadTable();
        
        // Scroll to table
        $('html, body').animate({
            scrollTop: $('#dataTableSection').offset().top - 100
        }, 500);
    });

    // Manual update button
    $('#manualUpdateBtn').on('click', function() {
        const btn = $(this);
        const originalHtml = btn.html();
        btn.prop('disabled', true).html('<i class="fas fa-spinner fa-spin"></i> Updating...');
        
        const currentYear = $('#yearSelector').val();
        
        $.ajax({
            url: '/quarters/api/manual-update',
            method: 'POST',
            data: {
                year: currentYear
            },
            dataType: 'json',
            contentType: 'application/x-www-form-urlencoded',
            success: function(response) {
                try {
                    console.log('Response received:', response);
                    console.log('Response type:', typeof response);
                    console.log('Response success field:', response ? response.success : 'undefined');
                } catch (e) {
                    console.log('Error logging response:', e.message);
                }
                
                // Check if response is a string and try to parse it as JSON
                if (typeof response === 'string') {
                    try {
                        response = JSON.parse(response);
                        try {
                            console.log('Parsed JSON response:', response);
                        } catch (logError) {
                            console.log('Error logging parsed response:', logError.message);
                        }
                    } catch (e) {
                        console.error('Failed to parse JSON response:', e);
                        Swal.fire({
                            icon: 'error',
                            title: 'Invalid Response!',
                            text: 'Server returned an invalid response format'
                        });
                        btn.prop('disabled', false).html(originalHtml);
                        return;
                    }
                }
                
                if (response && response.success) {
                    Swal.fire({
                        icon: 'success',
                        title: 'Success!',
                        text: response.message,
                        timer: 2000,
                        showConfirmButton: false
                    }).then(function() {
                        location.reload();
                    });
                } else {
                    Swal.fire({
                        icon: 'error',
                        title: 'Error!',
                        text: response ? response.error : 'Failed to update quarters'
                    });
                    btn.prop('disabled', false).html(originalHtml);
                }
            },
            error: function(xhr, status, error) {
                console.error('AJAX Error:', status, error);
                console.error('Response text:', xhr.responseText);
                Swal.fire({
                    icon: 'error',
                    title: 'Error!',
                    text: 'Failed to update quarters. Please try again.'
                });
                btn.prop('disabled', false).html(originalHtml);
            }
        });
    });

    // Hover effect for clickable cards
    $('.clickable-card').on('mouseenter', function() {
        $(this).css('transform', 'scale(1.05)');
    }).on('mouseleave', function() {
        $(this).css('transform', 'scale(1)');
    });
}

function reloadTable() {
    if (postOfficeTable) {
        postOfficeTable.ajax.reload();
    }
}

function updateURL() {
    const year = $('#yearSelector').val();
    const areaFilter = $('#areaFilter').val();
    const quarterFilter = $('#quarterFilter').val();
    const statusFilter = $('#statusFilter').val();
    
    let url = '/quarters?year=' + encodeURIComponent(year);
    
    if (areaFilter) {
        url += '&areaFilter=' + encodeURIComponent(areaFilter);
    }
    if (quarterFilter) {
        url += '&quarterFilter=' + encodeURIComponent(quarterFilter);
    }
    if (statusFilter) {
        url += '&statusFilter=' + encodeURIComponent(statusFilter);
    }
    
    // Update browser URL without reloading page
    history.replaceState(null, '', url);
}

function getCurrentQuarter() {
    const now = new Date();
    const month = now.getMonth() + 1;
    if (month >= 1 && month <= 3) return 'Q1';
    if (month >= 4 && month <= 6) return 'Q2';
    if (month >= 7 && month <= 9) return 'Q3';
    return 'Q4';
}

function initializeMap() {
    // Initialize map when modal is shown
    $('#mapmodal').on('shown.bs.modal', function() {
        if (!leafletMap) {
            leafletMap = L.map('leafletMap').setView([12.8797, 121.7740], 6);
            
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '© OpenStreetMap contributors'
            }).addTo(leafletMap);
            
            loadMapData();
            setupMapControls();
        } else {
            // Resize map if already initialized
            setTimeout(() => {
                leafletMap.invalidateSize();
            }, 300);
        }
    });
}

function setupMapControls() {
    // Load areas dynamically from server
    $.get('/post-office/areas', function(areas) {
        const areaDropdown = $('#areaDropdown');
        areaDropdown.empty();
        areaDropdown.append('<option value="">-- Show All Areas --</option>');
        
        areas.forEach(area => {
            areaDropdown.append(`<option value="${area}">${area}</option>`);
        });
    }).fail(function() {
        // Fallback to hardcoded areas if request fails
        const areas = ["Area 1", "Area 2", "Area 3", "Area 4", "Area 5", "Area 6", "Area 7", "Area 8", "Area 9"];
        const areaDropdown = $('#areaDropdown');
        areaDropdown.empty();
        areaDropdown.append('<option value="">-- Show All Areas --</option>');
        
        areas.forEach(area => {
            areaDropdown.append(`<option value="${area}">${area}</option>`);
        });
    });
    
    // Area dropdown change handler
    $('#areaDropdown').on('change', function() {
        filterMarkers();
        
        // Update radio button to match dropdown selection
        const selectedArea = $(this).val();
        if (selectedArea === '') {
            $('#showAllAreas').prop('checked', true);
        } else {
            // Uncheck show all areas
            $('#showAllAreas').prop('checked', false);
        }
    });
    
    // Radio button change handler (using event delegation for dynamically created elements)
    $(document).on('change', 'input[name="areaFilterRadio"]', function() {
        const selectedValue = $(this).val();
        $('#areaDropdown').val(selectedValue);
        filterMarkers();
    });
    
    // Search input handler
    $('#officeInput').on('input', function() {
        filterMarkers();
    });
}

// Function to go to data table
function goToDataTable() {
    // Close the map modal
    $('#mapmodal').modal('hide');
    
    // Scroll to the data table section
    $('html, body').animate({
        scrollTop: $('#dataTableSection').offset().top - 100
    }, 500);
    
    // Optionally highlight the table
    $('#dataTableSection').addClass('border border-primary border-3');
    setTimeout(() => {
        $('#dataTableSection').removeClass('border border-primary border-3');
    }, 2000);
}

function filterMarkers() {
    const selectedArea = $('#areaDropdown').val();
    const searchText = $('#officeInput').val().toLowerCase();
    
    let visibleMarkers = [];
    
    markers.forEach(markerObj => {
        const marker = markerObj.marker;
        const office = markerObj.data;
        
        let showMarker = true;
        
        // Filter by area
        if (selectedArea && office.area !== selectedArea) {
            showMarker = false;
        }
        
        // Filter by search text
        if (searchText && !office.postalOffice.toLowerCase().includes(searchText)) {
            showMarker = false;
        }
        
        if (showMarker) {
            marker.addTo(leafletMap);
            visibleMarkers.push(markerObj);
        } else {
            leafletMap.removeLayer(marker);
        }
    });
    
    // Auto-open popup if there's search text
    if (searchText && visibleMarkers.length > 0) {
        // Check for exact match first
        let exactMatch = visibleMarkers.find(markerObj => 
            markerObj.data.postalOffice.toLowerCase() === searchText
        );
        
        // If exact match found, open its popup and center map
        if (exactMatch) {
            exactMatch.marker.openPopup();
            leafletMap.setView([exactMatch.data.latitude, exactMatch.data.longitude], 15);
        }
        // If only one result and it contains the search text, open its popup
        else if (visibleMarkers.length === 1) {
            visibleMarkers[0].marker.openPopup();
            leafletMap.setView([visibleMarkers[0].data.latitude, visibleMarkers[0].data.longitude], 15);
        }
    }
}

function loadMapData() {
    const areaFilter = $('#areaFilter').val();
    const statusFilter = $('#statusFilter').val();
    
    $.ajax({
        url: '/quarters/api/map-data',
        data: {
            areaFilter: areaFilter,
            statusFilter: statusFilter
        },
        success: function(response) {
            console.log('Map data response:', response);
            
            if (response.success && response.data) {
                addMarkersToMap(response.data);
            } else {
                console.error('Failed to load map data:', response.error || 'Unknown error');
            }
        },
        error: function(xhr, status, error) {
            console.error('AJAX error loading map data:', error);
            console.error('Response:', xhr.responseText);
        }
    });
}

function refreshMapData() {
    console.log('Refreshing map data...');
    loadMapData();
}

function updateSingleMarker(postOfficeId, updatedData) {
    // Find and update the specific marker
    const markerToUpdate = markers.find(m => m.data.id === postOfficeId);
    
    if (markerToUpdate) {
        console.log('Updating marker for post office:', postOfficeId);
        
        // Update the data
        markerToUpdate.data = { ...markerToUpdate.data, ...updatedData };
        
        // Helper function to get correct image path
        const getImagePath = (imagePath) => {
            if (!imagePath || imagePath === 'no-image.png') return '/images/no-image.png';
            // Handle both old format (filename only) and new format (covers/filename or profiles/filename)
            const fullPath = imagePath.includes('/') ? imagePath : `covers/${imagePath}`;
            return `/uploads/${fullPath}`;
        };
        
        // Update the popup content
        const areaColor = getAreaColor(markerToUpdate.data.area);
        const coverPhotoSrc = getImagePath(updatedData.coverPhotoPath || updatedData.imagePath || markerToUpdate.data.coverPhotoPath || markerToUpdate.data.imagePath);
        
        markerToUpdate.marker.setPopupContent(`
            <div style="min-width: 300px; max-width: 350px;">
                <!-- Cover Photo -->
                <div class="popup-cover-photo">
                    <img src="${coverPhotoSrc}" 
                         alt="${updatedData.postalOffice || markerToUpdate.data.postalOffice} Cover Photo"
                         onerror="this.style.display='none'; this.parentElement.style.background='linear-gradient(135deg, #667eea 0%, #764ba2 100%)';">
                </div>
                
                <!-- Office Info -->
                <div style="padding: 15px; background: white; border-radius: 0 0 8px 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
                    <!-- Office Name and Area -->
                    <div style="margin-bottom: 12px;">
                        <h6 style="margin: 0; font-size: 16px; font-weight: 600; color: #2c3e50; margin-bottom: 5px;">${updatedData.postalOffice || markerToUpdate.data.postalOffice}</h6>
                        <span style="display: inline-block; padding: 2px 8px; background: ${areaColor}; color: white; font-size: 11px; border-radius: 12px;">
                            ${updatedData.area || markerToUpdate.data.area || 'Unknown Area'}
                        </span>
                    </div>
                    
                    <!-- Quick Info -->
                    <div style="font-size: 13px; color: #555; line-height: 1.4;">
                        <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
                            <span><strong>Status:</strong></span>
                            <span class="badge badge-${(updatedData.connectivityStatus === 'Connected' || updatedData.connectivityStatus === 'Active') ? 'success' : (updatedData.connectivityStatus === 'Disconnected' || updatedData.connectivityStatus === 'Inactive') ? 'danger' : (updatedData.connectivityStatus === 'Pending' ? 'warning' : 'secondary')}" style="font-size: 11px;">
                                ${updatedData.connectivityStatus || markerToUpdate.data.connectivityStatus || 'Unknown'}
                            </span>
                        </div>
                        <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
                            <span><strong>Postmaster:</strong></span>
                            <span>${updatedData.postmaster || markerToUpdate.data.postmaster || 'N/A'}</span>
                        </div>
                        <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
                            <span><strong>Employees:</strong></span>
                            <span>${updatedData.employees || markerToUpdate.data.employees || 'N/A'}</span>
                        </div>
                        <div style="margin-bottom: 8px;">
                            <strong>Address:</strong><br>
                            <span style="color: #777;">${updatedData.address || markerToUpdate.data.address || 'N/A'}</span>
                        </div>
                    </div>
                    
                    <!-- Action Buttons -->
                    <div style="display: flex; gap: 8px; margin-top: 12px;">
                        <button onclick="showProfileModal(${postOfficeId})" 
                                class="btn btn-sm btn-primary" 
                                style="flex: 1; font-size: 12px; padding: 4px 8px;">
                            <i class="fas fa-eye"></i> View Profile
                        </button>
                        <button onclick="editPostOffice(${postOfficeId})" 
                                class="btn btn-sm btn-outline-secondary" 
                                style="flex: 1; font-size: 12px; padding: 4px 8px;">
                            <i class="fas fa-edit"></i> Edit
                        </button>
                    </div>
                </div>
            </div>
        `);
        
        console.log('Marker updated successfully');
        
        // Also update profile modal if it's open
        if (typeof updateProfileModalIfOpen === 'function') {
            updateProfileModalIfOpen(postOfficeId, updatedData);
        }
    } else {
        console.warn('Marker not found for post office:', postOfficeId);
        // If marker not found, refresh the entire map
        refreshMapData();
    }
}

function getAreaColor(area) {
    // This should match the area colors used in addMarkersToMap
    const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD', '#98D8C8', '#F7DC6F', '#FF8C94', '#87CEEB'];
    // Simple hash to get consistent color for same area
    let hash = 0;
    for (let i = 0; i < (area || '').length; i++) {
        hash = area.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
}

// Listen for messages from table page or other windows
window.addEventListener('message', function(event) {
    // Verify origin for security (optional, adjust as needed)
    if (event.data && event.data.type === 'postOfficeUpdated') {
        console.log('Received post office update message:', event.data);
        
        if (event.data.action === 'updateMarker' && event.data.postOfficeId && event.data.data) {
            // Update specific marker
            updateSingleMarker(event.data.postOfficeId, event.data.data);
        } else if (event.data.action === 'refreshMap') {
            // Refresh entire map
            refreshMapData();
        }
    }
});

function addMarkersToMap(data) {
    // Clear existing markers
    markers.forEach(marker => leafletMap.removeLayer(marker));
    markers = [];

    const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD', '#98D8C8', '#F7DC6F', '#FF8C94', '#87CEEB'];
    const areaColors = {};
    
    // Populate search datalist
    const officeList = $('#officeList');
    officeList.empty();
    
    // Get unique areas and assign colors
    const uniqueAreas = [...new Set(data.map(office => office.area))];
    uniqueAreas.forEach((area, index) => {
        areaColors[area] = colors[index % colors.length];
    });

    data.forEach((office, index) => {
        // Debug: Log the office data to understand the structure
        console.log('Office data:', office);
        
        // Add to search datalist - ensure we're getting the correct field
        let officeName = office.postalOffice || office.name || office.postal_office || 'Unknown Office';
        
        // Clean the office name to remove any HTML or unwanted characters
        officeName = officeName.toString().trim();
        officeName = officeName.replace(/<[^>]*>/g, ''); // Remove HTML tags
        officeName = officeName.replace(/leaflet-popup-content-wrapper/gi, '').trim();
        
        // Only add if it's a valid office name and not empty
        if (officeName && officeName !== 'Unknown Office' && officeName.length > 0) {
            console.log('Adding to officeList:', officeName);
            officeList.append(`<option value="${officeName}">`);
        } else {
            console.warn('Skipping invalid office name:', officeName, 'from office:', office);
        }
        
        const areaColor = areaColors[office.area] || '#3388ff';
        
        if (office.latitude && office.longitude) {
            const icon = L.divIcon({
                html: `<div style="background: ${areaColor}; width: 12px; height: 12px; border-radius: 50%; border: 2px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);"></div>`,
                iconSize: [16, 16],
                className: 'custom-marker'
            });

            const marker = L.marker([office.latitude, office.longitude], { icon: icon })
                .addTo(leafletMap)
                .bindPopup(`
                    <div style="min-width: 300px; max-width: 350px;">
                        <!-- Cover Photo -->
                        <div class="popup-cover-photo">
                            <img src="${office.coverPhotoPath && office.coverPhotoPath !== 'no-image.png' ? `/uploads/${office.coverPhotoPath.includes('/') ? office.coverPhotoPath : 'covers/' + office.coverPhotoPath}` : '/images/no-image.png'}" 
                                 alt="${office.postalOffice} Cover Photo"
                                 onerror="this.style.display='none'; this.parentElement.style.background='linear-gradient(135deg, #667eea 0%, #764ba2 100%)';">
                        </div>
                        
                        <!-- Office Info -->
                        <div style="padding: 15px; background: white; border-radius: 0 0 8px 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
                            <!-- Office Name and Area -->
                            <div style="margin-bottom: 12px;">
                                <h6 style="margin: 0; font-size: 16px; font-weight: 600; color: #2c3e50; margin-bottom: 5px;">${office.postalOffice}</h6>
                                <span style="display: inline-block; padding: 2px 8px; background: ${areaColor}; color: white; font-size: 11px; border-radius: 12px;">
                                    ${office.area || 'Unknown Area'}
                                </span>
                            </div>
                            
                            <!-- Quick Info -->
                            <div style="font-size: 13px; color: #555; line-height: 1.4;">
                                <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
                                    <span><strong>Status:</strong></span>
                                    <span class="badge badge-${(office.connectivityStatus === 'Connected' || office.connectivityStatus === 'Active') ? 'success' : (office.connectivityStatus === 'Disconnected' || office.connectivityStatus === 'Inactive') ? 'danger' : (office.connectivityStatus === 'Pending' ? 'warning' : 'secondary')}" style="font-size: 11px;">
                                        ${office.connectivityStatus || 'Unknown'}
                                    </span>
                                </div>
                                <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
                                    <span><strong>Postmaster:</strong></span>
                                    <span>${office.postmaster || 'N/A'}</span>
                                </div>
                                <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
                                    <span><strong>Employees:</strong></span>
                                    <span>${office.employees || 'N/A'}</span>
                                </div>
                                <div style="margin-bottom: 8px;">
                                    <strong>Address:</strong><br>
                                    <span style="color: #777;">${office.address || 'N/A'}</span>
                                </div>
                            </div>
                            
                            <!-- Action Buttons -->
                            <div style="display: flex; gap: 8px; margin-top: 12px;">
                                <button onclick="showProfileModal(${office.id})" 
                                        class="btn btn-sm btn-primary" 
                                        style="flex: 1; font-size: 12px; padding: 4px 8px;">
                                    <i class="fas fa-eye"></i> View Profile
                                </button>
                                <button onclick="editPostOffice(${office.id})" 
                                        class="btn btn-sm btn-outline-secondary" 
                                        style="flex: 1; font-size: 12px; padding: 4px 8px;">
                                    <i class="fas fa-edit"></i> Edit
                                </button>
                            </div>
                        </div>
                    </div>
                `);

            markers.push({
                marker: marker,
                data: office
            });
        }
    });

    // Create area legend
    createAreaLegend(uniqueAreas, areaColors);

    if (markers.length > 0) {
        const group = new L.featureGroup(markers.map(m => m.marker));
        leafletMap.fitBounds(group.getBounds().pad(0.1));
    }
}

function createAreaLegend(areas, areaColors) {
    const legendContainer = $('#areaLegend');
    legendContainer.empty();
    
    areas.forEach(area => {
        const legendItem = $(`
            <div class="form-check mb-2">
                <input class="form-check-input" type="radio" name="areaFilterRadio" id="area_${area}" value="${area}">
                <label class="form-check-label" for="area_${area}">
                    <div style="display: flex; align-items: center;">
                        <div style="width: 16px; height: 16px; background: ${areaColors[area]}; border-radius: 50%; margin-right: 8px; border: 1px solid #ccc;"></div>
                        <small>${area}</small>
                    </div>
                </label>
            </div>
        `);
        legendContainer.append(legendItem);
    });
}

function editPostOffice(id) {
    console.log('Opening edit modal for ID:', id);
    
    // Show modal first
    $('#editModal').modal('show');
    
    // Show loading indicator
    $('#editModal .modal-body').prepend('<div id="editLoading" class="text-center py-2"><i class="fas fa-spinner fa-spin"></i> Loading...</div>');
    
    // Fetch post office data
    fetch('/api/post-office/' + id)
        .then(response => {
            console.log('Response status:', response.status);
            if (!response.ok) {
                if (response.status === 401) {
                    throw new Error('Session expired. Please login again.');
                } else if (response.status === 404) {
                    throw new Error('Post office not found');
                } else if (response.status === 500) {
                    throw new Error('Server error. Please try again later.');
                } else {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }
            }
            return response.json();
        })
        .then(response => {
            console.log('Data object:', response);
            console.log('Data.id:', response.postOffice ? response.postOffice.id : 'undefined');
            console.log('Response type:', typeof response);
            console.log('Data type:', typeof response.postOffice);
            
            if (response.postOffice) {
                console.log('Available data properties:', Object.keys(response.postOffice));
            }
            
            // Remove loading indicator
            $('#editLoading').remove();
            
            if (response.success && response.postOffice) {
                // Use the global postOfficeEditor to populate and show the modal
                if (window.postOfficeEditor) {
                    window.postOfficeEditor.populateForm(response.postOffice);
                } else {
                    console.error('PostOfficeEditor not initialized');
                    Swal.fire({
                        icon: 'error',
                        title: 'Error',
                        text: 'Post office editor not available'
                    });
                    $('#editModal').modal('hide');
                }
            } else {
                console.error('API Error:', response.error);
                Swal.fire({
                    icon: 'error',
                    title: 'Error',
                    text: 'Error loading post office data: ' + (response.error || 'Unknown error')
                });
                $('#editModal').modal('hide');
            }
        })
        .catch(error => {
            // Remove loading indicator
            $('#editLoading').remove();
            console.error('Fetch Error:', error);
            Swal.fire({
                icon: 'error',
                title: 'Network Error',
                text: error.message
            });
            $('#editModal').modal('hide');
        });
}

function viewDetails(id) {
    // TODO: Implement view details functionality
    Swal.fire('Info', 'View details functionality coming soon', 'info');
}

function exportReport(type) {
    const year = $('#yearSelector').val();
    const areaFilter = $('#areaFilter').val();
    const quarterFilter = $('#quarterFilter').val();
    const statusFilter = $('#statusFilter').val();

    let url = `/quarters/export?type=${type}&year=${year}`;
    
    if (areaFilter) url += `&areaFilter=${encodeURIComponent(areaFilter)}`;
    if (quarterFilter) url += `&quarterFilter=${encodeURIComponent(quarterFilter)}`;
    if (statusFilter) url += `&statusFilter=${encodeURIComponent(statusFilter)}`;

    if (type === 'print') {
        window.open(url, '_blank');
    } else {
        window.location.href = url;
    }
}

// Sidebar navigation
$("#show-dashboard").click(function(e) {
    e.preventDefault();
    window.location.href = '/dashboard';
});

$("#show-data-table").click(function(e) {
    e.preventDefault();
    window.location.href = '/table';
});

// Set QUARTERS menu as active on page load
$(document).ready(function() {
    // Clear all active states first
    $('.sidebar-menu .nav-link-toggle').removeClass('active');
    // Set current page as active
    $("#show-quarters").addClass('active');
});

// Load quarter data when year selector changes
function loadQuarterData() {
    const selectedYear = $('#yearSelector').val();
    console.log('Loading quarter data for year:', selectedYear);
    
    // Show loading state
    $('.quarter-stat').addClass('loading');
    
    $.ajax({
        url: '/quarters/api/quarters-data',
        method: 'GET',
        data: { year: selectedYear },
        success: function(response) {
            console.log('Quarter data response:', response);
            if (response.success && response.quartersData) {
                updateQuarterDisplay(response.quartersData);
            } else {
                console.error('Error in quarter data response:', response.error);
                Swal.fire({
                    icon: 'error',
                    title: 'Error',
                    text: 'Failed to load quarter data: ' + (response.error || 'Unknown error')
                });
            }
        },
        error: function(xhr, status, error) {
            console.error('AJAX Error loading quarter data:', status, error);
            Swal.fire({
                icon: 'error',
                title: 'Network Error',
                text: 'Failed to load quarter data. Please try again.'
            });
        },
        complete: function() {
            $('.quarter-stat').removeClass('loading');
        }
    });
}

// Update the quarter display with new data
function updateQuarterDisplay(quartersData) {
    console.log('Updating quarter display with data:', quartersData);
    
    // Update the "With Connectivity" section
    quartersData.forEach(function(quarter) {
        const quarterElement = $('.quarter-stat').filter(function() {
            return $(this).find('strong').text() === quarter.quarter + ' ' + quarter.year;
        });
        
        if (quarterElement.length > 0) {
            // Update the badge
            const badge = quarterElement.find('.badge-success');
            const newCount = quarter.newConnected || 0;
            badge.text(newCount > 0 ? '+' + newCount : '0');
            
            // Update the "Total Connected" text
            quarterElement.find('.stat-meta span:first strong').text(quarter.connected || 0);
            
            // Update the "New This Quarter" text
            quarterElement.find('.stat-meta span:last strong').text(newCount);
            
            console.log('Updated quarter', quarter.quarter, 'with new connected:', newCount);
        }
    });
    
    // Update the "Without Connectivity" section
    quartersData.forEach(function(quarter) {
        const quarterElement = $('.quarter-stat').filter(function() {
            return $(this).find('strong').text() === quarter.quarter + ' ' + quarter.year;
        });
        
        // Find the corresponding disconnected quarter element
        const disconnectedElement = quarterElement.closest('.row').find('.col-lg-6:last').find('.quarter-stat').filter(function() {
            return $(this).find('strong').text() === quarter.quarter + ' ' + quarter.year;
        });
        
        if (disconnectedElement.length > 0) {
            // Update the badge
            const badge = disconnectedElement.find('.badge-danger');
            const newCount = quarter.newDisconnected || 0;
            badge.text(newCount > 0 ? '+' + newCount : '0');
            
            // Update the "Total Disconnected" text
            disconnectedElement.find('.stat-meta span:first strong').text(quarter.disconnected || 0);
            
            // Update the "New This Quarter" text
            disconnectedElement.find('.stat-meta span:last strong').text(newCount);
            
            console.log('Updated quarter', quarter.quarter, 'with new disconnected:', newCount);
        }
    });
}

function hidePageLoader() {
    var loader = document.getElementById('pageLoader');
    if (loader) {
        loader.classList.add('hidden');
    }
}

// Test growth calculation function
function testGrowthCalculation() {
    const year = $('#yearSelector').val() || 2026;
    
    console.log('Testing growth calculation for year:', year);
    
    $.ajax({
        url: '/quarters/api/test-growth-calculation',
        method: 'GET',
        data: { year: year },
        success: function(response) {
            console.log('Growth calculation test response:', response);
            
            if (response.success) {
                let message = 'Growth Calculation Test Results:\n\n';
                message += `Quarter: ${response.quarter} ${response.year}\n`;
                message += `Area Filter: "${response.areaFilter}"\n\n`;
                message += 'Statistics:\n';
                
                const stats = response.statistics;
                message += `- New Connected: ${stats.newConnected}\n`;
                message += `- New Disconnected: ${stats.newDisconnected}\n`;
                message += `- Total Connected: ${stats.connected}\n`;
                message += `- Total Disconnected: ${stats.disconnected}\n`;
                message += `- Total Offices: ${stats.total}\n`;
                
                // Show in a nice format
                Swal.fire({
                    icon: 'info',
                    title: 'Growth Calculation Test',
                    html: `<pre style="text-align: left; font-size: 12px;">${message}</pre>`,
                    width: 600,
                    confirmButtonText: 'OK'
                });
                
                console.log('Growth calculation test successful:', response);
            } else {
                Swal.fire({
                    icon: 'error',
                    title: 'Test Failed',
                    text: response.error || 'Unknown error occurred'
                });
            }
        },
        error: function(xhr, status, error) {
            console.error('Error testing growth calculation:', status, error);
            Swal.fire({
                icon: 'error',
                title: 'Network Error',
                text: 'Failed to test growth calculation. Check console for details.'
            });
        }
    });
}

// Debug function to test API endpoints
function testAPIEndpoints() {
    console.log('Testing API endpoints...');
    
    // Test basic endpoint
    fetch('/quarters/api/test')
        .then(response => response.json())
        .then(data => {
            console.log('Test endpoint response:', data);
        })
        .catch(error => {
            console.error('Test endpoint error:', error);
        });
    
    // Test post offices endpoint
    fetch('/quarters/api/post-offices?year=2024')
        .then(response => {
            console.log('Post offices response status:', response.status);
            return response.json();
        })
        .then(data => {
            console.log('Post offices response:', data);
        })
        .catch(error => {
            console.error('Post offices endpoint error:', error);
        });
}

// Make test function available globally
window.testAPIEndpoints = testAPIEndpoints;

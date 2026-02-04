// Custom Quarters JavaScript

// Notification and User Dropdown Functions
function markAsRead(element) {
    $(element).removeClass('font-weight-bold');
    updateNotificationCount();
}

function clearNotifications() {
    $('#notificationDropdown').siblings('.dropdown-menu').find('.dropdown-item').slice(0, -1).remove();
    $('#notificationCount').text('0').hide();
    Swal.fire({
        icon: 'success',
        title: 'Notifications Cleared',
        timer: 1500,
        showConfirmButton: false
    });
}

function updateNotificationCount() {
    const count = $('#notificationDropdown').siblings('.dropdown-menu').find('.dropdown-item').length - 1;
    const badge = $('#notificationCount');
    if (count > 0) {
        badge.text(count).show();
    } else {
        badge.text('0').hide();
    }
}

function openAccountSettings() {
    Swal.fire({
        title: 'Account Settings',
        html: `
            <div style="text-align: left;">
                <h6>User Information</h6>
                <p><strong>Name:</strong> <span id="settingsName">User Name</span></p>
                <p><strong>Position:</strong> <span id="settingsPosition">Staff</span></p>
                <p><strong>Email:</strong> user@example.com</p>
                <hr>
                <h6>Preferences</h6>
                <div class="form-check">
                    <input class="form-check-input" type="checkbox" id="emailNotifications" checked>
                    <label class="form-check-label" for="emailNotifications">
                        Email Notifications
                    </label>
                </div>
                <div class="form-check">
                    <input class="form-check-input" type="checkbox" id="darkMode">
                    <label class="form-check-label" for="darkMode">
                        Dark Mode
                    </label>
                </div>
            </div>
        `,
        confirmButtonText: 'Save Changes',
        showCancelButton: true,
        didOpen: function() {
            // Populate user data when modal opens
            const fullName = /*[[${full_name}]]*/ 'User Name';
            const position = /*[[${position}]]*/ 'Staff';
            
            // Set name and position
            const nameElement = document.getElementById('settingsName');
            const positionElement = document.getElementById('settingsPosition');
            
            if (nameElement) nameElement.textContent = fullName || 'User Name';
            if (positionElement) positionElement.textContent = position || 'Staff';
        }
    });
}

function openProfile() {
    Swal.fire({
        title: 'User Profile',
        html: `
            <div style="text-align: center;">
                <div class="user-avatar-circle mx-auto mb-3" style="width: 80px; height: 80px; font-size: 32px;" id="profileAvatar">U</div>
                <h4 id="profileName">User Name</h4>
                <p class="text-muted" id="profilePosition">Position</p>
                <hr>
                <div style="text-align: left;">
                    <p><strong>Employee ID:</strong> EMP001</p>
                    <p><strong>Department:</strong> Postal Services</p>
                    <p><strong>Joined:</strong> January 15, 2024</p>
                    <p><strong>Last Login:</strong> <span id="lastLogin">Today at 9:30 AM</span></p>
                </div>
            </div>
        `,
        confirmButtonText: 'Close',
        didOpen: function() {
            // Populate user data when modal opens
            const fullName = /*[[${full_name}]]*/ 'User Name';
            const position = /*[[${position}]]*/ 'Staff';
            
            // Set avatar initial
            const avatar = document.getElementById('profileAvatar');
            if (avatar && fullName) {
                avatar.textContent = fullName.charAt(0).toUpperCase();
            }
            
            // Set name and position
            const nameElement = document.getElementById('profileName');
            const positionElement = document.getElementById('profilePosition');
            
            if (nameElement) nameElement.textContent = fullName || 'User Name';
            if (positionElement) positionElement.textContent = position || 'Staff';
        }
    });
}

function openHelp() {
    Swal.fire({
        title: 'Help & Support',
        html: `
            <div style="text-align: left;">
                <h6>Quick Links</h6>
                <ul>
                    <li><a href="#" onclick="showUserGuide()">User Guide</a></li>
                    <li><a href="#" onclick="showFAQ()">FAQ</a></li>
                    <li><a href="#" onclick="showContactSupport()">Contact Support</a></li>
                </ul>
                <hr>
                <h6>System Information</h6>
                <p><strong>Version:</strong> 2.1.0</p>
                <p><strong>Last Updated:</strong> January 30, 2026</p>
            </div>
        `,
        confirmButtonText: 'Close'
    });
}

function showUserGuide() {
    Swal.fire({
        title: 'User Guide',
        html: `
            <div style="text-align: left;">
                <h6>Getting Started</h6>
                <ol>
                    <li>Navigate using the sidebar menu</li>
                    <li>View post offices on the map</li>
                    <li>Filter by area or status</li>
                    <li>Export data as needed</li>
                </ol>
            </div>
        `,
        confirmButtonText: 'Got it'
    });
}

function showFAQ() {
    Swal.fire({
        title: 'Frequently Asked Questions',
        html: `
            <div style="text-align: left;">
                <h6>Q: How do I update post office information?</h6>
                <p>A: Click on any post office on the map or table to edit.</p>
                <h6>Q: How do I export data?</h6>
                <p>A: Use the export buttons in the data table view.</p>
                <h6>Q: How do I change my password?</h6>
                <p>A: Go to Account Settings in the user menu.</p>
            </div>
        `,
        confirmButtonText: 'Got it'
    });
}

function showContactSupport() {
    Swal.fire({
        title: 'Contact Support',
        html: `
            <div style="text-align: left;">
                <p><strong>Email:</strong> support@postal.gov.ph</p>
                <p><strong>Phone:</strong> (02) 1234-5678</p>
                <p><strong>Office Hours:</strong> Monday - Friday, 8:00 AM - 5:00 PM</p>
                <hr>
                <p>For urgent issues, please call the IT Helpdesk at extension 1234.</p>
            </div>
        `,
        confirmButtonText: 'Close'
    });
}

// Initialize when document is ready
$(document).ready(function() {
    // Initialize dropdowns
    $('.dropdown-toggle').dropdown();
    
    // Test dropdown functionality
    console.log('Quarters dropdowns initialized');
});

// Load quarter data based on selected year
function loadQuarterData() {
    const selectedYear = document.getElementById('yearSelector').value;
    
    // Show loading indicator
    Swal.fire({
        title: 'Loading...',
        html: 'Fetching quarter data for ' + selectedYear,
        allowOutsideClick: false,
        didOpen: () => {
            Swal.showLoading();
        }
    });
    
    // Make AJAX request to get quarter data for selected year
    $.ajax({
        url: '/quarters/api/quarters-data',
        type: 'GET',
        data: { year: selectedYear },
        success: function(response) {
            if (response.success) {
                // Update the selected year display
                document.getElementById('selectedYear').textContent = selectedYear;
                
                // Update the quarter data in the UI
                updateQuarterUI(response.quartersData);
                
                Swal.close();
            } else {
                Swal.fire({
                    icon: 'error',
                    title: 'Error',
                    text: response.error || 'Failed to load quarter data'
                });
            }
        },
        error: function(xhr, status, error) {
            // Fallback: reload the page with year parameter
            window.location.href = '/quarters?year=' + selectedYear;
        }
    });
}

// Update quarter UI with new data
function updateQuarterUI(quartersData) {
    // Update the quarter statistics cards
    updateQuarterCards(quartersData);
    
    // Update the debug info if present
    const debugInfo = document.querySelector('.alert-warning');
    if (debugInfo) {
        if (quartersData && quartersData.length > 0) {
            debugInfo.style.display = 'none';
        } else {
            debugInfo.style.display = 'block';
        }
    }
}

// Update quarter cards with new data
function updateQuarterCards(quartersData) {
    if (!quartersData || quartersData.length === 0) return;
    
    // Update "With Connectivity" column
    const withConnectivityCard = document.querySelector('.col-lg-6:first-child .card-body');
    if (withConnectivityCard) {
        updateQuarterCard(withConnectivityCard, quartersData, 'connected');
    }
    
    // Update "Without Connectivity" column
    const withoutConnectivityCard = document.querySelector('.col-lg-6:last-child .card-body');
    if (withoutConnectivityCard) {
        updateQuarterCard(withoutConnectivityCard, quartersData, 'disconnected');
    }
}

// Update individual quarter card
function updateQuarterCard(cardElement, quartersData, type) {
    let html = '';
    
    quartersData.forEach(quarter => {
        const count = type === 'connected' ? quarter.connected : quarter.disconnected;
        const newCount = type === 'connected' ? quarter.newConnected : quarter.newDisconnected;
        const isCurrent = quarter.isCurrent;
        
        html += `
            <div class="quarter-stat p-3 mb-2 border rounded ${isCurrent ? 'border-primary' : ''}">
                <div class="d-flex justify-content-between align-items-center">
                    <div>
                        <strong>${quarter.quarter} ${quarter.year}</strong>
                        ${isCurrent ? '<span class="badge badge-primary ml-2">Current</span>' : ''}
                    </div>
                    <div class="text-right">
                        <div class="h5 mb-0">${count}</div>
                        <small class="${newCount > 0 ? (type === 'connected' ? 'text-success' : 'text-danger') : 'text-muted'}">
                            ${newCount > 0 ? '+' + newCount : 'No change'}
                        </small>
                    </div>
                </div>
                <div class="progress mt-2" style="height: 4px;">
                    <div class="progress-bar ${type === 'connected' ? 'bg-success' : 'bg-danger'}" 
                         style="width: ${Math.min((count / Math.max(...quartersData.map(q => type === 'connected' ? q.connected : q.disconnected))) * 100, 100)}%">
                    </div>
                </div>
            </div>
        `;
    });
    
    cardElement.innerHTML = html;
}

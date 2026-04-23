/**
 * office-profile-popup.js
 *
 * Shared inline popup for viewing a post office profile from any page
 * (dashboard, table, quarters, report).
 *
 * Usage:  openOfficeProfilePopup(officeId, officeName)
 *
 * The popup fetches data from GET /api/postal-office/{id} and renders
 * a Bootstrap modal with a cover-photo banner, tab navigation, and
 * a "View Full Profile" button that goes to /profile/{id}.
 *
 * Cover photo banner uses slot 1 URL: /api/postal-office/{id}/cover-photo/1
 * (slots 2 & 3 are only shown in the full carousel on the profile page).
 */

window.openOfficeProfilePopup = function (officeId, officeName) {
    if (!officeId) return;

    // ── Detect page context ───────────────────────────────────────────────
    var currentPath = window.location.pathname;
    var sourceParam = 'table';
    if      (currentPath.includes('/dashboard')) { sourceParam = 'dashboard'; sessionStorage.setItem('dashboardReturnUrl', currentPath + window.location.search); }
    else if (currentPath.includes('/quarters'))  { sourceParam = 'quarters';  sessionStorage.setItem('quartersReturnUrl',  currentPath + window.location.search); }
    else if (currentPath.includes('/report'))    { sourceParam = 'report';    sessionStorage.setItem('reportReturnUrl',    currentPath + window.location.search); }
    else if (currentPath.includes('/table'))     { sourceParam = 'table';     sessionStorage.setItem('tableReturnUrl',     currentPath + window.location.search); }

    var fullProfileUrl = '/profile/' + officeId + '?source=' + sourceParam;

    // ── Set office name and full profile URL ─────────────────────────────
    $('#officeProfilePopupName').text(officeName || 'Post Office Profile');
    $('#officeProfileOpenFull').attr('href', fullProfileUrl);

    // ── Reset modal body to loading state ─────────────────────────────────
    $('#officeProfilePopupBody').html(
        '<div class="d-flex align-items-center justify-content-center" style="height:300px;">' +
          '<div class="text-center text-muted">' +
            '<i class="fas fa-spinner fa-spin fa-2x mb-2 d-block"></i>' +
            'Loading profile...' +
          '</div>' +
        '</div>'
    );

    // ── Show modal ───────────────────────────────────────────────────────
    var $modal = $('#officeProfilePopupModal');
    $modal.modal('show');

    // ── Fetch and render ──────────────────────────────────────────────────
    // Fetch and render with timeout
    var timeoutId = setTimeout(function() {
        console.warn('Profile API request timeout after 10 seconds');
        document.getElementById('officeProfilePopupBody').innerHTML =
            '<div class="text-center py-5">' +
              '<i class="fas fa-clock fa-2x text-warning mb-3"></i>' +
              '<p class="text-muted">Request timed out. Server may be unavailable.</p>' +
              '<a href="' + fullProfileUrl + '" class="btn btn-primary btn-sm">' +
                '<i class="fas fa-external-link-alt mr-1"></i>Open Full Profile' +
              '</a>' +
            '</div>';
    }, 10000); // 10 second timeout

    fetch('/api/postal-office/' + officeId + '/profile')
        .then(function (r) {
            clearTimeout(timeoutId);
            console.log('Profile API response status:', r.status);
            if (!r.ok) {
                console.error('Profile API error:', r.status, r.statusText);
                throw new Error('HTTP ' + r.status + ' - ' + r.statusText);
            }
            return r.json();
        })
        .then(function (data) {
            clearTimeout(timeoutId);
            console.log('Profile API response data:', data);
            _renderPopupBody(data, officeId, fullProfileUrl);
        })
        .catch(function (error) {
            clearTimeout(timeoutId);
            console.error('Profile API fetch error:', error);
            document.getElementById('officeProfilePopupBody').innerHTML =
                '<div class="text-center py-5">' +
                  '<i class="fas fa-exclamation-triangle fa-2x text-warning mb-3"></i>' +
                  '<p class="text-muted">Failed to load profile data.</p>' +
                  '<p class="text-muted small">' + error.message + '</p>' +
                  '<a href="' + fullProfileUrl + '" class="btn btn-primary btn-sm">' +
                    '<i class="fas fa-external-link-alt mr-1"></i>Open Full Profile' +
                  '</a>' +
                '</div>';
        });
};

// ── Render popup body ─────────────────────────────────────────────────────────

function _renderPopupBody(data, officeId, fullProfileUrl) {
    var nameEl = document.getElementById('officeProfilePopupName');
    if (nameEl) nameEl.textContent = data.name || 'Post Office Profile';

    var connBadge = data.connectionStatus
        ? '<span class="badge badge-success px-3 py-2"><i class="fas fa-wifi mr-1"></i>Active</span>'
        : '<span class="badge badge-danger px-3 py-2"><i class="fas fa-wifi mr-1"></i>Inactive</span>';

    var officeBadge = data.officeStatus === 'OPEN'
        ? '<span class="badge badge-info px-3 py-2"><i class="fas fa-door-open mr-1"></i>Open</span>'
        : data.officeStatus === 'CLOSED'
        ? '<span class="badge badge-danger px-3 py-2"><i class="fas fa-door-closed mr-1"></i>Closed</span>'
        : '';

    // Cover photo: use the URL from API response if available
    // The full carousel (slots 1/2/3) is only shown on the full profile page.
    var coverPhotoUrl = data.coverPhotoUrl || null;

    var html =
        // Cover photo banner
        '<div style="height:180px;overflow:hidden;position:relative;background:#1a3a7a;">' +
          (coverPhotoUrl
            ? '<img src="' + coverPhotoUrl + '"' +
                 ' onerror="this.style.display=\'none\'"' +
                 ' style="width:100%;height:100%;object-fit:contain;opacity:0.7;">'
            : '<div style="width:100%;height:100%;background-color:#1a3a7a;"></div>') +
          '<div style="position:absolute;bottom:12px;left:20px;">' +
            '<h4 class="text-white font-weight-bold mb-1" style="text-shadow:0 1px 4px rgba(0,0,0,0.5);">' +
              _esc(data.name || 'N/A') +
            '</h4>' +
            '<div style="display:flex;gap:6px;">' + connBadge + officeBadge + '</div>' +
          '</div>' +
        '</div>' +

        // Tab navigation
        '<div class="px-4 pt-3" style="background:#f8f9fa;border-bottom:1px solid #dee2e6;">' +
          '<div class="d-flex" style="gap:4px;">' +
            _popupTab('basic',        'Basic Info',    true) +
            _popupTab('connectivity', 'Connectivity',  false) +
            _popupTab('contact',      'Contact',       false) +
          '</div>' +
        '</div>' +

        // Tab content panels
        '<div class="p-4" style="background:#fff;">' +

          // ── Basic ──
          '<div id="ppTab-basic" style="display:block;">' +
            '<div class="row">' +
              '<div class="col-md-6">' +
                _infoRow('fas fa-map-marker-alt', 'Area',           data.area || (data.areaId ? 'Area ' + data.areaId : null)) +
                _infoRow('fas fa-envelope',        'ZIP Code',       data.zipCode) +
                _infoRow('fas fa-map',             'Address',        data.address) +
                _infoRow('fas fa-tag',             'Classification', data.classification) +
              '</div>' +
              '<div class="col-md-6">' +
                _infoRow('fas fa-user-tie',  'Postmaster',      data.postmaster) +
                _infoRow('fas fa-concierge-bell', 'Services',   data.serviceProvided) +
                _infoRow('fas fa-comment-alt',    'Remarks',     data.remarks) +
              '</div>' +
            '</div>' +
          '</div>' +

          // ── Connectivity ──
          '<div id="ppTab-connectivity" style="display:none;">' +
            '<div class="row">' +
              '<div class="col-md-6">' +
                _infoRow('fas fa-building',        'ISP',             data.internetServiceProvider) +
                _infoRow('fas fa-plug',            'Connection Type', data.typeOfConnection) +
                _infoRow('fas fa-tachometer-alt',  'Speed',           data.speed) +
              '</div>' +
              '<div class="col-md-6">' +
                _infoRow('fas fa-network-wired',   'Static IP',       data.staticIpAddress) +
                _infoRow('fas fa-door-open',       'Office Status',   data.officeStatus) +
              '</div>' +
            '</div>' +
          '</div>' +

          // ── Contact ──
          '<div id="ppTab-contact" style="display:none;">' +
            '<div class="row">' +
              '<div class="col-md-6">' +
                _infoRow('fas fa-phone',     'Office Contact',  data.postalOfficeContactPerson) +
                _infoRow('fas fa-phone-alt', 'Contact Number',  data.postalOfficeContactNumber) +
                _infoRow('fas fa-users',     'Employees',       data.noOfEmployees) +
                _infoRow('fas fa-cash-register', 'Tellers',     data.noOfPostalTellers) +
              '</div>' +
              '<div class="col-md-6">' +
              
                _infoRow('fas fa-mail-bulk',      'Carriers',    data.noOfLetterCarriers) +
              '</div>' +
            '</div>' +
          '</div>' +

        '</div>'; // end tab content

    document.getElementById('officeProfilePopupBody').innerHTML = html;

    // ── Wire tab switching ────────────────────────────────────────────────
    document.querySelectorAll('[data-pp-tab]').forEach(function (btn) {
        btn.addEventListener('click', function (e) {
            e.preventDefault();
            var target = this.getAttribute('data-pp-tab');

            document.querySelectorAll('[data-pp-tab]').forEach(function (b) {
                b.style.borderBottom = '2px solid transparent';
                b.style.color        = '#007bff';
                b.style.fontWeight   = '';
            });
            this.style.borderBottom = '2px solid #007bff';
            this.style.color        = '#0056b3';
            this.style.fontWeight   = '700';

            ['basic', 'connectivity', 'contact'].forEach(function (name) {
                var el = document.getElementById('ppTab-' + name);
                if (el) el.style.display = (name === target) ? 'block' : 'none';
            });
        });
    });

    // Activate first tab visually
    var firstTab = document.querySelector('[data-pp-tab="basic"]');
    if (firstTab) {
        firstTab.style.borderBottom = '2px solid #007bff';
        firstTab.style.color        = '#0056b3';
        firstTab.style.fontWeight   = '700';
    }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function _popupTab(name, label, active) {
    return '<a href="#" data-pp-tab="' + name + '" style="' +
        'display:inline-block;padding:8px 14px;text-decoration:none;font-size:13px;' +
        'border-bottom:2px solid ' + (active ? '#007bff' : 'transparent') + ';' +
        'color:' + (active ? '#0056b3' : '#007bff') + ';' +
        'font-weight:' + (active ? '700' : '') + ';">' +
        label + '</a>';
}

function _infoRow(icon, label, value) {
    var val = (value !== null && value !== undefined && value !== '') ? _esc(String(value)) : '—';
    return '<div class="mb-2 d-flex align-items-start" style="font-size:13px;">' +
               '<i class="' + icon + ' text-muted mr-2 mt-1" style="width:14px;flex-shrink:0;"></i>' +
               '<div><span class="text-muted" style="font-size:11px;display:block;">' + label + '</span>' +
               '<strong>' + val + '</strong></div>' +
           '</div>';
}

function _esc(s) {
    if (!s) return '';
    return String(s)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}
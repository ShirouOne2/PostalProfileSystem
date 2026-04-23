/**
 * Notifications Inbox JavaScript
 * Handles the notifications inbox page functionality including:
 * - Loading and displaying notifications
 * - Filtering by status, type, and date range
 * - Marking notifications as read
 * - View switching between list and grid
 * - Real-time updates via SSE
 */

(function() {
    'use strict';

    // State management
    let currentView = 'list';
    let notifications = [];
    let filters = {
        status: '',
        type: '',
        dateRange: ''
    };

    // DOM elements
    const elements = {
        loadingState: document.getElementById('loadingState'),
        emptyState: document.getElementById('emptyState'),
        notificationsContainer: document.getElementById('notificationsContainer'),
        totalCount: document.getElementById('totalCount'),
        unreadCount: document.getElementById('unreadCount'),
        readCount: document.getElementById('readCount'),
        todayCount: document.getElementById('todayCount'),
        notificationSummary: document.getElementById('notificationSummary'),
        filterStatus: document.getElementById('filterStatus'),
        filterType: document.getElementById('filterType'),
        filterDateRange: document.getElementById('filterDateRange'),
        applyFiltersBtn: document.getElementById('applyFiltersBtn'),
        clearFiltersBtn: document.getElementById('clearFiltersBtn'),
        markAllReadBtn: document.getElementById('markAllReadBtn'),
        refreshNotificationsBtn: document.getElementById('refreshNotificationsBtn'),
        listViewBtn: document.getElementById('listViewBtn'),
        gridViewBtn: document.getElementById('gridViewBtn'),
        sidebarNotifBadge: document.getElementById('sidebarNotifBadge')
    };

    // Initialize
    function init() {
        loadNotifications();
        loadStats();
        bindEvents();
        setupSSE();
    }

    // Load notifications from API
    function loadNotifications() {
        showLoading();
        
        const params = new URLSearchParams();
        if (filters.status) params.append('status', filters.status);
        if (filters.type) params.append('type', filters.type);
        if (filters.dateRange) params.append('dateRange', filters.dateRange);

        fetch(`/notifications/api/list?${params.toString()}`)
            .then(response => response.json())
            .then(data => {
                notifications = data.notifications;
                updateStats(data);
                renderNotifications();
                updateSummary(data.filteredCount, data.totalCount);
                hideLoading();
            })
            .catch(error => {
                console.error('Error loading notifications:', error);
                showError('Failed to load notifications');
                hideLoading();
            });
    }

    // Load statistics
    function loadStats() {
        fetch('/notifications/api/stats')
            .then(response => response.json())
            .then(data => {
                updateStats(data);
            })
            .catch(error => {
                console.error('Error loading stats:', error);
            });
    }

    // Update statistics display
    function updateStats(data) {
        if (elements.totalCount) elements.totalCount.textContent = data.totalCount || 0;
        if (elements.unreadCount) elements.unreadCount.textContent = data.unreadCount || 0;
        if (elements.readCount) elements.readCount.textContent = data.readCount || 0;
        if (elements.todayCount) elements.todayCount.textContent = data.todayCount || 0;
        
        // Update sidebar badge
        if (elements.sidebarNotifBadge) {
            const unreadCount = data.unreadCount || 0;
            if (unreadCount > 0) {
                elements.sidebarNotifBadge.textContent = unreadCount > 9 ? '9+' : unreadCount;
                elements.sidebarNotifBadge.style.display = 'inline-block';
            } else {
                elements.sidebarNotifBadge.style.display = 'none';
            }
        }
    }

    // Render notifications based on current view
    function renderNotifications() {
        if (notifications.length === 0) {
            showEmpty();
            return;
        }

        hideEmpty();
        const html = currentView === 'list' ? renderListView() : renderGridView();
        elements.notificationsContainer.innerHTML = html;
    }

    // Render list view
    function renderListView() {
        return notifications.map(notif => `
            <div class="notification-item ${notif.read ? 'read' : 'unread'} new" 
                 data-notif-id="${notif.id}">
                <div class="notification-content">
                    ${!notif.read ? '<div class="unread-indicator"></div>' : ''}
                    <div class="notification-header">
                        <div class="notification-type">
                            <i class="${notif.icon}" style="color: ${notif.color}"></i>
                            <span>${notif.typeLabel}</span>
                        </div>
                        <div class="d-flex align-items-center">
                            <div class="notification-timestamp mr-2">${notif.timestampFormatted}</div>
                            <button class="btn btn-sm btn-outline-primary" onclick="event.stopPropagation(); viewFullNotification(${notif.id})">
                                <i class="fas fa-eye mr-1"></i>View
                            </button>
                        </div>
                    </div>
                    <div class="notification-message">
                        <strong>${notif.officeName}</strong> - ${notif.detail}
                    </div>
                    <div class="notification-details">
                        Changed by: <strong>${notif.changedBy}</strong>
                    </div>
                </div>
            </div>
        `).join('');
    }

    // Render grid view
    function renderGridView() {
        return `
            <div class="notifications-grid">
                ${notifications.map(notif => `
                    <div class="notification-card ${notif.read ? 'read' : 'unread'} new" 
                         data-notif-id="${notif.id}">
                        <div class="card-body">
                            ${!notif.read ? '<div class="unread-indicator"></div>' : ''}
                            <div class="d-flex align-items-center mb-2">
                                <i class="${notif.icon} mr-2" style="color: ${notif.color}"></i>
                                <span class="font-weight-bold">${notif.typeLabel}</span>
                            </div>
                            <h6 class="card-title">${notif.officeName}</h6>
                            <p class="card-text text-muted small">${notif.detail}</p>
                            <div class="d-flex justify-content-between align-items-center mb-2">
                                <small class="text-muted">By ${notif.changedBy}</small>
                                <small class="text-muted">${notif.timestampFormatted}</small>
                            </div>
                            <button class="btn btn-sm btn-primary btn-block" onclick="event.stopPropagation(); viewFullNotification(${notif.id})">
                                <i class="fas fa-eye mr-1"></i>View Full Details
                            </button>
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
    }

    // View full notification details
    window.viewFullNotification = function(id) {
        const notif = notifications.find(n => n.id === id);
        if (!notif) return;

        // Auto mark as read when modal is opened (if not already read)
        if (!notif.read) {
            fetch('/api/notifications/mark-read/' + id, { method: 'POST' })
                .then(response => response.json())
                .then(() => {
                    // Update local state
                    notif.read = true;
                    renderNotifications();
                    loadStats();
                })
                .catch(error => {
                    console.error('Error marking notification as read:', error);
                });
        }

        // Populate modal with notification details
        const modalBody = document.getElementById('fullNotificationBody');
        const modalTitle = document.getElementById('fullNotificationTitle');
        const markAsReadBtn = document.getElementById('markAsReadFromModalBtn');

        modalTitle.textContent = notif.typeLabel;
        modalBody.innerHTML = `
            <div class="notification-full-details">
                <div class="row mb-3">
                    <div class="col-md-3">
                        <strong>Type:</strong>
                    </div>
                    <div class="col-md-9">
                        <i class="${notif.icon}" style="color: ${notif.color}"></i>
                        <span class="ml-2">${notif.typeLabel}</span>
                    </div>
                </div>
                <div class="row mb-3">
                    <div class="col-md-3">
                        <strong>Office:</strong>
                    </div>
                    <div class="col-md-9">
                        ${notif.officeName}
                    </div>
                </div>
                <div class="row mb-3">
                    <div class="col-md-3">
                        <strong>Details:</strong>
                    </div>
                    <div class="col-md-9">
                        ${notif.detail}
                    </div>
                </div>
                <div class="row mb-3">
                    <div class="col-md-3">
                        <strong>Changed By:</strong>
                    </div>
                    <div class="col-md-9">
                        ${notif.changedBy}
                    </div>
                </div>
                <div class="row mb-3">
                    <div class="col-md-3">
                        <strong>Timestamp:</strong>
                    </div>
                    <div class="col-md-9">
                        ${notif.timestampFormatted}
                    </div>
                </div>
                <div class="row">
                    <div class="col-md-3">
                        <strong>Status:</strong>
                    </div>
                    <div class="col-md-9">
                        <span class="badge badge-success">
                            Read
                        </span>
                    </div>
                </div>
            </div>
        `;

        // Hide mark as read button since it's automatically marked as read
        markAsReadBtn.style.display = 'none';

        // Show modal
        $('#fullNotificationModal').modal('show');
    };

    // Mark notification as read from modal
    function markAsReadFromModal(id) {
        fetch('/api/notifications/mark-read/' + id, { method: 'POST' })
            .then(response => response.json())
            .then(() => {
                // Update local state
                const notif = notifications.find(n => n.id === id);
                if (notif) {
                    notif.read = true;
                }
                renderNotifications();
                loadStats();
                
                // Hide mark as read button in modal
                document.getElementById('markAsReadFromModalBtn').style.display = 'none';
                
                // Update status badge in modal
                const statusBadge = document.querySelector('#fullNotificationModal .badge');
                if (statusBadge) {
                    statusBadge.className = 'badge badge-success';
                    statusBadge.textContent = 'Read';
                }
                
                showSuccess('Notification marked as read');
            })
            .catch(error => {
                console.error('Error marking notification as read:', error);
                showError('Failed to mark notification as read');
            });
    }

    // Mark notification as read
    window.markAsRead = function(id) {
        fetch('/api/notifications/mark-read/' + id, { method: 'POST' })
            .then(response => response.json())
            .then(() => {
                // Update local state
                const notif = notifications.find(n => n.id === id);
                if (notif) {
                    notif.read = true;
                }
                renderNotifications();
                loadStats();
            })
            .catch(error => {
                console.error('Error marking notification as read:', error);
            });
    };

    // Mark all notifications as read
    function markAllAsRead() {
        fetch('/api/notifications/mark-all-read', { method: 'POST' })
            .then(response => response.json())
            .then(() => {
                // Update local state
                notifications.forEach(n => n.read = true);
                renderNotifications();
                loadStats();
                showSuccess('All notifications marked as read');
            })
            .catch(error => {
                console.error('Error marking all as read:', error);
                showError('Failed to mark all as read');
            });
    }

    // Switch view
    function switchView(view) {
        currentView = view;
        
        // Update button states
        elements.listViewBtn.classList.toggle('active', view === 'list');
        elements.gridViewBtn.classList.toggle('active', view === 'grid');
        
        renderNotifications();
    }

    // Apply filters
    function applyFilters() {
        filters.status = elements.filterStatus.value;
        filters.type = elements.filterType.value;
        filters.dateRange = elements.filterDateRange.value;
        loadNotifications();
    }

    // Clear filters
    function clearFilters() {
        elements.filterStatus.value = '';
        elements.filterType.value = '';
        elements.filterDateRange.value = '';
        filters = { status: '', type: '', dateRange: '' };
        loadNotifications();
    }

    // Update summary text
    function updateSummary(filtered, total) {
        if (elements.notificationSummary) {
            if (filtered === total) {
                elements.notificationSummary.textContent = `${total} notification${total !== 1 ? 's' : ''}`;
            } else {
                elements.notificationSummary.textContent = `${filtered} of ${total} notification${total !== 1 ? 's' : ''}`;
            }
        }
    }

    // Show/hide loading state
    function showLoading() {
        if (elements.loadingState) elements.loadingState.style.display = 'block';
        if (elements.notificationsContainer) elements.notificationsContainer.style.display = 'none';
        if (elements.emptyState) elements.emptyState.style.display = 'none';
    }

    function hideLoading() {
        if (elements.loadingState) elements.loadingState.style.display = 'none';
    }

    function showEmpty() {
        if (elements.emptyState) elements.emptyState.style.display = 'block';
        if (elements.notificationsContainer) elements.notificationsContainer.style.display = 'none';
    }

    function hideEmpty() {
        if (elements.emptyState) elements.emptyState.style.display = 'none';
        if (elements.notificationsContainer) elements.notificationsContainer.style.display = 'block';
    }

    // Show success/error messages
    function showSuccess(message) {
        // Use SweetAlert2 if available, otherwise fallback
        if (typeof Swal !== 'undefined') {
            Swal.fire({
                icon: 'success',
                title: 'Success',
                text: message,
                timer: 2000,
                showConfirmButton: false
            });
        } else {
            alert(message);
        }
    }

    function showError(message) {
        if (typeof Swal !== 'undefined') {
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: message
            });
        } else {
            alert(message);
        }
    }

    // Setup Server-Sent Events for real-time updates
    function setupSSE() {
        if (!window.EventSource) return;

        const es = new EventSource('/api/notifications/stream');

        es.addEventListener('badge', function(e) {
            const count = (e.data || '').trim();
            if (elements.sidebarNotifBadge) {
                if (count && count !== '0') {
                    elements.sidebarNotifBadge.textContent = count;
                    elements.sidebarNotifBadge.style.display = 'inline-block';
                } else {
                    elements.sidebarNotifBadge.style.display = 'none';
                }
            }
        });

        es.addEventListener('notification', function(e) {
            // Refresh notifications when new ones arrive
            loadNotifications();
            loadStats();
        });

        es.onerror = function() {
            console.error('SSE connection error');
            es.close();
            setTimeout(() => setupSSE(), 3000);
        };

        window.addEventListener('beforeunload', () => es.close(), { once: true });
    }

    // Bind events
    function bindEvents() {
        // Filter buttons
        if (elements.applyFiltersBtn) {
            elements.applyFiltersBtn.addEventListener('click', applyFilters);
        }
        if (elements.clearFiltersBtn) {
            elements.clearFiltersBtn.addEventListener('click', clearFilters);
        }

        // Action buttons
        if (elements.markAllReadBtn) {
            elements.markAllReadBtn.addEventListener('click', markAllAsRead);
        }
        if (elements.refreshNotificationsBtn) {
            elements.refreshNotificationsBtn.addEventListener('click', () => {
                loadNotifications();
                loadStats();
            });
        }

        // View toggle buttons
        if (elements.listViewBtn) {
            elements.listViewBtn.addEventListener('click', () => switchView('list'));
        }
        if (elements.gridViewBtn) {
            elements.gridViewBtn.addEventListener('click', () => switchView('grid'));
        }

        // Filter change events (auto-apply on change)
        ['filterStatus', 'filterType', 'filterDateRange'].forEach(id => {
            if (elements[id]) {
                elements[id].addEventListener('change', () => {
                    // Auto-apply filters after a short delay
                    setTimeout(applyFilters, 300);
                });
            }
        });
    }

    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();

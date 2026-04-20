/**
 * Approval Dashboard JavaScript
 * Handles the approval dashboard functionality including:
 * - Loading and displaying approval requests
 * - Approving and rejecting requests
 * - Viewing request details
 * - Real-time updates via SSE
 */

(function() {
    'use strict';

    // State management
    let currentRequestId = null;
    let currentAction = null;
    let refreshInterval = null;

    // DOM elements
    const elements = {
        approvalBadge: document.getElementById('approvalBadge'),
        approvalModal: document.getElementById('approvalModal'),
        approvalModalBody: document.getElementById('approvalModalBody'),
        notesModal: document.getElementById('notesModal'),
        notesModalTitle: document.getElementById('notesModalTitle'),
        adminNotes: document.getElementById('adminNotes'),
        approveBtn: document.getElementById('approveBtn'),
        rejectBtn: document.getElementById('rejectBtn'),
        confirmActionBtn: document.getElementById('confirmActionBtn'),
        statusFilter: document.getElementById('statusFilter'),
        typeFilter: document.getElementById('typeFilter'),
        areaFilter: document.getElementById('areaFilter'),
        requestsTable: document.getElementById('requestsTable')
    };

    // Initialize
    function init() {
        bindEvents();
        loadPendingCount();
        startRealTimeUpdates();
    }

    // Bind events
    function bindEvents() {
        // Filter change events
        ['statusFilter', 'typeFilter', 'areaFilter'].forEach(id => {
            if (elements[id]) {
                elements[id].addEventListener('change', debounce(applyFilters, 300));
            }
        });

        // Modal events
        if (elements.approveBtn) {
            elements.approveBtn.addEventListener('click', () => {
                currentAction = 'approve';
                showNotesModal('Approve Request');
            });
        }

        if (elements.rejectBtn) {
            elements.rejectBtn.addEventListener('click', () => {
                currentAction = 'reject';
                showNotesModal('Reject Request');
            });
        }

        if (elements.confirmActionBtn) {
            elements.confirmActionBtn.addEventListener('click', confirmAction);
        }

        // Modal close events - reset form
        if (elements.notesModal) {
            elements.notesModal.addEventListener('hidden.bs.modal', resetNotesForm);
        }
    }

    // View request details
    window.viewDetails = function(requestId) {
        currentRequestId = requestId;
        
        fetch(`/approvals/view/${requestId}`)
            .then(response => response.text())
            .then(html => {
                if (elements.approvalModalBody) {
                    elements.approvalModalBody.innerHTML = html;
                }
                
                // Show modal
                const modal = new bootstrap.Modal(elements.approvalModal);
                modal.show();
            })
            .catch(error => {
                console.error('Error loading request details:', error);
                showError('Failed to load request details');
            });
    };

    // Approve request
    window.approveRequest = function(requestId) {
        currentRequestId = requestId;
        currentAction = 'approve';
        showNotesModal('Approve Request');
    };

    // Reject request
    window.rejectRequest = function(requestId) {
        currentRequestId = requestId;
        currentAction = 'reject';
        showNotesModal('Reject Request');
    };

    // Show notes modal
    function showNotesModal(title) {
        if (elements.notesModalTitle) {
            elements.notesModalTitle.textContent = title;
        }
        
        if (elements.adminNotes) {
            elements.adminNotes.value = '';
            elements.adminNotes.focus();
        }
        
        const modal = new bootstrap.Modal(elements.notesModal);
        modal.show();
    }

    // Confirm action (approve/reject)
    function confirmAction() {
        if (!currentRequestId || !currentAction) return;

        const notes = elements.adminNotes ? elements.adminNotes.value.trim() : '';
        const url = `/approvals/${currentAction}/${currentRequestId}`;
        
        const formData = new FormData();
        if (notes) {
            formData.append('adminNotes', notes);
        }

        fetch(url, {
            method: 'POST',
            body: formData
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                showSuccess(data.message);
                
                // Close modals
                const notesModal = bootstrap.Modal.getInstance(elements.notesModal);
                const approvalModal = bootstrap.Modal.getInstance(elements.approvalModal);
                
                if (notesModal) notesModal.hide();
                if (approvalModal) approvalModal.hide();
                
                // Refresh data
                setTimeout(() => {
                    window.location.reload();
                }, 1000);
            } else {
                showError(data.message);
            }
        })
        .catch(error => {
            console.error('Error processing request:', error);
            showError('Failed to process request');
        });
    }

    // Apply filters
    function applyFilters() {
        const status = elements.statusFilter ? elements.statusFilter.value : '';
        const type = elements.typeFilter ? elements.typeFilter.value : '';
        const area = elements.areaFilter ? elements.areaFilter.value : '';

        const params = new URLSearchParams();
        if (status) params.append('status', status);
        if (type) params.append('type', type);
        if (area) params.append('area', area);

        fetch(`/approvals/api/requests?${params.toString()}`)
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    updateRequestsTable(data.requests);
                } else {
                    showError(data.message);
                }
            })
            .catch(error => {
                console.error('Error applying filters:', error);
                showError('Failed to apply filters');
            });
    }

    // Clear filters
    window.clearFilters = function() {
        if (elements.statusFilter) elements.statusFilter.value = '';
        if (elements.typeFilter) elements.typeFilter.value = '';
        if (elements.areaFilter) elements.areaFilter.value = '';
        
        applyFilters();
    };

    // Refresh requests
    window.refreshRequests = function() {
        window.location.reload();
    };

    // Update requests table
    function updateRequestsTable(requests) {
        if (!elements.requestsTable) return;

        const tbody = elements.requestsTable.querySelector('tbody');
        if (!tbody) return;

        tbody.innerHTML = requests.map(request => `
            <tr>
                <td>
                    <span class="badge ${request.requestType === 'NEW_OFFICE' ? 'badge-primary' : 'badge-info'}">
                        ${request.requestType}
                    </span>
                </td>
                <td>
                    <strong>${request.officeName}</strong>
                    <br>
                    <small class="text-muted">${request.area ? request.area.name : ''}</small>
                </td>
                <td>${request.requestedBy}</td>
                <td>
                    <span class="badge ${getStatusClass(request.status)}">
                        ${request.status}
                    </span>
                </td>
                <td>${formatDate(request.requestedAt)}</td>
                <td>${request.processedBy || '-'}</td>
                <td>
                    <div class="btn-group btn-group-sm">
                        <button type="button" class="btn btn-outline-primary" onclick="viewDetails(${request.id})">
                            <i class="fas fa-eye"></i>
                        </button>
                        ${request.status === 'PENDING' ? `
                            <button type="button" class="btn btn-outline-success" onclick="approveRequest(${request.id})">
                                <i class="fas fa-check"></i>
                            </button>
                            <button type="button" class="btn btn-outline-danger" onclick="rejectRequest(${request.id})">
                                <i class="fas fa-times"></i>
                            </button>
                        ` : ''}
                    </div>
                </td>
            </tr>
        `).join('');
    }

    // Get status badge class
    function getStatusClass(status) {
        switch (status) {
            case 'PENDING': return 'badge-warning';
            case 'APPROVED': return 'badge-success';
            case 'REJECTED': return 'badge-danger';
            default: return 'badge-secondary';
        }
    }

    // Format date
    function formatDate(dateString) {
        const date = new Date(dateString);
        return date.toLocaleString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    // Load pending count
    function loadPendingCount() {
        fetch('/approvals/api/pending-count')
            .then(response => response.json())
            .then(data => {
                updateApprovalBadge(data.count);
            })
            .catch(error => {
                console.error('Error loading pending count:', error);
            });
    }

    // Update approval badge
    function updateApprovalBadge(count) {
        if (!elements.approvalBadge) return;

        if (count > 0) {
            elements.approvalBadge.textContent = count > 9 ? '9+' : count;
            elements.approvalBadge.style.display = 'inline-block';
        } else {
            elements.approvalBadge.style.display = 'none';
        }
    }

    // Start real-time updates
    function startRealTimeUpdates() {
        // Update pending count every 30 seconds
        refreshInterval = setInterval(() => {
            loadPendingCount();
        }, 30000);

        // Setup SSE for real-time updates if EventSource is available
        if (window.EventSource) {
            setupSSE();
        }
    }

    // Setup Server-Sent Events for real-time updates
    function setupSSE() {
        try {
            const es = new EventSource('/api/approvals/stream');

            es.addEventListener('pending-count', function(e) {
                const count = parseInt(e.data) || 0;
                updateApprovalBadge(count);
            });

            es.addEventListener('new-request', function(e) {
                // Refresh the page to show new request
                setTimeout(() => {
                    window.location.reload();
                }, 1000);
            });

            es.onerror = function() {
                console.error('SSE connection error');
                setTimeout(() => setupSSE(), 5000);
            };

        } catch (error) {
            console.error('Error setting up SSE:', error);
        }
    }

    // Reset notes form
    function resetNotesForm() {
        currentRequestId = null;
        currentAction = null;
        if (elements.adminNotes) {
            elements.adminNotes.value = '';
        }
    }

    // Show success message
    function showSuccess(message) {
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

    // Show error message
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

    // Debounce function
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

    // Cleanup on page unload
    window.addEventListener('beforeunload', () => {
        if (refreshInterval) {
            clearInterval(refreshInterval);
        }
    });

    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();

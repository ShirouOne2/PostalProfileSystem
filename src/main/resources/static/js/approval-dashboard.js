// approval-dashboard.js - Approval Dashboard Management

let pendingRequests = [];
let currentRequestId = null;

// Load requests on page load
document.addEventListener('DOMContentLoaded', () => {
    loadPendingRequests();
    loadApprovalStats();
    
    // Auto refresh every 30 seconds
    setInterval(() => {
        loadPendingRequests();
        loadApprovalStats();
    }, 30000);
});

// Load pending requests
async function loadPendingRequests() {
    try {
        const response = await fetch('/approvals/api/pending');
        
        if (response.status === 401) {
            window.location.href = '/login';
            return;
        }
        
        pendingRequests = await response.json();
        renderPendingRequests();
        updatePendingCount();
        
    } catch (error) {
        console.error('Error loading pending requests:', error);
        Swal.fire({
            icon: 'error',
            title: 'Error',
            text: 'Failed to load pending requests',
            confirmButtonColor: '#d33'
        });
    }
}

// Load approval statistics
async function loadApprovalStats() {
    try {
        const response = await fetch('/approvals/api/stats');
        const stats = await response.json();
        
        document.getElementById('pendingCount').textContent = stats.pending || 0;
        document.getElementById('approvedCount').textContent = stats.approved || 0;
        document.getElementById('rejectedCount').textContent = stats.rejected || 0;
        
    } catch (error) {
        console.error('Error loading stats:', error);
    }
}

// Render pending requests table
function renderPendingRequests() {
    const tbody = document.getElementById('pendingRequestsBody');
    const emptyState = document.getElementById('noPendingRequests');
    
    if (pendingRequests.length === 0) {
        tbody.innerHTML = '';
        emptyState.style.display = 'block';
        return;
    }
    
    emptyState.style.display = 'none';
    
    tbody.innerHTML = pendingRequests.map(request => `
        <tr>
            <td>#${request.id}</td>
            <td>
                <span class="badge badge-${getRequestTypeClass(request.requestType)}">
                    ${getRequestTypeDisplay(request.requestType)}
                </span>
            </td>
            <td>
                <div class="user-info">
                    <div class="user-avatar">${getInitials(request.userName)}</div>
                    <div class="user-details">
                        <div class="user-name">${request.userName}</div>
                        <div class="user-email">${request.userEmail}</div>
                    </div>
                </div>
            </td>
            <td>${request.requestedBy}</td>
            <td>
                <button class="btn btn-sm btn-outline-primary" onclick="viewRequestDetails(${request.id})">
                    <i class="fas fa-eye"></i> View Changes
                </button>
            </td>
            <td>${formatDate(request.createdAt)}</td>
            <td>
                <div class="action-buttons">
                    <button class="btn-action btn-view" onclick="viewRequestDetails(${request.id})" title="View">
                        <i class="fas fa-eye"></i>
                    </button>
                    <button class="btn-action btn-edit" onclick="quickApprove(${request.id})" title="Quick Approve">
                        <i class="fas fa-check"></i>
                    </button>
                    <button class="btn-action btn-delete" onclick="quickReject(${request.id})" title="Quick Reject">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
            </td>
        </tr>
    `).join('');
}

// Update pending count
function updatePendingCount() {
    const count = pendingRequests.length;
    document.getElementById('pendingBadge').textContent = `${count} pending`;
    
    if (count > 0) {
        document.getElementById('pendingBadge').classList.add('bg-warning');
        document.getElementById('pendingBadge').classList.remove('bg-secondary');
    } else {
        document.getElementById('pendingBadge').classList.remove('bg-warning');
        document.getElementById('pendingBadge').classList.add('bg-secondary');
    }
}

// View request details
async function viewRequestDetails(requestId) {
    currentRequestId = requestId;
    const request = pendingRequests.find(r => r.id === requestId);
    
    if (!request) return;
    
    try {
        const response = await fetch(`/approvals/api/request/${requestId}`);
        const details = await response.json();
        
        const detailsHtml = `
            <div class="row">
                <div class="col-md-6">
                    <h6>Request Information</h6>
                    <table class="table table-sm">
                        <tr><td><strong>Request ID:</strong></td><td>#${details.id}</td></tr>
                        <tr><td><strong>Type:</strong></td><td>${getRequestTypeDisplay(details.requestType)}</td></tr>
                        <tr><td><strong>Status:</strong></td><td>${getStatusDisplay(details.status)}</td></tr>
                        <tr><td><strong>Created:</strong></td><td>${formatDate(details.createdAt)}</td></tr>
                        <tr><td><strong>Requested By:</strong></td><td>${details.requestedBy}</td></tr>
                    </table>
                </div>
                <div class="col-md-6">
                    <h6>User Information</h6>
                    <table class="table table-sm">
                        <tr><td><strong>Name:</strong></td><td>${details.userName}</td></tr>
                        <tr><td><strong>Email:</strong></td><td>${details.userEmail}</td></tr>
                        <tr><td><strong>Current Role:</strong></td><td>${details.currentRole || 'N/A'}</td></tr>
                        <tr><td><strong>Current Status:</strong></td><td>${details.currentStatus || 'N/A'}</td></tr>
                    </table>
                </div>
            </div>
            
            <div class="row mt-3">
                <div class="col-12">
                    <h6>Requested Changes</h6>
                    <div class="border rounded p-3 bg-light">
                        ${formatChanges(details.requestedChanges)}
                    </div>
                </div>
            </div>
            
            ${details.originalData ? `
            <div class="row mt-3">
                <div class="col-12">
                    <h6>Original Data</h6>
                    <div class="border rounded p-3 bg-light">
                        ${formatChanges(details.originalData)}
                    </div>
                </div>
            </div>
            ` : ''}
        `;
        
        document.getElementById('requestDetails').innerHTML = detailsHtml;
        document.getElementById('requestModal').classList.add('show');
        
    } catch (error) {
        console.error('Error loading request details:', error);
        Swal.fire({
            icon: 'error',
            title: 'Error',
            text: 'Failed to load request details',
            confirmButtonColor: '#d33'
        });
    }
}

// Quick approve request
async function quickApprove(requestId) {
    const result = await Swal.fire({
        title: 'Approve Request?',
        text: 'Are you sure you want to approve this request?',
        icon: 'question',
        showCancelButton: true,
        confirmButtonText: 'Yes, Approve',
        cancelButtonText: 'Cancel',
        confirmButtonColor: '#28a745',
        cancelButtonColor: '#6c757d'
    });
    
    if (!result.isConfirmed) return;
    
    await processApproval(requestId, 'approve');
}

// Quick reject request
async function quickReject(requestId) {
    const { value: notes } = await Swal.fire({
        title: 'Reject Request?',
        text: 'Please provide a reason for rejection:',
        icon: 'warning',
        input: 'textarea',
        inputPlaceholder: 'Enter rejection reason...',
        showCancelButton: true,
        confirmButtonText: 'Reject',
        cancelButtonText: 'Cancel',
        confirmButtonColor: '#d33',
        cancelButtonColor: '#6c757d',
        inputValidator: (value) => {
            if (!value) {
                return 'You must provide a rejection reason!';
            }
        }
    });
    
    if (notes) {
        await processApproval(requestId, 'reject', notes);
    }
}

// Approve request from modal
async function approveRequest() {
    const result = await Swal.fire({
        title: 'Approve Request?',
        text: 'Are you sure you want to approve this request?',
        icon: 'question',
        showCancelButton: true,
        confirmButtonText: 'Yes, Approve',
        cancelButtonText: 'Cancel',
        confirmButtonColor: '#28a745',
        cancelButtonColor: '#6c757d'
    });
    
    if (result.isConfirmed) {
        await processApproval(currentRequestId, 'approve');
        closeRequestModal();
    }
}

// Reject request from modal
async function rejectRequest() {
    const { value: notes } = await Swal.fire({
        title: 'Reject Request?',
        text: 'Please provide a reason for rejection:',
        icon: 'warning',
        input: 'textarea',
        inputPlaceholder: 'Enter rejection reason...',
        showCancelButton: true,
        confirmButtonText: 'Reject',
        cancelButtonText: 'Cancel',
        confirmButtonColor: '#d33',
        cancelButtonColor: '#6c757d',
        inputValidator: (value) => {
            if (!value) {
                return 'You must provide a rejection reason!';
            }
        }
    });
    
    if (notes) {
        await processApproval(currentRequestId, 'reject', notes);
        closeRequestModal();
    }
}

// Process approval/rejection
async function processApproval(requestId, action, notes = '') {
    try {
        const response = await fetch('/approvals/api/process', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                requestId: requestId,
                action: action,
                notes: notes
            })
        });
        
        const result = await response.json();
        
        if (result.success) {
            await Swal.fire({
                icon: 'success',
                title: action === 'approve' ? 'Approved!' : 'Rejected!',
                text: result.message,
                timer: 2000,
                showConfirmButton: false
            });
            
            // Refresh data
            loadPendingRequests();
            loadApprovalStats();
        } else {
            Swal.fire({
                icon: 'error',
                title: 'Failed',
                text: result.message,
                confirmButtonColor: '#d33'
            });
        }
        
    } catch (error) {
        console.error('Error processing approval:', error);
        Swal.fire({
            icon: 'error',
            title: 'Error',
            text: 'Failed to process approval',
            confirmButtonColor: '#d33'
        });
    }
}

// Close request modal
function closeRequestModal() {
    document.getElementById('requestModal').classList.remove('show');
    currentRequestId = null;
}

// Refresh requests
function refreshRequests() {
    loadPendingRequests();
    loadApprovalStats();
    
    // Show refresh animation
    const refreshBtn = event.target;
    refreshBtn.innerHTML = '<i class="fas fa-sync-alt fa-spin"></i> Refreshing...';
    refreshBtn.disabled = true;
    
    setTimeout(() => {
        refreshBtn.innerHTML = '<i class="fas fa-sync-alt"></i> Refresh';
        refreshBtn.disabled = false;
    }, 1000);
}

// Helper functions
function getRequestTypeClass(type) {
    const classes = {
        'CREATE_USER': 'success',
        'UPDATE_USER': 'primary',
        'DELETE_USER': 'danger'
    };
    return classes[type] || 'secondary';
}

function getRequestTypeDisplay(type) {
    const displays = {
        'CREATE_USER': 'Create User',
        'UPDATE_USER': 'Update User',
        'DELETE_USER': 'Delete User'
    };
    return displays[type] || type;
}

function getStatusDisplay(status) {
    const displays = {
        'PENDING': '<span class="badge bg-warning">Pending</span>',
        'AREA_ADMIN_APPROVED': '<span class="badge bg-info">Area Admin Approved</span>',
        'SRD_APPROVED': '<span class="badge bg-success">SRD Approved</span>',
        'AREA_ADMIN_REJECTED': '<span class="badge bg-danger">Rejected</span>',
        'SRD_REJECTED': '<span class="badge bg-danger">Rejected</span>'
    };
    return displays[status] || status;
}

function formatDate(dateString) {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleString();
}

function getInitials(name) {
    if (!name) return '?';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
}

function formatChanges(changes) {
    if (!changes) return 'No changes';
    
    try {
        const changesObj = typeof changes === 'string' ? JSON.parse(changes) : changes;
        
        return Object.entries(changesObj).map(([key, value]) => {
            return `<div class="mb-2">
                <strong>${key}:</strong> 
                <span class="text-primary">${value}</span>
            </div>`;
        }).join('');
    } catch (e) {
        return `<pre>${changes}</pre>`;
    }
}

// Logout function
async function logout() {
    const result = await Swal.fire({
        title: 'Logout?',
        text: 'Are you sure you want to logout?',
        icon: 'question',
        showCancelButton: true,
        confirmButtonText: 'Yes, Logout',
        cancelButtonText: 'Cancel',
        confirmButtonColor: '#3085d6',
        cancelButtonColor: '#6c757d'
    });

    if (result.isConfirmed) {
        window.location.href = '/logout';
    }
}

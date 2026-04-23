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
                        <tr><td><strong>Requested At:</strong></td><td>${formatDate(details.requestedAt)}</td></tr>
                        <tr><td><strong>Requested By:</strong></td><td>${details.requestedBy}</td></tr>
                        <tr><td><strong>Office:</strong></td><td>${details.officeName || 'N/A'}</td></tr>
                    </table>
                </div>
                <div class="col-md-6">
                    <h6>Approval Trail</h6>
                    <table class="table table-sm">
                        <tr><td><strong>Area Admin:</strong></td><td>${details.areaAdminProcessedBy || 'Pending'}</td></tr>
                        <tr><td><strong>Area Action Time:</strong></td><td>${formatDate(details.areaAdminProcessedAt)}</td></tr>
                        <tr><td><strong>Final Processor:</strong></td><td>${details.processedBy || 'Pending'}</td></tr>
                        <tr><td><strong>Final Action Time:</strong></td><td>${formatDate(details.processedAt)}</td></tr>
                    </table>
                </div>
            </div>
            
            <div class="row mt-3">
                <div class="col-12">
                    <h6>Requested Changes</h6>
                    <div class="border rounded p-3 bg-light">
                        ${formatChangesDiff(details.oldValues, details.newValues)}
                    </div>
                </div>
            </div>
            
            ${details.oldValues ? `
            <div class="row mt-3">
                <div class="col-12">
                    <h6>Original Data (Raw)</h6>
                    <div class="border rounded p-3 bg-light">
                        ${formatChanges(details.oldValues)}
                    </div>
                </div>
            </div>
            ` : ''}
        `;
        
        document.getElementById('requestDetails').innerHTML = detailsHtml;
        $('#requestModal').modal('show');
        
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
    $('#requestModal').modal('hide');
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
        'NEW_OFFICE': 'success',
        'EDIT_OFFICE': 'primary',
        'DELETE_OFFICE': 'danger'
    };
    return classes[type] || 'secondary';
}

function getRequestTypeDisplay(type) {
    const displays = {
        'NEW_OFFICE': 'New Office',
        'EDIT_OFFICE': 'Edit Office',
        'DELETE_OFFICE': 'Delete Office'
    };
    return displays[type] || type;
}

function getStatusDisplay(status) {
    const displays = {
        'PENDING': '<span class="badge bg-warning">Pending</span>',
        'AREA_APPROVED': '<span class="badge bg-info">Area Approved (Waiting SRD)</span>',
        'APPROVED': '<span class="badge bg-success">Approved</span>',
        'REJECTED': '<span class="badge bg-danger">Rejected</span>'
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

function formatChangesDiff(oldValues, newValues) {
    let oldObj = {};
    let newObj = {};

    try {
        oldObj = oldValues
            ? (typeof oldValues === 'string' ? JSON.parse(oldValues) : oldValues)
            : {};
    } catch (e) {
        oldObj = {};
    }

    try {
        newObj = newValues
            ? (typeof newValues === 'string' ? JSON.parse(newValues) : newValues)
            : {};
    } catch (e) {
        newObj = {};
    }

    // Only check keys that exist in newValues (fields that were actually edited)
    const editedKeys = Object.keys(newObj || {});
    
    const updatedFields = [];

    editedKeys.forEach((key) => {
        const oldVal = normalizeDiffValue(oldObj[key]);
        const newVal = normalizeDiffValue(newObj[key]);
        
        // Only include if the value actually changed
        if (oldVal !== newVal) {
            updatedFields.push({ key, oldVal, newVal });
        }
    });

    if (updatedFields.length === 0) {
        return '<div class="text-muted">No changes detected.</div>';
    }

    let html = '';

    // Show updated fields only
    html += `
        <div class="mb-3">
            <h6 class="text-primary font-weight-bold">
                <i class="fas fa-edit mr-1"></i>Updated Fields (${updatedFields.length})
            </h6>
            ${updatedFields.map(({ key, oldVal, newVal }) => `
                <div class="mb-2 p-3 border border-primary rounded bg-light">
                    <div class="font-weight-bold text-primary">${humanizeFieldName(key)}</div>
                    <div class="mt-1" style="font-size:12px;">
                        <div class="mb-1">
                            <span class="text-danger font-weight-bold">Before:</span> 
                            <span class="text-muted">${escapeHtml(oldVal)}</span>
                        </div>
                        <div>
                            <span class="text-success font-weight-bold">After:</span> 
                            <span class="text-dark">${escapeHtml(newVal)}</span>
                        </div>
                    </div>
                </div>
            `).join('')}
        </div>
    `;

    return html;
}

function normalizeDiffValue(value) {
    if (value === null || value === undefined || value === '') return 'N/A';
    if (typeof value === 'boolean') return value ? 'true' : 'false';
    return String(value).trim();
}

function humanizeFieldName(key) {
    const labels = {
        name: 'Post Office Name',
        postmaster: 'Postmaster',
        classification: 'Classification',
        serviceProvided: 'Service Provided',
        address: 'Address',
        zipCode: 'Zip Code',
        connectionStatus: 'Connection Status',
        officeStatus: 'Office Status',
        internetServiceProvider: 'Internet Service Provider',
        typeOfConnection: 'Type of Connection',
        speed: 'Speed',
        staticIpAddress: 'Static IP Address',
        noOfEmployees: 'No. of Employees',
        noOfPostalTellers: 'No. of Postal Tellers',
        noOfLetterCarriers: 'No. of Letter Carriers',
        postalOfficeContactPerson: 'Postal Office Contact Person',
        postalOfficeContactNumber: 'Postal Office Contact Number',
        ispContactPerson: 'ISP Contact Person',
        ispContactNumber: 'ISP Contact Number',
        remarks: 'Remarks',
        areaId: 'Area',
        regionId: 'Region',
        provinceId: 'Province',
        cityMunId: 'City / Municipality',
        barangayId: 'Barangay'
    };
    return labels[key] || key;
}

function escapeHtml(value) {
    return String(value)
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#39;');
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

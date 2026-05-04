// users.js - User Management with SweetAlert2

let users = [];
let editingUserId = null;

// Load users on page load
document.addEventListener('DOMContentLoaded', () => {
    loadUsers();

    // Setup form submit handler
    document.getElementById('userForm').addEventListener('submit', handleFormSubmit);
});

// Load all users
async function loadUsers() {
    try {
        // Show loading
        Swal.fire({
            title: 'Loading Users...',
            text: 'Please wait',
            allowOutsideClick: false,
            didOpen: () => {
                Swal.showLoading();
            }
        });

        const response = await fetch('/users/api/all');
        
        if (response.status === 401) {
            Swal.close();
            await Swal.fire({
                icon: 'warning',
                title: 'Session Expired',
                text: 'Please login again',
                confirmButtonText: 'Go to Login'
            });
            window.location.href = '/login';
            return;
        }

        users = await response.json();
        renderUsers();
        
        Swal.close();
        
        // Show success toast
        const Toast = Swal.mixin({
            toast: true,
            position: 'top-end',
            showConfirmButton: false,
            timer: 2000,
            timerProgressBar: true
        });
        
        Toast.fire({
            icon: 'success',
            title: `Loaded ${users.length} users`
        });
        
    } catch (error) {
        console.error('Error loading users:', error);
        Swal.fire({
            icon: 'error',
            title: 'Failed to Load Users',
            text: error.message,
            confirmButtonColor: '#d33'
        });
    }
}

// Render users table
function renderUsers() {
    const tbody = document.getElementById('usersTableBody');
    const emptyState = document.getElementById('emptyState');

    if (users.length === 0) {
        tbody.innerHTML = '';
        emptyState.style.display = 'block';
        return;
    }

    emptyState.style.display = 'none';

    tbody.innerHTML = users.map(user => `
        <tr>
            <td>${user.id}</td>
            <td>${user.name}</td>
            <td>${user.email}</td>
            <td>
                <span class="badge badge-${user.role.toLowerCase()}">${user.role}</span>
            </td>
            <td>
                <span class="badge badge-${user.active ? 'active' : 'inactive'}">
                    ${user.active ? 'Active' : 'Inactive'}
                </span>
            </td>
            <td>
                <div class="actions">
                    <button class="btn btn-warning" onclick="editUser(${user.id})">Edit</button>
                    <button class="btn btn-${user.active ? 'secondary' : 'success'}" 
                            onclick="toggleUserStatus(${user.id})">
                        ${user.active ? 'Deactivate' : 'Activate'}
                    </button>
                    <button class="btn btn-danger" onclick="deleteUser(${user.id})">Delete</button>
                </div>
            </td>
        </tr>
    `).join('');
}

// Show add user modal
function showAddModal() {
    editingUserId = null;
    document.getElementById('modalTitle').textContent = 'Add New User';
    document.getElementById('userForm').reset();
    document.getElementById('userId').value = '';
    document.getElementById('userPassword').required = true;
    document.getElementById('userActive').checked = true;
    document.getElementById('userModal').classList.add('show');
}

// Edit user
function editUser(id) {
    const user = users.find(u => u.id === id);
    if (!user) return;

    editingUserId = id;
    document.getElementById('modalTitle').textContent = 'Edit User';
    document.getElementById('userId').value = user.id;
    document.getElementById('userName').value = user.name;
    document.getElementById('userEmail').value = user.email;
    document.getElementById('userPassword').value = '';
    document.getElementById('userPassword').required = false;
    document.getElementById('userRole').value = user.role;
    document.getElementById('userActive').checked = user.active;
    document.getElementById('userModal').classList.add('show');
}

// Close modal
function closeModal() {
    document.getElementById('userModal').classList.remove('show');
    editingUserId = null;
}

// Handle form submit
async function handleFormSubmit(e) {
    e.preventDefault();

    const userData = {
        name: document.getElementById('userName').value,
        email: document.getElementById('userEmail').value,
        role: document.getElementById('userRole').value,
        active: document.getElementById('userActive').checked
    };

    const password = document.getElementById('userPassword').value;
    if (password) {
        userData.password = password;
    }

    // Show loading
    Swal.fire({
        title: editingUserId ? 'Submitting Update Request...' : 'Submitting Create Request...',
        text: 'Please wait',
        allowOutsideClick: false,
        didOpen: () => {
            Swal.showLoading();
        }
    });

    try {
        let response;

        if (editingUserId) {
            // Create approval request for user update
            response = await fetch('/users/api/request-update', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    userId: editingUserId,
                    changes: userData
                })
            });
        } else {
            // Create approval request for new user
            response = await fetch('/users/api/request-create', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(userData)
            });
        }

        const result = await response.json();

        if (result.success) {
            await Swal.fire({
                icon: 'success',
                title: 'Request Submitted!',
                text: result.message + ' Your request is now pending Area Admin approval.',
                timer: 3000,
                showConfirmButton: false
            });
            closeModal();
            loadUsers();
        } else {
            Swal.fire({
                icon: 'error',
                title: 'Failed',
                text: result.message,
                confirmButtonColor: '#d33'
            });
        }

    } catch (error) {
        console.error('Error submitting request:', error);
        Swal.fire({
            icon: 'error',
            title: 'Error',
            text: 'Failed to submit request',
            confirmButtonColor: '#d33'
        });
    }
}

// Toggle user status (active/inactive)
async function toggleUserStatus(id) {
    const user = users.find(u => u.id === id);
    if (!user) return;

    const result = await Swal.fire({
        title: user.active ? 'Deactivate User?' : 'Activate User?',
        text: user.active 
            ? `Are you sure you want to deactivate ${user.name}?` 
            : `Are you sure you want to activate ${user.name}?`,
        icon: 'question',
        showCancelButton: true,
        confirmButtonText: user.active ? 'Yes, Deactivate' : 'Yes, Activate',
        cancelButtonText: 'Cancel',
        confirmButtonColor: user.active ? '#d33' : '#28a745',
        cancelButtonColor: '#6c757d'
    });

    if (!result.isConfirmed) return;

    // Show loading
    Swal.fire({
        title: 'Updating...',
        text: 'Please wait',
        allowOutsideClick: false,
        didOpen: () => {
            Swal.showLoading();
        }
    });

    try {
        const response = await fetch(`/users/api/toggle-status/${id}`, {
            method: 'PUT'
        });

        const apiResult = await response.json();

        if (apiResult.success) {
            await Swal.fire({
                icon: 'success',
                title: 'Success!',
                text: apiResult.message,
                timer: 2000,
                showConfirmButton: false
            });
            loadUsers();
        } else {
            Swal.fire({
                icon: 'error',
                title: 'Failed',
                text: apiResult.message,
                confirmButtonColor: '#d33'
            });
        }

    } catch (error) {
        console.error('Error toggling user status:', error);
        Swal.fire({
            icon: 'error',
            title: 'Error',
            text: 'Failed to update user status',
            confirmButtonColor: '#d33'
        });
    }
}

// Delete user
async function deleteUser(id) {
    const user = users.find(u => u.id === id);
    if (!user) return;

    const result = await Swal.fire({
        title: 'Delete User?',
        html: `
            <p>Are you sure you want to delete <strong>${user.name}</strong>?</p>
            <p class="text-danger"><small>This action cannot be undone!</small></p>
        `,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'Yes, Delete',
        cancelButtonText: 'Cancel',
        confirmButtonColor: '#d33',
        cancelButtonColor: '#6c757d',
        focusCancel: true
    });

    if (!result.isConfirmed) return;

    // Show loading
    Swal.fire({
        title: 'Deleting...',
        text: 'Please wait',
        allowOutsideClick: false,
        didOpen: () => {
            Swal.showLoading();
        }
    });

    try {
        const response = await fetch(`/users/api/delete/${id}`, {
            method: 'DELETE'
        });

        const apiResult = await response.json();

        if (apiResult.success) {
            await Swal.fire({
                icon: 'success',
                title: 'Deleted!',
                text: apiResult.message,
                timer: 2000,
                showConfirmButton: false
            });
            loadUsers();
        } else {
            Swal.fire({
                icon: 'error',
                title: 'Failed',
                text: apiResult.message,
                confirmButtonColor: '#d33'
            });
        }

    } catch (error) {
        console.error('Error deleting user:', error);
        Swal.fire({
            icon: 'error',
            title: 'Error',
            text: 'Failed to delete user',
            confirmButtonColor: '#d33'
        });
    }
}

// Role change handler
function onRoleChange() {
    const roleSelect = document.getElementById('role');
    const selectedRole = roleSelect.value;
    
    // Get role name from value
    const roleNames = {
        '1': 'System Admin',
        '2': 'Area Admin', 
        '3': 'User',
        '4': 'SRD Operation'
    };
    
    const roleName = roleNames[selectedRole] || '';
    
    // Show role change notification
    if (selectedRole) {
        // You can add specific logic based on role selection
        console.log('Role changed to:', roleName);
        
        // Example: Show/hide certain fields based on role
        if (selectedRole === '1') {
            // System Admin specific logic
            console.log('System Admin selected - Full permissions');
        } else if (selectedRole === '2') {
            // Area Admin specific logic
            console.log('Area Admin selected - Area-specific permissions');
        } else if (selectedRole === '3') {
            // User specific logic
            console.log('User selected - Limited permissions');
        } else if (selectedRole === '4') {
            // SRD Operation specific logic
            console.log('SRD Operation selected - Search, Read, Delete permissions');
        }
    }
}

// Get role display name
function getRoleDisplayName(roleValue) {
    const roleNames = {
        '1': 'System Admin',
        '2': 'Area Admin',
        '3': 'User',
        '4': 'SRD Operation'
    };
    return roleNames[roleValue] || 'Unknown';
}

// Get role badge class
function getRoleBadgeClass(roleValue) {
    const badgeClasses = {
        '1': 'danger',    // System Admin - Red
        '2': 'warning',   // Area Admin - Orange
        '3': 'primary',    // User - Blue
        '4': 'info'       // SRD Operation - Light Blue
    };
    return badgeClasses[roleValue] || 'secondary';
}

// Logout
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

// Close modal when clicking outside
document.getElementById('userModal').addEventListener('click', (e) => {
    if (e.target.id === 'userModal') {
        closeModal();
    }
});
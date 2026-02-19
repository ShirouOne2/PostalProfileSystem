// Global variables
let usersTable;
let userModal;
let isEditMode = false;

// Initialize when document is ready
$(document).ready(function() {
    initializeDataTable();
    initializeModal();
    loadUsers();
    attachEventListeners();
});

// Initialize DataTable
function initializeDataTable() {
    usersTable = $('#usersTable').DataTable({
        responsive: true,
        pageLength: 10,
        lengthMenu: [[10, 25, 50, 100], [10, 25, 50, 100]],
        order: [[0, 'asc']],
        language: {
            search: "Search users:",
            lengthMenu: "Show _MENU_ users",
            info: "Showing _START_ to _END_ of _TOTAL_ users",
            infoEmpty: "No users found",
            infoFiltered: "(filtered from _MAX_ total users)",
            zeroRecords: "No matching users found",
            emptyTable: "No users available"
        },
        columnDefs: [
            { orderable: false, targets: 6 } // Actions column not sortable
        ]
    });
}

// Initialize Bootstrap Modal
function initializeModal() {
    userModal = new bootstrap.Modal(document.getElementById('userModal'));
}

// Attach event listeners
function attachEventListeners() {
    // Password strength checker
    $('#password').on('input', function() {
        checkPasswordStrength($(this).val());
        validatePasswordMatch();
    });

    // Confirm password validation
    $('#confirmPassword').on('input', validatePasswordMatch);

    // Remove invalid state on input
    $('.form-control, .form-select').on('input change', function() {
        $(this).removeClass('is-invalid');
    });
}

// Load all users
async function loadUsers() {
    showLoading(true);
    
    try {
        const response = await fetch('/api/users');
        
        if (!response.ok) {
            throw new Error('Failed to load users');
        }
        
        const users = await response.json();
        displayUsers(users);
        
    } catch (error) {
        console.error('Error loading users:', error);
        Swal.fire({
            icon: 'error',
            title: 'Error',
            text: 'Failed to load users. Please try again.',
            confirmButtonColor: '#667eea'
        });
    } finally {
        showLoading(false);
    }
}

// Display users in DataTable
function displayUsers(users) {
    usersTable.clear();
    
    if (users && users.length > 0) {
        users.forEach(user => {
            usersTable.row.add([
                createUserCell(user),
                user.username,
                user.email || 'N/A',
                createRoleBadge(user.role),
                user.areaId || 'N/A',
                createStatusBadge(user.enabled),
                createActionButtons(user.id)
            ]);
        });
    }
    
    usersTable.draw();
}

// Create user cell with avatar
function createUserCell(user) {
    const initial = user.username.charAt(0).toUpperCase();
    return `
        <div class="user-info">
            <div class="user-avatar">${initial}</div>
            <div class="user-details">
                <div class="user-name">${user.username}</div>
                <div class="user-email">${user.email || ''}</div>
            </div>
        </div>
    `;
}

// Create role badge
function createRoleBadge(roleId) {
    const roles = {
        1: 'Admin',
        2: 'User',
        3: 'Manager'
    };
    const roleName = roles[roleId] || 'Unknown';
    return `<span class="badge badge-role">${roleName}</span>`;
}

// Create status badge
function createStatusBadge(enabled) {
    if (enabled) {
        return '<span class="badge badge-active"><i class="fas fa-check-circle me-1"></i> Active</span>';
    } else {
        return '<span class="badge badge-inactive"><i class="fas fa-times-circle me-1"></i> Inactive</span>';
    }
}

// Create action buttons
function createActionButtons(userId) {
    return `
        <div class="action-buttons">
            <button class="btn-action btn-view" onclick="viewUser(${userId})" title="View">
                <i class="fas fa-eye"></i>
            </button>
            <button class="btn-action btn-edit" onclick="editUser(${userId})" title="Edit">
                <i class="fas fa-edit"></i>
            </button>
            <button class="btn-action btn-delete" onclick="deleteUser(${userId})" title="Delete">
                <i class="fas fa-trash"></i>
            </button>
        </div>
    `;
}

// Show Add User Modal
function showAddModal() {
    isEditMode = false;
    $('#userForm')[0].reset();
    $('#userId').val('');
    $('#isEdit').val('false');
    
    // Update modal title
    $('#modalTitle').html('<i class="fas fa-user-plus me-2"></i> Add New User');
    
    // Make password required for new users
    $('#password').prop('required', true);
    $('#confirmPassword').prop('required', true);
    $('#passwordRequired').show();
    $('#confirmRequired').show();
    $('#passwordHint').hide();
    
    // Clear validation states
    $('.form-control, .form-select').removeClass('is-invalid');
    $('#passwordStrengthBar').removeClass('weak medium strong').css('width', '0');
    $('#passwordStrengthText').text('');
    
    // Set defaults
    $('#status').val('active');
    
    userModal.show();
}

// View User Details
async function viewUser(userId) {
    showLoading(true);
    
    try {
        const response = await fetch(`/api/users/${userId}`);
        
        if (!response.ok) {
            throw new Error('User not found');
        }
        
        const user = await response.json();
        
        const roles = { 1: 'Admin', 2: 'User', 3: 'Manager' };
        
        Swal.fire({
            title: '<strong>User Details</strong>',
            html: `
                <div style="text-align: left; padding: 20px;">
                    <p><strong>ID:</strong> ${user.id}</p>
                    <p><strong>Username:</strong> ${user.username}</p>
                    <p><strong>Email:</strong> ${user.email || 'N/A'}</p>
                    <p><strong>Role:</strong> ${roles[user.role] || 'Unknown'}</p>
                    <p><strong>Area ID:</strong> ${user.areaId || 'N/A'}</p>
                    <p><strong>Status:</strong> ${user.enabled ? '<span style="color: #1cc88a;">Active</span>' : '<span style="color: #e74a3b;">Inactive</span>'}</p>
                </div>
            `,
            confirmButtonColor: '#667eea',
            confirmButtonText: 'Close'
        });
        
    } catch (error) {
        console.error('Error viewing user:', error);
        Swal.fire({
            icon: 'error',
            title: 'Error',
            text: 'Failed to load user details',
            confirmButtonColor: '#667eea'
        });
    } finally {
        showLoading(false);
    }
}

// Edit User
async function editUser(userId) {
    showLoading(true);
    
    try {
        const response = await fetch(`/api/users/${userId}`);
        
        if (!response.ok) {
            throw new Error('User not found');
        }
        
        const user = await response.json();
        
        // Set form values
        $('#userId').val(user.id);
        $('#isEdit').val('true');
        $('#username').val(user.username);
        $('#email').val(user.email);
        $('#role').val(user.role);
        $('#areaId').val(user.areaId || '');
        $('#status').val(user.enabled ? 'active' : 'inactive');
        
        // Clear password fields
        $('#password').val('');
        $('#confirmPassword').val('');
        
        // Make password optional for editing
        $('#password').prop('required', false);
        $('#confirmPassword').prop('required', false);
        $('#passwordRequired').hide();
        $('#confirmRequired').hide();
        $('#passwordHint').show();
        
        // Update modal title
        $('#modalTitle').html('<i class="fas fa-edit me-2"></i> Edit User');
        
        // Clear validation states
        $('.form-control, .form-select').removeClass('is-invalid');
        $('#passwordStrengthBar').removeClass('weak medium strong').css('width', '0');
        $('#passwordStrengthText').text('');
        
        isEditMode = true;
        userModal.show();
        
    } catch (error) {
        console.error('Error loading user:', error);
        Swal.fire({
            icon: 'error',
            title: 'Error',
            text: 'Failed to load user details',
            confirmButtonColor: '#667eea'
        });
    } finally {
        showLoading(false);
    }
}

// Save User (Create or Update)
async function saveUser() {
    // Validate form
    if (!validateForm()) {
        Swal.fire({
            icon: 'warning',
            title: 'Validation Error',
            text: 'Please fill in all required fields correctly',
            confirmButtonColor: '#667eea'
        });
        return;
    }
    
    const userId = $('#userId').val();
    const isEdit = $('#isEdit').val() === 'true';
    
    // Prepare data
    const userData = {
        username: $('#username').val().trim(),
        email: $('#email').val().trim(),
        role: parseInt($('#role').val()),
        status: $('#status').val() === 'active',
        areaId: $('#areaId').val() ? parseInt($('#areaId').val()) : null
    };
    
    // Add password only if provided
    const password = $('#password').val();
    if (password) {
        userData.password = password;
    }
    
    showLoading(true);
    
    try {
        const url = isEdit ? `/api/users/${userId}` : '/api/users';
        const method = isEdit ? 'PUT' : 'POST';
        
        const response = await fetch(url, {
            method: method,
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(userData)
        });
        
        const result = await response.json();
        
        if (response.ok) {
            userModal.hide();
            
            await Swal.fire({
                icon: 'success',
                title: 'Success!',
                text: isEdit ? 'User updated successfully' : 'User created successfully',
                confirmButtonColor: '#667eea',
                timer: 2000
            });
            
            loadUsers();
        } else {
            throw new Error(result.message || 'Failed to save user');
        }
        
    } catch (error) {
        console.error('Error saving user:', error);
        Swal.fire({
            icon: 'error',
            title: 'Error',
            text: error.message || 'Failed to save user. Please try again.',
            confirmButtonColor: '#667eea'
        });
    } finally {
        showLoading(false);
    }
}

// Delete User
async function deleteUser(userId) {
    const result = await Swal.fire({
        title: 'Are you sure?',
        text: "You won't be able to revert this!",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#e74a3b',
        cancelButtonColor: '#858796',
        confirmButtonText: 'Yes, delete it!',
        cancelButtonText: 'Cancel'
    });
    
    if (!result.isConfirmed) {
        return;
    }
    
    showLoading(true);
    
    try {
        const response = await fetch(`/api/users/${userId}`, {
            method: 'DELETE'
        });
        
        if (response.ok) {
            await Swal.fire({
                icon: 'success',
                title: 'Deleted!',
                text: 'User has been deleted.',
                confirmButtonColor: '#667eea',
                timer: 2000
            });
            
            loadUsers();
        } else {
            const result = await response.json();
            throw new Error(result.message || 'Failed to delete user');
        }
        
    } catch (error) {
        console.error('Error deleting user:', error);
        Swal.fire({
            icon: 'error',
            title: 'Error',
            text: error.message || 'Failed to delete user. Please try again.',
            confirmButtonColor: '#667eea'
        });
    } finally {
        showLoading(false);
    }
}

// Validate Form
function validateForm() {
    let isValid = true;
    
    // Clear previous validation
    $('.form-control, .form-select').removeClass('is-invalid');
    
    // Username validation
    const username = $('#username').val().trim();
    if (username.length < 3) {
        $('#username').addClass('is-invalid');
        isValid = false;
    }
    
    // Email validation
    const email = $('#email').val().trim();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        $('#email').addClass('is-invalid');
        isValid = false;
    }
    
    // Password validation (only if provided or for new users)
    const password = $('#password').val();
    const isEdit = $('#isEdit').val() === 'true';
    
    if (!isEdit || password) {
        if (password.length < 6) {
            $('#password').addClass('is-invalid');
            isValid = false;
        }
        
        // Confirm password
        if (!validatePasswordMatch()) {
            isValid = false;
        }
    }
    
    // Role validation
    if (!$('#role').val()) {
        $('#role').addClass('is-invalid');
        isValid = false;
    }
    
    // Status validation
    if (!$('#status').val()) {
        $('#status').addClass('is-invalid');
        isValid = false;
    }
    
    return isValid;
}

// Check password strength
function checkPasswordStrength(password) {
    const strengthBar = $('#passwordStrengthBar');
    const strengthText = $('#passwordStrengthText');
    
    if (!password || password.length === 0) {
        strengthBar.removeClass('weak medium strong').css('width', '0');
        strengthText.text('');
        return;
    }
    
    let strength = 0;
    
    if (password.length >= 6) strength++;
    if (password.length >= 10) strength++;
    if (/[a-z]/.test(password) && /[A-Z]/.test(password)) strength++;
    if (/\d/.test(password)) strength++;
    if (/[^A-Za-z0-9]/.test(password)) strength++;
    
    strengthBar.removeClass('weak medium strong');
    
    if (strength <= 2) {
        strengthBar.addClass('weak');
        strengthText.text('Weak password').css('color', '#e74a3b');
    } else if (strength <= 3) {
        strengthBar.addClass('medium');
        strengthText.text('Medium password').css('color', '#f6c23e');
    } else {
        strengthBar.addClass('strong');
        strengthText.text('Strong password').css('color', '#1cc88a');
    }
}

// Validate password match
function validatePasswordMatch() {
    const password = $('#password').val();
    const confirmPassword = $('#confirmPassword');
    
    if (confirmPassword.val() && password !== confirmPassword.val()) {
        confirmPassword.addClass('is-invalid');
        return false;
    } else {
        confirmPassword.removeClass('is-invalid');
        return true;
    }
}

// Show/Hide loading spinner
function showLoading(show) {
    if (show) {
        $('#loadingSpinner').addClass('show');
    } else {
        $('#loadingSpinner').removeClass('show');
    }
}
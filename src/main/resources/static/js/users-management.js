// ============================================================
// users-management.js — Bootstrap 4 + Area/Role fix
// ============================================================

let usersTable;
let isEditMode = false;

// Role map — matches CustomUserDetailsService
const ROLES = {
    1: 'System Admin',
    2: 'Area Admin',
    3: 'User',
    4: 'SRD Operation',
    5: 'Asset'
};

// Area map
const AREAS = {
    1: 'Area 1', 2: 'Area 2', 3: 'Area 3',
    4: 'Area 4', 5: 'Area 5', 6: 'Area 6',
    7: 'Area 7', 8: 'Area 8', 9: 'Area 9'
};

// ============================================================
// INIT
// ============================================================
$(document).ready(function () {
    initializeDataTable();
    loadUsers();
    attachEventListeners();
});

function initializeDataTable() {
    if ($.fn.DataTable.isDataTable('#usersTable')) {
        $('#usersTable').DataTable().destroy();
    }
    
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
            { targets: 0, width: '280px' }, // User info
            { targets: 1, width: '130px' }, // Role
            { targets: 2, width: '130px' }, // Access Level
            { targets: 3, width: '100px', className: 'dt-center' }, // Status
            { targets: 4, width: '120px', className: 'dt-center', orderable: false } // Actions
        ]
    });
}

function attachEventListeners() {
    $('#password').on('input', function () {
        checkPasswordStrength($(this).val());
        validatePasswordMatch();
    });
    $('#confirmPassword').on('input', validatePasswordMatch);
    $('.form-control').on('input change', function () {
        $(this).removeClass('is-invalid');
    });
}

// ============================================================
// LOAD & DISPLAY USERS
// ============================================================
async function loadUsers() {
    showLoading(true);
    try {
        const response = await fetch('/api/users');
        if (!response.ok) throw new Error('Failed to load users');
        const users = await response.json();
        displayUsers(users);
    } catch (error) {
        console.error('Error loading users:', error);
        Swal.fire({ icon: 'error', title: 'Error', text: 'Failed to load users. Please try again.', confirmButtonColor: '#667eea' });
    } finally {
        showLoading(false);
    }
}

function displayUsers(users) {
    usersTable.clear();
    if (users && users.length > 0) {
        users.forEach(user => {
            usersTable.row.add([
                createUserCell(user),
                createRoleBadge(user.role),
                getAreaLabel(user.role, user.areaId),
                createStatusBadge(user.enabled),
                createActionButtons(user.id)
            ]);
        });
    }
    usersTable.draw();
}

function createUserCell(user) {
    const initial = (user.username || '?').charAt(0).toUpperCase();
    return `
        <div class="user-info">
            <div class="user-avatar">${initial}</div>
            <div class="user-details">
                <div class="user-name">${user.username}</div>
                <div class="user-email">${user.email || ''}</div>
            </div>
        </div>`;
}

function createRoleBadge(roleId) {
    const colors = { 
        1: '#e74a3b', // System Admin
        2: '#f6c23e', // Area Admin
        3: '#1cc88a', // User
        4: '#36b9cc', // SRD Operation
        5: '#4e73df'  // Asset
    };
    const label  = ROLES[roleId] || 'Unknown';
    const color  = colors[roleId] || '#858796';
    return `<span class="badge" style="background:${color}; color:white; padding:3px 10px; border-radius:50px; font-weight:600; font-size:10px;">${label}</span>`;
}

function getAreaLabel(roleId, areaId) {
    if ((roleId === 1 || roleId === 4 || roleId === 5) && !areaId) {
        return '<span class="badge shadow-sm" style="background:#f8f9fc; color:#4e73df; border:1px solid #4e73df; padding:3px 10px; border-radius:50px; font-weight:600; font-size:10px;"><i class="fas fa-shield-alt mr-1"></i> Full Access</span>';
    }
    const label = areaId ? (AREAS[areaId] || 'Area ' + areaId) : 'N/A';
    return `<span class="badge badge-light border" style="padding:3px 10px; border-radius:50px; font-weight:600; font-size:10px; color:#5a5c69;">${label}</span>`;
}

function createStatusBadge(enabled) {
    return enabled
        ? '<span class="badge" style="background:#1cc88a; color:white; padding:4px 10px; border-radius:50px; font-weight:600; font-size:10px;"><i class="fas fa-check-circle mr-1"></i> Active</span>'
        : '<span class="badge" style="background:#e74a3b; color:white; padding:4px 10px; border-radius:50px; font-weight:600; font-size:10px;"><i class="fas fa-times-circle mr-1"></i> Inactive</span>';
}

function createActionButtons(userId) {
    return `
        <div class="action-buttons">
            <button class="btn-action btn-view"   onclick="viewUser(${userId})"   title="View">   <i class="fas fa-eye"></i>   </button>
            <button class="btn-action btn-edit"   onclick="editUser(${userId})"   title="Edit">   <i class="fas fa-edit"></i>  </button>
            <button class="btn-action btn-delete" onclick="deleteUser(${userId})" title="Delete"> <i class="fas fa-trash"></i> </button>
        </div>`;
}

// ============================================================
// AREA / ROLE DROPDOWN LOGIC
// ============================================================
function onRoleChange() {
    const role = parseInt($('#role').val());

    if (role === 1 || role === 4 || role === 5) {
        // System Admin / SRD Operation / Asset → Full Access pre-selected
        $('#areaGroup').show();
        $('#fullAccessOption').show();
        $('#areaId').val('0');
        $('#areaId').prop('required', false);
        $('#areaHintNormal').hide();
        $('#areaHintAdmin').show();
    } else if (role === 2 || role === 3) {
        // Area Admin / User → Area 1-9 only
        $('#areaGroup').show();
        $('#fullAccessOption').hide();
        if ($('#areaId').val() === '0') $('#areaId').val('');
        $('#areaId').prop('required', true);
        $('#areaHintAdmin').hide();
        $('#areaHintNormal').show();
    } else {
        $('#areaGroup').hide();
        $('#areaId').val('').prop('required', false);
        $('#areaHintNormal').hide();
        $('#areaHintAdmin').hide();
    }
}

// ============================================================
// AVATAR
// ============================================================
function previewAvatar(input) {
    if (input.files && input.files[0]) {
        const reader = new FileReader();
        reader.onload = function (e) {
            $('#avatarPreview').attr('src', e.target.result).show();
            $('#avatarPlaceholder').hide();
        };
        reader.readAsDataURL(input.files[0]);
    }
}

function resetAvatar() {
    $('#avatarPreview').attr('src', '').hide();
    $('#avatarPlaceholder').show();
    $('#avatarInput').val('');
}

// ============================================================
// SHOW ADD MODAL
// ============================================================
function showAddModal() {
    isEditMode = false;
    $('#userForm')[0].reset();
    $('#userId').val('');
    $('#isEdit').val('false');

    $('#modalTitle').html('<i class="fas fa-user-plus mr-2"></i> Add New User');

    // Password required for new user
    $('#password').prop('required', true);
    $('#confirmPassword').prop('required', true);
    $('#passwordRequired').show();
    $('#confirmRequired').show();
    $('#passwordHint').hide();

    // Clear validation
    $('.form-control').removeClass('is-invalid');
    $('#passwordStrengthBar').removeClass('weak medium strong').css('width', '0');
    $('#passwordStrengthText').text('');

    // Defaults
    $('#enabled').prop('checked', true);
    $('#role').val('');
    $('#areaGroup').hide();
    $('#areaId').val('');
    $('#areaHintNormal').hide();
    $('#areaHintAdmin').hide();

    resetAvatar();

    // ✅ Bootstrap 4
    $('#userModal').modal('show');
}

// ============================================================
// VIEW USER
// ============================================================
async function viewUser(userId) {
    showLoading(true);
    try {
        const response = await fetch(`/api/users/${userId}`);
        if (!response.ok) throw new Error('User not found');
        const user = await response.json();

        Swal.fire({
            title: '<strong>User Details</strong>',
            html: `
                <div style="text-align:left; padding:10px;">
                    <p><strong>ID:</strong> ${user.id}</p>
                    <p><strong>Username:</strong> ${user.username}</p>
                    <p><strong>Email:</strong> ${user.email || 'N/A'}</p>
                    <p><strong>Role:</strong> ${ROLES[user.role] || 'Unknown'}</p>
                    <p><strong>Area:</strong> ${getAreaLabel(user.role, user.areaId)}</p>
                    <p><strong>Status:</strong> ${user.enabled
                        ? '<span style="color:#1cc88a; font-weight:bold;">Active</span>'
                        : '<span style="color:#e74a3b; font-weight:bold;">Inactive</span>'}</p>
                </div>`,
            confirmButtonColor: '#667eea',
            confirmButtonText: 'Close'
        });
    } catch (error) {
        console.error('Error viewing user:', error);
        Swal.fire({ icon: 'error', title: 'Error', text: 'Failed to load user details', confirmButtonColor: '#667eea' });
    } finally {
        showLoading(false);
    }
}

// ============================================================
// EDIT USER
// ============================================================
async function editUser(userId) {
    showLoading(true);
    try {
        const response = await fetch(`/api/users/${userId}`);
        if (!response.ok) throw new Error('User not found');
        const user = await response.json();

        $('#userId').val(user.id);
        $('#isEdit').val('true');
        $('#username').val(user.username);
        $('#email').val(user.email);
        $('#enabled').prop('checked', user.enabled);

        // ✅ Set role first, then trigger dropdown logic
        $('#role').val(user.role);
        onRoleChange();

        // ✅ Set areaId after dropdown is shown
        if (user.role === 1) {
            $('#areaId').val(user.areaId ? user.areaId : '0');
        } else {
            $('#areaId').val(user.areaId || '');
        }

        // Password optional for edit
        $('#password').val('');
        $('#confirmPassword').val('');
        $('#password').prop('required', false);
        $('#confirmPassword').prop('required', false);
        $('#passwordRequired').hide();
        $('#confirmRequired').hide();
        $('#passwordHint').show();

        $('#modalTitle').html('<i class="fas fa-edit mr-2"></i> Edit User');

        $('.form-control').removeClass('is-invalid');
        $('#passwordStrengthBar').removeClass('weak medium strong').css('width', '0');
        $('#passwordStrengthText').text('');

        resetAvatar();
        isEditMode = true;

        // ✅ Bootstrap 4
        $('#userModal').modal('show');

    } catch (error) {
        console.error('Error loading user:', error);
        Swal.fire({ icon: 'error', title: 'Error', text: 'Failed to load user details', confirmButtonColor: '#667eea' });
    } finally {
        showLoading(false);
    }
}

// ============================================================
// SAVE USER
// ============================================================
async function saveUser() {
    if (!validateForm()) {
        Swal.fire({ icon: 'warning', title: 'Validation Error', text: 'Please fill in all required fields correctly.', confirmButtonColor: '#667eea' });
        return;
    }

    const userId  = $('#userId').val();
    const isEdit  = $('#isEdit').val() === 'true';
    const roleVal = parseInt($('#role').val());
    const areaVal = $('#areaId').val();

    // ✅ System Admin / SRD Operation / Asset + Full Access → areaId = null
    let areaId = null;
    if (roleVal !== 1 && roleVal !== 4 && roleVal !== 5) {
        areaId = areaVal ? parseInt(areaVal) : null;
    } else if (areaVal && areaVal !== '0') {
        areaId = parseInt(areaVal);
    }

    const userData = {
        username: $('#username').val().trim(),
        email:    $('#email').val().trim(),
        role:     roleVal,
        enabled:  $('#enabled').is(':checked'),
        areaId:   areaId
    };

    const password = $('#password').val();
    if (password) userData.password = password;

    showLoading(true);
    try {
        const url    = isEdit ? `/api/users/${userId}` : '/api/users';
        const method = isEdit ? 'PUT' : 'POST';

        const response = await fetch(url, {
            method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(userData)
        });

        const result = await response.json();

        if (response.ok) {
            // ✅ Bootstrap 4
            $('#userModal').modal('hide');

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
        Swal.fire({ icon: 'error', title: 'Error', text: error.message || 'Failed to save user. Please try again.', confirmButtonColor: '#667eea' });
    } finally {
        showLoading(false);
    }
}

// ============================================================
// DELETE USER
// ============================================================
async function deleteUser(userId) {
    const result = await Swal.fire({
        title: 'Are you sure?',
        text: "You won't be able to revert this!",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#e74a3b',
        cancelButtonColor:  '#858796',
        confirmButtonText:  'Yes, delete it!',
        cancelButtonText:   'Cancel'
    });
    if (!result.isConfirmed) return;

    showLoading(true);
    try {
        const response = await fetch(`/api/users/${userId}`, { method: 'DELETE' });
        if (response.ok) {
            await Swal.fire({ icon: 'success', title: 'Deleted!', text: 'User has been deleted.', confirmButtonColor: '#667eea', timer: 2000 });
            loadUsers();
        } else {
            const res = await response.json();
            throw new Error(res.message || 'Failed to delete user');
        }
    } catch (error) {
        console.error('Error deleting user:', error);
        Swal.fire({ icon: 'error', title: 'Error', text: error.message || 'Failed to delete user.', confirmButtonColor: '#667eea' });
    } finally {
        showLoading(false);
    }
}

// ============================================================
// VALIDATION
// ============================================================
function validateForm() {
    let isValid = true;
    $('.form-control').removeClass('is-invalid');

    // Username
    if ($('#username').val().trim().length < 3) {
        $('#username').addClass('is-invalid');
        isValid = false;
    }

    // Email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test($('#email').val().trim())) {
        $('#email').addClass('is-invalid');
        isValid = false;
    }

    // Password
    const password = $('#password').val();
    const isEdit   = $('#isEdit').val() === 'true';
    if (!isEdit || password) {
        if (password.length < 6) {
            $('#password').addClass('is-invalid');
            isValid = false;
        }
        if (!validatePasswordMatch()) isValid = false;
    }

    // Role required
    if (!$('#role').val()) {
        $('#role').addClass('is-invalid');
        isValid = false;
    }

    // Area required for Area Admin and User
    const role = parseInt($('#role').val());
    if ((role === 2 || role === 3) && !$('#areaId').val()) {
        $('#areaId').addClass('is-invalid');
        isValid = false;
    }

    return isValid;
}

function checkPasswordStrength(password) {
    const bar  = $('#passwordStrengthBar');
    const text = $('#passwordStrengthText');
    if (!password) { bar.removeClass('weak medium strong').css('width', '0'); text.text(''); return; }

    let strength = 0;
    if (password.length >= 6)  strength++;
    if (password.length >= 10) strength++;
    if (/[a-z]/.test(password) && /[A-Z]/.test(password)) strength++;
    if (/\d/.test(password))   strength++;
    if (/[^A-Za-z0-9]/.test(password)) strength++;

    bar.removeClass('weak medium strong');
    if      (strength <= 2) { bar.addClass('weak');   text.text('Weak password').css('color', '#e74a3b'); }
    else if (strength <= 3) { bar.addClass('medium'); text.text('Medium password').css('color', '#f6c23e'); }
    else                    { bar.addClass('strong'); text.text('Strong password').css('color', '#1cc88a'); }
}

function validatePasswordMatch() {
    const pw      = $('#password').val();
    const confirm = $('#confirmPassword');
    if (confirm.val() && pw !== confirm.val()) {
        confirm.addClass('is-invalid');
        return false;
    }
    confirm.removeClass('is-invalid');
    return true;
}

// ============================================================
// LOADING SPINNER
// ============================================================
function showLoading(show) {
    show ? $('#loadingSpinner').addClass('show') : $('#loadingSpinner').removeClass('show');
}

// ── Cleanup on navigation ────────────────────────────────────────────────
// Destroy DataTable instance before page unload to prevent memory leaks
// and double-binding issues when navigating back to this page.
window.addEventListener('beforeunload', function () {
    if (usersTable && $.fn.DataTable.isDataTable('#usersTable')) {
        usersTable.destroy();
    }
});
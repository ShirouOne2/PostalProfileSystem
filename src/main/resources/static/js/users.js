// users.js - User Management

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
        const response = await fetch('/users/api/all');
        
        if (response.status === 401) {
            window.location.href = '/login';
            return;
        }

        users = await response.json();
        renderUsers();
    } catch (error) {
        console.error('Error loading users:', error);
        showNotification('Failed to load users', 'error');
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

    try {
        let response;

        if (editingUserId) {
            // Update existing user
            response = await fetch(`/users/api/update/${editingUserId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(userData)
            });
        } else {
            // Add new user
            response = await fetch('/users/api/add', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(userData)
            });
        }

        const result = await response.json();

        if (result.success) {
            showNotification(result.message, 'success');
            closeModal();
            loadUsers();
        } else {
            showNotification(result.message, 'error');
        }

    } catch (error) {
        console.error('Error saving user:', error);
        showNotification('Failed to save user', 'error');
    }
}

// Toggle user status (active/inactive)
async function toggleUserStatus(id) {
    const user = users.find(u => u.id === id);
    if (!user) return;

    const confirmMsg = user.active 
        ? 'Are you sure you want to deactivate this user?' 
        : 'Are you sure you want to activate this user?';

    if (!confirm(confirmMsg)) return;

    try {
        const response = await fetch(`/users/api/toggle-status/${id}`, {
            method: 'PUT'
        });

        const result = await response.json();

        if (result.success) {
            showNotification(result.message, 'success');
            loadUsers();
        } else {
            showNotification(result.message, 'error');
        }

    } catch (error) {
        console.error('Error toggling user status:', error);
        showNotification('Failed to update user status', 'error');
    }
}

// Delete user
async function deleteUser(id) {
    if (!confirm('Are you sure you want to delete this user? This action cannot be undone.')) {
        return;
    }

    try {
        const response = await fetch(`/users/api/delete/${id}`, {
            method: 'DELETE'
        });

        const result = await response.json();

        if (result.success) {
            showNotification(result.message, 'success');
            loadUsers();
        } else {
            showNotification(result.message, 'error');
        }

    } catch (error) {
        console.error('Error deleting user:', error);
        showNotification('Failed to delete user', 'error');
    }
}

// Logout
function logout() {
    if (confirm('Are you sure you want to logout?')) {
        window.location.href = '/logout';
    }
}

// Show notification
function showNotification(message, type = 'error') {
    const existingNotification = document.querySelector('.notification');
    if (existingNotification) {
        existingNotification.remove();
    }

    const notification = document.createElement('div');
    notification.className = 'notification';
    notification.textContent = message;
    
    const styles = {
        position: 'fixed',
        top: '20px',
        right: '20px',
        padding: '15px 20px',
        borderRadius: '8px',
        color: 'white',
        fontWeight: '500',
        zIndex: '2000',
        animation: 'slideIn 0.3s ease-out',
        maxWidth: '300px',
        boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
    };

    Object.assign(notification.style, styles);

    if (type === 'error') {
        notification.style.background = '#e74c3c';
    } else if (type === 'success') {
        notification.style.background = '#27ae60';
    }

    document.body.appendChild(notification);

    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease-out';
        setTimeout(() => notification.remove(), 300);
    }, 4000);
}

// Add CSS animations
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from {
            transform: translateX(100%);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }

    @keyframes slideOut {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(100%);
            opacity: 0;
        }
    }
`;
document.head.appendChild(style);

// Close modal when clicking outside
document.getElementById('userModal').addEventListener('click', (e) => {
    if (e.target.id === 'userModal') {
        closeModal();
    }
});
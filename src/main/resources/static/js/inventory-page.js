// Inventory Page Specific JavaScript

// Set today's date
document.addEventListener('DOMContentLoaded', function() {
    const todayDateElement = document.getElementById('todayDate');
    if (todayDateElement) {
        todayDateElement.textContent = new Date().toLocaleDateString('en-PH', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    }
});

// Modal functions
function openModal() {
    const modalTitle = document.getElementById('modalTitle');
    const modalSub = document.getElementById('modalSub');
    const itemForm = document.getElementById('itemForm');
    const fId = document.getElementById('f-id');
    const modalOverlay = document.getElementById('modalOverlay');

    if (modalTitle) modalTitle.textContent = 'Add New Item';
    if (modalSub) modalSub.textContent = 'Fill in the asset details below';
    if (itemForm) itemForm.reset();
    if (fId) fId.value = '';
    if (modalOverlay) modalOverlay.classList.add('open');
}

function closeModal() {
    const modalOverlay = document.getElementById('modalOverlay');
    if (modalOverlay) {
        modalOverlay.classList.remove('open');
    }
}

function handleOverlayClick(event) {
    if (event.target === event.currentTarget) {
        closeModal();
    }
}

function openEdit(id, name, description, category, isServiceable, employeeId, dateAcquired, amount, createdBy) {
    const modalTitle = document.getElementById('modalTitle');
    const modalSub = document.getElementById('modalSub');
    const fId = document.getElementById('f-id');
    const fName = document.getElementById('f-name');
    const fDesc = document.getElementById('f-desc');
    const fCat = document.getElementById('f-cat');
    const fSvc = document.getElementById('f-svc');
    const fEmp = document.getElementById('f-emp');
    const fDate = document.getElementById('f-date');
    const fAmount = document.getElementById('f-amount');
    const fCreatedBy = document.getElementById('f-createdBy');
    const modalOverlay = document.getElementById('modalOverlay');

    if (modalTitle) modalTitle.textContent = 'Edit Item';
    if (modalSub) modalSub.textContent = 'Update the asset details below';
    if (fId) fId.value = id;
    if (fName) fName.value = name;
    if (fDesc) fDesc.value = description;
    if (fCat) fCat.value = category;
    if (fSvc) fSvc.value = isServiceable;
    if (fEmp) fEmp.value = employeeId;
    if (fDate) fDate.value = dateAcquired;
    if (fAmount) fAmount.value = amount;
    if (fCreatedBy) fCreatedBy.value = createdBy;
    if (modalOverlay) modalOverlay.classList.add('open');
}

// Initialize event listeners
document.addEventListener('DOMContentLoaded', function() {
    // Handle modal overlay clicks
    const modalOverlay = document.getElementById('modalOverlay');
    if (modalOverlay) {
        modalOverlay.addEventListener('click', handleOverlayClick);
    }

    // Handle close button clicks
    const modalCloseButtons = document.querySelectorAll('.modal-x');
    modalCloseButtons.forEach(button => {
        button.addEventListener('click', closeModal);
    });

    // Handle cancel button clicks
    const cancelButton = document.querySelector('button[onclick="closeModal()"]');
    if (cancelButton) {
        cancelButton.addEventListener('click', closeModal);
    }

    // Handle Edit button clicks
    document.querySelectorAll('.act-btn.edit').forEach(btn => {
        btn.addEventListener('click', function() {
            openEdit(
                this.getAttribute('data-id'),
                this.getAttribute('data-name'),
                this.getAttribute('data-desc'),
                this.getAttribute('data-cat'),
                this.getAttribute('data-svc'),
                this.getAttribute('data-emp'),
                this.getAttribute('data-date'),
                this.getAttribute('data-amt'),
                this.getAttribute('data-by')
            );
        });
    });

    // Handle Print Tag button clicks
    document.querySelectorAll('.act-btn.print').forEach(btn => {
        btn.addEventListener('click', function() {
            if (typeof openPrintTagModal === 'function') {
                openPrintTagModal(this.getAttribute('data-id'));
            }
        });
    });
});

// Debounce function for search
function debounceSubmit() {
    clearTimeout(window._debounceTimer);
    window._debounceTimer = setTimeout(() => {
        document.getElementById('filterForm').submit();
    }, 500);
}

// Export functions for global access
window.inventoryPage = {
    openModal,
    closeModal,
    handleOverlayClick,
    openEdit,
    debounceSubmit
};

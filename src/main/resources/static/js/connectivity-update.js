/**
 * Connectivity Update Handler - Java Spring Boot Version
 * Handles updating post office connectivity details with change tracking
 */

class ConnectivityUpdater {
    constructor() {
        this.init();
    }

    init() {
        this.bindEvents();
        this.setupValidation();
    }

    bindEvents() {
        // Form submission
        $(document).on('submit', '#connectivityUpdateForm', (e) => {
            e.preventDefault();
            this.updateConnectivity();
        });

        // Auto-update date fields based on connectivity status
        $(document).on('change', '#connectivityStatus', (e) => {
            this.handleStatusChange(e.target.value);
        });

        // Format speed input
        $(document).on('input', '#speed', (e) => {
            this.formatSpeedInput(e.target);
        });

        // Date picker initialization
        this.initDatePickers();
    }

    setupValidation() {
        // Add validation rules
        $('#connectivityUpdateForm').validate({
            rules: {
                connectivityStatus: {
                    required: true
                },
                speed: {
                    number: true,
                    min: 0
                }
            },
            messages: {
                connectivityStatus: {
                    required: 'Please select connectivity status'
                },
                speed: {
                    number: 'Please enter a valid number',
                    min: 'Speed must be greater than or equal to 0'
                }
            }
        });
    }

    initDatePickers() {
        $('#dateConnected, #dateNotConnected').datepicker({
            format: 'dd/mm/yyyy',
            autoclose: true,
            todayHighlight: true
        });
    }

    handleStatusChange(status) {
        const now = new Date();
        const formattedDate = this.formatDate(now);

        if (status === 'Connected' || status === 'Active') {
            $('#dateConnected').val(formattedDate).prop('readonly', true);
            $('#dateNotConnected').val('').prop('readonly', false);
        } else if (status === 'Disconnected' || status === 'Inactive') {
            $('#dateNotConnected').val(formattedDate).prop('readonly', true);
            $('#dateConnected').val('').prop('readonly', false);
        } else {
            $('#dateConnected, #dateNotConnected').prop('readonly', false);
        }
    }

    formatSpeedInput(input) {
        let value = input.value.replace(/[^\d.]/g, '');
        const parts = value.split('.');
        
        if (parts.length > 2) {
            value = parts[0] + '.' + parts.slice(1).join('');
        }
        
        if (parts[1] && parts[1].length > 2) {
            value = parts[0] + '.' + parts[1].substring(0, 2);
        }
        
        input.value = value;
    }

    formatDate(date) {
        const day = String(date.getDate()).padStart(2, '0');
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const year = date.getFullYear();
        return `${day}/${month}/${year}`;
    }

    async updateConnectivity() {
        if (!$('#connectivityUpdateForm').valid()) {
            this.showNotification('Please fix the validation errors', 'error');
            return;
        }

        const form = $('#connectivityUpdateForm');
        const postOfficeId = form.find('input[name="id"]').val();
        
        if (!postOfficeId) {
            this.showNotification('Missing post office ID', 'error');
            return;
        }

        // Show loading
        this.showLoading();

        try {
            // Collect form data
            const updateData = this.collectFormData(form);
            
            // Send update request
            const response = await fetch('/api/connectivity/update', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Requested-With': 'XMLHttpRequest'
                },
                body: JSON.stringify(updateData)
            });

            const result = await response.json();

            if (result.success) {
                this.showSuccessMessage(result);
                this.updateUIAfterSuccess(result.changes);
            } else {
                this.showNotification(result.message || 'Update failed', 'error');
            }

        } catch (error) {
            console.error('Update error:', error);
            this.showNotification('Network error occurred', 'error');
        } finally {
            this.hideLoading();
        }
    }

    collectFormData(form) {
        const data = {
            id: parseInt(form.find('input[name="id"]').val())
        };

        // Collect all connectivity fields
        const fields = [
            'connectivityStatus',
            'internetServiceProvider', 
            'speed',
            'isWired',
            'isShared',
            'isFree',
            'dateConnected',
            'dateNotConnected',
            'staticIpAddress',
            'remarks'
        ];

        fields.forEach(field => {
            const element = form.find(`[name="${field}"]`);
            if (element.length > 0) {
                if (element.is(':checkbox')) {
                    data[field] = element.is(':checked') ? 'Yes' : 'No';
                } else {
                    data[field] = element.val();
                }
            }
        });

        return data;
    }

    showSuccessMessage(result) {
        let message = result.message;
        
        if (result.changes && result.changes.length > 0) {
            message += '<br><br><strong>Changes made:</strong><ul>';
            result.changes.forEach(change => {
                message += `<li><strong>${change.display_name}:</strong> "${change.old_value}" → "${change.new_value}"</li>`;
            });
            message += '</ul>';
        }

        Swal.fire({
            title: 'Success!',
            html: message,
            icon: 'success',
            confirmButtonText: 'OK',
            confirmButtonClass: 'btn btn-success'
        });
    }

    updateUIAfterSuccess(changes) {
        // Update any UI elements that might need refreshing
        changes.forEach(change => {
            const element = $(`[data-field="${change.field}"]`);
            if (element.length > 0) {
                element.text(change.new_value);
            }
        });

        // Trigger any custom events
        $(document).trigger('connectivity:updated', {
            changes: changes,
            timestamp: new Date()
        });

        // Close modal if it exists
        const modal = $('#connectivityUpdateModal');
        if (modal.length > 0) {
            modal.modal('hide');
        }
    }

    showNotification(message, type = 'info') {
        const toast = Swal.mixin({
            toast: true,
            position: 'top-end',
            showConfirmButton: false,
            timer: 3000,
            timerProgressBar: true
        });

        toast.fire({
            icon: type,
            title: message
        });
    }

    showLoading() {
        // Show loading spinner
        const loadingHtml = `
            <div class="loading-overlay">
                <div class="spinner-border text-primary" role="status">
                    <span class="sr-only">Loading...</span>
                </div>
                <div class="mt-2">Updating connectivity details...</div>
            </div>
        `;

        $('body').append(loadingHtml);
        $('.loading-overlay').fadeIn();
    }

    hideLoading() {
        $('.loading-overlay').fadeOut(() => {
            $('.loading-overlay').remove();
        });
    }

    // Utility method to open connectivity update modal
    openUpdateModal(postOfficeId) {
        // Load post office data and open modal
        this.loadPostOfficeData(postOfficeId).then(data => {
            this.populateForm(data);
            $('#connectivityUpdateModal').modal('show');
        });
    }

    async loadPostOfficeData(postOfficeId) {
        try {
            const response = await fetch(`/api/postoffice/${postOfficeId}`);
            if (!response.ok) throw new Error('Failed to load post office data');
            return await response.json();
        } catch (error) {
            console.error('Load error:', error);
            this.showNotification('Failed to load post office data', 'error');
            throw error;
        }
    }

    populateForm(data) {
        const form = $('#connectivityUpdateForm');
        
        // Set ID
        form.find('input[name="id"]').val(data.id);
        
        // Populate all fields
        Object.keys(data).forEach(key => {
            const element = form.find(`[name="${key}"]`);
            if (element.length > 0) {
                if (element.is(':checkbox')) {
                    element.prop('checked', data[key] === 'Yes' || data[key] === true);
                } else {
                    element.val(data[key] || '');
                }
            }
        });

        // Handle status change
        if (data.connectivityStatus) {
            this.handleStatusChange(data.connectivityStatus);
        }
    }
}

// Initialize when document is ready
$(document).ready(() => {
    window.connectivityUpdater = new ConnectivityUpdater();
});

// Global function for opening update modal (can be called from other scripts)
window.openConnectivityUpdateModal = (postOfficeId) => {
    if (window.connectivityUpdater) {
        window.connectivityUpdater.openUpdateModal(postOfficeId);
    }
};

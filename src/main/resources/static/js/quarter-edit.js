/**
 * Quarter Edit Modal - Java Spring Boot Version
 * Handles simplified quarter-specific post office editing functionality
 */

class QuarterEditor {
    constructor() {
        this.init();
    }

    init() {
        this.bindEvents();
        this.setupValidation();
    }

    bindEvents() {
        // Form submission
        $(document).on('submit', '#editQuarterForm', (e) => {
            e.preventDefault();
            this.submitQuarterForm();
        });

        // Modal events
        $('#editQuarterModal').on('show.bs.modal', () => {
            this.prepareModal();
        });

        $('#editQuarterModal').on('hidden.bs.modal', () => {
            this.cleanupModal();
        });
    }

    setupValidation() {
        $('#editQuarterForm').validate({
            rules: {
                'PROVINCE': {
                    required: false
                },
                'INTERNET_SERVICE_PROVIDER': {
                    required: false
                },
                'STATIC_IP_ADDRESS': {
                    required: false,
                    ipv4: true
                },
                'SPEED': {
                    required: false,
                    min: 0
                },
                'SERVICES_PROVIDED': {
                    required: false
                },
                'CONNECTIVITY_STATUS': {
                    required: false
                }
            },
            messages: {
                'STATIC_IP_ADDRESS': {
                    ipv4: 'Please enter a valid IP address'
                },
                'SPEED': {
                    min: 'Speed must be 0 or greater'
                }
            }
        });

        // Add custom IP validation method
        $.validator.addMethod('ipv4', function(value, element) {
            return this.optional(element) || /^(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/.test(value);
        }, 'Please enter a valid IP address');
    }

    async submitQuarterForm() {
        if (!$('#editQuarterForm').valid()) {
            this.showCustomErrorAlert('Please fix the validation errors');
            return;
        }

        const formData = new FormData($('#editQuarterForm')[0]);
        
        this.showLoading();

        try {
            const response = await fetch('/quarter/edit', {
                method: 'POST',
                headers: {
                    'X-Requested-With': 'XMLHttpRequest',
                    'Accept': 'application/json'
                },
                body: formData
            });

            const result = await response.json();

            if (result.success) {
                this.showCustomSuccessAlert(result.message || 'Quarter record updated successfully!', () => {
                    this.closeModal();
                    this.triggerRefresh();
                });
            } else {
                this.showCustomErrorAlert(result.message || 'Update failed');
            }

        } catch (error) {
            console.error('Update error:', error);
            this.showCustomErrorAlert('An error occurred while updating the record');
        } finally {
            this.hideLoading();
        }
    }

    async loadQuarterPostOfficeData(postOfficeId) {
        try {
            const response = await fetch(`/quarter/${postOfficeId}`);
            if (!response.ok) throw new Error('Failed to load post office data');
            return await response.json();
        } catch (error) {
            console.error('Load error:', error);
            this.showCustomErrorAlert('Failed to load post office data');
            throw error;
        }
    }

    async openQuarterEditModal(postOfficeId) {
        try {
            // Load post office data
            const response = await this.loadQuarterPostOfficeData(postOfficeId);
            const data = response.data;
            
            // Populate form
            this.populateQuarterForm(data);
            
            // Show modal
            $('#editQuarterModal').modal('show');
            
        } catch (error) {
            console.error('Error opening quarter edit modal:', error);
        }
    }

    populateQuarterForm(data) {
        const setVal = (id, value) => {
            const el = document.getElementById(id);
            if (el) {
                // For select dropdowns, ensure we match the exact option value
                if (el.tagName === 'SELECT') {
                    // Try to find exact match first
                    let optionFound = false;
                    for (let i = 0; i < el.options.length; i++) {
                        if (el.options[i].value === value) {
                            el.selectedIndex = i;
                            optionFound = true;
                            break;
                        }
                    }
                    // If no exact match, try case-insensitive match
                    if (!optionFound && value) {
                        const upperValue = value.toString().toUpperCase();
                        for (let i = 0; i < el.options.length; i++) {
                            if (el.options[i].value.toUpperCase() === upperValue) {
                                el.selectedIndex = i;
                                optionFound = true;
                                break;
                            }
                        }
                    }
                    // If still no match, set to first option (empty)
                    if (!optionFound) {
                        el.selectedIndex = 0;
                    }
                } else {
                    el.value = value !== undefined && value !== null ? value : '';
                }
            }
        };

        // Set record ID
        setVal('editQuarterRecordId', data.P_O_ID ?? data.p_o_id ?? '');
        
        // Basic Information (read-only fields)
        setVal('editQuarterAREA', data.AREA ?? data.area ?? '');
        setVal('editQuarterPOSTAL_OFFICE', data.POSTAL_OFFICE ?? data.postal_office ?? '');
        
        // Editable fields
        setVal('editQuarterPROVINCE', data.PROVINCE ?? data.province ?? '');
        setVal('editQuarterINTERNET_SERVICE_PROVIDER', data.INTERNET_SERVICE_PROVIDER ?? data.internet_service_provider ?? '');
        setVal('editQuarterSTATIC_IP_ADDRESS', data.STATIC_IP_ADDRESS ?? data.static_ip_address ?? '');
        setVal('editQuarterREMARKS', data.REMARKS ?? data.remarks ?? '');

        // Normalize date values to YYYY-MM-DD when possible
        const formatDate = (val) => {
            if (!val) return '';
            const d = new Date(val);
            if (isNaN(d.getTime())) return '';
            return d.toISOString().slice(0, 10);
        };
        
        const dateConnected = formatDate(data.DATE_CONNECTED ?? data.date_connected ?? data.CONNECTED_AT ?? data.connected_at ?? '');
        const dateNotConnected = formatDate(data.DATE_NOT_CONNECTED ?? data.date_not_connected ?? data.DATE_DISCONNECTED ?? data.DISCONNECTED_AT ?? data.disconnected_at ?? '');

        setVal('editQuarterSPEED', data.SPEED ?? data.speed ?? '');
        setVal('editQuarterSERVICES_PROVIDED', data.SERVICES_PROVIDED ?? data.services_provided ?? '');
        setVal('editQuarterCONNECTIVITY_STATUS', data.CONNECTIVITY_STATUS ?? data.connectivity_status ?? '');
        setVal('editQuarterDATE_CONNECTED', dateConnected);
        setVal('editQuarterDATE_NOT_CONNECTED', dateNotConnected);

        // Radio helpers for YES/NO fields
        const setRadio = (name, value) => {
            const upper = (value || '').toString().toUpperCase();
            const yes = document.getElementById(`editQuarter${name}_YES`);
            const no = document.getElementById(`editQuarter${name}_NO`);
            if (yes && no) {
                if (upper === 'YES') {
                    yes.checked = true;
                } else if (upper === 'NO') {
                    no.checked = true;
                } else {
                    yes.checked = false;
                    no.checked = false;
                }
            }
        };

        setRadio('IS_WIRED', data.IS_WIRED ?? data.is_wired ?? '');
        setRadio('IS_SHARED', data.IS_SHARED ?? data.is_shared ?? '');
        setRadio('IS_FREE', data.IS_FREE ?? data.is_free ?? '');
    }

    showCustomSuccessAlert(message, callback) {
        const alertHtml = `
            <div id="customSuccessAlert" class="custom-alert-overlay">
                <div class="custom-alert-modal custom-alert-success">
                    <div class="custom-alert-icon">
                        <div class="success-checkmark">
                            <div class="check-icon"></div>
                        </div>
                    </div>
                    <div class="custom-alert-content">
                        <h3 class="custom-alert-title">Success!</h3>
                        <p class="custom-alert-message">${message}</p>
                    </div>
                    <div class="custom-alert-buttons">
                        <button class="custom-alert-btn custom-alert-btn-primary" onclick="closeCustomSuccessAlert()">OK</button>
                    </div>
                </div>
            </div>
        `;
        
        // Add to container
        const container = document.getElementById('customAlertContainer');
        if (container) {
            container.innerHTML = alertHtml;
        } else {
            document.body.insertAdjacentHTML('beforeend', alertHtml);
        }
        
        // Set callback if provided
        if (callback && typeof callback === 'function') {
            window.customSuccessCallback = callback;
        }
        
        // Animate in
        setTimeout(() => {
            const alert = document.getElementById('customSuccessAlert');
            if (alert) {
                alert.classList.add('show');
            }
        }, 100);
    }

    showCustomErrorAlert(message) {
        const alertHtml = `
            <div id="customErrorAlert" class="custom-alert-overlay">
                <div class="custom-alert-modal custom-alert-error">
                    <div class="custom-alert-icon">
                        <div class="error-icon">
                            <div class="error-x"></div>
                        </div>
                    </div>
                    <div class="custom-alert-content">
                        <h3 class="custom-alert-title">Error!</h3>
                        <p class="custom-alert-message">${message}</p>
                    </div>
                    <div class="custom-alert-buttons">
                        <button class="custom-alert-btn custom-alert-btn-danger" onclick="closeCustomErrorAlert()">OK</button>
                    </div>
                </div>
            </div>
        `;
        
        // Add to container
        const container = document.getElementById('customAlertContainer');
        if (container) {
            container.innerHTML = alertHtml;
        } else {
            document.body.insertAdjacentHTML('beforeend', alertHtml);
        }
        
        // Animate in
        setTimeout(() => {
            const alert = document.getElementById('customErrorAlert');
            if (alert) {
                alert.classList.add('show');
            }
        }, 100);
    }

    closeCustomSuccessAlert() {
        const alert = document.getElementById('customSuccessAlert');
        if (alert) {
            alert.classList.remove('show');
            setTimeout(() => {
                alert.remove();
                // Execute callback if exists
                if (window.customSuccessCallback && typeof window.customSuccessCallback === 'function') {
                    window.customSuccessCallback();
                    window.customSuccessCallback = null;
                }
            }, 300);
        }
    }

    closeCustomErrorAlert() {
        const alert = document.getElementById('customErrorAlert');
        if (alert) {
            alert.classList.remove('show');
            setTimeout(() => {
                alert.remove();
            }, 300);
        }
    }

    prepareModal() {
        // Clear any previous validation errors
        $('#editQuarterForm').validate().resetForm();
        $('.error').removeClass('error');
    }

    cleanupModal() {
        // Clear any custom alerts
        const container = document.getElementById('customAlertContainer');
        if (container) {
            container.innerHTML = '';
        }
    }

    closeModal() {
        $('#editQuarterModal').modal('hide');
    }

    showLoading() {
        // You can add a loading overlay if needed
        console.log('Loading...');
    }

    hideLoading() {
        console.log('Loading complete');
    }

    triggerRefresh() {
        // Trigger custom event for table refresh
        $(document).trigger('quarter:updated', {
            timestamp: new Date()
        });
    }
}

// Initialize when document is ready
$(document).ready(() => {
    window.quarterEditor = new QuarterEditor();
});

// Global function for opening quarter edit modal (can be called from other scripts)
window.openQuarterEditModal = (postOfficeId) => {
    if (window.quarterEditor) {
        window.quarterEditor.openQuarterEditModal(postOfficeId);
    }
};

// Global functions for custom alerts (to be called from onclick handlers)
window.closeCustomSuccessAlert = () => {
    if (window.quarterEditor) {
        window.quarterEditor.closeCustomSuccessAlert();
    }
};

window.closeCustomErrorAlert = () => {
    if (window.quarterEditor) {
        window.quarterEditor.closeCustomErrorAlert();
    }
};

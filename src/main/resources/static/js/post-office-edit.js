/**
 * Post Office Edit Modal - Java Spring Boot Version
 * Handles comprehensive post office editing functionality
 */

class PostOfficeEditor {
    constructor() {
        this.init();
    }

    init() {
        this.bindEvents();
        this.loadDropdownData();
        this.setupValidation();
        this.initializePillInputs();
    }

    bindEvents() {
        // Form submission
        $(document).on('submit', '#editForm', (e) => {
            e.preventDefault();
            this.submitEditForm();
        });

        // Connectivity status change
        $(document).on('change', '#editCONNECTIVITY_STATUS', (e) => {
            this.toggleDateFields(e.target.value);
        });

        // Connection type change
        $(document).on('change', '#editCONNECTION_TYPE', (e) => {
            this.handleConnectionTypeChange(e.target.value);
        });

        // Radio button changes for TYPE_OF_CONNECTION
        $(document).on('change', 'input[name="IS_WIRED"], input[name="IS_SHARED"], input[name="IS_FREE"]', () => {
            this.updateTypeOfConnectionHidden();
        });

        // Modal events
        $('#editModal').on('show.bs.modal', () => {
            this.prepareModal();
        });

        $('#editModal').on('hidden.bs.modal', () => {
            this.cleanupModal();
        });
    }

    async loadDropdownData() {
        try {
            // Load areas
            const areasResponse = await fetch('/api/areas');
            if (areasResponse.ok) {
                const areas = await areasResponse.json();
                this.populateDatalist('areaListEdit', areas);
            }

            // Load regions (mock data for now - add endpoint if needed)
            this.populateDatalist('regionListEdit', [
                'NCR', 'Region I', 'Region II', 'Region III', 'Region IV-A', 'Region IV-B',
                'Region V', 'Region VI', 'Region VII', 'Region VIII', 'Region IX',
                'Region X', 'Region XI', 'Region XII', 'Region XIII', 'CAR', 'BARMM', 'MIMAROPA'
            ]);

            // Load provinces (mock data for now - add endpoint if needed)
            this.populateDatalist('provinceListEdit', [
                'Metro Manila', 'Cavite', 'Laguna', 'Batangas', 'Rizal', 'Quezon',
                'Bulacan', 'Pampanga', 'Tarlac', 'Zambales', 'Nueva Ecija',
                'Cebu', 'Bohol', 'Negros Oriental', 'Siquijor',
                'Davao del Sur', 'Davao del Norte', 'Davao Oriental', 'Compostela Valley'
            ]);

            // Load cities (mock data for now - add endpoint if needed)
            this.populateDatalist('cityListEdit', [
                'Manila', 'Quezon City', 'Caloocan', 'Davao City', 'Cebu City',
                'Zamboanga City', 'Antipolo', 'Taguig', 'Pasig', 'Cagayan de Oro',
                'Parañaque', 'Makati', 'Mandaluyong', 'San Juan', 'Las Piñas'
            ]);

            // Load barangays (mock data for now - add endpoint if needed)
            this.populateDatalist('barangayListEdit', [
                'Barangay 1', 'Barangay 2', 'Barangay 3', 'Barangay 4', 'Barangay 5'
            ]);

        } catch (error) {
            console.error('Error loading dropdown data:', error);
        }
    }

    populateDatalist(datalistId, items) {
        const datalist = document.getElementById(datalistId);
        if (datalist) {
            datalist.innerHTML = '';
            items.forEach(item => {
                const option = document.createElement('option');
                option.value = item;
                datalist.appendChild(option);
            });
        } else {
            console.warn(`Datalist element not found: ${datalistId}`);
        }
    }

    setupValidation() {
        $('#editForm').validate({
            rules: {
                'AREA': {
                    required: true
                },
                'POSTAL_OFFICE': {
                    required: true
                },
                'ADDRESS_LINE': {
                    required: true
                },
                // Only numeric validations, no required fields for these
                'LATITUDE': {
                    range: [-90, 90]
                },
                'LONGITUDE': {
                    range: [-180, 180]
                },
                'Employees': {
                    min: 0
                },
                'SPEED': {
                    min: 0
                }
            },
            messages: {
                'AREA': {
                    required: 'Area is required'
                },
                'POSTAL_OFFICE': {
                    required: 'Postal office name is required'
                },
                'ADDRESS_LINE': {
                    required: 'Address line is required'
                },
                'LATITUDE': {
                    range: 'Please enter a valid latitude (-90 to 90)'
                },
                'LONGITUDE': {
                    range: 'Please enter a valid longitude (-180 to 180)'
                },
                'Employees': {
                    min: 'Employees must be 0 or greater'
                },
                'SPEED': {
                    min: 'Speed must be 0 or greater'
                }
            }
        });
    }

    async submitEditForm() {
        if (!$('#editForm').valid()) {
            this.showNotification('Please fix the validation errors', 'error');
            return;
        }

        // Ensure TYPE_OF_CONNECTION is updated
        this.updateTypeOfConnectionHidden();

        // Create FormData manually, excluding empty file inputs
        const formData = new FormData();
        const form = document.getElementById('editForm');
        
        // Add all form elements except empty file inputs
        Array.from(form.elements).forEach(element => {
            if (element.name) {
                if (element.type === 'file') {
                    // Only add file inputs that have files selected
                    if (element.files && element.files.length > 0) {
                        // Only take the FIRST file to prevent FileCountLimitExceededException
                        formData.append(element.name, element.files[0]);
                    }
                } else if (element.type === 'checkbox' || element.type === 'radio') {
                    if (element.checked) {
                        formData.append(element.name, element.value);
                    }
                } else if (element.tagName !== 'BUTTON') {
                    formData.append(element.name, element.value);
                }
            }
        });
        
        const recordId = formData.get('id');
        
        if (!recordId) {
            this.showNotification('No record ID found', 'error');
            return;
        }
        
        // For backward compatibility, also set CONNECTION_TYPE from CLASSIFICATION
        const classificationValue = formData.get('CLASSIFICATION');
        if (classificationValue) {
            formData.set('CONNECTION_TYPE', classificationValue);
        }
        
        // Debug: Log all form data
        console.log('DEBUG: Form data being submitted:');
        for (let [key, value] of formData.entries()) {
            console.log(`  ${key}: ${value instanceof File ? `File: ${value.name}` : value}`);
        }
        
        this.showLoading();

        try {
            const response = await fetch(`/api/post-offices/${recordId}`, {
                method: 'PUT',
                body: formData
            });

            const result = await response.json();

            if (result.success) {
                this.showSuccessMessage(result);
                this.closeModal();
                this.triggerRefresh();
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

    async loadPostOfficeData(postOfficeId) {
        try {
            console.log('Loading post office data for ID:', postOfficeId);
            const response = await fetch(`/api/post-offices/${postOfficeId}`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Requested-With': 'XMLHttpRequest'
                },
                credentials: 'same-origin' // Include cookies for session
            });
            
            console.log('Response status:', response.status, response.statusText);
            console.log('Response content-type:', response.headers.get('content-type'));
            
            if (!response.ok) {
                if (response.status === 401) {
                    throw new Error('Unauthorized - Please log in again');
                } else if (response.status === 404) {
                    throw new Error('Post office not found');
                } else {
                    // Get the response text to see what's actually returned
                    const responseText = await response.text();
                    console.error('Error response body:', responseText);
                    throw new Error(`HTTP ${response.status}: ${response.statusText}. Response: ${responseText.substring(0, 200)}`);
                }
            }
            
            // Check if response is actually JSON
            const contentType = response.headers.get('content-type');
            if (!contentType || !contentType.includes('application/json')) {
                const text = await response.text();
                console.error('Non-JSON response received:', text);
                console.error('Content-Type was:', contentType);
                throw new Error(`Server returned non-JSON response. Content-Type: ${contentType}. Response: ${text.substring(0, 200)}`);
            }
            
            const result = await response.json();
            console.log('Parsed JSON response:', result);
            console.log('Response keys:', Object.keys(result || {}));
            console.log('Response success:', result.success);
            console.log('Response data:', result.data);
            console.log('Response error:', result.error);
            
            // Check if response has the expected format
            if (result && typeof result === 'object') {
                if (result.success && result.data) {
                    console.log('Valid response format found (data field)');
                    return result;
                } else if (result.success && result.postOffice) {
                    console.log('Valid response format found (postOffice field)');
                    // Convert postOffice field to data for consistency
                    return { success: true, data: result.postOffice };
                } else if (result.success && result.post_office) {
                    console.log('Valid response format found (post_office field)');
                    // Convert post_office field to data for consistency
                    return { success: true, data: result.post_office };
                } else if (result.error) {
                    throw new Error(result.error);
                } else if (result.P_O_ID || result.id) {
                    // Direct post office object returned (fallback)
                    console.log('Direct post office object returned');
                    return { success: true, data: result };
                } else {
                    console.error('Unexpected response format:', result);
                    console.error('Available properties:', Object.getOwnPropertyNames(result));
                    throw new Error('Invalid response format - missing success/data/postOffice fields. Found: ' + Object.keys(result).join(', '));
                }
            } else {
                console.error('Response is not an object:', result);
                throw new Error('Invalid response format - response is not an object');
            }
        } catch (error) {
            console.error('Load error:', error);
            this.showNotification('Failed to load post office data: ' + error.message, 'error');
            throw error;
        }
    }

    async openEditModal(postOfficeId) {
        try {
            // Load post office data
            const response = await this.loadPostOfficeData(postOfficeId);
            const data = response.data;
            
            // Populate form
            this.populateForm(data);
            
            // Show modal
            $('#editModal').modal('show');
            
        } catch (error) {
            console.error('Error opening edit modal:', error);
            
            // Check if it's an authentication error
            if (error.message.includes('Unauthorized') || error.message.includes('401')) {
                Swal.fire({
                    icon: 'warning',
                    title: 'Session Expired',
                    text: 'Your session has expired. Please log in again.',
                    confirmButtonText: 'Go to Login',
                    showCancelButton: false
                }).then((result) => {
                    if (result.isConfirmed) {
                        window.location.href = '/login';
                    }
                });
            } else {
                Swal.fire({
                    icon: 'error',
                    title: 'Error!',
                    text: 'Failed to load post office data: ' + error.message,
                    footer: 'Please check the browser console for more details'
                });
            }
        }
    }

    populateForm(data) {
        console.log('DEBUG: Populating form with data:', data);
        console.log('DEBUG: Available data keys:', Object.keys(data || {}));
        
        // Set record ID
        $('#editRecordId').val(data.P_O_ID || data.id);
        console.log('DEBUG: Set record ID to:', data.P_O_ID || data.id);
        
        // Basic Information
        this.setFieldValue('editAREA', data.AREA || data.area);
        this.setFieldValue('editPOSTAL_OFFICE', data.POSTAL_OFFICE || data.postalOffice || data.postal_office);
        this.setFieldValue('editPostmaster', data.Postmaster || data.postmaster);
        this.setFieldValue('editEmployees', data.Employees || data.employees);
        this.setFieldValue('editNO_OF_POSTAL_TELLER', data.NO_OF_POSTAL_TELLER || data.noOfPostalTeller || data.no_of_postal_teller);
        this.setFieldValue('editNO_OF_LETTER_CARRIERS', data.NO_OF_LETTER_CARRIERS || data.noOfLetterCarriers || data.no_of_letter_carriers);
        this.setFieldValue('editSERVICES_PROVIDED', data.SERVICES_PROVIDED || data.servicesProvided || data.services_provided);
        
        // Location Information
        this.setFieldValue('editREGION', data.REGION || data.region);
        this.setFieldValue('editPROVINCE', data.PROVINCE || data.province);
        this.setFieldValue('editCITY', data.CITY || data.city);
        this.setFieldValue('editBARANGAY', data.BARANGAY || data.barangay);
        this.setFieldValue('editZIP_CODE', data.ZIP_CODE || data.zipCode || data.zip_code);
        this.setFieldValue('editADDRESS_LINE', data.ADDRESS_LINE || data.addressLine || data.address_line);
        this.setFieldValue('editLATITUDE', data.LATITUDE || data.latitude);
        this.setFieldValue('editLONGITUDE', data.LONGITUDE || data.longitude);
        
        // Handle CLASSIFICATION (now a regular select element)
        this.setFieldValue('editCLASSIFICATION', data.CLASSIFICATION || data.classification || data.CONNECTION_TYPE || data.connectionType || data.connection_type);
        
        // Also set CONNECTION_TYPE for backward compatibility
        const classificationValue = data.CLASSIFICATION || data.classification || data.CONNECTION_TYPE || data.connectionType || data.connection_type;
        if (classificationValue) {
            this.setFieldValue('editCONNECTION_TYPE', classificationValue);
        }
        
        // Connectivity Information
        const connectivityStatus = data.CONNECTIVITY_STATUS || data.connectivityStatus || data.connectivity_status;
        this.setFieldValue('editCONNECTIVITY_STATUS', connectivityStatus);
        this.setFieldValue('editINTERNET_SERVICE_PROVIDER', data.INTERNET_SERVICE_PROVIDER || data.internetServiceProvider || data.internet_service_provider);
        this.setPillValue('editINTERNET_SERVICE_PROVIDER', data.INTERNET_SERVICE_PROVIDER || data.internetServiceProvider || data.internet_service_provider);
        
        // Process TYPE_OF_CONNECTION
        this.processTypeOfConnectionFields(data);
        
        this.setFieldValue('editSPEED', data.SPEED || data.speed);
        this.setFieldValue('editSTATIC_IP_ADDRESS', data.STATIC_IP_ADDRESS || data.staticIpAddress || data.static_ip_address);
        
        // Date fields
        this.setFieldValue('editDATE_CONNECTED', this.formatDateForInput(data.DATE_CONNECTED || data.dateConnected || data.date_connected));
        this.setFieldValue('editDATE_NOT_CONNECTED', this.formatDateForInput(data.DATE_NOT_CONNECTED || data.dateNotConnected || data.date_not_connected));
        
        // Contact Information
        this.setFieldValue('editPOSTAL_OFFICE_CONTACT_PERSON', data.POSTAL_OFFICE_CONTACT_PERSON || data.postalOfficeContactPerson || data.postal_office_contact_person);
        this.setFieldValue('editPOSTAL_OFFICE_CONTACT_NUMBER', data.POSTAL_OFFICE_CONTACT_NUMBER || data.contactNumber || data.postal_office_contact_number);
        this.setFieldValue('editISP_CONTACT_PERSON', data.ISP_CONTACT_PERSON || data.ispContactPerson || data.isp_contact_person);
        this.setFieldValue('editISP_CONTACT_NUMBER', data.ISP_CONTACT_NUMBER || data.ispContactNumber || data.isp_contact_number);
        
        // Images
        this.displayCurrentImages(data);
        
        // Toggle date fields based on connectivity status
        this.toggleDateFields(connectivityStatus);
        
        console.log('DEBUG: Form population completed');
    }

    processTypeOfConnectionFields(data) {
        // Parse TYPE_OF_CONNECTION if available
        const typeOfConnection = data.TYPE_OF_CONNECTION || data.type_of_connection;
        
        if (typeOfConnection && typeOfConnection.includes('|')) {
            // Parse combined format: "Type:Regular|Wired:Yes|Shared:No|Free:Yes"
            const parts = typeOfConnection.split('|');
            parts.forEach(part => {
                const [key, value] = part.split(':');
                if (key && value) {
                    const keyLower = key.trim().toLowerCase();
                    const valueUpper = value.trim();
                    
                    switch (keyLower) {
                        case 'type':
                        case 'connection_type':
                            this.setFieldValue('editCONNECTION_TYPE', valueUpper);
                            break;
                        case 'wired':
                        case 'is_wired':
                            this.setRadioValue('IS_WIRED', valueUpper);
                            break;
                        case 'shared':
                        case 'is_shared':
                            this.setRadioValue('IS_SHARED', valueUpper);
                            break;
                        case 'free':
                        case 'is_free':
                            this.setRadioValue('IS_FREE', valueUpper);
                            break;
                    }
                }
            });
        } else {
            // Fallback to individual fields - check all possible field name formats
            this.setRadioValue('IS_WIRED', data.IS_WIRED || data.is_wired || data.isWired);
            this.setRadioValue('IS_SHARED', data.IS_SHARED || data.is_shared || data.isShared);
            this.setRadioValue('IS_FREE', data.IS_FREE || data.is_free || data.isFree);
        }
    }

    setFieldValue(fieldId, value) {
        const field = document.getElementById(fieldId);
        if (field) {
            field.value = value || '';
            console.log(`DEBUG: Set ${fieldId} to:`, value || '');
        } else {
            console.warn(`DEBUG: Field not found: ${fieldId}`);
        }
    }

    setRadioValue(name, value) {
        const yesRadio = document.getElementById(`edit${name}_Yes`);
        const noRadio = document.getElementById(`edit${name}_No`);
        
        if (yesRadio && noRadio) {
            if (value && value.toString().toUpperCase() === 'YES') {
                yesRadio.checked = true;
                noRadio.checked = false;
            } else {
                yesRadio.checked = false;
                noRadio.checked = true;
            }
        }
    }

    formatDateForInput(dateString) {
        if (!dateString) return '';
        
        try {
            // Handle different date formats
            if (dateString.includes('T')) {
                // ISO format
                return dateString.split('T')[0];
            } else if (dateString.includes('/')) {
                // dd/MM/yyyy format
                const parts = dateString.split('/');
                if (parts.length === 3) {
                    return parts[2] + '-' + parts[1] + '-' + parts[0];
                }
            } else if (dateString.includes('-')) {
                // yyyy-MM-dd format
                return dateString.split(' ')[0];
            }
        } catch (e) {
            console.error('Error formatting date:', e);
        }
        
        return '';
    }

    displayCurrentImages(data) {
        const timestamp = new Date().getTime();
        
        // Profile image - check all possible field name formats
        const profileImage = data.Image_Path || data.image_path || data.imagePath;
        const profileDiv = document.getElementById('currentProfileImage');
        console.log('DEBUG: profileDiv found:', !!profileDiv, 'profileImage:', profileImage);
        
        if (profileDiv) {
            if (profileImage) {
                // Handle both old format (filename only) and new format (profiles/filename)
                const profilePath = profileImage.includes('/') ? profileImage : `profiles/${profileImage}`;
                profileDiv.innerHTML = `<img src="/uploads/${profilePath}?t=${timestamp}" alt="Current Profile" class="img-thumbnail" style="max-width: 150px; max-height: 150px;" onerror="this.src='/images/no-image.png'">`;
            } else {
                profileDiv.innerHTML = '';
            }
        } else {
            console.warn('DEBUG: currentProfileImage element not found');
        }
        
        // Cover image - check all possible field name formats
        const coverImage = data.Cover_Photo_Path || data.cover_photo_path || data.coverPhotoPath;
        const coverDiv = document.getElementById('currentCoverImage');
        console.log('DEBUG: coverDiv found:', !!coverDiv, 'coverImage:', coverImage);
        
        if (coverDiv) {
            if (coverImage) {
                // Handle both old format (filename only) and new format (covers/filename)
                const coverPath = coverImage.includes('/') ? coverImage : `covers/${coverImage}`;
                coverDiv.innerHTML = `<img src="/uploads/${coverPath}?t=${timestamp}" alt="Current Cover" class="img-thumbnail" style="max-width: 150px; max-height: 150px;" onerror="this.src='/images/no-image.png'">`;
            } else {
                coverDiv.innerHTML = '';
            }
        } else {
            console.warn('DEBUG: currentCoverImage element not found');
        }
        
        // Clear previews - add null checks
        const profilePreview = document.getElementById('profilePreview');
        const coverPreview = document.getElementById('coverPreview');
        
        if (profilePreview) {
            profilePreview.innerHTML = '';
        } else {
            console.warn('DEBUG: profilePreview element not found');
        }
        
        if (coverPreview) {
            coverPreview.innerHTML = '';
        } else {
            console.warn('DEBUG: coverPreview element not found');
        }
    }

    toggleDateFields(status) {
        const dateConnectedContainer = document.getElementById('editDateConnectedContainer');
        const dateNotConnectedContainer = document.getElementById('editDateNotConnectedContainer');
        const dateConnectedField = document.getElementById('editDATE_CONNECTED');
        const dateNotConnectedField = document.getElementById('editDATE_NOT_CONNECTED');
        
        if (!dateConnectedContainer || !dateNotConnectedContainer) return;
        
        const statusLower = (status || '').toLowerCase();
        
        if (statusLower === 'active') {
            dateConnectedContainer.style.display = 'block';
            dateNotConnectedContainer.style.display = 'none';
            if (dateConnectedField && !dateConnectedField.value) {
                dateConnectedField.value = this.getTodayDate();
            }
            if (dateNotConnectedField) {
                dateNotConnectedField.value = '';
            }
        } else if (statusLower === 'inactive') {
            dateConnectedContainer.style.display = 'none';
            dateNotConnectedContainer.style.display = 'block';
            if (dateNotConnectedField && !dateNotConnectedField.value) {
                dateNotConnectedField.value = this.getTodayDate();
            }
            if (dateConnectedField) {
                dateConnectedField.value = '';
            }
        } else {
            dateConnectedContainer.style.display = 'none';
            dateNotConnectedContainer.style.display = 'none';
        }
    }

    handleConnectionTypeChange(connectionType) {
        const connectivityStatusField = document.getElementById('editCONNECTIVITY_STATUS');
        
        if (connectionType && connectionType !== '') {
            connectivityStatusField.value = 'Active';
            this.toggleDateFields('Active');
        }
    }

    updateTypeOfConnectionHidden() {
        const wiredYes = document.getElementById('editIS_WIRED_Yes');
        const wiredNo = document.getElementById('editIS_WIRED_No');
        const sharedYes = document.getElementById('editIS_SHARED_Yes');
        const sharedNo = document.getElementById('editIS_SHARED_No');
        const freeYes = document.getElementById('editIS_FREE_Yes');
        const freeNo = document.getElementById('editIS_FREE_No');
        const connectionTypeHidden = document.getElementById('editCONNECTION_TYPE'); // Hidden field for pills
        const hiddenField = document.getElementById('editTYPE_OF_CONNECTION');
        
        if (!hiddenField) return;
        
        let isWired = 'No';
        let isShared = 'No';
        let isFree = 'No';
        
        if (wiredYes && wiredYes.checked) {
            isWired = 'Yes';
        }
        if (sharedYes && sharedYes.checked) {
            isShared = 'Yes';
        }
        if (freeYes && freeYes.checked) {
            isFree = 'Yes';
        }
        
        // Get the connection type from the hidden field (set by pills)
        const connectionType = (connectionTypeHidden && connectionTypeHidden.value) ? connectionTypeHidden.value.trim() : '';
        
        console.log('DEBUG: updateTypeOfConnectionHidden - connectionType:', connectionType);
        console.log('DEBUG: updateTypeOfConnectionHidden - isWired:', isWired, 'isShared:', isShared, 'isFree:', isFree);
        
        if (connectionType) {
            hiddenField.value = `Type:${connectionType}|Wired:${isWired}|Shared:${isShared}|Free:${isFree}`;
        } else {
            hiddenField.value = `Wired:${isWired}|Shared:${isShared}|Free:${isFree}`;
        }
        
        console.log('DEBUG: updateTypeOfConnectionHidden - final value:', hiddenField.value);
    }

    getTodayDate() {
        return new Date().toISOString().slice(0, 10);
    }

    prepareModal() {
        // Clear any previous validation errors
        $('#editForm').validate().resetForm();
        $('.error').removeClass('error');
    }

    cleanupModal() {
        // Clear file input previews
        $('#profilePreview, #coverPreview').empty();
        
        // Clear file inputs
        $('input[type="file"]').val('');
        
        // Reset date field visibility
        document.getElementById('editDateConnectedContainer').style.display = 'none';
        document.getElementById('editDateNotConnectedContainer').style.display = 'none';
        
        // Clear pill inputs
        this.clearPillInputs();
    }

    clearPillInputs() {
        // Only clear INTERNET_SERVICE_PROVIDER pill input
        // SERVICES_PROVIDED and CLASSIFICATION are now regular select elements
        const pillConfigs = [
            'editINTERNET_SERVICE_PROVIDER'
        ];

        pillConfigs.forEach(hiddenInputId => {
            const config = this.getPillConfigByHiddenInput(hiddenInputId);
            console.log(`DEBUG: Clearing pills for ${hiddenInputId}, config:`, !!config);
            
            if (config) {
                const pillsContainer = document.getElementById(config.pillsContainerId);
                const hiddenInput = document.getElementById(config.hiddenInputId);
                const input = document.getElementById(config.inputId);
                
                console.log(`DEBUG: Found elements - pillsContainer: ${!!pillsContainer}, hiddenInput: ${!!hiddenInput}, input: ${!!input}`);
                
                if (pillsContainer) {
                    pillsContainer.innerHTML = '';
                } else {
                    console.warn(`DEBUG: pillsContainer not found for ID: ${config.pillsContainerId}`);
                }
                
                if (hiddenInput) {
                    hiddenInput.value = '';
                } else {
                    console.warn(`DEBUG: hiddenInput not found for ID: ${config.hiddenInputId}`);
                }
                
                if (input) {
                    input.value = '';
                } else {
                    console.warn(`DEBUG: input not found for ID: ${config.inputId}`);
                }
            } else {
                console.warn(`DEBUG: No config found for hiddenInputId: ${hiddenInputId}`);
            }
        });
    }

    closeModal() {
        $('#editModal').modal('hide');
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
        $('.loading-overlay').fadeIn();
    }

    hideLoading() {
        $('.loading-overlay').fadeOut();
    }

    triggerRefresh() {
        // Try to reload table based on current page
        if (typeof reloadTable === 'function') {
            reloadTable();
        } else {
            // Trigger custom event for table refresh as fallback
            $(document).trigger('postoffice:updated', {
                timestamp: new Date()
            });
        }
    }

    initializePillInputs() {
        // Only initialize pill inputs for INTERNET_SERVICE_PROVIDER
        // SERVICES_PROVIDED and CLASSIFICATION are now regular select elements
        const pillConfigs = [
            {
                inputId: 'editINTERNET_SERVICE_PROVIDER_INPUT',
                dropdownId: 'editINTERNET_SERVICE_PROVIDER_DROPDOWN',
                pillsContainerId: 'editINTERNET_SERVICE_PROVIDER_PILLS',
                hiddenInputId: 'editINTERNET_SERVICE_PROVIDER',
                multiSelect: false
            }
        ];

        pillConfigs.forEach(config => {
            this.setupPillInput(config);
        });
    }

    setupPillInput(config) {
        const input = document.getElementById(config.inputId);
        const dropdown = document.getElementById(config.dropdownId);
        const pillsContainer = document.getElementById(config.pillsContainerId);
        const hiddenInput = document.getElementById(config.hiddenInputId);

        if (!input || !dropdown || !pillsContainer || !hiddenInput) {
            return;
        }

        // Store original placeholder
        input.setAttribute('data-original-placeholder', input.placeholder);

        // Input focus event
        input.addEventListener('focus', () => {
            this.showDropdown(dropdown);
            this.filterOptions(input, dropdown);
            
            // Show current selection in input for easier editing
            const currentPill = pillsContainer.querySelector('.pill');
            if (currentPill && !input.value) {
                input.placeholder = `Current: ${currentPill.textContent.trim()}`;
            }
        });

        // Input input event
        input.addEventListener('input', () => {
            this.filterOptions(input, dropdown);
            // Reset placeholder when user starts typing
            if (input.value) {
                input.placeholder = input.getAttribute('data-original-placeholder') || 'Type to search...';
            }
        });

        // Input blur event
        input.addEventListener('blur', () => {
            setTimeout(() => {
                this.hideDropdown(dropdown);
                // Reset placeholder
                input.placeholder = input.getAttribute('data-original-placeholder') || 'Type to search...';
            }, 200);
        });

        // Dropdown option click events
        dropdown.addEventListener('click', (e) => {
            if (e.target.classList.contains('pill-option')) {
                this.selectOption(e.target, config);
            }
        });

        // Click outside to close dropdown
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.pill-input-wrapper')) {
                this.hideDropdown(dropdown);
            }
        });

        // Keyboard navigation
        input.addEventListener('keydown', (e) => {
            this.handleKeyNavigation(e, dropdown, config);
        });
    }

    showDropdown(dropdown) {
        dropdown.classList.add('show');
    }

    hideDropdown(dropdown) {
        dropdown.classList.remove('show');
    }

    filterOptions(input, dropdown) {
        const filter = input.value.toLowerCase();
        const options = dropdown.querySelectorAll('.pill-option');
        
        options.forEach(option => {
            const text = option.textContent.toLowerCase();
            const value = option.dataset.value.toLowerCase();
            
            if (text.includes(filter) || value.includes(filter)) {
                option.style.display = 'block';
            } else {
                option.style.display = 'none';
            }
        });
    }

    selectOption(optionElement, config) {
        const value = optionElement.dataset.value;
        const text = optionElement.textContent;
        const pillsContainer = document.getElementById(config.pillsContainerId);
        const hiddenInput = document.getElementById(config.hiddenInputId);
        const input = document.getElementById(config.inputId);

        if (!config.multiSelect) {
            // Check if pill already exists - if so, remove it (toggle behavior)
            const existingPill = pillsContainer.querySelector(`[data-value="${value}"]`);
            if (existingPill) {
                this.removePill(existingPill, config);
                return;
            }
            
            if (pillsContainer) {
                pillsContainer.innerHTML = '';
            } else {
                console.warn('DEBUG: pillsContainer not found for clearing');
                return;
            }
            hiddenInput.value = value;
            input.value = '';
        } else {
            // Check if pill already exists
            const existingPill = pillsContainer.querySelector(`[data-value="${value}"]`);
            if (existingPill) {
                return; // Already selected
            }
            
            // Add to hidden input values
            const currentValues = hiddenInput.value ? hiddenInput.value.split(',') : [];
            currentValues.push(value);
            hiddenInput.value = currentValues.join(',');
        }

        // Create pill element
        const pill = this.createPillElement(value, text, config);
        pillsContainer.appendChild(pill);

        // Clear input and hide dropdown
        input.value = '';
        this.hideDropdown(document.getElementById(config.dropdownId));

        // Trigger change event for validation
        hiddenInput.dispatchEvent(new Event('change'));
    }

    createPillElement(value, text, config) {
        const pill = document.createElement('div');
        pill.className = 'pill';
        pill.dataset.value = value;
        pill.title = `Click to remove: ${text}`;
        pill.innerHTML = `
            ${text}
            <span class="pill-remove" data-value="${value}" title="Remove">×</span>
        `;

        // Add click event to entire pill for removal
        pill.addEventListener('click', (e) => {
            e.stopPropagation();
            this.removePill(pill, config);
        });

        // Prevent event bubbling on remove button
        const removeBtn = pill.querySelector('.pill-remove');
        removeBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.removePill(pill, config);
        });

        return pill;
    }

    removePill(pillElement, config) {
        const value = pillElement.dataset.value;
        const pillsContainer = document.getElementById(config.pillsContainerId);
        const hiddenInput = document.getElementById(config.hiddenInputId);

        // Remove pill element
        pillElement.remove();

        if (!config.multiSelect) {
            // Clear hidden input for single select
            hiddenInput.value = '';
        } else {
            // Remove from hidden input values
            const currentValues = hiddenInput.value ? hiddenInput.value.split(',') : [];
            const index = currentValues.indexOf(value);
            if (index > -1) {
                currentValues.splice(index, 1);
                hiddenInput.value = currentValues.join(',');
            }
        }

        // Trigger change event for validation
        hiddenInput.dispatchEvent(new Event('change'));
    }

    handleKeyNavigation(e, dropdown, config) {
        const options = Array.from(dropdown.querySelectorAll('.pill-option:not([style*="display: none"])'));
        const currentIndex = options.findIndex(option => option.classList.contains('selected'));

        switch (e.key) {
            case 'ArrowDown':
                e.preventDefault();
                if (currentIndex < options.length - 1) {
                    if (currentIndex >= 0) options[currentIndex].classList.remove('selected');
                    options[currentIndex + 1].classList.add('selected');
                } else if (options.length > 0) {
                    if (currentIndex >= 0) options[currentIndex].classList.remove('selected');
                    options[0].classList.add('selected');
                }
                break;

            case 'ArrowUp':
                e.preventDefault();
                if (currentIndex > 0) {
                    options[currentIndex].classList.remove('selected');
                    options[currentIndex - 1].classList.add('selected');
                } else if (options.length > 0) {
                    if (currentIndex >= 0) options[currentIndex].classList.remove('selected');
                    options[options.length - 1].classList.add('selected');
                }
                break;

            case 'Enter':
                e.preventDefault();
                if (currentIndex >= 0 && options[currentIndex]) {
                    this.selectOption(options[currentIndex], config);
                }
                break;

            case 'Escape':
                this.hideDropdown(dropdown);
                break;
        }
    }

    setPillValue(hiddenInputId, value) {
        console.log(`DEBUG: setPillValue called for ${hiddenInputId} with value:`, value);
        const hiddenInput = document.getElementById(hiddenInputId);
        const config = this.getPillConfigByHiddenInput(hiddenInputId);
        
        if (!config || !hiddenInput || !value) {
            console.warn(`DEBUG: setPillValue failed - config: ${!!config}, hiddenInput: ${!!hiddenInput}, value: ${!!value}`);
            return;
        }

        const pillsContainer = document.getElementById(config.pillsContainerId);
        const dropdown = document.getElementById(config.dropdownId);
        
        console.log(`DEBUG: Found pillsContainer: ${!!pillsContainer}, dropdown: ${!!dropdown}`);
        
        if (pillsContainer) {
            pillsContainer.innerHTML = '';
        } else {
            console.warn('DEBUG: pillsContainer not found for clearing');
            return;
        }
        
        if (!config.multiSelect) {
            // Find matching option and create pill
            const option = dropdown.querySelector(`[data-value="${value}"]`);
            console.log(`DEBUG: Looking for option with data-value="${value}", found: ${!!option}`);
            if (option) {
                const pill = this.createPillElement(value, option.textContent, config);
                pillsContainer.appendChild(pill);
                hiddenInput.value = value;
                console.log(`DEBUG: Created pill for ${hiddenInputId}: ${value}`);
            } else {
                console.warn(`DEBUG: No option found for value: ${value}`);
                // Create pill anyway even if option not found
                const pill = this.createPillElement(value, value, config);
                pillsContainer.appendChild(pill);
                hiddenInput.value = value;
            }
        } else {
            // Handle multiple values
            const values = value.split(',');
            values.forEach(val => {
                const trimmedVal = val.trim();
                if (trimmedVal) {
                    const option = dropdown.querySelector(`[data-value="${trimmedVal}"]`);
                    if (option) {
                        const pill = this.createPillElement(trimmedVal, option.textContent, config);
                        pillsContainer.appendChild(pill);
                    }
                }
            });
            hiddenInput.value = value;
        }
    }

    getPillConfigByHiddenInput(hiddenInputId) {
        // Only return INTERNET_SERVICE_PROVIDER config
        // SERVICES_PROVIDED and CLASSIFICATION are now regular select elements
        const configs = [
            {
                inputId: 'editINTERNET_SERVICE_PROVIDER_INPUT',
                dropdownId: 'editINTERNET_SERVICE_PROVIDER_DROPDOWN',
                pillsContainerId: 'editINTERNET_SERVICE_PROVIDER_PILLS',
                hiddenInputId: 'editINTERNET_SERVICE_PROVIDER',
                multiSelect: false
            }
        ];

        return configs.find(config => config.hiddenInputId === hiddenInputId);
    }
}

// Initialize when document is ready
$(document).ready(() => {
    console.log('Initializing PostOfficeEditor...');
    window.postOfficeEditor = new PostOfficeEditor();
    console.log('PostOfficeEditor initialized successfully');
});

// Also initialize on DOM content loaded as fallback
document.addEventListener('DOMContentLoaded', () => {
    if (!window.postOfficeEditor) {
        console.log('Initializing PostOfficeEditor on DOMContentLoaded fallback...');
        window.postOfficeEditor = new PostOfficeEditor();
        console.log('PostOfficeEditor initialized successfully on fallback');
    }
});

// Global function for opening edit modal (can be called from other scripts)
window.openPostOfficeEditModal = (postOfficeId) => {
    if (window.postOfficeEditor) {
        window.postOfficeEditor.openEditModal(postOfficeId);
    }
};

// Image preview function
window.previewImageEdit = function(event, previewId) {
    const reader = new FileReader();
    reader.onload = function () {
        const preview = document.getElementById(previewId);
        if (preview) {
            preview.innerHTML = '<img src="' + reader.result + '" class="img-thumbnail" style="max-width: 150px; max-height: 150px;">';
        } else {
            console.warn(`Preview element not found: ${previewId}`);
        }
    };
    if (event.target.files && event.target.files[0]) {
        reader.readAsDataURL(event.target.files[0]);
    }
};

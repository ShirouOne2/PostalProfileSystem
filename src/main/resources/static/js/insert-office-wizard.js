document.addEventListener('DOMContentLoaded', function() {

    console.log('Insert Office Wizard initializing...');

    const steps = document.querySelectorAll('.wizard-step');
    const indicators = document.querySelectorAll('.wizard-step-indicator');
    const form = document.getElementById('insertPostalOfficeForm');
    let currentStep = 0;

    function showStep(index) {
        // Hide all steps
        document.querySelectorAll('.wizard-step').forEach(step => {
            step.classList.remove('active');
        });
        
        // Show target step by ID
        const targetStep = document.getElementById('step-' + (index + 1));
        if (targetStep) {
            targetStep.classList.add('active');
        } else {
            console.error('Step not found: step-' + (index + 1));
            return;
        }
        
        // Update indicators
        document.querySelectorAll('.wizard-step-indicator').forEach(indicator => {
            indicator.classList.remove('active', 'completed');
        });
        
        // Mark current and completed steps
        document.querySelectorAll('.wizard-step-indicator').forEach(indicator => {
            const indicatorStep = parseInt(indicator.getAttribute('data-step'));
            if (indicatorStep === index + 1) {
                indicator.classList.add('active');
            } else if (indicatorStep < index + 1) {
                indicator.classList.add('completed');
            }
        });
        
        currentStep = index;
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    function validateStep(index) {
        // Example validation per step
        if (index === 0) { // Basic Info
            const requiredFields = ['officeName', 'areaId'];
            for (let id of requiredFields) {
                const el = document.getElementById(id);
                if (!el || !el.value) {
                    Swal.fire('Missing Information', `Please fill ${el?.name || id}`, 'warning');
                    el?.focus();
                    return false;
                }
            }
        }

        if (index === 1) { // Location validation
            const requiredFields = ['regionId', 'provinceId', 'cityMunId'];
            for (let id of requiredFields) {
                const el = document.getElementById(id);
                if (!el || !el.value) {
                    Swal.fire('Missing Information', `Please select ${el?.name || id}`, 'warning');
                    el?.focus();
                    return false;
                }
            }
            
            const lat = parseFloat(document.getElementById('latitude')?.value || 0);
            const lng = parseFloat(document.getElementById('longitude')?.value || 0);
            if (lat && (lat < -90 || lat > 90)) {
                Swal.fire('Invalid Latitude', 'Must be between -90 and 90', 'error');
                return false;
            }
            if (lng && (lng < -180 || lng > 180)) {
                Swal.fire('Invalid Longitude', 'Must be between -180 and 180', 'error');
                return false;
            }
        }

        if (index === 2) { // Connectivity validation
            const connectionStatus = document.getElementById('connectionStatus')?.checked;
            if (connectionStatus) {
                const requiredFields = ['internetServiceProvider', 'typeOfConnection'];
                for (let id of requiredFields) {
                    const el = document.getElementById(id);
                    if (!el || !el.value) {
                        Swal.fire('Missing Information', `Please fill ${el?.name || id}`, 'warning');
                        el?.focus();
                        return false;
                    }
                }
            }
        }

        return true;
    }

    // Next buttons
    document.querySelectorAll('.btn-next').forEach(btn => {
        btn.addEventListener('click', () => {
            if (validateStep(currentStep) && currentStep < steps.length - 1) {
                showStep(currentStep + 1);
            }
        });
    });

    // Previous buttons
    document.querySelectorAll('.btn-prev').forEach(btn => {
        btn.addEventListener('click', () => {
            if (currentStep > 0) showStep(currentStep - 1);
        });
    });

    // Clickable indicators
    indicators.forEach((ind, i) => {
        ind.addEventListener('click', () => showStep(i));
    });

    // Form submission
    form?.addEventListener('submit', function(e) {
        e.preventDefault();

        if (!validateStep(currentStep)) return;

        Swal.fire({
            title: 'Confirm Submission',
            text: 'Add this post office?',
            icon: 'question',
            showCancelButton: true,
            confirmButtonText: 'Yes, Save'
        }).then(result => {
            if (result.isConfirmed) submitForm();
        });
    });

    function getIntValue(id) {
        const el = document.getElementById(id);
        return el && el.value ? parseInt(el.value) : null;
    }

    function getFloatValue(id) {
        const el = document.getElementById(id);
        return el && el.value ? parseFloat(el.value) : null;
    }

    function getStringValue(id) {
        const el = document.getElementById(id);
        return el && el.value ? el.value.trim() : null;
    }

    function getCheckedValue(id) {
        const el = document.getElementById(id);
        return el ? el.checked : false;
    }

    function submitForm() {
        const submitBtn = form.querySelector('button[type="submit"]');
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';

        Swal.fire({ title: 'Saving...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });

        const formData = {
            name: getStringValue('officeName'),
            postmaster: getStringValue('postmaster'),
            address: getStringValue('address'),
            zipCode: getStringValue('zipCode'),
            areaId: getIntValue('areaId'),
            regionId: getIntValue('regionId'),
            provinceId: getIntValue('provinceId'),
            cityMunId: getIntValue('cityMunId'),
            barangayId: getIntValue('barangayId'),
            latitude: getFloatValue('latitude'),
            longitude: getFloatValue('longitude'),
            connectionStatus: getCheckedValue('connectionStatus')
        };

        fetch('/api/postal-office/insert', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(formData)
        })
        .then(res => res.json())
        .then(data => {
            if (data.success) {
                Swal.fire({ icon: 'success', title: 'Success!', text: 'Post Office Added!', timer: 2000, showConfirmButton: false })
                    .then(() => window.location.href = '/table');
            } else {
                throw new Error(data.message);
            }
        })
        .catch(err => {
            Swal.fire('Error', err.message || 'Something went wrong', 'error');
            submitBtn.disabled = false;
            submitBtn.innerHTML = '<i class="fas fa-save"></i> Save Record';
        });
    }

    showStep(currentStep);
    console.log('Wizard Ready');
    
    // Show welcome message
    Swal.fire({
        icon: 'info',
        title: 'Post Office Registration',
        html: `
            <p>Complete the 5-step process to add a new post office.</p>
            <hr>
            <p><small><strong>Steps:</strong></small></p>
            <p><small>1. Basic Information → 2. Location → 3. Connectivity → 4. Contact → 5. Additional Info</small></p>
        `,
        toast: true,
        position: 'top-end',
        timer: 5000,
        timerProgressBar: true,
        showConfirmButton: false
    });

    // =====================================================
    // CASCADING DROPDOWN FUNCTIONALITY
    // =====================================================
    
    function resetSelect(selectElement, placeholderText, disabled) {
        if (!selectElement) return;
        
        selectElement.innerHTML = '';
        const option = document.createElement('option');
        option.value = '';
        option.textContent = placeholderText;
        selectElement.appendChild(option);
        selectElement.disabled = disabled;
    }
    
    function setSelectLoading(selectElement, isLoading) {
        if (!selectElement) return;
        
        if (isLoading) {
            selectElement.disabled = true;
            selectElement.innerHTML = '<option value="">Loading...</option>';
        }
    }
    
    // Region -> Province cascade
    const regionSelect = document.getElementById('regionId');
    if (regionSelect) {
        regionSelect.addEventListener('change', function() {
            const regionId = this.value;
            const provinceSelect = document.getElementById('provinceId');
            const citySelect = document.getElementById('cityMunId');
            const barangaySelect = document.getElementById('barangayId');
            
            resetSelect(provinceSelect, '-- Select Province --', true);
            resetSelect(citySelect, '-- Select City/Municipality --', true);
            resetSelect(barangaySelect, '-- Select Barangay --', true);
            
            if (!regionId) return;
            
            setSelectLoading(provinceSelect, true);
            
            fetch('/api/provinces/by-region/' + regionId)
                .then(response => {
                    if (!response.ok) {
                        return response.json().then(err => {
                            throw new Error(err.message || 'Failed to load provinces');
                        });
                    }
                    return response.json();
                })
                .then(provinces => {
                    if (provinces.success === false) {
                        throw new Error(provinces.message || 'Failed to load provinces');
                    }
                    
                    resetSelect(provinceSelect, '-- Select Province --', false);
                    
                    if (provinces.length === 0) {
                        Swal.fire({
                            icon: 'info',
                            title: 'No Provinces Found',
                            text: 'No provinces found for this region',
                            toast: true,
                            position: 'top-end',
                            timer: 3000,
                            showConfirmButton: false
                        });
                        return;
                    }
                    
                    provinces.forEach(province => {
                        const option = document.createElement('option');
                        option.value = province.id;
                        option.textContent = province.name;
                        provinceSelect.appendChild(option);
                    });
                })
                .catch(error => {
                    console.error('Error loading provinces:', error);
                    resetSelect(provinceSelect, '-- Error Loading Provinces --', true);
                    Swal.fire({
                        icon: 'error',
                        title: 'Error',
                        text: 'Failed to load provinces. Please try again.',
                        confirmButtonColor: '#d33'
                    });
                });
        });
    }
    
    // Province -> City/Municipality cascade
    const provinceSelect2 = document.getElementById('provinceId');
    if (provinceSelect2) {
        provinceSelect2.addEventListener('change', function() {
            const provinceId = this.value;
            const citySelect2 = document.getElementById('cityMunId');
            const barangaySelect = document.getElementById('barangayId');
            
            resetSelect(citySelect2, '-- Select City/Municipality --', true);
            resetSelect(barangaySelect, '-- Select Barangay --', true);
            
            if (!provinceId) return;
            
            setSelectLoading(citySelect2, true);
            
            fetch('/api/cities/by-province/' + provinceId)
                .then(response => {
                    if (!response.ok) {
                        return response.json().then(err => {
                            throw new Error(err.message || 'Failed to load cities');
                        });
                    }
                    return response.json();
                })
                .then(cities => {
                    if (cities.success === false) {
                        throw new Error(cities.message || 'Failed to load cities');
                    }
                    
                    resetSelect(citySelect2, '-- Select City/Municipality --', false);
                    
                    if (cities.length === 0) {
                        Swal.fire({
                            icon: 'info',
                            title: 'No Cities Found',
                            text: 'No cities/municipalities found for this province',
                            toast: true,
                            position: 'top-end',
                            timer: 3000,
                            showConfirmButton: false
                        });
                        return;
                    }
                    
                    cities.forEach(city => {
                        const option = document.createElement('option');
                        option.value = city.id;
                        option.textContent = city.name;
                        citySelect2.appendChild(option);
                    });
                })
                .catch(error => {
                    console.error('Error loading cities:', error);
                    resetSelect(citySelect2, '-- Error Loading Cities --', true);
                    Swal.fire({
                        icon: 'error',
                        title: 'Error',
                        text: 'Failed to load cities/municipalities. Please try again.',
                        confirmButtonColor: '#d33'
                    });
                });
        });
    }
    
    // City/Municipality -> Barangay cascade
    const citySelect3 = document.getElementById('cityMunId');
    if (citySelect3) {
        citySelect3.addEventListener('change', function() {
            const cityId = this.value;
            const barangaySelect = document.getElementById('barangayId');
            
            resetSelect(barangaySelect, '-- Select Barangay --', true);
            
            if (!cityId) return;
            
            setSelectLoading(barangaySelect, true);
            
            fetch('/api/barangays/by-city/' + cityId)
                .then(response => {
                    if (!response.ok) {
                        return response.json().then(err => {
                            throw new Error(err.message || 'Failed to load barangays');
                        });
                    }
                    return response.json();
                })
                .then(barangays => {
                    if (barangays.success === false) {
                        throw new Error(barangays.message || 'Failed to load barangays');
                    }
                    
                    resetSelect(barangaySelect, '-- Select Barangay (Optional) --', false);
                    
                    if (barangays.length === 0) {
                        Swal.fire({
                            icon: 'info',
                            title: 'No Barangays Found',
                            text: 'No barangays found for this city/municipality',
                            toast: true,
                            position: 'top-end',
                            timer: 3000,
                            showConfirmButton: false
                        });
                        return;
                    }
                    
                    barangays.forEach(barangay => {
                        const option = document.createElement('option');
                        option.value = barangay.id;
                        option.textContent = barangay.name;
                        barangaySelect.appendChild(option);
                    });
                })
                .catch(error => {
                    console.error('Error loading barangays:', error);
                    resetSelect(barangaySelect, '-- Error Loading Barangays --', true);
                    Swal.fire({
                        icon: 'error',
                        title: 'Error',
                        text: 'Failed to load barangays. Please try again.',
                        confirmButtonColor: '#d33'
                    });
                });
        });
    }
});

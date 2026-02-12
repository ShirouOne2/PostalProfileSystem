/**
 * Insert Office Wizard - 2-Step Version
 * Step 1: Basic Info + Location Hierarchy
 * Step 2: Coordinates & Status
 */

document.addEventListener('DOMContentLoaded', function() {
    
    console.log('Insert Office Wizard (2-Step) initializing...');
    
    // =====================================================
    // WIZARD NAVIGATION
    // =====================================================
    
    function showStep(stepNumber) {
        console.log('Navigating to step', stepNumber);
        
        // Hide all steps
        document.querySelectorAll('.wizard-step').forEach(step => {
            step.classList.remove('active');
        });
        
        // Show target step
        const targetStep = document.getElementById('step-' + stepNumber);
        if (targetStep) {
            targetStep.classList.add('active');
        } else {
            console.error('Step not found: step-' + stepNumber);
            return;
        }
        
        // Update indicators
        document.querySelectorAll('.wizard-step-indicator').forEach(indicator => {
            indicator.classList.remove('active', 'completed');
        });
        
        // Mark current and completed steps
        document.querySelectorAll('.wizard-step-indicator').forEach(indicator => {
            const indicatorStep = parseInt(indicator.getAttribute('data-step'));
            if (indicatorStep === stepNumber) {
                indicator.classList.add('active');
            } else if (indicatorStep < stepNumber) {
                indicator.classList.add('completed');
            }
        });
        
        // Scroll to top
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }
    
    // =====================================================
    // VALIDATION FUNCTIONS
    // =====================================================
    
    function validateStep1() {
        const officeName = document.getElementById('officeName')?.value.trim();
        const areaId = document.getElementById('areaId')?.value;
        const regionId = document.getElementById('regionId')?.value;
        const provinceId = document.getElementById('provinceId')?.value;
        const cityMunId = document.getElementById('cityMunId')?.value;
        
        // Check office name
        if (!officeName) {
            Swal.fire({
                icon: 'warning',
                title: 'Missing Information',
                text: 'Please enter a post office name',
                confirmButtonColor: '#3085d6'
            });
            document.getElementById('officeName')?.focus();
            return false;
        }
        
        // Check area
        if (!areaId) {
            Swal.fire({
                icon: 'warning',
                title: 'Missing Information',
                text: 'Please select an area',
                confirmButtonColor: '#3085d6'
            });
            document.getElementById('areaId')?.focus();
            return false;
        }
        
        // Check region
        if (!regionId) {
            Swal.fire({
                icon: 'warning',
                title: 'Missing Information',
                text: 'Please select a region',
                confirmButtonColor: '#3085d6'
            });
            document.getElementById('regionId')?.focus();
            return false;
        }
        
        // Check province
        if (!provinceId) {
            Swal.fire({
                icon: 'warning',
                title: 'Missing Information',
                text: 'Please select a province',
                confirmButtonColor: '#3085d6'
            });
            document.getElementById('provinceId')?.focus();
            return false;
        }
        
        // Check city
        if (!cityMunId) {
            Swal.fire({
                icon: 'warning',
                title: 'Missing Information',
                text: 'Please select a city/municipality',
                confirmButtonColor: '#3085d6'
            });
            document.getElementById('cityMunId')?.focus();
            return false;
        }
        
        return true;
    }
    
    function validateStep2() {
        const latitude = document.getElementById('latitude')?.value;
        const longitude = document.getElementById('longitude')?.value;
        
        // Validate latitude if provided
        if (latitude && latitude !== '') {
            const lat = parseFloat(latitude);
            if (isNaN(lat) || lat < -90 || lat > 90) {
                Swal.fire({
                    icon: 'error',
                    title: 'Invalid Latitude',
                    text: 'Latitude must be a number between -90 and 90',
                    confirmButtonColor: '#d33'
                });
                document.getElementById('latitude')?.focus();
                return false;
            }
        }
        
        // Validate longitude if provided
        if (longitude && longitude !== '') {
            const lng = parseFloat(longitude);
            if (isNaN(lng) || lng < -180 || lng > 180) {
                Swal.fire({
                    icon: 'error',
                    title: 'Invalid Longitude',
                    text: 'Longitude must be a number between -180 and 180',
                    confirmButtonColor: '#d33'
                });
                document.getElementById('longitude')?.focus();
                return false;
            }
        }
        
        return true;
    }
    
    // =====================================================
    // NAVIGATION BUTTON EVENT LISTENERS
    // =====================================================
    
    const nextStep1Btn = document.getElementById('nextStep1');
    if (nextStep1Btn) {
        nextStep1Btn.addEventListener('click', function(e) {
            e.preventDefault();
            if (validateStep1()) {
                showStep(2);
            }
        });
    }
    
    const prevStep2Btn = document.getElementById('prevStep2');
    if (prevStep2Btn) {
        prevStep2Btn.addEventListener('click', function(e) {
            e.preventDefault();
            showStep(1);
        });
    }
    
    // =====================================================
    // CASCADING DROPDOWN FUNCTIONS
    // =====================================================
    
    // Helper function to reset select element
    function resetSelect(selectElement, placeholderText, disabled) {
        if (!selectElement) return;
        
        selectElement.innerHTML = '';
        const option = document.createElement('option');
        option.value = '';
        option.textContent = placeholderText;
        selectElement.appendChild(option);
        selectElement.disabled = disabled;
    }
    
    // Helper function to show loading state
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
            
            // Reset dependent dropdowns
            resetSelect(provinceSelect, '-- Select Province --', true);
            resetSelect(citySelect, '-- Select City/Municipality --', true);
            resetSelect(barangaySelect, '-- Select Barangay --', true);
            
            if (!regionId) return;
            
            // Show loading state
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
                    // Check if response is an error object
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
    const provinceSelect = document.getElementById('provinceId');
    if (provinceSelect) {
        provinceSelect.addEventListener('change', function() {
            const provinceId = this.value;
            const citySelect = document.getElementById('cityMunId');
            const barangaySelect = document.getElementById('barangayId');
            
            // Reset dependent dropdowns
            resetSelect(citySelect, '-- Select City/Municipality --', true);
            resetSelect(barangaySelect, '-- Select Barangay --', true);
            
            if (!provinceId) return;
            
            // Show loading state
            setSelectLoading(citySelect, true);
            
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
                    // Check if response is an error object
                    if (cities.success === false) {
                        throw new Error(cities.message || 'Failed to load cities');
                    }
                    
                    resetSelect(citySelect, '-- Select City/Municipality --', false);
                    
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
                        citySelect.appendChild(option);
                    });
                })
                .catch(error => {
                    console.error('Error loading cities:', error);
                    resetSelect(citySelect, '-- Error Loading Cities --', true);
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
    const citySelect = document.getElementById('cityMunId');
    if (citySelect) {
        citySelect.addEventListener('change', function() {
            const cityId = this.value;
            const barangaySelect = document.getElementById('barangayId');
            
            resetSelect(barangaySelect, '-- Select Barangay --', true);
            
            if (!cityId) return;
            
            // Show loading state
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
                    // Check if response is an error object
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
    
    // =====================================================
    // FORM SUBMISSION
    // =====================================================
    
    const form = document.getElementById('insertPostalOfficeForm');
    if (form) {
        form.addEventListener('submit', function(e) {
            e.preventDefault();
            
            // Final validation before submit
            if (!validateStep2()) {
                return;
            }
            
            // Confirmation dialog
            Swal.fire({
                title: 'Confirm Submission',
                html: `
                    <p>Are you sure you want to add this post office?</p>
                    <p><strong>${document.getElementById('officeName').value}</strong></p>
                `,
                icon: 'question',
                showCancelButton: true,
                confirmButtonColor: '#28a745',
                cancelButtonColor: '#6c757d',
                confirmButtonText: '<i class="fas fa-check"></i> Yes, Add Office',
                cancelButtonText: '<i class="fas fa-times"></i> Cancel'
            }).then((result) => {
                if (result.isConfirmed) {
                    submitForm();
                }
            });
        });
    }
    
    function submitForm() {
        const submitBtn = form.querySelector('button[type="submit"]');
        const originalText = submitBtn.innerHTML;
        
        // Disable submit button
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';
        
        // Show loading dialog
        Swal.fire({
            title: 'Adding Post Office...',
            html: 'Please wait while we save the information',
            allowOutsideClick: false,
            allowEscapeKey: false,
            didOpen: () => {
                Swal.showLoading();
            }
        });
        
        // Build form data object
        const formData = {
            name: document.getElementById('officeName')?.value || null,
            postmaster: document.getElementById('postmaster')?.value || null,
            address: document.getElementById('address')?.value || null,
            zipCode: document.getElementById('zipCode')?.value || null,
            areaId: parseInt(document.getElementById('areaId')?.value) || null,
            regionId: parseInt(document.getElementById('regionId')?.value) || null,
            provinceId: parseInt(document.getElementById('provinceId')?.value) || null,
            cityMunId: parseInt(document.getElementById('cityMunId')?.value) || null,
            barangayId: parseInt(document.getElementById('barangayId')?.value) || null,
            latitude: parseFloat(document.getElementById('latitude')?.value) || null,
            longitude: parseFloat(document.getElementById('longitude')?.value) || null,
            connectionStatus: document.getElementById('connectionStatus')?.checked || false
        };
        
        console.log('Submitting form data:', formData);
        
        // Submit via fetch API
        fetch('/api/postal-office/insert', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(formData)
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                Swal.fire({
                    icon: 'success',
                    title: 'Success!',
                    html: `
                        <p><strong>${formData.name}</strong> has been added successfully!</p>
                        <p>You will be redirected to the data table...</p>
                    `,
                    timer: 3000,
                    timerProgressBar: true,
                    showConfirmButton: false,
                    willClose: () => {
                        window.location.href = '/table';
                    }
                });
            } else {
                Swal.fire({
                    icon: 'error',
                    title: 'Failed to Add Office',
                    text: data.message || 'An error occurred',
                    confirmButtonColor: '#d33'
                });
                submitBtn.disabled = false;
                submitBtn.innerHTML = originalText;
            }
        })
        .catch(error => {
            console.error('Error submitting form:', error);
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: 'Failed to add postal office. Please try again.',
                confirmButtonColor: '#d33'
            });
            submitBtn.disabled = false;
            submitBtn.innerHTML = originalText;
        });
    }
    
    // =====================================================
    // KEYBOARD SHORTCUTS
    // =====================================================
    
    document.addEventListener('keydown', function(e) {
        // Alt + Right Arrow = Next Step
        if (e.altKey && e.key === 'ArrowRight') {
            e.preventDefault();
            const activeStep = document.querySelector('.wizard-step.active');
            if (activeStep && activeStep.id === 'step-1' && validateStep1()) {
                showStep(2);
            }
        }
        
        // Alt + Left Arrow = Previous Step
        if (e.altKey && e.key === 'ArrowLeft') {
            e.preventDefault();
            const activeStep = document.querySelector('.wizard-step.active');
            if (activeStep && activeStep.id === 'step-2') {
                showStep(1);
            }
        }
    });
    
    console.log('Insert Office Wizard (2-Step) initialized successfully');
    
    // Show welcome message
    Swal.fire({
        icon: 'info',
        title: 'Post Office Registration',
        html: `
            <p>Complete the 2-step process to add a new post office.</p>
            <hr>
            <p><small><strong>Keyboard shortcuts:</strong></small></p>
            <p><small>Alt + â†’ : Next Step | Alt + â† : Previous Step</small></p>
        `,
        toast: true,
        position: 'top-end',
        timer: 5000,
        timerProgressBar: true,
        showConfirmButton: false
    });
});
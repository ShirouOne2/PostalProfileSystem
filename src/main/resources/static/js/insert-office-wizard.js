/**
 * Insert Office Wizard - Vanilla JavaScript
 * No jQuery dependencies
 */

document.addEventListener('DOMContentLoaded', function() {
    
    // Wizard Navigation Functions
    function showStep(stepNumber) {
        // Hide all steps
        document.querySelectorAll('.wizard-step').forEach(step => {
            step.classList.remove('active');
        });
        
        // Show target step
        const targetStep = document.getElementById('step-' + stepNumber);
        if (targetStep) {
            targetStep.classList.add('active');
        }
        
        // Update indicators
        document.querySelectorAll('.wizard-step-indicator').forEach(indicator => {
            indicator.classList.remove('active');
        });
        
        const targetIndicator = document.querySelector(`.wizard-step-indicator[data-step="${stepNumber}"]`);
        if (targetIndicator) {
            targetIndicator.classList.add('active');
        }
    }
    
    // Validation Functions
    function validateStep1() {
        const officeName = document.getElementById('officeName').value.trim();
        const areaId = document.getElementById('areaId').value;
        
        if (!officeName) {
            alert('Please enter a post office name');
            return false;
        }
        
        if (!areaId) {
            alert('Please select an area');
            return false;
        }
        
        return true;
    }
    
    function validateStep2() {
        const regionId = document.getElementById('regionId').value;
        const provinceId = document.getElementById('provinceId').value;
        const cityMunId = document.getElementById('cityMunId').value;
        
        if (!regionId) {
            alert('Please select a region');
            return false;
        }
        
        if (!provinceId) {
            alert('Please select a province');
            return false;
        }
        
        if (!cityMunId) {
            alert('Please select a city/municipality');
            return false;
        }
        
        return true;
    }
    
    // Navigation Button Event Listeners
    const nextStep1Btn = document.getElementById('nextStep1');
    if (nextStep1Btn) {
        nextStep1Btn.addEventListener('click', function() {
            if (validateStep1()) {
                showStep(2);
            }
        });
    }
    
    const nextStep2Btn = document.getElementById('nextStep2');
    if (nextStep2Btn) {
        nextStep2Btn.addEventListener('click', function() {
            if (validateStep2()) {
                showStep(3);
            }
        });
    }
    
    const prevStep2Btn = document.getElementById('prevStep2');
    if (prevStep2Btn) {
        prevStep2Btn.addEventListener('click', function() {
            showStep(1);
        });
    }
    
    const prevStep3Btn = document.getElementById('prevStep3');
    if (prevStep3Btn) {
        prevStep3Btn.addEventListener('click', function() {
            showStep(2);
        });
    }
    
    // Cascading Dropdown Functions
    
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
            
            if (regionId) {
                fetch('/api/provinces/by-region/' + regionId)
                    .then(response => {
                        if (!response.ok) throw new Error('Failed to load provinces');
                        return response.json();
                    })
                    .then(provinces => {
                        provinces.forEach(province => {
                            const option = document.createElement('option');
                            option.value = province.id;
                            option.textContent = province.name;
                            provinceSelect.appendChild(option);
                        });
                        provinceSelect.disabled = false;
                    })
                    .catch(error => {
                        console.error('Error:', error);
                        alert('Error loading provinces');
                    });
            }
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
            
            if (provinceId) {
                fetch('/api/cities/by-province/' + provinceId)
                    .then(response => {
                        if (!response.ok) throw new Error('Failed to load cities');
                        return response.json();
                    })
                    .then(cities => {
                        cities.forEach(city => {
                            const option = document.createElement('option');
                            option.value = city.id;
                            option.textContent = city.name;
                            citySelect.appendChild(option);
                        });
                        citySelect.disabled = false;
                    })
                    .catch(error => {
                        console.error('Error:', error);
                        alert('Error loading cities');
                    });
            }
        });
    }
    
    // City/Municipality -> Barangay cascade
    const citySelect = document.getElementById('cityMunId');
    if (citySelect) {
        citySelect.addEventListener('change', function() {
            const cityId = this.value;
            const barangaySelect = document.getElementById('barangayId');
            
            resetSelect(barangaySelect, '-- Select Barangay --', true);
            
            if (cityId) {
                fetch('/api/barangays/by-city/' + cityId)
                    .then(response => {
                        if (!response.ok) throw new Error('Failed to load barangays');
                        return response.json();
                    })
                    .then(barangays => {
                        barangays.forEach(barangay => {
                            const option = document.createElement('option');
                            option.value = barangay.id;
                            option.textContent = barangay.name;
                            barangaySelect.appendChild(option);
                        });
                        barangaySelect.disabled = false;
                    })
                    .catch(error => {
                        console.error('Error:', error);
                        alert('Error loading barangays');
                    });
            }
        });
    }
    
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
    
    // Form submission
    const form = document.getElementById('insertPostalOfficeForm');
    if (form) {
        form.addEventListener('submit', function(e) {
            e.preventDefault();
            
            const submitBtn = form.querySelector('button[type="submit"]');
            const originalText = submitBtn.innerHTML;
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';
            
            // Build form data object
            const formData = {
                name: document.getElementById('officeName').value || null,
                postmaster: document.getElementById('postmaster').value || null,
                address: document.getElementById('address').value || null,
                zipCode: document.getElementById('zipCode').value || null,
                areaId: parseInt(document.getElementById('areaId').value) || null,
                regionId: parseInt(document.getElementById('regionId').value) || null,
                provinceId: parseInt(document.getElementById('provinceId').value) || null,
                cityMunId: parseInt(document.getElementById('cityMunId').value) || null,
                barangayId: parseInt(document.getElementById('barangayId').value) || null,
                latitude: parseFloat(document.getElementById('latitude').value) || null,
                longitude: parseFloat(document.getElementById('longitude').value) || null,
                connectionStatus: document.getElementById('connectionStatus').checked
            };
            
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
                    alert('✓ Postal Office added successfully!');
                    window.location.href = '/table';
                } else {
                    alert('✗ Error: ' + data.message);
                    submitBtn.disabled = false;
                    submitBtn.innerHTML = originalText;
                }
            })
            .catch(error => {
                console.error('Error:', error);
                alert('✗ Error: Failed to add postal office');
                submitBtn.disabled = false;
                submitBtn.innerHTML = originalText;
            });
        });
    }
});
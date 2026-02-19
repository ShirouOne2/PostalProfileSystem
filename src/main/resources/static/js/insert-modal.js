$(document).ready(function() {
    
    // Region -> Province cascade
    $('#regionId').on('change', function() {
        const regionId = $(this).val();
        const $provinceSelect = $('#provinceId');
        
        // Reset dependent dropdowns
        $provinceSelect.html('<option value="">-- Select Province --</option>').prop('disabled', true);
        $('#cityMunId').html('<option value="">-- Select City/Municipality --</option>').prop('disabled', true);
        $('#barangayId').html('<option value="">-- Select Barangay --</option>').prop('disabled', true);
        
        if (regionId) {
            $.get('/api/provinces/by-region/' + regionId, function(provinces) {
                provinces.forEach(function(province) {
                    $provinceSelect.append(
                        $('<option></option>').val(province.id).text(province.name)
                    );
                });
                $provinceSelect.prop('disabled', false);
            });
        }
    });
    
    // Province -> City/Municipality cascade
    $('#provinceId').on('change', function() {
        const provinceId = $(this).val();
        const $citySelect = $('#cityMunId');
        
        // Reset dependent dropdowns
        $citySelect.html('<option value="">-- Select City/Municipality --</option>').prop('disabled', true);
        $('#barangayId').html('<option value="">-- Select Barangay --</option>').prop('disabled', true);
        
        if (provinceId) {
            $.get('/api/cities/by-province/' + provinceId, function(cities) {
                cities.forEach(function(city) {
                    $citySelect.append(
                        $('<option></option>').val(city.id).text(city.name)
                    );
                });
                $citySelect.prop('disabled', false);
            });
        }
    });
    
    // City/Municipality -> Barangay cascade
    $('#cityMunId').on('change', function() {
        const cityId = $(this).val();
        const $barangaySelect = $('#barangayId');
        
        $barangaySelect.html('<option value="">-- Select Barangay --</option>').prop('disabled', true);
        
        if (cityId) {
            $.get('/api/barangays/by-city/' + cityId, function(barangays) {
                barangays.forEach(function(barangay) {
                    $barangaySelect.append(
                        $('<option></option>').val(barangay.id).text(barangay.name)
                    );
                });
                $barangaySelect.prop('disabled', false);
            });
        }
    });
    
    // Form submission
    $('#insertPostalOfficeForm').on('submit', function(e) {
        e.preventDefault();
        
        const formData = {
            name: $('#officeName').val(),
            postmaster: $('#postmaster').val() || null,
            address: $('#address').val() || null,
            zipCode: $('#zipCode').val() || null,
            areaId: $('#areaId').val() || null,
            regionId: $('#regionId').val() || null,
            provinceId: $('#provinceId').val() || null,
            cityMunId: $('#cityMunId').val() || null,
            barangayId: $('#barangayId').val() || null,
            latitude: $('#latitude').val() || null,
            longitude: $('#longitude').val() || null,
            connectionStatus: $('#connectionStatus').is(':checked')
        };
        
        $.ajax({
            url: '/api/postal-office/insert',
            type: 'POST',
            contentType: 'application/json',
            data: JSON.stringify(formData),
            success: function(response) {
                alert('Postal Office added successfully!');
                $('#insertPostalOfficeModal').modal('hide');
                $('#insertPostalOfficeForm')[0].reset();
                location.reload(); // Reload to see new data
            },
            error: function(xhr) {
                alert('Error: ' + (xhr.responseJSON?.message || 'Failed to add postal office'));
            }
        });
    });
    
    // Reset form when modal is closed
    $('#insertPostalOfficeModal').on('hidden.bs.modal', function() {
        $('#insertPostalOfficeForm')[0].reset();
        $('#provinceId, #cityMunId, #barangayId').prop('disabled', true);
    });
});

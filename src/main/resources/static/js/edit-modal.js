/**
 * Edit Modal for Post Office
 * Handles the edit modal functionality for postal office editing
 */

$(document).ready(function() {
    
    // Function to open edit modal with data
    window.openEditModalWithData = function(officeData) {
        // Populate form with office data
        $('#editOfficeId').val(officeData.id);
        $('#editName').val(officeData.name || '');
        $('#editPostmaster').val(officeData.postmaster || '');
        $('#editAddress').val(officeData.address || '');
        $('#editZipCode').val(officeData.zipCode || '');
        $('#editStatus').val(officeData.connectionStatus ? 'true' : 'false');
        $('#editISP').val(officeData.internetServiceProvider || '');
        $('#editSpeed').val(officeData.speed || '');
        $('#editTypeOfConnection').val(officeData.typeOfConnection || '');
        $('#editStaticIP').val(officeData.staticIpAddress || '');
        $('#editNoOfEmployees').val(officeData.noOfEmployees || 0);
        $('#editNoOfTellers').val(officeData.noOfPostalTellers || 0);
        $('#editNoOfCarriers').val(officeData.noOfLetterCarriers || 0);
        $('#editContactPerson').val(officeData.postalOfficeContactPerson || '');
        $('#editContactNumber').val(officeData.postalOfficeContactNumber || '');
        $('#editISPContactPerson').val(officeData.ispContactPerson || '');
        $('#editISPContactNumber').val(officeData.ispContactNumber || '');
        $('#editLatitude').val(officeData.latitude || '');
        $('#editLongitude').val(officeData.longitude || '');
        
        // Show modal
        $('#editOfficeModal').modal('show');
    };
    
    // Save changes function
    window.saveOfficeChanges = function() {
        var officeId = $('#editOfficeId').val();
        var $btn = $('#editOfficeModal .btn-warning');
        
        var formData = {
            id: officeId,
            name: $('#editName').val(),
            postmaster: $('#editPostmaster').val() || null,
            address: $('#editAddress').val() || null,
            zipCode: $('#editZipCode').val() || null,
            connectionStatus: $('#editStatus').val() === 'true',
            internetServiceProvider: $('#editISP').val() || null,
            speed: $('#editSpeed').val() || null,
            typeOfConnection: $('#editTypeOfConnection').val() || null,
            staticIpAddress: $('#editStaticIP').val() || null,
            noOfEmployees: parseInt($('#editNoOfEmployees').val()) || 0,
            noOfPostalTellers: parseInt($('#editNoOfTellers').val()) || 0,
            noOfLetterCarriers: parseInt($('#editNoOfCarriers').val()) || 0,
            postalOfficeContactPerson: $('#editContactPerson').val() || null,
            postalOfficeContactNumber: $('#editContactNumber').val() || null,
            ispContactPerson: $('#editISPContactPerson').val() || null,
            ispContactNumber: $('#editISPContactNumber').val() || null,
            latitude: $('#editLatitude').val() || null,
            longitude: $('#editLongitude').val() || null
        };
        
        // Validation
        if (!formData.name || formData.name.trim() === '') {
            Swal.fire({
                icon: 'error',
                title: 'Validation Error',
                text: 'Office name is required.'
            });
            return;
        }
        
        $btn.prop('disabled', true).html('<i class="fas fa-spinner fa-spin mr-1"></i> Saving...');
        
        $.ajax({
            url: '/api/postal-office/' + officeId,
            method: 'PUT',
            contentType: 'application/json',
            data: JSON.stringify(formData),
            success: function (res) {
                $('#editOfficeModal').modal('hide');
                $btn.prop('disabled', false).html('<i class="fas fa-save"></i> Save Changes');
                
                if (res.success) {
                    Swal.fire({
                        icon: 'success',
                        title: 'Updated!',
                        text: 'Post office information has been updated successfully.',
                        timer: 2000,
                        showConfirmButton: false
                    }).then(function () {
                        location.reload(); // Reload to show updated data
                    });
                } else {
                    Swal.fire({ 
                        icon: 'error', 
                        title: 'Update Failed', 
                        text: res.message || 'Failed to update post office.' 
                    });
                }
            },
            error: function (xhr) {
                $btn.prop('disabled', false).html('<i class="fas fa-save"></i> Save Changes');
                var msg = xhr.responseJSON ? xhr.responseJSON.message : 'An error occurred while updating.';
                Swal.fire({ icon: 'error', title: 'Error', text: msg });
            }
        });
    };
    
    // Reset form when modal is closed
    $('#editOfficeModal').on('hidden.bs.modal', function() {
        $('#editOfficeForm')[0].reset();
    });
});

/* ── Profile Page Photo Upload Management ─────────────────────── */

let profilePhotosInitialized = false;

document.addEventListener('DOMContentLoaded', function() {
    if (!profilePhotosInitialized) {
        initializeProfilePhotoUploads();
        profilePhotosInitialized = true;
    }
});

function initializeProfilePhotoUploads() {
    // Profile picture upload
    const profileUploadOverlay = document.getElementById('profileUploadOverlay');
    const profilePhotoInput = document.getElementById('profilePhotoInput');
    
    if (profileUploadOverlay && profilePhotoInput) {
        profileUploadOverlay.addEventListener('click', function() {
            profilePhotoInput.click();
        });
        
        profilePhotoInput.addEventListener('change', function(e) {
            handleProfilePhotoUpload(e.target.files[0]);
        });
    }
    
    // Cover photo uploads (carousel)
    const coverUploadOverlays = document.querySelectorAll('.cover-upload-overlay');
    
    coverUploadOverlays.forEach(overlay => {
        overlay.addEventListener('click', function() {
            const slot = this.getAttribute('data-slot');
            const input = document.getElementById('coverPhotoInput' + slot);
            if (input) {
                input.click();
            }
        });
    });
    
    // Cover photo input change handlers
    for (let i = 1; i <= 3; i++) {
        const input = document.getElementById('coverPhotoInput' + i);
        if (input) {
            input.addEventListener('change', function(e) {
                handleCoverPhotoUpload(e.target.files[0], i);
            });
        }
    }
}

function handleProfilePhotoUpload(file) {
    if (!file) return;
    
    // Validate file size (5MB limit)
    if (file.size > 5 * 1024 * 1024) {
        Swal.fire({
            icon: 'warning',
            title: 'File Too Large',
            text: 'Profile photo must be smaller than 5MB.',
            confirmButtonColor: '#007bff'
        });
        return;
    }
    
    // Validate file type
    if (!file.type.startsWith('image/')) {
        Swal.fire({
            icon: 'warning',
            title: 'Invalid File Type',
            text: 'Please select an image file.',
            confirmButtonColor: '#007bff'
        });
        return;
    }
    
    // Show preview
    const reader = new FileReader();
    reader.onload = function(e) {
        const profileImg = document.getElementById('profilePicImg');
        if (profileImg) {
            profileImg.src = e.target.result;
        }
    };
    reader.readAsDataURL(file);
    
    // Upload to server
    uploadProfilePhoto(file);
}

function handleCoverPhotoUpload(file, slot) {
    if (!file) return;
    
    // Validate file size (5MB limit)
    if (file.size > 5 * 1024 * 1024) {
        Swal.fire({
            icon: 'warning',
            title: 'File Too Large',
            text: 'Cover photo must be smaller than 5MB.',
            confirmButtonColor: '#007bff'
        });
        return;
    }
    
    // Validate file type
    if (!file.type.startsWith('image/')) {
        Swal.fire({
            icon: 'warning',
            title: 'Invalid File Type',
            text: 'Please select an image file.',
            confirmButtonColor: '#007bff'
        });
        return;
    }
    
    // Show loading state
    Swal.fire({
        title: 'Uploading...',
        html: 'Please wait while we upload your cover photo.',
        allowOutsideClick: false,
        didOpen: () => {
            Swal.showLoading();
        }
    });
    
    // Upload to server
    uploadCoverPhoto(file, slot);
}

function uploadProfilePhoto(file) {
    const officeId = getOfficeIdFromPage();
    if (!officeId) return;
    
    const formData = new FormData();
    formData.append('file', file);
    
    fetch(`/api/postal-office/${officeId}/profile-photo`, {
        method: 'POST',
        body: formData
    })
    .then(response => {
        if (!response.ok) throw new Error('Upload failed');
        return response.json();
    })
    .then(data => {
        Swal.fire({
            icon: 'success',
            title: 'Success!',
            text: 'Profile photo updated successfully.',
            timer: 2000,
            showConfirmButton: false
        });
        
        // Refresh the profile image
        setTimeout(() => {
            location.reload();
        }, 1500);
    })
    .catch(error => {
        console.error('Error uploading profile photo:', error);
        Swal.fire({
            icon: 'error',
            title: 'Upload Failed',
            text: 'There was an error uploading your profile photo. Please try again.',
            confirmButtonColor: '#007bff'
        });
    });
}

function uploadCoverPhoto(file, slot) {
    const officeId = getOfficeIdFromPage();
    if (!officeId) return;
    
    const formData = new FormData();
    formData.append('file', file);
    
    fetch(`/api/postal-office/${officeId}/cover-photo/${slot}`, {
        method: 'POST',
        body: formData
    })
    .then(response => {
        if (!response.ok) throw new Error('Upload failed');
        return response.json();
    })
    .then(data => {
        Swal.fire({
            icon: 'success',
            title: 'Success!',
            text: `Cover photo ${slot} updated successfully.`,
            timer: 2000,
            showConfirmButton: false
        });
        
        // Refresh the page to show updated cover photo
        setTimeout(() => {
            location.reload();
        }, 1500);
    })
    .catch(error => {
        console.error('Error uploading cover photo:', error);
        Swal.fire({
            icon: 'error',
            title: 'Upload Failed',
            text: 'There was an error uploading your cover photo. Please try again.',
            confirmButtonColor: '#007bff'
        });
    });
}

function getOfficeIdFromPage() {
    // Try to get office ID from various possible sources
    const urlPath = window.location.pathname;
    const match = urlPath.match(/\/profile\/(\d+)/);
    if (match) return match[1];
    
    // Alternative: try to get from meta tag or data attribute
    const officeIdElement = document.querySelector('[data-office-id]');
    if (officeIdElement) return officeIdElement.getAttribute('data-office-id');
    
    return null;
}

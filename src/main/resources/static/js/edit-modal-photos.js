/**
 * Edit modal — photo preview, existing photo load, and clear-slot behavior.
 * Modal open, form fill, cascading location, save, archive: edit-modal.js (window.openModal, saveOfficeChanges).
 */

function editModalUploadPhoto(input, photoType, slot) {
    if (input.files && input.files[0]) {
        var file = input.files[0];
        var reader = new FileReader();

        reader.onload = function (e) {
            var boxId = photoType === 'profile' ? 'editProfileBox' : 'editCover' + slot + 'Box';
            var previewId = photoType === 'profile' ? 'editProfilePreview' : 'editCover' + slot + 'Preview';
            var placeholderId = photoType === 'profile' ? 'editProfilePlaceholder' : 'editCover' + slot + 'Placeholder';

            var box = document.getElementById(boxId);
            var preview = document.getElementById(previewId);
            var placeholder = document.getElementById(placeholderId);

            if (preview && placeholder) {
                preview.src = e.target.result;
                preview.style.display = 'block';
                placeholder.style.display = 'none';

                if (box) {
                    box.classList.add('loaded');
                    var deleteBtn = box.querySelector('.edit-photo-delete-btn');
                    if (deleteBtn) deleteBtn.style.display = 'block';
                }
            }
        };

        reader.readAsDataURL(file);

        // Upload to server immediately
        var officeId = $('#editOfficeId').val();
        if (!officeId) {
            Swal.fire('Error', 'Cannot upload photo: Office ID is missing.', 'error');
            return;
        }

        var formData = new FormData();
        formData.append('file', file);
        var url = '/api/postal-office/' + officeId + '/' + (photoType === 'profile' ? 'profile-photo' : 'cover-photo/' + slot);

        Swal.fire({
            title: 'Uploading...',
            allowOutsideClick: false,
            didOpen: () => { Swal.showLoading(); }
        });

        $.ajax({
            url: url,
            type: 'POST',
            data: formData,
            processData: false,
            contentType: false,
            success: function(res) {
                if (res.success) {
                    Swal.fire({
                        icon: 'success',
                        title: 'Uploaded!',
                        text: 'Photo uploaded successfully.',
                        timer: 1500,
                        showConfirmButton: false
                    });
                } else {
                    Swal.fire('Error', res.message || 'Upload failed.', 'error');
                }
            },
            error: function() {
                Swal.fire('Error', 'Failed to upload photo.', 'error');
            }
        });
    }
}

function editModalLoadPhotos(officeId) {
    if (!officeId || typeof $ === 'undefined') return;

    $.getJSON('/api/postal-office/' + officeId + '/photos')
        .done(function (photos) {
            if (photos && photos.length > 0) {
                photos.forEach(function (photo) {
                    var boxId, previewId, placeholderId;

                    if (photo.type === 'profile') {
                        boxId = 'editProfileBox';
                        previewId = 'editProfilePreview';
                        placeholderId = 'editProfilePlaceholder';
                    } else if (photo.type === 'cover' && photo.slot >= 1 && photo.slot <= 3) {
                        boxId = 'editCover' + photo.slot + 'Box';
                        previewId = 'editCover' + photo.slot + 'Preview';
                        placeholderId = 'editCover' + photo.slot + 'Placeholder';
                    }

                    if (boxId && previewId && placeholderId) {
                        var box = document.getElementById(boxId);
                        var preview = document.getElementById(previewId);
                        var placeholder = document.getElementById(placeholderId);

                        if (preview && placeholder && box) {
                            preview.src = photo.url || '/uploads/postal-offices/' + photo.filename;
                            preview.style.display = 'block';
                            placeholder.style.display = 'none';
                            box.classList.add('loaded');

                            var deleteBtn = box.querySelector('.edit-photo-delete-btn');
                            if (deleteBtn) deleteBtn.style.display = 'block';
                        }
                    }
                });
            }
        })
        .fail(function () {
            console.log('No existing photos found for office ' + officeId);
        });
}

if (typeof $ !== 'undefined') {
    $(document).on('click', '.edit-photo-delete-btn', function () {
        var $btn = $(this);
        var type = $btn.data('type');
        var slot = $btn.data('slot') || 0;
        var officeId = $('#editOfficeId').val();

        var $box = $btn.closest('.edit-photo-box');
        var $preview = $box.find('.edit-photo-preview');
        var $placeholder = $box.find('.edit-photo-placeholder');
        var $input = $box.siblings('input[type="file"]');

        Swal.fire({
            title: 'Delete Photo?',
            text: "Are you sure you want to delete this photo?",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#e74a3b',
            cancelButtonColor: '#858796',
            confirmButtonText: '<i class="fas fa-trash"></i> Yes, delete it!'
        }).then((result) => {
            if (result.isConfirmed) {
                // If the user selected a new file but hasn't uploaded it, just clear the UI
                if ($input[0] && $input[0].files && $input[0].files.length > 0) {
                    $input.val('');
                    $preview.attr('src', '').hide();
                    $placeholder.show();
                    $box.removeClass('loaded');
                    $btn.hide();
                    return;
                }

                // If office ID exists, it's an existing photo on the server, so call the DELETE API
                if (officeId) {
                    var url = '/api/postal-office/' + officeId + '/' + (type === 'profile' ? 'profile-photo' : 'cover-photo/' + slot);
                    
                    // Show a small loading spinner in Swal
                    Swal.fire({
                        title: 'Deleting...',
                        allowOutsideClick: false,
                        didOpen: () => { Swal.showLoading(); }
                    });

                    $.ajax({
                        url: url,
                        type: 'DELETE',
                        success: function(res) {
                            if (res.success) {
                                $preview.attr('src', '').hide();
                                $placeholder.show();
                                $box.removeClass('loaded');
                                $btn.hide();
                                Swal.fire({
                                    icon: 'success',
                                    title: 'Deleted!',
                                    text: 'Photo has been deleted.',
                                    timer: 1500,
                                    showConfirmButton: false
                                });
                            } else {
                                Swal.fire('Error', res.message || 'Delete failed.', 'error');
                            }
                        },
                        error: function() {
                            Swal.fire('Error', 'Failed to delete photo. Please try again.', 'error');
                        }
                    });
                } else {
                    // Fallback if no office ID
                    $preview.attr('src', '').hide();
                    $placeholder.show();
                    $box.removeClass('loaded');
                    $btn.hide();
                }
            }
        });
    });
}

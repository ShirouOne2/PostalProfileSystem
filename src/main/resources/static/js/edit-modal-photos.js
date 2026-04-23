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
        var $box = $btn.closest('.edit-photo-box');
        var $preview = $box.find('.edit-photo-preview');
        var $placeholder = $box.find('.edit-photo-placeholder');
        var $input = $box.siblings('input[type="file"]');

        $preview.attr('src', '').hide();
        $placeholder.show();
        $box.removeClass('loaded');
        $btn.hide();

        if ($input.length) {
            $input.val('');
        }
    });
}

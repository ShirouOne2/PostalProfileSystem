/**
 * Insert Wizard Photo Upload Helpers
 * Handles photo upload and preview functionality for the office insert wizard
 * Separated from insert-office.html for better code organization
 */

function wizardHandleDragOver(e) {
    e.preventDefault();
    e.currentTarget.classList.add('drag-over');
}

function wizardHandleDragLeave(e) {
    e.currentTarget.classList.remove('drag-over');
}

function wizardHandleDrop(e, inputId) {
    e.preventDefault();
    e.currentTarget.classList.remove('drag-over');
    var files = e.dataTransfer.files;
    if (!files || !files[0]) return;
    var input = document.getElementById(inputId);
    // Assign dropped file to the hidden input via DataTransfer
    var dt = new DataTransfer();
    dt.items.add(files[0]);
    input.files = dt.files;
    input.dispatchEvent(new Event('change'));
}

function wizardPreviewPhoto(input, innerDivId, previewImgId) {
    if (!input.files || !input.files[0]) return;
    var file = input.files[0];
    if (file.size > 5 * 1024 * 1024) {
        Swal.fire('File Too Large', 'Image must be smaller than 5MB.', 'warning');
        input.value = '';
        return;
    }
    var reader = new FileReader();
    reader.onload = function (e) {
        var inner   = document.getElementById(innerDivId);
        var preview = document.getElementById(previewImgId);
        var zone    = inner ? inner.closest('.upload-drop-zone') : null;
        if (inner)   inner.style.display   = 'none';
        if (preview) { preview.src = e.target.result; preview.style.display = 'block'; }
        if (zone)    zone.classList.add('has-photo');

        // Add remove button if not already there
        if (zone && !zone.querySelector('.upload-remove-btn')) {
            var btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'upload-remove-btn';
            btn.title = 'Remove photo';
            btn.innerHTML = '<i class="fas fa-times"></i>';
            btn.onclick = function (ev) {
                ev.stopPropagation();
                input.value = '';
                if (preview) { preview.src = ''; preview.style.display = 'none'; }
                if (inner)   inner.style.display = '';
                zone.classList.remove('has-photo');
                btn.remove();
            };
            zone.appendChild(btn);
        }
    };
    reader.readAsDataURL(file);
}

/**
 * Upload queued photos after a record is saved.
 * Returns a Promise that resolves when all uploads finish (or are skipped).
 */
function uploadInsertPhotos(officeId) {
    var uploads = [
        { inputId: 'insertProfilePhoto', endpoint: '/api/postal-office/' + officeId + '/profile-photo' },
        { inputId: 'insertCover1',       endpoint: '/api/postal-office/' + officeId + '/cover-photo/1' },
        { inputId: 'insertCover2',       endpoint: '/api/postal-office/' + officeId + '/cover-photo/2' },
        { inputId: 'insertCover3',       endpoint: '/api/postal-office/' + officeId + '/cover-photo/3' }
    ];

    var promises = uploads.map(function (u) {
        var input = document.getElementById(u.inputId);
        if (!input || !input.files || !input.files[0]) return Promise.resolve();
        var formData = new FormData();
        formData.append('file', input.files[0]);
        return fetch(u.endpoint, { method: 'POST', body: formData })
            .then(function (r) { return r.json(); })
            .catch(function () { /* silent — photo upload failure shouldn't block navigation */ });
    });

    return Promise.all(promises);
}

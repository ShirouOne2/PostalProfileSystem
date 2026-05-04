// ── Global: called by onchange on the Connection Status select ────────────
function syncConnectionStatus(select) {
    const isActive    = select.value === 'active';
    const connCheck   = document.getElementById('connectionStatus');
    const dateConn    = document.getElementById('dateConnected');
    const dateDisconn = document.getElementById('dateDisconnected');
    const pad = n => String(n).padStart(2, '0');
    const nowLocal = () => {
        const d = new Date();
        return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
    };

    if (connCheck) connCheck.checked = isActive;
    if (dateConn && dateDisconn) {
        if (isActive) {
            if (!dateConn.value) dateConn.value = nowLocal();
            dateDisconn.value    = '';
            dateConn.disabled    = false;
            dateDisconn.disabled = true;
        } else {
            if (!dateDisconn.value) dateDisconn.value = nowLocal();
            dateConn.value       = '';
            dateConn.disabled    = true;
            dateDisconn.disabled = false;
        }
    }
}

document.addEventListener('DOMContentLoaded', function () {

    console.log('Insert Office Wizard initializing...');

    const steps = document.querySelectorAll('.wizard-step');
    const form  = document.getElementById('insertPostalOfficeForm');
    let currentStep = 0;

    // ─── Required fields per step ───────────────────────────────────────────
    const REQUIRED = {
        0: [
            { id: 'officeName', label: 'Post Office Name' }
        ],
        1: [
            { id: 'areaId',     label: 'Area'              },
            { id: 'provinceId', label: 'Province'          },
            { id: 'cityMunId',  label: 'City / Municipality' }
        ]
    };

    // ─── Validation helpers ─────────────────────────────────────────────────
    function markInvalid(el) { if (!el) return; el.classList.add('is-invalid'); el.classList.remove('is-valid'); }
    function markValid(el)   { if (!el) return; el.classList.remove('is-invalid'); el.classList.add('is-valid'); }
    function clearMark(el)   { if (!el) return; el.classList.remove('is-invalid', 'is-valid'); }

    const touched = new Set();

    document.querySelectorAll('input, select, textarea').forEach(el => {
        el.addEventListener('focus', () => touched.add(el.id), { once: false });
        ['input', 'change'].forEach(evt =>
            el.addEventListener(evt, () => {
                if (!touched.has(el.id)) return;
                const isReq = Object.values(REQUIRED).flat().some(f => f.id === el.id);
                if (el.value && el.value.trim() !== '') markValid(el);
                else if (isReq) markInvalid(el);
                else clearMark(el);
            })
        );
    });

    // ─── Step validation ────────────────────────────────────────────────────
    function validateStep(index) {
        const required = REQUIRED[index];
        if (!required) return true;

        let valid = true;
        const missing = [];

        required.forEach(({ id, label }) => {
            const el = document.getElementById(id);
            touched.add(id);
            if (!el || !el.value || el.value.trim() === '') {
                markInvalid(el);
                missing.push(label);
                valid = false;
            } else {
                markValid(el);
            }
        });

        if (index === 1) {
            const latEl = document.getElementById('latitude');
            const lngEl = document.getElementById('longitude');
            const lat   = latEl?.value !== '' ? parseFloat(latEl.value) : null;
            const lng   = lngEl?.value !== '' ? parseFloat(lngEl.value) : null;

            if (lat !== null && (isNaN(lat) || lat < -90 || lat > 90)) {
                markInvalid(latEl); missing.push('Latitude (must be -90 to 90)'); valid = false;
            } else if (lat !== null) { markValid(latEl); }

            if (lng !== null && (isNaN(lng) || lng < -180 || lng > 180)) {
                markInvalid(lngEl); missing.push('Longitude (must be -180 to 180)'); valid = false;
            } else if (lng !== null) { markValid(lngEl); }
        }

        if (!valid) {
            Swal.fire({
                icon: 'warning',
                title: 'Required Fields Missing',
                html: `<p style="margin-bottom:8px">Please fill in the following before proceeding:</p>
                       <ul style="text-align:left;display:inline-block;margin:0;padding-left:1.2em;">
                         ${missing.map(m => `<li><strong>${m}</strong></li>`).join('')}
                       </ul>`,
                confirmButtonColor: '#3085d6'
            });
        }
        return valid;
    }

    // ─── Full validation ─────────────────────────────────────────────────────
    function validateAll() {
        const all = [
            { id: 'officeName', label: 'Post Office Name',    step: 1 },
            { id: 'areaId',     label: 'Area',                step: 2 },
            { id: 'provinceId', label: 'Province',            step: 2 },
            { id: 'cityMunId',  label: 'City / Municipality', step: 2 }
        ];

        let valid = true;
        const missing = [];

        all.forEach(({ id, label, step }) => {
            const el = document.getElementById(id);
            touched.add(id);
            if (!el || !el.value || el.value.trim() === '') {
                markInvalid(el); missing.push({ label, step }); valid = false;
            } else { markValid(el); }
        });

        if (!valid) {
            const firstStep = Math.min(...missing.map(m => m.step));
            Swal.fire({
                icon: 'error',
                title: 'Cannot Save — Required Fields Incomplete',
                html: `<p style="margin-bottom:8px">Please complete the following before saving:</p>
                       <ul style="text-align:left;display:inline-block;margin:0;padding-left:1.2em;">
                         ${missing.map(m => `<li><strong>${m.label}</strong><span style="color:#6c757d;font-size:.85em;"> — Step ${m.step}</span></li>`).join('')}
                       </ul>`,
                confirmButtonText: `<i class="fas fa-arrow-left"></i> Go to Step ${firstStep}`,
                confirmButtonColor: '#d33'
            }).then(() => {
                showStep(firstStep - 1);
                document.getElementById(missing[0].id)?.focus();
            });
        }
        return valid;
    }

    // ─── Step navigation ────────────────────────────────────────────────────
    function showStep(index) {
        document.querySelectorAll('.wizard-step').forEach(s => s.classList.remove('active'));
        const target = document.getElementById('step-' + (index + 1));
        if (!target) return;
        target.classList.add('active');

        document.querySelectorAll('.wizard-step-indicator').forEach(ind => {
            ind.classList.remove('active', 'completed');
            const n = parseInt(ind.getAttribute('data-step'));
            if (n === index + 1)    ind.classList.add('active');
            else if (n < index + 1) ind.classList.add('completed');
        });

        currentStep = index;
        const totalSteps = document.querySelectorAll('.wizard-step-indicator').length;
        const pct = totalSteps > 1 ? (index / (totalSteps - 1)) * 100 : 0;
        document.querySelector('.wizard-steps')?.style.setProperty('--wizard-progress', pct + '%');
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    document.querySelectorAll('.btn-next').forEach(btn =>
        btn.addEventListener('click', () => {
            if (validateStep(currentStep) && currentStep < steps.length - 1)
                showStep(currentStep + 1);
        })
    );

    document.querySelectorAll('.btn-prev').forEach(btn =>
        btn.addEventListener('click', () => { if (currentStep > 0) showStep(currentStep - 1); })
    );

    document.querySelectorAll('.wizard-step-indicator').forEach((ind, i) =>
        ind.addEventListener('click', () => {
            if (i > currentStep) { if (validateStep(currentStep)) showStep(i); }
            else showStep(i);
        })
    );

    // ─── Status Dropdowns ────────────────────────────────────────────────────

    function nowLocal() {
        const d = new Date(), pad = n => String(n).padStart(2, '0');
        return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
    }

    function initStatusDropdowns() {
        const connSelect  = document.getElementById('connectionStatusSelect');
        const connCheck   = document.getElementById('connectionStatus');
        const dateConn    = document.getElementById('dateConnected');
        const dateDisconn = document.getElementById('dateDisconnected');

        // Default state = Inactive
        if (dateConn)    dateConn.disabled    = true;
        if (dateDisconn) {
            dateDisconn.disabled = false;
            if (!dateDisconn.value) dateDisconn.value = nowLocal();
        }

        if (connSelect) {
            connSelect.addEventListener('change', function () {
                const isActive = this.value === 'active';
                if (connCheck) connCheck.checked = isActive;

                if (dateConn && dateDisconn) {
                    if (isActive) {
                        if (!dateConn.value) dateConn.value = nowLocal();
                        dateDisconn.value    = '';
                        dateConn.disabled    = false;
                        dateDisconn.disabled = true;
                    } else {
                        if (!dateDisconn.value) dateDisconn.value = nowLocal();
                        dateConn.value       = '';
                        dateConn.disabled    = true;
                        dateDisconn.disabled = false;
                    }
                }
            });
        }

        const officeStatusSelect = document.getElementById('officeStatus');
        if (officeStatusSelect) {
            officeStatusSelect.addEventListener('change', function () {
                if (this.value) {
                    this.classList.remove('is-invalid');
                    this.classList.add('is-valid');
                } else {
                    this.classList.remove('is-valid');
                    if (touched.has(this.id)) this.classList.add('is-invalid');
                }
            });
            officeStatusSelect.addEventListener('focus', () => touched.add('officeStatus'), { once: false });
        }
    }

    initStatusDropdowns();

    // ─── Field value getters ─────────────────────────────────────────────────

    function getStr(id) {
        const el = document.getElementById(id);
        if (!el) return null;
        const v = el.value?.trim();
        return (v === '' || v == null) ? null : v;
    }

    function getInt(id) {
        const v = getStr(id);
        if (v == null) return null;
        const n = parseInt(v, 10);
        return isNaN(n) ? null : n;
    }

    function getFloat(id) {
        const v = getStr(id);
        if (v == null) return null;
        const n = parseFloat(v);
        return isNaN(n) ? null : n;
    }

    function getBool(id) {
        const el = document.getElementById(id);
        if (!el) return false;
        if (el.type === 'checkbox') return el.checked;
        return el.value === 'true';
    }

    // Speed: user enters number only, store as "N Mbps"
    function getSpeed() {
        const el = document.getElementById('speed');
        if (!el || !el.value || el.value.trim() === '') return null;
        const num = parseFloat(el.value.trim());
        return isNaN(num) ? null : num + ' Mbps';
    }

    // ─── Form submit ─────────────────────────────────────────────────────────
    form?.addEventListener('submit', function (e) {
        e.preventDefault();
        if (!validateAll()) return;

        const officeName = document.getElementById('officeName')?.value?.trim() || '';

        Swal.fire({
            icon: 'question',
            title: 'Confirm Save',
            html: `<p>Save this new post office?</p>
                   <p style="font-weight:600;color:#002868;">${officeName}</p>`,
            showCancelButton: true,
            confirmButtonText: '<i class="fas fa-save"></i> Yes, Save',
            cancelButtonText:  'Review Again',
            confirmButtonColor: '#28a745'
        }).then(r => { if (r.isConfirmed) submitForm(); });
    });

    // ─── Submit to API ────────────────────────────────────────────────────────
    function submitForm() {
        const btn = form.querySelector('button[type="submit"]');
        btn.disabled = true;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';
        Swal.fire({ title: 'Saving...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });

        fetch('/api/postal/postal-office/insert', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                // Basic Info
                name:                           getStr('officeName'),
                postmaster:                     getStr('postmaster'),
                address:                        getStr('address'),
                zipCode:                        getStr('zipCode'),

                // Location
                areaId:                         getInt('areaId'),
                provinceId:                     getInt('provinceId'),
                cityMunId:                      getInt('cityMunId'),
                barangayId:                     getInt('barangayId'),
                latitude:                       getFloat('latitude'),
                longitude:                      getFloat('longitude'),

                // Office Status
                officeStatus:                   getStr('officeStatus'),

                // Connectivity
                connectionStatus:               getBool('connectionStatus'),
                internetServiceProvider:        getStr('internetServiceProvider'),
                classification:                 getStr('classification'),
                ownedOrShared:                  getStr('ownedOrShared'),
                typeOfConnection:               getStr('typeOfConnection'),
                speed:                          getSpeed(),
                staticIpAddress:                getStr('ipAddressType') === 'static' ? 'Static' : null,
                ispContactPerson:               getStr('ispContactPerson'),
                ispContactNumber:               getStr('ispContactNumber'),

                // Plan & Billing
                planName:                       getStr('planName'),
                planPrice:                      getFloat('planPrice'),
                accountNumber:                  getStr('accountNumber'),
                dateConnected:                  getStr('dateConnected'),
                dateDisconnected:               getStr('dateDisconnected'),
                isWired:                        getBool('isWired'),
                isFree:                         getBool('isFree'),
                planContract:                   getStr('planContract'),

                // Contact
                postalOfficeContactPerson:      getStr('postalOfficeContactPerson'),
                postalOfficeContactNumber:      getStr('postalOfficeContactNumber'),

                // Additional
                noOfEmployees:                  getInt('noOfEmployees'),
                noOfPostalTellers:              getInt('noOfPostalTellers'),
                noOfLetterCarriers:             getInt('noOfLetterCarriers'),
                serviceProvided:                getStr('serviceProvided'),
                remarks:                        getStr('remarks')
            })
        })
        .then(r => r.json())
        .then(data => {
            // Restore button either way
            btn.disabled = false;
            btn.innerHTML = '<i class="fas fa-save"></i> Save Record';

            if (data.success) {
                const officeId = data.id;

                // Check if any photos were selected — match IDs used in the HTML
                const hasPhotos = ['coverPhoto', 'profilePicture']
                    .some(id => {
                        const el = document.getElementById(id);
                        return el && el.files && el.files[0];
                    });

                if (hasPhotos && officeId) {
                    Swal.fire({ title: 'Uploading Photos...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });
                    uploadInsertPhotos(officeId).then(() => {
                        Swal.fire({
                            icon: 'success', title: 'Saved!',
                            text: 'Post Office and photos added successfully.',
                            timer: 2000, showConfirmButton: false
                        }).then(() => { window.location.href = '/table'; });
                    });
                } else {
                    Swal.fire({
                        icon: 'success',
                        title: 'Saved!',
                        text: 'Post Office added successfully.',
                        timer: 2000,
                        showConfirmButton: false
                    }).then(() => { window.location.href = '/table'; });
                }
            } else {
                Swal.fire('Error', data.message || 'Save failed. Please try again.', 'error');
            }
        })
        .catch(err => {
            btn.disabled = false;
            btn.innerHTML = '<i class="fas fa-save"></i> Save Record';
            Swal.fire('Error', err.message || 'Something went wrong.', 'error');
        });
    }

    // ─── Summary box (updates when Step 5 becomes active) ────────────────────
    (function () {
        function getSelectedText(id) {
            const el = document.getElementById(id);
            if (!el) return '—';
            if (el.tagName === 'SELECT') return el.options[el.selectedIndex]?.text || '—';
            return el.value?.trim() || '—';
        }

        function updateSummary() {
            const nameEl = document.getElementById('summaryName');
            if (nameEl) nameEl.textContent = document.getElementById('officeName')?.value?.trim() || '—';

            const fieldMap = {
                summaryArea:           'areaId',
                summaryProvince:       'provinceId',
                summaryCity:           'cityMunId',
                summaryISP:            'internetServiceProvider',
                summaryClassification: 'classification'
            };
            Object.entries(fieldMap).forEach(([sid, srcId]) => {
                const el = document.getElementById(sid);
                if (el) el.textContent = getSelectedText(srcId);
            });

            const statusEl  = document.getElementById('summaryStatus');
            const connCheck = document.getElementById('connectionStatus');
            if (statusEl) {
                statusEl.innerHTML = connCheck?.checked
                    ? '<span class="badge badge-success">Active</span>'
                    : '<span class="badge badge-secondary">Inactive</span>';
            }
        }

        const observer = new MutationObserver(mutations =>
            mutations.forEach(m => {
                if (m.target.id === 'step-5' && m.target.classList.contains('active')) updateSummary();
            })
        );
        document.querySelectorAll('.wizard-step').forEach(s =>
            observer.observe(s, { attributes: true, attributeFilter: ['class'] })
        );
    })();

    // ─── Init ─────────────────────────────────────────────────────────────────
    showStep(0);
    console.log('Wizard ready.');

}); // end DOMContentLoaded

// ─── Location cascade dropdowns ───────────────────────────────────────────────

function resetSelect(element, placeholder, disabled) {
    if (!element) return;
    element.innerHTML = `<option value="">${placeholder}</option>`;
    element.disabled = disabled;
}

function loadingSelect(element) {
    if (!element) return;
    element.innerHTML = '<option value="">Loading...</option>';
    element.disabled = true;
}

document.addEventListener('DOMContentLoaded', function () {

    document.getElementById('areaId')?.addEventListener('change', function () {
        const provSel = document.getElementById('provinceId');
        const citySel = document.getElementById('cityMunId');
        const baraSel = document.getElementById('barangayId');

        resetSelect(provSel, '-- Select Province --', true);
        resetSelect(citySel, '-- Select City/Municipality --', true);
        resetSelect(baraSel, '-- Select Barangay --', true);

        if (!this.value) return;

        loadingSelect(provSel);
        fetch('/api/postal/provinces/by-area/' + this.value)
            .then(r => r.ok ? r.json() : r.json().then(e => { throw new Error(e.message); }))
            .then(list => {
                resetSelect(provSel, '-- Select Province --', false);
                list.forEach(p => {
                    const o = document.createElement('option');
                    o.value = p.id; o.textContent = p.name;
                    provSel.appendChild(o);
                });
            })
            .catch(err => {
                resetSelect(provSel, '-- Error --', true);
                Swal.fire('Error', 'Failed to load provinces: ' + err.message, 'error');
            });
    });

    document.getElementById('provinceId')?.addEventListener('change', function () {
        const citySel = document.getElementById('cityMunId');
        const baraSel = document.getElementById('barangayId');
        resetSelect(citySel, '-- Select City/Municipality --', true);
        resetSelect(baraSel, '-- Select Barangay --', true);
        if (!this.value) return;
        loadingSelect(citySel);
        fetch('/api/postal/cities/by-province/' + this.value)
            .then(r => r.ok ? r.json() : r.json().then(e => { throw new Error(e.message); }))
            .then(list => {
                resetSelect(citySel, '-- Select City/Municipality --', false);
                list.forEach(c => {
                    const o = document.createElement('option');
                    o.value = c.id; o.textContent = c.name;
                    citySel.appendChild(o);
                });
            })
            .catch(err => {
                resetSelect(citySel, '-- Error --', true);
                Swal.fire('Error', 'Failed to load cities: ' + err.message, 'error');
            });
    });

    document.getElementById('cityMunId')?.addEventListener('change', function () {
        const baraSel = document.getElementById('barangayId');
        resetSelect(baraSel, '-- Select Barangay --', true);
        if (!this.value) return;
        loadingSelect(baraSel);
        fetch('/api/postal/barangays/by-city/' + this.value)
            .then(r => r.ok ? r.json() : r.json().then(e => { throw new Error(e.message); }))
            .then(list => {
                resetSelect(baraSel, '-- Select Barangay (Optional) --', false);
                list.forEach(b => {
                    const o = document.createElement('option');
                    o.value = b.id; o.textContent = b.name;
                    baraSel.appendChild(o);
                });
            })
            .catch(err => {
                resetSelect(baraSel, '-- Error --', true);
                Swal.fire('Error', 'Failed to load barangays: ' + err.message, 'error');
            });
    });

});

// ─── Photo upload after save ──────────────────────────────────────────────────
// Input IDs must match exactly what's in the HTML:
//   coverPhoto     → cover-photo slot 1
//   profilePicture → profile-photo

function uploadInsertPhotos(officeId) {
    const uploads = [
        { inputId: 'profilePicture', endpoint: '/api/postal-office/' + officeId + '/profile-photo' },
        { inputId: 'coverPhoto',     endpoint: '/api/postal-office/' + officeId + '/cover-photo/1'  }
    ];

    const promises = uploads.map(function (u) {
        const input = document.getElementById(u.inputId);
        if (!input || !input.files || !input.files[0]) return Promise.resolve();
        const formData = new FormData();
        formData.append('file', input.files[0]);
        return fetch(u.endpoint, { method: 'POST', body: formData })
            .then(r => r.json())
            .catch(() => { /* silent — photo failure should not block navigation */ });
    });

    return Promise.all(promises);
}
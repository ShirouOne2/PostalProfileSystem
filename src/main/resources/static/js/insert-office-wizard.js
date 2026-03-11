document.addEventListener('DOMContentLoaded', function () {

    console.log('Insert Office Wizard initializing...');

    const steps = document.querySelectorAll('.wizard-step');
    const form  = document.getElementById('insertPostalOfficeForm');
    let currentStep = 0;

    // ─── Required fields per step ───────────────────────────────────────────
    const REQUIRED = {
        0: [
            { id: 'officeName', label: 'Post Office Name' },
            { id: 'areaId',     label: 'Area'             }
        ],
        1: [
            { id: 'regionId',   label: 'Region'             },
            { id: 'provinceId', label: 'Province'            },
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
            { id: 'officeName', label: 'Post Office Name',   step: 1 },
            { id: 'areaId',     label: 'Area',               step: 1 },
            { id: 'regionId',   label: 'Region',             step: 2 },
            { id: 'provinceId', label: 'Province',           step: 2 },
            { id: 'cityMunId',  label: 'City / Municipality',step: 2 }
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

    // ─── Connection status → auto-set dates ─────────────────────────────────
    const connCheck   = document.getElementById('connectionStatus');
    const dateConn    = document.getElementById('dateConnected');
    const dateDisconn = document.getElementById('dateDisconnected');

    function nowLocal() {
        const d = new Date(), pad = n => String(n).padStart(2, '0');
        return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
    }

    if (connCheck && dateConn && dateDisconn) {
        connCheck.addEventListener('change', function () {
            if (this.checked) {
                if (!dateConn.value) dateConn.value = nowLocal();
                dateDisconn.value = ''; dateConn.disabled = false; dateDisconn.disabled = true;
            } else {
                if (!dateDisconn.value) dateDisconn.value = nowLocal();
                dateConn.value = ''; dateConn.disabled = true; dateDisconn.disabled = false;
            }
        });
        if (!connCheck.checked) {
            if (!dateDisconn.value) dateDisconn.value = nowLocal();
            dateConn.disabled = true; dateDisconn.disabled = false;
        }
    }

    // ─── Form submit ─────────────────────────────────────────────────────────
    form?.addEventListener('submit', function (e) {
        e.preventDefault();
        if (!validateAll()) return;

        const fullName = (document.getElementById('officeName')?.value?.trim() || '') +
                         ' ' + (document.getElementById('officeNameSuffix')?.value || 'PO');

        Swal.fire({
            icon: 'question',
            title: 'Confirm Save',
            html: `<p>Save this new post office?</p>
                   <p style="font-weight:600;color:#002868;">${fullName}</p>`,
            showCancelButton: true,
            confirmButtonText: '<i class="fas fa-save"></i> Yes, Save',
            cancelButtonText:  'Review Again',
            confirmButtonColor: '#28a745'
        }).then(r => { if (r.isConfirmed) submitForm(); });
    });

    // ─── Field value getters ─────────────────────────────────────────────────
    const getStr = id => {
        const e = document.getElementById(id);
        if (id === 'officeName') {
            const base   = e?.value?.trim() || '';
            const suffix = document.getElementById('officeNameSuffix')?.value || 'PO';
            return base ? base + ' ' + suffix : null;
        }
        return e?.value?.trim() || null;
    };
    const getInt   = id => { const e = document.getElementById(id); return e?.value ? parseInt(e.value) : null; };
    const getFloat = id => { const e = document.getElementById(id); return e?.value ? parseFloat(e.value) : null; };
    const getBool  = id => { const e = document.getElementById(id); return e ? e.checked : false; };

    // ─── Submit to API ───────────────────────────────────────────────────────
    function submitForm() {
        const btn = form.querySelector('button[type="submit"]');
        btn.disabled = true;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';
        Swal.fire({ title: 'Saving...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });

        fetch('/api/postal-office/insert', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                name:                      getStr('officeName'),
                postmaster:                getStr('postmaster'),
                address:                   getStr('address'),
                zipCode:                   getStr('zipCode'),
                areaId:                    getInt('areaId'),
                regionId:                  getInt('regionId'),
                provinceId:                getInt('provinceId'),
                cityMunId:                 getInt('cityMunId'),
                barangayId:                getInt('barangayId'),
                latitude:                  getFloat('latitude'),
                longitude:                 getFloat('longitude'),
                connectionStatus:          getBool('connectionStatus'),
                internetServiceProvider:   getStr('internetServiceProvider'),
                typeOfConnection:          getStr('typeOfConnection'),
                speed:                     getStr('speed'),
                staticIpAddress:           getStr('staticIpAddress'),
                dateConnected:             getStr('dateConnected'),
                dateDisconnected:          getStr('dateDisconnected'),
                postalOfficeContactPerson: getStr('postalOfficeContactPerson'),
                postalOfficeContactNumber: getStr('postalOfficeContactNumber'),
                ispContactPerson:          getStr('ispContactPerson'),
                ispContactNumber:          getStr('ispContactNumber'),
                noOfEmployees:             getInt('noOfEmployees'),
                noOfPostalTellers:         getInt('noOfPostalTellers'),
                noOfLetterCarriers:        getInt('noOfLetterCarriers'),
                classification:            getStr('classification'),
                serviceProvided:           getStr('serviceProvided')
            })
        })
        .then(r => r.json())
        .then(data => {
            if (data.success) {
                Swal.fire({
                    icon: 'success', title: 'Saved!',
                    text: 'Post Office added successfully.',
                    timer: 2000, showConfirmButton: false
                }).then(() => window.location.href = '/table');
            } else { throw new Error(data.message || 'Save failed'); }
        })
        .catch(err => {
            Swal.fire('Error', err.message || 'Something went wrong.', 'error');
            btn.disabled = false;
            btn.innerHTML = '<i class="fas fa-save"></i> Save Record';
        });
    }

    // ─── Cascading dropdowns ─────────────────────────────────────────────────
    function resetSelect(sel, placeholder, disabled) {
        if (!sel) return;
        sel.innerHTML = `<option value="">${placeholder}</option>`;
        sel.disabled = disabled;
        if (touched.has(sel.id)) clearMark(sel);
    }
    function loadingSelect(sel) {
        if (!sel) return;
        sel.innerHTML = '<option value="">Loading...</option>';
        sel.disabled = true;
    }

    document.getElementById('regionId')?.addEventListener('change', function () {
        const provSel = document.getElementById('provinceId');
        const citySel = document.getElementById('cityMunId');
        const baraSel = document.getElementById('barangayId');
        resetSelect(provSel, '-- Select Province --', true);
        resetSelect(citySel, '-- Select City/Municipality --', true);
        resetSelect(baraSel, '-- Select Barangay --', true);
        if (!this.value) return;
        loadingSelect(provSel);
        fetch('/api/provinces/by-region/' + this.value)
            .then(r => r.ok ? r.json() : r.json().then(e => { throw new Error(e.message); }))
            .then(list => {
                resetSelect(provSel, '-- Select Province --', false);
                list.forEach(p => { const o = document.createElement('option'); o.value = p.id; o.textContent = p.name; provSel.appendChild(o); });
            })
            .catch(err => { resetSelect(provSel, '-- Error --', true); Swal.fire('Error', 'Failed to load provinces: ' + err.message, 'error'); });
    });

    document.getElementById('provinceId')?.addEventListener('change', function () {
        const citySel = document.getElementById('cityMunId');
        const baraSel = document.getElementById('barangayId');
        resetSelect(citySel, '-- Select City/Municipality --', true);
        resetSelect(baraSel, '-- Select Barangay --', true);
        if (!this.value) return;
        loadingSelect(citySel);
        fetch('/api/cities/by-province/' + this.value)
            .then(r => r.ok ? r.json() : r.json().then(e => { throw new Error(e.message); }))
            .then(list => {
                resetSelect(citySel, '-- Select City/Municipality --', false);
                list.forEach(c => { const o = document.createElement('option'); o.value = c.id; o.textContent = c.name; citySel.appendChild(o); });
            })
            .catch(err => { resetSelect(citySel, '-- Error --', true); Swal.fire('Error', 'Failed to load cities: ' + err.message, 'error'); });
    });

    document.getElementById('cityMunId')?.addEventListener('change', function () {
        const baraSel = document.getElementById('barangayId');
        resetSelect(baraSel, '-- Select Barangay --', true);
        if (!this.value) return;
        loadingSelect(baraSel);
        fetch('/api/barangays/by-city/' + this.value)
            .then(r => r.ok ? r.json() : r.json().then(e => { throw new Error(e.message); }))
            .then(list => {
                resetSelect(baraSel, '-- Select Barangay (Optional) --', false);
                list.forEach(b => { const o = document.createElement('option'); o.value = b.id; o.textContent = b.name; baraSel.appendChild(o); });
            })
            .catch(err => { resetSelect(baraSel, '-- Error --', true); Swal.fire('Error', 'Failed to load barangays: ' + err.message, 'error'); });
    });

    // ─── Summary box ─────────────────────────────────────────────────────────
    (function () {
        function getSelectedText(id) {
            const el = document.getElementById(id);
            if (!el) return '—';
            if (el.tagName === 'SELECT') return el.options[el.selectedIndex]?.text || '—';
            return el.value?.trim() || '—';
        }
        function updateSummary() {
            const map = { summaryName: 'officeName', summaryArea: 'areaId', summaryRegion: 'regionId', summaryProvince: 'provinceId', summaryCity: 'cityMunId' };
            Object.entries(map).forEach(([sid, srcId]) => {
                const el = document.getElementById(sid);
                if (el) {
                    // For officeName, append suffix
                    if (srcId === 'officeName') {
                        const base   = document.getElementById('officeName')?.value?.trim() || '—';
                        const suffix = document.getElementById('officeNameSuffix')?.value || 'PO';
                        el.textContent = base !== '—' ? base + ' ' + suffix : '—';
                    } else {
                        el.textContent = getSelectedText(srcId);
                    }
                }
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
            mutations.forEach(m => { if (m.target.id === 'step-5' && m.target.classList.contains('active')) updateSummary(); })
        );
        document.querySelectorAll('.wizard-step').forEach(s => observer.observe(s, { attributes: true, attributeFilter: ['class'] }));
    })();

    // ─── Init ────────────────────────────────────────────────────────────────
    showStep(0);
    console.log('Wizard ready.');
});
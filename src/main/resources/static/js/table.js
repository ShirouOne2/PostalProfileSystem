/**
 * Post Office Inventory - table.js
 * PHLPost Profile System
 */

document.addEventListener('DOMContentLoaded', function () {

    // ── Initialize DataTable ──────────────────────────────────────────────────
    window._inventoryTable = new DataTable('#myTable', {
        pageLength: 25,
        lengthMenu: [10, 25, 50, 100],
        paging:    true,
        ordering:  true,
        info:      true,
        searching: true,

        columnDefs: [
            { targets: 0, width: '50px',  orderable: false, className: 'dt-center' },
            { targets: 1, orderable: true },
            { targets: 2, orderable: true },
            { targets: 3, orderable: true },
            { targets: 4, width: '110px', orderable: true,  className: 'dt-center' },
            { targets: 5, width: '160px', orderable: false, className: 'dt-center', searchable: false }
        ],

        order: [[2, 'asc'], [1, 'asc']],

        language: {
            search:     "Search:",
            lengthMenu: "Show _MENU_ entries per page",
            info:       "Showing _START_ to _END_ of _TOTAL_ entries",
            infoEmpty:  "No entries found",
            infoFiltered: "(filtered from _MAX_ total entries)",
            paginate:   { first: "<<", previous: "<", next: ">", last: ">>" },
            zeroRecords: "No matching records found"
        },

        dom: '<"row mb-3"<"col-sm-6"l><"col-sm-6 text-right"f>>rt<"row mt-2"<"col-sm-6"i><"col-sm-6"p>>',

        responsive: true,

        // Dynamic row numbering — updates correctly after sort/filter/page
        drawCallback: function () {
            const api  = this.api();
            const info = api.page.info();
            api.column(0, { page: 'current' }).nodes().each(function (cell, i) {
                cell.innerHTML = info.start + i + 1;
            });
        }
    });

    // ── Delegated event listeners ─────────────────────────────────────────────
    document.getElementById('myTable').addEventListener('click', function (e) {
        const editBtn = e.target.closest('.btn-edit');
        if (editBtn) handleEdit(editBtn.getAttribute('data-office-id'));
    });

}); // end DOMContentLoaded


// ── Edit Office ───────────────────────────────────────────────────────────────
function handleEdit(officeId) {
    Swal.fire({
        title: 'Loading...',
        allowOutsideClick: false,
        allowEscapeKey: false,
        showConfirmButton: false,
        didOpen: () => Swal.showLoading()
    });

    fetch('/api/postal-office/' + officeId)
        .then(r => r.json())
        .then(office => {
            Swal.close();

            document.getElementById('editOfficeId').value             = office.id;
            document.getElementById('editName').value                 = office.name || '';
            document.getElementById('editPostmaster').value           = office.postmaster || '';
            document.getElementById('editAddress').value              = office.address || '';
            document.getElementById('editZipCode').value              = office.zipCode || '';
            document.getElementById('editStatus').value               = office.connectionStatus ? 'true' : 'false';
            document.getElementById('editISP').value                  = office.internetServiceProvider || '';
            document.getElementById('editSpeed').value                = office.speed || '';
            document.getElementById('editTypeOfConnection').value     = office.typeOfConnection || '';
            document.getElementById('editStaticIP').value             = office.staticIpAddress || '';
            document.getElementById('editNoOfEmployees').value        = office.noOfEmployees || '';
            document.getElementById('editNoOfTellers').value          = office.noOfPostalTellers || '';
            document.getElementById('editNoOfCarriers').value         = office.noOfLetterCarriers || '';
            document.getElementById('editContactPerson').value        = office.postalOfficeContactPerson || '';
            document.getElementById('editContactNumber').value        = office.postalOfficeContactNumber || '';
            document.getElementById('editISPContactPerson').value     = office.ispContactPerson || '';
            document.getElementById('editISPContactNumber').value     = office.ispContactNumber || '';
            document.getElementById('editLatitude').value             = office.latitude || '';
            document.getElementById('editLongitude').value            = office.longitude || '';

            $('#editOfficeModal').modal('show');
        })
        .catch(() => {
            Swal.fire({ icon: 'error', title: 'Error', text: 'Failed to load office data.' });
        });
}


// ── Save Changes ──────────────────────────────────────────────────────────────
function saveOfficeChanges() {
    const id = document.getElementById('editOfficeId').value;

    if (!document.getElementById('editName').value.trim()) {
        Swal.fire({ icon: 'warning', title: 'Validation Error', text: 'Office name is required.' });
        return;
    }

    const updateData = {
        name:                        document.getElementById('editName').value,
        postmaster:                  document.getElementById('editPostmaster').value || null,
        address:                     document.getElementById('editAddress').value || null,
        zipCode:                     document.getElementById('editZipCode').value || null,
        connectionStatus:            document.getElementById('editStatus').value === 'true',
        internetServiceProvider:     document.getElementById('editISP').value || null,
        speed:                       document.getElementById('editSpeed').value || null,
        typeOfConnection:            document.getElementById('editTypeOfConnection').value || null,
        staticIpAddress:             document.getElementById('editStaticIP').value || null,
        noOfEmployees:               document.getElementById('editNoOfEmployees').value ? parseInt(document.getElementById('editNoOfEmployees').value) : null,
        noOfPostalTellers:           document.getElementById('editNoOfTellers').value   ? parseInt(document.getElementById('editNoOfTellers').value)   : null,
        noOfLetterCarriers:          document.getElementById('editNoOfCarriers').value  ? parseInt(document.getElementById('editNoOfCarriers').value)  : null,
        postalOfficeContactPerson:   document.getElementById('editContactPerson').value || null,
        postalOfficeContactNumber:   document.getElementById('editContactNumber').value || null,
        ispContactPerson:            document.getElementById('editISPContactPerson').value || null,
        ispContactNumber:            document.getElementById('editISPContactNumber').value || null,
        latitude:                    document.getElementById('editLatitude').value  ? parseFloat(document.getElementById('editLatitude').value)  : null,
        longitude:                   document.getElementById('editLongitude').value ? parseFloat(document.getElementById('editLongitude').value) : null
    };

    Swal.fire({
        title: 'Saving...',
        allowOutsideClick: false,
        allowEscapeKey: false,
        showConfirmButton: false,
        didOpen: () => Swal.showLoading()
    });

    fetch('/api/postal-office/' + id, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData)
    })
    .then(r => r.json())
    .then(() => {
        $('#editOfficeModal').modal('hide');
        Swal.fire({ icon: 'success', title: 'Saved!', text: 'Post office updated successfully.', timer: 2000, showConfirmButton: false })
            .then(() => location.reload());
    })
    .catch(() => {
        Swal.fire({ icon: 'error', title: 'Failed', text: 'Could not update post office.' });
    });
}
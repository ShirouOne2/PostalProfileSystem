/* ============================================================
   add-computer-modal-script.js
   Handles the add computer modal functionality
   ============================================================ */

function closeComputerModal() {
    document.getElementById('computerModalOverlay').classList.remove('open');
}

function handleComputerOverlayClick(e) {
    if (e.target.id === 'computerModalOverlay') closeComputerModal();
}

function saveComputer() {
    // Add save logic here
    console.log('Save computer');
}

/* Initialize modal event listeners */
document.addEventListener('DOMContentLoaded', function() {
    const overlay = document.getElementById('computerModalOverlay');
    if (overlay) {
        overlay.addEventListener('click', handleComputerOverlayClick);
    }
});

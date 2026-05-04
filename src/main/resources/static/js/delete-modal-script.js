function closeDeleteModal() {
    document.getElementById('deleteModalOverlay').classList.remove('open');
}

function handleDeleteOverlayClick(e) {
    if (e.target.id === 'deleteModalOverlay') closeDeleteModal();
}

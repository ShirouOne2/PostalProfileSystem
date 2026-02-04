// Remove the page load loading screen - form should be visible immediately
// window.addEventListener('load', () => {
//     const overlay = document.getElementById('loadingOverlay');
//     const form = document.getElementById('loginForm');
//
//     // Wait 1.65 seconds before fading out the loader
//     setTimeout(() => {
//         overlay.classList.add('fade-out');
//
//         // Show form after fade-out completes (0.5s)
//         setTimeout(() => {
//             overlay.style.display = 'none';
//             form.style.display = 'block';
//         }, 500);
//     }, 1650);
// });

function togglePassword(icon) {
    const input = icon.previousElementSibling;
    input.type = input.type === "password" ? "text" : "password";
    icon.name = input.type === "password"
        ? "eye-outline"
        : "eye-off-outline";
}

function showLoginLoading() {
    const button = document.querySelector('.login-button');
    const overlay = document.getElementById('loadingOverlay');
    
    // Show loading overlay
    overlay.style.display = 'flex';
    
    // Disable button to prevent multiple submissions
    button.disabled = true;
    button.textContent = 'Logging in...';
}

function handleLogin(event) {
    // This function is no longer used - replaced by showLoginLoading()
    // but kept for reference
}

// Display message if present in URL
function displayMessage() {
    const urlParams = new URLSearchParams(window.location.search);
    const message = urlParams.get('msg');
    
    if (message) {
        // Create message element
        const messageDiv = document.createElement('div');
        messageDiv.className = 'alert-message';
        messageDiv.textContent = decodeURIComponent(message);
        messageDiv.style.cssText = `
            position: fixed;
            top: 20px;
            left: 50%;
            transform: translateX(-50%);
            background: #f8d7da;
            color: #721c24;
            padding: 12px 20px;
            border-radius: 8px;
            border: 1px solid #f5c6cb;
            z-index: 9999;
            font-size: 14px;
            box-shadow: 0 4px 8px rgba(0,0,0,0.1);
            max-width: 400px;
            text-align: center;
        `;
        
        // Add to page
        document.body.appendChild(messageDiv);
        
        // Remove after 5 seconds
        setTimeout(() => {
            if (messageDiv.parentNode) {
                messageDiv.parentNode.removeChild(messageDiv);
            }
        }, 5000);
    }
}

// Display message when page loads
displayMessage();

// Profile view JavaScript
$(document).ready(function() {
    // Initialize tooltips
    $('[data-toggle="tooltip"]').tooltip();
    
    // Add smooth scrolling
    $('a[href^="#"]').on('click', function(event) {
        var target = $(this.getAttribute('href'));
        if (target.length) {
            event.preventDefault();
            $('html, body').stop().animate({
                scrollTop: target.offset().top - 100
            }, 1000);
        }
    });
    
    // Image preview on hover
    $('.profile-picture').on('mouseenter', function() {
        $(this).css('transform', 'scale(1.05)');
    }).on('mouseleave', function() {
        $(this).css('transform', 'scale(1)');
    });
    
    // Print functionality
    window.addEventListener('beforeprint', function() {
        // Add print-specific styling
        $('body').addClass('printing');
    });
    
    window.addEventListener('afterprint', function() {
        // Remove print-specific styling
        $('body').removeClass('printing');
    });
    
    // Copy contact information to clipboard
    $('.copy-contact').on('click', function() {
        var text = $(this).data('text');
        copyToClipboard(text);
        
        // Show feedback
        var originalText = $(this).html();
        $(this).html('<i class="fas fa-check"></i> Copied!');
        setTimeout(() => {
            $(this).html(originalText);
        }, 2000);
    });
});

// Utility function to copy text to clipboard
function copyToClipboard(text) {
    var textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand('copy');
    document.body.removeChild(textarea);
}

// Show loading state
function showLoading() {
    $('body').addClass('loading');
}

// Hide loading state
function hideLoading() {
    $('body').removeClass('loading');
}

// Format phone number for display
function formatPhoneNumber(phone) {
    if (!phone) return 'N/A';
    
    // Remove all non-numeric characters
    var cleaned = phone.replace(/\D/g, '');
    
    // Format based on length
    if (cleaned.length === 11) {
        return cleaned.replace(/(\d{4})(\d{3})(\d{4})/, '$1-$2-$3');
    } else if (cleaned.length === 10) {
        return cleaned.replace(/(\d{3})(\d{3})(\d{4})/, '($1) $2-$3');
    }
    
    return phone;
}

// Validate email format
function isValidEmail(email) {
    var regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return regex.test(email);
}

// Show success message
function showSuccess(message) {
    Swal.fire({
        icon: 'success',
        title: 'Success',
        text: message,
        timer: 3000,
        showConfirmButton: false
    });
}

// Show error message
function showError(message) {
    Swal.fire({
        icon: 'error',
        title: 'Error',
        text: message
    });
}

// Show confirmation dialog
function showConfirmation(message, callback) {
    Swal.fire({
        title: 'Are you sure?',
        text: message,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#3085d6',
        cancelButtonColor: '#d33',
        confirmButtonText: 'Yes, proceed!'
    }).then((result) => {
        if (result.isConfirmed) {
            callback();
        }
    });
}

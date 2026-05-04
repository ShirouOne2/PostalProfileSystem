/* ============================================================
   print-tag-modal-script.js
   Opens a modal preview of the property tag and allows printing
   WITHOUT navigating away from the inventory page.
   ============================================================ */

if (typeof _currentPrintTagId === 'undefined') {
    var _currentPrintTagId = null;
    var _printTagHtml      = '';
}

/**
 * Called from the 🏷️ button in the inventory table row.
 * @param {number} inventoryId
 */
function openPrintTagModal(inventoryId) {
    _currentPrintTagId = inventoryId;
    _printTagHtml      = '';

    const modal    = document.getElementById('printTagModal');
    const loading  = document.getElementById('printTagLoading');
    const content  = document.getElementById('printTagContent');
    const errorBox = document.getElementById('printTagError');
    const errorMsg = document.getElementById('printTagErrorMsg');

    // Reset state
    loading.style.display  = 'flex';
    content.style.display  = 'none';
    errorBox.style.display = 'none';
    content.innerHTML      = '';

    // Show modal
    modal.classList.add('open');
    document.body.style.overflow = 'hidden';

    // Fetch the rendered tag page from the server
    fetch(`/inventory/print-tag/${inventoryId}`)
        .then(res => {
            if (!res.ok) throw new Error(`Server returned ${res.status}`);
            return res.text();
        })
        .then(html => {
            _printTagHtml = html;

            const parser = new DOMParser();
            const doc    = parser.parseFromString(html, 'text/html');
            const tagEl  = doc.querySelector('.tag-wrapper');

            if (tagEl) {
                tagEl.style.margin = '0 auto';

                // Fix flexbox on tag-bottom so QR shows in preview
                const tagBottom = tagEl.querySelector('.tag-bottom');
                if (tagBottom) {
                    tagBottom.style.display    = 'flex';
                    tagBottom.style.alignItems = 'flex-end';
                }

                content.innerHTML = ''; // Prevent duplicates from multiple fast clicks
                content.appendChild(tagEl);

                // Handle broken QR images
                content.querySelectorAll('.tag-qr img').forEach(img => {
                    img.style.display    = 'block';
                    img.style.objectFit  = 'contain';
                    img.style.background = '#fff';
                    img.onerror = function () {
                        const ph       = document.createElement('div');
                        ph.className   = 'qr-placeholder-box';
                        ph.style.cssText = 'width:90px;height:90px;border:1px solid #ddd;border-radius:4px;display:flex;align-items:center;justify-content:center;font-size:11px;color:#888;';
                        ph.textContent = 'QR Code';
                        img.parentNode.replaceChild(ph, img);
                    };
                });
            } else {
                content.innerHTML = '<p style="color:var(--muted);text-align:center;font-size:13px;padding:40px 0">Preview unavailable — use the Print button below.</p>';
            }

            loading.style.display        = 'none';
            content.style.display        = 'flex';
            content.style.justifyContent = 'center';
            content.style.overflowX      = 'hidden';
        })
        .catch(err => {
            loading.style.display  = 'none';
            errorBox.style.display = 'block';
            console.error('Print tag fetch error:', err);
            errorMsg.textContent = 'Failed to load print tag: ' + err.message;
        });
}

/**
 * Close the modal.
 */
function closePrintTagModal() {
    const modal = document.getElementById('printTagModal');
    modal.classList.remove('open');
    document.body.style.overflow = '';
    _currentPrintTagId = null;
    _printTagHtml      = '';
}

/**
 * Print the tag directly using iframe for better QR code preservation.
 */
function printTagFromModal() {
    if (!_currentPrintTagId || !_printTagHtml) return;

    // Create a hidden iframe for printing
    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.top = '0';
    iframe.style.left = '0';
    iframe.style.width = '1px';
    iframe.style.height = '1px';
    iframe.style.border = 'none';
    iframe.style.visibility = 'hidden';
    document.body.appendChild(iframe);

    // Write the full HTML to the iframe
    const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;
    iframeDoc.open();
    iframeDoc.write(_printTagHtml);
    iframeDoc.close();

    // Track if print has been triggered to prevent multiple attempts
    let printTriggered = false;

    // Helper function to safely remove iframe
    const removeIframe = () => {
        if (iframe && iframe.parentNode === document.body) {
            document.body.removeChild(iframe);
        }
    };

    // Helper function to trigger print once
    const triggerPrint = () => {
        if (!printTriggered) {
            printTriggered = true;
            iframe.contentWindow.print();
            setTimeout(removeIframe, 1000);
        }
    };

    // Wait for content to load and images to be ready
    iframe.onload = () => {
        const images = iframeDoc.querySelectorAll('img');
        let loadedCount = 0;
        const totalImages = images.length;

        const checkLoaded = () => {
            loadedCount++;
            if (loadedCount >= totalImages) {
                setTimeout(triggerPrint, 500);
            }
        };

        if (totalImages === 0) {
            triggerPrint();
        } else {
            images.forEach(img => {
                if (img.complete) {
                    checkLoaded();
                } else {
                    img.onload = checkLoaded;
                    img.onerror = checkLoaded;
                }
            });

            // Fallback timeout
            setTimeout(() => {
                if (iframe.parentNode && !printTriggered) {
                    triggerPrint();
                }
            }, 3000);
        }
    };

    // Fallback if onload doesn't fire
    setTimeout(() => {
        if (iframe.parentNode && !printTriggered) {
            triggerPrint();
        }
    }, 2000);
}

/* Close on overlay click */
document.addEventListener('DOMContentLoaded', () => {
    const overlay = document.getElementById('printTagModal');
    if (overlay) {
        overlay.addEventListener('click', e => {
            if (e.target === overlay) closePrintTagModal();
        });
    }
});

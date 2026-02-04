/**
 * Session Timeout Management
 * Handles user session timeout and automatic logout
 */

class SessionTimeoutManager {
    constructor() {
        this.warningTimeout = 25 * 60 * 1000; // 25 minutes
        this.sessionTimeout = 30 * 60 * 1000; // 30 minutes
        this.warningShown = false;
        this.timeoutTimer = null;
        this.warningTimer = null;
        
        this.init();
    }
    
    init() {
        // Start monitoring session
        this.startSessionMonitoring();
        
        // Reset timers on user activity
        this.setupActivityListeners();
    }
    
    startSessionMonitoring() {
        // Clear existing timers
        this.clearTimers();
        
        // Set warning timer (25 minutes)
        this.warningTimer = setTimeout(() => {
            this.showWarning();
        }, this.warningTimeout);
        
        // Set session timeout timer (30 minutes)
        this.timeoutTimer = setTimeout(() => {
            this.forceLogout();
        }, this.sessionTimeout);
    }
    
    clearTimers() {
        if (this.warningTimer) {
            clearTimeout(this.warningTimer);
            this.warningTimer = null;
        }
        
        if (this.timeoutTimer) {
            clearTimeout(this.timeoutTimer);
            this.timeoutTimer = null;
        }
    }
    
    setupActivityListeners() {
        const events = [
            'mousedown', 'mousemove', 'keypress', 'scroll', 
            'touchstart', 'click', 'keydown', 'keyup'
        ];
        
        events.forEach(event => {
            document.addEventListener(event, () => {
                this.resetTimers();
            }, true);
        });
    }
    
    resetTimers() {
        this.warningShown = false;
        this.startSessionMonitoring();
        
        // Hide warning if it's currently shown
        const warningModal = document.getElementById('sessionWarningModal');
        if (warningModal) {
            warningModal.style.display = 'none';
        }
    }
    
    showWarning() {
        if (this.warningShown) return;
        
        this.warningShown = true;
        
        // Create warning modal if it doesn't exist
        this.createWarningModal();
        
        // Show the modal
        const modal = document.getElementById('sessionWarningModal');
        if (modal) {
            modal.style.display = 'flex';
            
            // Auto-hide after 2 minutes and force logout
            setTimeout(() => {
                this.forceLogout();
            }, 2 * 60 * 1000);
        }
    }
    
    createWarningModal() {
        // Check if modal already exists
        if (document.getElementById('sessionWarningModal')) {
            return;
        }
        
        const modalHTML = `
            <div id="sessionWarningModal" style="display: none; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); z-index: 9999; justify-content: center; align-items: center;">
                <div style="background: white; padding: 30px; border-radius: 8px; max-width: 400px; text-align: center; box-shadow: 0 4px 20px rgba(0,0,0,0.3);">
                    <h3 style="color: #dc3545; margin-bottom: 15px;">
                        <i class="fas fa-exclamation-triangle"></i> Session Timeout Warning
                    </h3>
                    <p style="margin-bottom: 20px; color: #666;">
                        Your session will expire in 2 minutes due to inactivity. Click "Continue" to stay logged in.
                    </p>
                    <div style="display: flex; gap: 10px; justify-content: center;">
                        <button onclick="sessionTimeoutManager.extendSession()" style="background: #007bff; color: white; border: none; padding: 10px 20px; border-radius: 4px; cursor: pointer;">
                            Continue Session
                        </button>
                        <button onclick="sessionTimeoutManager.logoutNow()" style="background: #6c757d; color: white; border: none; padding: 10px 20px; border-radius: 4px; cursor: pointer;">
                            Logout Now
                        </button>
                    </div>
                    <div style="margin-top: 15px;">
                        <div style="background: #f8f9fa; border-radius: 4px; padding: 5px;">
                            <div id="sessionCountdown" style="color: #dc3545; font-weight: bold;">2:00</div>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        document.body.insertAdjacentHTML('beforeend', modalHTML);
        this.startCountdown();
    }
    
    startCountdown() {
        let timeLeft = 120; // 2 minutes in seconds
        
        const countdownElement = document.getElementById('sessionCountdown');
        if (!countdownElement) return;
        
        const countdownInterval = setInterval(() => {
            const minutes = Math.floor(timeLeft / 60);
            const seconds = timeLeft % 60;
            countdownElement.textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;
            
            timeLeft--;
            
            if (timeLeft < 0) {
                clearInterval(countdownInterval);
                this.forceLogout();
            }
        }, 1000);
    }
    
    extendSession() {
        // Make an AJAX call to extend the session
        fetch('/api/extend-session', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            }
        })
        .then(response => {
            if (response.ok) {
                this.resetTimers();
            } else {
                // If server responds with error, force logout
                this.forceLogout();
            }
        })
        .catch(error => {
            console.error('Error extending session:', error);
            // On network error, still reset timers locally
            this.resetTimers();
        });
    }
    
    logoutNow() {
        this.forceLogout();
    }
    
    forceLogout() {
        // Clear timers
        this.clearTimers();
        
        // Redirect to logout
        window.location.href = '/logout';
    }
}

// Initialize session timeout manager when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    window.sessionTimeoutManager = new SessionTimeoutManager();
});

// Make it globally available
window.SessionTimeoutManager = SessionTimeoutManager;

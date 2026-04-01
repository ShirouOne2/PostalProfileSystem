package com.pps.profilesystem.Controller;

import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;
import lombok.extern.slf4j.Slf4j;
import java.util.Map;
import java.util.Random;
import java.util.concurrent.ConcurrentHashMap;

@RestController
@RequestMapping("/api")
@Slf4j
public class AuthApiController {

    // In-memory storage for demo purposes (in production, use database)
    private static final Map<String, String> otpStorage = new ConcurrentHashMap<>();
    private static final Map<String, String> resetTokens = new ConcurrentHashMap<>();
    private static final Map<String, Long> otpExpiry = new ConcurrentHashMap<>();
    
    // Simulated user database (in production, use actual user service)
    private static final Map<String, String> users = new ConcurrentHashMap<>();
    
    static {
        // Add some test users
        users.put("admin@example.com", "password123");
        users.put("user@example.com", "password123");
    }

    @GetMapping("/user/current")
    public ResponseEntity<?> getCurrentUser() {
        try {
            Authentication auth = SecurityContextHolder.getContext().getAuthentication();
            if (auth != null && auth.isAuthenticated() && !auth.getName().equals("anonymousUser")) {
                // User is authenticated
                return ResponseEntity.ok(Map.of(
                    "authenticated", true,
                    "username", auth.getName(),
                    "authorities", auth.getAuthorities().stream()
                        .map(Object::toString)
                        .toList()
                ));
            } else {
                // User is not authenticated
                return ResponseEntity.ok(Map.of("authenticated", false));
            }
        } catch (Exception e) {
            log.error("Error checking current user", e);
            return ResponseEntity.ok(Map.of("authenticated", false));
        }
    }

    @PostMapping("/auth/request-otp")
    public ResponseEntity<?> requestOtp(@RequestBody Map<String, String> request) {
        String email = request.get("email");
        
        log.info("OTP request received for email: {}", email);
        
        // Check if email exists
        if (!users.containsKey(email)) {
            return ResponseEntity.badRequest().body(
                Map.of("success", false, "message", "Email not found in our system")
            );
        }
        
        // Generate 6-digit OTP
        String otp = String.format("%06d", new Random().nextInt(999999));
        otpStorage.put(email, otp);
        otpExpiry.put(email, System.currentTimeMillis() + 300000); // 5 minutes
        
        log.info("Generated OTP for {}: {}", email, otp);
        
        // In production, send email with OTP
        // For demo, we'll log it and return success
        System.out.println("=================================");
        System.out.println("DEMO: OTP for " + email + " is: " + otp);
        System.out.println("=================================");
        
        return ResponseEntity.ok(
            Map.of("success", true, "message", "OTP sent successfully")
        );
    }

    @PostMapping("/auth/verify-otp")
    public ResponseEntity<?> verifyOtp(@RequestBody Map<String, String> request) {
        String email = request.get("email");
        String otp = request.get("otp");
        
        log.info("OTP verification attempt for email: {}", email);
        
        // Check if OTP exists and is valid
        String storedOtp = otpStorage.get(email);
        Long expiry = otpExpiry.get(email);
        
        if (storedOtp == null) {
            return ResponseEntity.badRequest().body(
                Map.of("success", false, "message", "OTP not found or expired")
            );
        }
        
        if (System.currentTimeMillis() > expiry) {
            otpStorage.remove(email);
            otpExpiry.remove(email);
            return ResponseEntity.badRequest().body(
                Map.of("success", false, "message", "OTP has expired")
            );
        }
        
        if (!storedOtp.equals(otp)) {
            return ResponseEntity.badRequest().body(
                Map.of("success", false, "message", "Invalid OTP")
            );
        }
        
        // Generate reset token
        String resetToken = java.util.UUID.randomUUID().toString();
        resetTokens.put(resetToken, email);
        
        // Clear OTP
        otpStorage.remove(email);
        otpExpiry.remove(email);
        
        return ResponseEntity.ok(
            Map.of("success", true, "resetToken", resetToken)
        );
    }

    @PostMapping("/auth/reset-password")
    public ResponseEntity<?> resetPassword(@RequestBody Map<String, String> request) {
        String email = request.get("email");
        String token = request.get("token");
        String newPassword = request.get("newPassword");
        String confirmPassword = request.get("confirmPassword");
        
        log.info("Password reset attempt for email: {}", email);
        
        // Validate token
        String storedEmail = resetTokens.get(token);
        if (storedEmail == null || !storedEmail.equals(email)) {
            return ResponseEntity.badRequest().body(
                Map.of("success", false, "message", "Invalid or expired reset token")
            );
        }
        
        // Validate passwords
        if (!newPassword.equals(confirmPassword)) {
            return ResponseEntity.badRequest().body(
                Map.of("success", false, "message", "Passwords do not match")
            );
        }
        
        if (newPassword.length() < 6) {
            return ResponseEntity.badRequest().body(
                Map.of("success", false, "message", "Password must be at least 6 characters long")
            );
        }
        
        // Update password (in production, use proper password hashing)
        users.put(email, newPassword);
        
        // Clear reset token
        resetTokens.remove(token);
        
        log.info("Password reset successful for email: {}", email);
        
        return ResponseEntity.ok(
            Map.of("success", true, "message", "Password reset successfully")
        );
    }
}

package com.pps.profilesystem.Controller;

import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;

@Controller
public class AuthController {

    @GetMapping("/login")
    public String login() {
        return "login"; // Points to src/main/resources/templates/login.html
    }

    @GetMapping("/request-otp")
    public String requestOtp() {
        return "request-otp"; // Points to src/main/resources/templates/request-otp.html
    }

    @GetMapping("/verify-otp")
    public String verifyOtp() {
        return "verify-otp"; // Points to src/main/resources/templates/verify-otp.html
    }

    @GetMapping("/reset-password")
    public String resetPassword() {
        return "reset-password"; // Points to src/main/resources/templates/reset-password.html
    }
}
package com.pps.profilesystem.Controller;

import jakarta.servlet.http.HttpSession;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

/**
 * KeepAliveController
 *
 * Provides a lightweight endpoint that the frontend pings to refresh
 * the server-side Spring session when the user chooses "Stay Logged In".
 *
 * Endpoint: GET /api/keep-alive
 * Returns:  200 OK with { "status": "ok", "remainingTime": seconds }
 *
 * This endpoint is already permitted in SecurityConfig ("/api/**").
 */
@RestController
@RequestMapping("/api")
public class KeepAliveController {

    @GetMapping("/keep-alive")
    public ResponseEntity<Map<String, Object>> keepAlive(HttpSession session) {
        // Accessing this endpoint is enough to reset the server-side
        // HttpSession's maxInactiveInterval timer automatically.
        
        // Get remaining time for debugging
        int remainingTime = session.getMaxInactiveInterval();
        
        return ResponseEntity.ok(Map.of(
            "status", "ok",
            "remainingTime", remainingTime,
            "sessionId", session.getId()
        ));
    }
}
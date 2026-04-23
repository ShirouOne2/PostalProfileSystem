package com.pps.profilesystem.Controller;

import com.pps.profilesystem.Service.ConnectivityNotificationService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.util.Map;

/**
 * NotificationSseController
 *
 * SSE stream and mark-read endpoints for the bell notification dropdown.
 * Accessible by System Admin (role 1), Area Admin (role 2), User (role 3),
 * and SRD Operation (role 4).
 */
@RestController
@RequestMapping("/api/notifications")
@PreAuthorize("hasAnyRole('ADMIN', 'AREA_ADMIN', 'USER', 'SRD_OPERATION')")
public class NotificationSseController {

    @Autowired
    private ConnectivityNotificationService notifService;

    @GetMapping(value = "/stream", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public SseEmitter stream(Authentication auth) {
        return notifService.registerEmitter(auth != null ? auth.getName() : null);
    }

    @PostMapping("/mark-read/{id}")
    public ResponseEntity<?> markRead(@PathVariable long id, Authentication auth) {
        notifService.markRead(id, auth != null ? auth.getName() : null);
        return ResponseEntity.ok(Map.of("ok", true));
    }

    @PostMapping("/mark-all-read")
    public ResponseEntity<?> markAllRead(Authentication auth) {
        notifService.markAllRead(auth != null ? auth.getName() : null);
        return ResponseEntity.ok(Map.of("ok", true));
    }
}
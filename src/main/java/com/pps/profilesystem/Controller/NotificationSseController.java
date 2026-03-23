package com.pps.profilesystem.Controller;

import com.pps.profilesystem.Service.ConnectivityNotificationService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.util.Map;

/**
 * NotificationSseController
 *
 * SSE stream and mark-read endpoints for the bell notification dropdown.
 * Accessible by System Admin (role 1) AND Area Admin (role 2).
 * Regular users (role 3) do not receive notifications.
 */
@RestController
@RequestMapping("/api/notifications")
@PreAuthorize("hasAnyRole('ADMIN', 'AREA_ADMIN')")
public class NotificationSseController {

    @Autowired
    private ConnectivityNotificationService notifService;

    @GetMapping(value = "/stream", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public SseEmitter stream() {
        return notifService.registerAdminEmitter();
    }

    @PostMapping("/mark-read/{id}")
    public ResponseEntity<?> markRead(@PathVariable long id) {
        notifService.markRead(id);
        return ResponseEntity.ok(Map.of("ok", true));
    }

    @PostMapping("/mark-all-read")
    public ResponseEntity<?> markAllRead() {
        notifService.markAllRead();
        return ResponseEntity.ok(Map.of("ok", true));
    }
}
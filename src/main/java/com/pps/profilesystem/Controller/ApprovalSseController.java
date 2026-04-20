package com.pps.profilesystem.Controller;

import com.pps.profilesystem.Entity.ApprovalRequest;
import com.pps.profilesystem.Service.ApprovalService;
import com.pps.profilesystem.Repository.AreaRepository;
import com.pps.profilesystem.Event.ApprovalRequestEvent;
import org.springframework.context.event.EventListener;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseBody;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.io.IOException;
import java.util.List;
import java.util.Map;
import java.util.concurrent.CopyOnWriteArrayList;

/**
 * Approval SSE Controller
 * 
 * Handles Server-Sent Events for real-time approval request updates.
 * Provides live updates for pending request counts and new requests.
 */
@Controller
@RequestMapping("/api/approvals")
public class ApprovalSseController {

    @Autowired
    private ApprovalService approvalService;

    @Autowired
    private AreaRepository areaRepository;

    // Store emitters for each connected client
    private final CopyOnWriteArrayList<SseEmitter> emitters = new CopyOnWriteArrayList<>();

    /**
     * SSE endpoint for real-time approval updates
     */
    @GetMapping(value = "/stream", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    @ResponseBody
    public SseEmitter streamApprovalUpdates(Authentication auth) {
        SseEmitter emitter = new SseEmitter(Long.MAX_VALUE);
        emitters.add(emitter);

        try {
            // Send initial pending count
            sendPendingCount(emitter, auth);
        } catch (IOException e) {
            emitter.complete();
            emitters.remove(emitter);
            return emitter;
        }

        // Remove emitter on completion or timeout
        emitter.onCompletion(() -> {
            emitters.remove(emitter);
        });

        emitter.onTimeout(() -> {
            emitters.remove(emitter);
            emitter.complete();
        });

        return emitter;
    }

    /**
     * Broadcast pending count update to all connected clients
     */
    public void broadcastPendingCount() {
        for (SseEmitter emitter : emitters) {
            try {
                sendPendingCount(emitter, null);
            } catch (IOException e) {
                emitters.remove(emitter);
                emitter.complete();
            }
        }
    }

    /**
     * Broadcast new request notification to all connected clients
     */
    public void broadcastNewRequest(ApprovalRequest request) {
        for (SseEmitter emitter : emitters) {
            try {
                emitter.send(SseEmitter.event()
                        .name("new-request")
                        .data(request.getId()));
            } catch (IOException e) {
                emitters.remove(emitter);
                emitter.complete();
            }
        }
    }

    /**
     * Send pending count to specific emitter
     */
    private void sendPendingCount(SseEmitter emitter, Authentication auth) throws IOException {
        try {
            // Get areas assigned to the current user (simplified for now)
            List<Integer> areaIds = areaRepository.findAll().stream()
                    .map(area -> area.getId())
                    .toList();

            List<ApprovalRequest> pendingRequests = approvalService.getPendingRequestsForAreas(areaIds);
            long pendingCount = pendingRequests.size();

            emitter.send(SseEmitter.event()
                    .name("pending-count")
                    .data(String.valueOf(pendingCount)));
        } catch (Exception e) {
            // If there's an error getting the count, send 0
            emitter.send(SseEmitter.event()
                    .name("pending-count")
                    .data("0"));
        }
    }

    /**
     * Get current pending count (REST endpoint)
     */
    @GetMapping("/pending-count")
    @ResponseBody
    public Map<String, Object> getPendingCount(Authentication auth) {
        try {
            // Get areas assigned to the current user (simplified for now)
            List<Integer> areaIds = areaRepository.findAll().stream()
                    .map(area -> area.getId())
                    .toList();

            List<ApprovalRequest> pendingRequests = approvalService.getPendingRequestsForAreas(areaIds);
            long pendingCount = pendingRequests.size();

            return Map.of("count", pendingCount);
        } catch (Exception e) {
            return Map.of("count", 0);
        }
    }
    
    /**
     * Listen for approval request events
     */
    @EventListener
    public void handleApprovalRequestEvent(ApprovalRequestEvent event) {
        if ("NEW_REQUEST".equals(event.getEventType())) {
            broadcastNewRequest(event.getRequest());
        } else if ("PENDING_COUNT_UPDATE".equals(event.getEventType())) {
            broadcastPendingCount();
        }
    }
}

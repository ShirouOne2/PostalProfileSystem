package com.pps.profilesystem.Service;

import com.pps.profilesystem.DTO.ConnectivityNotification;
import com.pps.profilesystem.Entity.ConnectivityNotificationEntity;
import com.pps.profilesystem.Repository.ConnectivityNotificationRepository;

import jakarta.annotation.PostConstruct;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;
import org.springframework.transaction.support.TransactionTemplate;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;
import jakarta.annotation.PreDestroy;

import java.io.IOException;
import java.time.LocalDateTime;
import java.util.*;
import java.util.concurrent.*;
import java.util.logging.Logger;

/**
 * ConnectivityNotificationService
 *
 * Notifications are persisted in MySQL so they remain in the inbox after being read,
 * across server restarts, and for all users (broadcast and targeted). A cap of
 * {@value #RECENT_CAP} newest rows is loaded for the UI and SSE (see repository query).
 */
@Service
public class ConnectivityNotificationService {

    private static final Logger log = Logger.getLogger(ConnectivityNotificationService.class.getName());

    private static final int RECENT_CAP = 2000;
    private static final long EMITTER_TIMEOUT = 3 * 60 * 1000L;  // 3 minutes

    @Autowired
    private ConnectivityNotificationRepository notifRepo;

    @Autowired
    private PlatformTransactionManager transactionManager;

    private TransactionTemplate txTemplate;

    private final Map<String, List<SseEmitter>> emittersByUser = new ConcurrentHashMap<>();
    private final ExecutorService flushExecutor = Executors.newCachedThreadPool();

    @PostConstruct
    void initTransactionTemplate() {
        this.txTemplate = new TransactionTemplate(transactionManager);
    }

    public static Integer roleIdFromAuthorities(Collection<? extends org.springframework.security.core.GrantedAuthority> authorities) {
        if (authorities == null) return null;
        for (var a : authorities) {
            if (a == null) continue;
            String r = a.getAuthority();
            if ("ROLE_ADMIN".equals(r)) return 1;
            if ("ROLE_AREA_ADMIN".equals(r)) return 2;
            if ("ROLE_USER".equals(r)) return 3;
            if ("ROLE_SRD_OPERATION".equals(r)) return 4;
        }
        return null;
    }

    // ── SSE registration ─────────────────────────────────────────────────────

    public SseEmitter registerEmitter(String userEmail) {
        SseEmitter emitter = new SseEmitter(EMITTER_TIMEOUT);
        String userKey = normalizeUserKey(userEmail);

        Runnable cleanup = () -> {
            List<SseEmitter> userEmitters = emittersByUser.get(userKey);
            if (userEmitters != null) {
                userEmitters.remove(emitter);
                if (userEmitters.isEmpty()) emittersByUser.remove(userKey);
            }
            log.fine("[SSE] Emitter removed for " + userKey);
        };
        emitter.onCompletion(cleanup);
        emitter.onTimeout(() -> emitter.complete());
        emitter.onError(e  -> emitter.completeWithError(e));

        emittersByUser.computeIfAbsent(userKey, k -> new CopyOnWriteArrayList<>()).add(emitter);
        log.fine("[SSE] Emitter registered for " + userKey);

        flushExecutor.execute(() -> {
            try {
                Thread.sleep(100);
                String vis = "_anonymous".equals(userKey) ? null : userKey;
                List<ConnectivityNotification> forUser = getAllForUser(vis);
                long unread = unreadCountForUser(vis);
                flush(emitter, forUser, unread, vis);
            } catch (IOException ex) {
                emitter.completeWithError(ex);
            } catch (InterruptedException ie) {
                Thread.currentThread().interrupt();
            }
        });

        return emitter;
    }

    // ── Public API ────────────────────────────────────────────────────────────

    public void push(ConnectivityNotification.Type type,
                     String officeName, Integer officeId,
                     String changedBy, String detail) {
        pushAudit(
                type,
                officeName,
                officeId,
                changedBy,
                null,
                detail,
                null,
                "CONNECTIVITY",
                "PostalOffice",
                officeId != null ? officeId.longValue() : null
        );
    }

    @Transactional
    public void pushToRecipient(ConnectivityNotification.Type type,
                     String officeName, Integer officeId,
                     String changedBy, String detail,
                     String recipientEmail) {
        pushAudit(
                type,
                officeName,
                officeId,
                changedBy,
                null,
                detail,
                recipientEmail,
                "APPROVAL",
                "ApprovalRequest",
                null
        );
    }

    /**
     * Audit-ready push that stores actor_email + actor_role_id (matches roles.role_id),
     * plus event metadata for reporting.
     */
    @Transactional
    public void pushAudit(ConnectivityNotification.Type type,
                          String officeName, Integer officeId,
                          String changedBy,
                          Integer actorRoleId,
                          String detail,
                          String recipientEmail,
                          String eventSource,
                          String entityType,
                          Long entityId) {
        ConnectivityNotificationEntity e = new ConnectivityNotificationEntity();
        e.setType(type);
        e.setOfficeName(officeName != null ? officeName : "");
        e.setOfficeId(officeId);
        String actor = changedBy != null ? changedBy : "";
        e.setChangedBy(actor);
        if (!actor.isBlank()) {
            e.setActorEmail(actor.trim().toLowerCase());
        }
        e.setActorRoleId(actorRoleId);
        e.setEventSource(eventSource);
        e.setEntityType(entityType);
        e.setEntityId(entityId);
        e.setDetail(detail);
        if (recipientEmail != null && !recipientEmail.isBlank()) {
            e.setRecipientEmail(recipientEmail.trim().toLowerCase());
        } else {
            e.setRecipientEmail(null);
        }
        e.setCreatedAt(LocalDateTime.now());
        notifRepo.save(e);
        scheduleBroadcastAfterCommit();
    }

    @Transactional
    public void markRead(long id, String userEmail) {
        if (userEmail == null || userEmail.isBlank()) {
            return;
        }
        notifRepo.findWithReadsById(id).ifPresent(e -> {
            e.addReadEmail(userEmail);
            notifRepo.save(e);
            scheduleBroadcastAfterCommit();
        });
    }

    @Transactional
    public void markAllRead(String userEmail) {
        if (userEmail == null || userEmail.isBlank()) {
            return;
        }
        String key = userEmail.trim().toLowerCase();
        List<ConnectivityNotificationEntity> rows = notifRepo.findRecent(PageRequest.of(0, RECENT_CAP));
        List<ConnectivityNotificationEntity> dirty = new ArrayList<>();
        for (ConnectivityNotificationEntity row : rows) {
            ConnectivityNotification d = toDto(row);
            if (d.isVisibleTo(userEmail) && !d.isReadBy(userEmail)) {
                row.addReadEmail(key);
                dirty.add(row);
            }
        }
        if (!dirty.isEmpty()) {
            notifRepo.saveAll(dirty);
            scheduleBroadcastAfterCommit();
        }
    }

    public List<ConnectivityNotification> getAllForUser(String userEmail) {
        return loadRecentDtos().stream()
                .filter(n -> n.isVisibleTo(userEmail))
                .toList();
    }

    public long unreadCountForUser(String userEmail) {
        return getAllForUser(userEmail).stream().filter(n -> !n.isReadBy(userEmail)).count();
    }

    /** Ensures SSE subscribers see updates only after the DB transaction commits. */
    private void scheduleBroadcastAfterCommit() {
        if (TransactionSynchronizationManager.isSynchronizationActive()) {
            TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
                @Override
                public void afterCommit() {
                    broadcastToAll();
                }
            });
        } else {
            broadcastToAll();
        }
    }

    // ── Broadcast ─────────────────────────────────────────────────────────────

    private void broadcastToAll() {
        List<ConnectivityNotification> all = loadRecentDtos();
        for (Map.Entry<String, List<SseEmitter>> entry : emittersByUser.entrySet()) {
            String userKey = entry.getKey();
            String vis = "_anonymous".equals(userKey) ? null : userKey;
            List<ConnectivityNotification> forUser = all.stream()
                    .filter(n -> n.isVisibleTo(vis))
                    .toList();
            long unread = forUser.stream().filter(n -> !n.isReadBy(vis)).count();
            List<SseEmitter> dead = new ArrayList<>();
            for (SseEmitter e : entry.getValue()) {
                try {
                    flush(e, forUser, unread, vis);
                } catch (IOException ex) {
                    dead.add(e);
                }
            }
            if (!dead.isEmpty()) {
                entry.getValue().removeAll(dead);
            }
        }
    }

    private void flush(SseEmitter emitter, List<ConnectivityNotification> items, long unread, String userEmail) throws IOException {
        String badge = unread > 9 ? "9+" : (unread > 0 ? String.valueOf(unread) : "");
        emitter.send(SseEmitter.event().name("badge").data(badge));
        emitter.send(SseEmitter.event().name("notification").data(buildHtml(items, unread, userEmail)));
    }

    private List<ConnectivityNotification> loadRecentDtos() {
        return txTemplate.execute(status ->
                notifRepo.findRecent(PageRequest.of(0, RECENT_CAP)).stream()
                        .map(this::toDto)
                        .toList());
    }

    private ConnectivityNotification toDto(ConnectivityNotificationEntity e) {
        ConnectivityNotification n = new ConnectivityNotification(
                e.getId(),
                e.getType(),
                e.getOfficeName(),
                e.getOfficeId(),
                e.getChangedBy(),
                e.getDetail(),
                e.getRecipientEmail(),
                e.getCreatedAt()
        );
        if (e.getReadByEmails() != null) {
            for (String em : e.getReadByEmails()) {
                if (em != null && !em.isBlank()) {
                    n.markReadBy(em);
                }
            }
        }
        return n;
    }

    // ── HTML builder ──────────────────────────────────────────────────────────

    private String buildHtml(List<ConnectivityNotification> items, long unread, String userEmail) {
        StringBuilder sb = new StringBuilder();

        sb.append("<div class=\"d-flex align-items-center justify-content-between px-3 py-2\" ")
          .append("style=\"background:#1a3a6b;color:#fff;\">")
          .append("<span style=\"font-weight:700;font-size:13px;\">")
          .append("<i class='fas fa-bell mr-1'></i>")
          .append(unread > 0 ? unread + " unread" : "Notifications")
          .append("</span>");

        if (unread > 0) {
            sb.append("<a href='#' data-mark-all-read ")
              .append("style=\"font-size:10px;color:#aad4ff;text-decoration:none;\">")
              .append("Mark all read</a>");
        }
        sb.append("</div>");

        sb.append("<div style=\"max-height:320px;overflow-y:auto;\">");

        if (items.isEmpty()) {
            sb.append("<div class='text-center text-muted py-4' style='font-size:12px;'>")
              .append("<i class='fas fa-check-circle mr-1 text-success'></i>")
              .append("No changes yet.</div>");
        } else {
            for (ConnectivityNotification n : items) {
                renderItem(sb, n, n.isReadBy(userEmail));
            }
        }

        sb.append("</div>");

        return sb.toString();
    }

    private void renderItem(StringBuilder sb, ConnectivityNotification n, boolean isRead) {
        String bg = isRead ? "#fff" : "#f0f6ff";
        String fw = isRead ? "400" : "600";

        sb.append("<div class='notif-item d-flex align-items-start py-2 px-3' ")
          .append("style='border-bottom:1px solid #f0f0f0;background:").append(bg).append(";cursor:pointer;' ")
          .append("data-notif-id='").append(n.getId()).append("'>");

        sb.append("<div class='mr-3 mt-1 d-flex align-items-center justify-content-center rounded-circle flex-shrink-0' ")
          .append("style='width:32px;height:32px;background:")
          .append(n.getColor()).append("22;border:1.5px solid ").append(n.getColor()).append("55;'>")
          .append("<i class='").append(n.getIcon()).append("' style='color:").append(n.getColor())
          .append(";font-size:12px;'></i></div>");

        sb.append("<div style='flex:1;min-width:0;'>");
        sb.append("<div style='font-size:12px;font-weight:").append(fw).append(";color:#1a3a6b;'>")
          .append("<span style='background:").append(n.getColor())
          .append("22;color:").append(n.getColor())
          .append(";border-radius:3px;padding:1px 5px;font-size:10px;font-weight:700;margin-right:4px;'>")
          .append(esc(n.getTypeLabel())).append("</span>")
          .append(esc(n.getOfficeName()))
          .append("</div>");

        if (n.getDetail() != null && !n.getDetail().isBlank()) {
            String[] parts = n.getDetail().split(" · ");
            sb.append("<div style='font-size:11px;color:#555;margin-top:2px;'>");
            for (String part : parts) {
                sb.append("<div style='white-space:nowrap;overflow:hidden;text-overflow:ellipsis;'>")
                  .append("&nbsp;·&nbsp;").append(esc(part.trim())).append("</div>");
            }
            sb.append("</div>");
        }

        sb.append("<div style='font-size:10px;color:#aaa;margin-top:2px;'>")
          .append("by <strong>").append(esc(n.getChangedBy())).append("</strong>")
          .append(" · ").append(n.getTimestampFormatted()).append("</div>");

        sb.append("</div>");

        if (!isRead) {
            sb.append("<span style='width:8px;height:8px;min-width:8px;background:#dc3545;")
              .append("border-radius:50%;margin-top:7px;flex-shrink:0;'></span>");
        }

        sb.append("</div>");
    }

    @PreDestroy
    public void shutdown() {
        flushExecutor.shutdownNow();
        for (List<SseEmitter> emitters : emittersByUser.values()) {
            for (SseEmitter emitter : emitters) {
                try { emitter.complete(); } catch (Exception ignored) {}
            }
        }
        emittersByUser.clear();
        log.info("[SSE] Shutdown complete — all emitters released.");
    }

    private String normalizeUserKey(String userEmail) {
        if (userEmail == null || userEmail.isBlank()) return "_anonymous";
        return userEmail.trim().toLowerCase();
    }

    private String esc(String s) {
        if (s == null) return "";
        return s.replace("&", "&amp;")
                .replace("<", "&lt;")
                .replace(">", "&gt;")
                .replace("\"", "&quot;");
    }
}

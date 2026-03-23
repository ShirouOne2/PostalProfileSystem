package com.pps.profilesystem.Service;

import com.pps.profilesystem.DTO.ConnectivityNotification;

import org.springframework.stereotype.Service;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;
import jakarta.annotation.PreDestroy;

import java.io.IOException;
import java.util.*;
import java.util.concurrent.*;
import java.util.concurrent.atomic.AtomicLong;
import java.util.logging.Logger;

/**
 * ConnectivityNotificationService
 *
 * SSE design notes:
 *  - Timeout set to 3 minutes; browser EventSource auto-reconnects after timeout.
 *  - Initial flush is async (via flushExecutor) so the HTTP response is fully
 *    committed before SSE events are written — avoids premature IOException.
 *  - Removal callbacks registered BEFORE adding to list — no race condition.
 *  - Dead emitters are purged eagerly on every broadcast.
 *
 * FIX: buildHtml() previously wrapped everything in <div class="dropdown-menu">
 *  which was then injected into notifContent (itself inside the Bootstrap
 *  dropdown-menu container). The nested .dropdown-menu was hidden by Bootstrap,
 *  making the dropdown appear empty. Now buildHtml() sends ONLY the inner
 *  content — header bar + items + footer — with NO outer wrapper div.
 *  The JS (#notifContent) is the container; no extra wrapper needed.
 */
@Service
public class ConnectivityNotificationService {

    private static final Logger log = Logger.getLogger(ConnectivityNotificationService.class.getName());

    private static final int  MAX             = 50;
    private static final long EMITTER_TIMEOUT = 3 * 60 * 1000L;  // 3 minutes

    private final Deque<ConnectivityNotification> store         = new ConcurrentLinkedDeque<>();
    private final AtomicLong                      idSeq         = new AtomicLong(0);
    private final List<SseEmitter>                adminEmitters = new CopyOnWriteArrayList<>();
    private final ExecutorService                 flushExecutor = Executors.newCachedThreadPool();

    // ── SSE registration ─────────────────────────────────────────────────────

    public SseEmitter registerAdminEmitter() {
        SseEmitter emitter = new SseEmitter(EMITTER_TIMEOUT);

        // Register callbacks BEFORE adding to the list — no race with broadcast
        Runnable cleanup = () -> {
            adminEmitters.remove(emitter);
            log.fine("[SSE] Emitter removed — active: " + adminEmitters.size());
        };
        emitter.onCompletion(cleanup);
        emitter.onTimeout(() -> emitter.complete());   // complete() triggers onCompletion above
        emitter.onError(e  -> emitter.completeWithError(e));

        adminEmitters.add(emitter);
        log.fine("[SSE] Emitter registered — active: " + adminEmitters.size());

        // Flush initial state asynchronously AFTER Spring commits the HTTP response.
        flushExecutor.execute(() -> {
            try {
                Thread.sleep(100);
                flush(emitter);
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

        ConnectivityNotification n = new ConnectivityNotification(
                idSeq.incrementAndGet(), type,
                officeName, officeId, changedBy, detail);

        store.addFirst(n);
        while (store.size() > MAX) store.removeLast();

        broadcastToAll();
    }

    public void markRead(long id) {
        store.stream().filter(n -> n.getId() == id).findFirst()
             .ifPresent(ConnectivityNotification::markRead);
        broadcastToAll();
    }

    public void markAllRead() {
        store.forEach(ConnectivityNotification::markRead);
        broadcastToAll();
    }

    public List<ConnectivityNotification> getAll() {
        return Collections.unmodifiableList(new ArrayList<>(store));
    }

    public long unreadCount() {
        return store.stream().filter(n -> !n.isRead()).count();
    }

    // ── Broadcast ─────────────────────────────────────────────────────────────

    private void broadcastToAll() {
        List<SseEmitter> dead = new ArrayList<>();
        for (SseEmitter e : adminEmitters) {
            try {
                flush(e);
            } catch (IOException ex) {
                dead.add(e);
            }
        }
        if (!dead.isEmpty()) {
            adminEmitters.removeAll(dead);
            log.fine("[SSE] Purged " + dead.size() + " dead emitter(s) — active: " + adminEmitters.size());
        }
    }

    private void flush(SseEmitter emitter) throws IOException {
        List<ConnectivityNotification> all    = getAll();
        long                           unread = unreadCount();

        String badge = unread > 9 ? "9+" : (unread > 0 ? String.valueOf(unread) : "");
        emitter.send(SseEmitter.event().name("badge").data(badge));
        emitter.send(SseEmitter.event().name("notification").data(buildHtml(all, unread)));
    }

    // ── HTML builder ──────────────────────────────────────────────────────────
    //
    // ✅ FIX: This method now returns ONLY the inner content (header bar +
    // notification list + footer). It does NOT wrap everything in a
    // <div class="dropdown-menu"> anymore.
    //
    // WHY: The JS injects this HTML into #notifContent, which is already
    // a child of the Bootstrap .dropdown-menu container in the header.
    // Nesting a second .dropdown-menu inside the first caused Bootstrap
    // to hide the inner one — the bell opened but the panel was invisible.

    private String buildHtml(List<ConnectivityNotification> items, long unread) {
        StringBuilder sb = new StringBuilder();

        // ── Header bar ────────────────────────────────────────────────────────
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

        // ── Scrollable item list ───────────────────────────────────────────────
        sb.append("<div style=\"max-height:320px;overflow-y:auto;\">");

        if (items.isEmpty()) {
            sb.append("<div class='text-center text-muted py-4' style='font-size:12px;'>")
              .append("<i class='fas fa-check-circle mr-1 text-success'></i>")
              .append("No changes yet.</div>");
        } else {
            for (ConnectivityNotification n : items) {
                renderItem(sb, n);
            }
        }

        sb.append("</div>");

        // ── Footer ────────────────────────────────────────────────────────────
        sb.append("<div class='text-center py-2' style='background:#f8f9fa;border-top:1px solid #eee;'>")
          .append("<small class='text-muted' style='font-size:11px;'>")
          .append("<i class='fas fa-sync-alt mr-1'></i>Live · SSE auto-refresh</small>")
          .append("</div>");

        return sb.toString();
    }

    private void renderItem(StringBuilder sb, ConnectivityNotification n) {
        String bg = n.isRead() ? "#fff" : "#f0f6ff";
        String fw = n.isRead() ? "400"  : "600";

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

        if (!n.isRead()) {
            sb.append("<span style='width:8px;height:8px;min-width:8px;background:#dc3545;")
              .append("border-radius:50%;margin-top:7px;flex-shrink:0;'></span>");
        }

        sb.append("</div>");
    }

    // ── Graceful shutdown ─────────────────────────────────────────────────────

    @PreDestroy
    public void shutdown() {
        flushExecutor.shutdownNow();
        for (SseEmitter emitter : adminEmitters) {
            try { emitter.complete(); } catch (Exception ignored) {}
        }
        adminEmitters.clear();
        log.info("[SSE] Shutdown complete — all emitters released.");
    }

    private String esc(String s) {
        if (s == null) return "";
        return s.replace("&", "&amp;")
                .replace("<", "&lt;")
                .replace(">", "&gt;")
                .replace("\"", "&quot;");
    }
}
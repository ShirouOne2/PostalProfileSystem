package com.pps.profilesystem.Controller;

import com.pps.profilesystem.Entity.User;
import com.pps.profilesystem.Service.UserCacheService;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.ControllerAdvice;
import org.springframework.web.bind.annotation.ModelAttribute;

/**
 * GlobalModelAdvice
 *
 * Adds the logged-in user's details to the Thymeleaf model on every
 * page (Controller) request.
 *
 * Key fixes vs. the original:
 *
 *  1. SKIPS API / REST requests  — endpoints under /api/** return JSON,
 *     not Thymeleaf views, so injecting model attributes is wasted work
 *     and still consumes a DB connection via the cache miss path.
 *     We check the request URI and return early for anything that isn't
 *     a page request.
 *
 *  2. Cache is in UserCacheService (a separate @Service bean) — Spring
 *     @Cacheable works via AOP proxy.  Self-invocation (a class calling
 *     its own @Cacheable method) bypasses the proxy, so the cache never
 *     activated in the old code.  Moving the cached method to its own
 *     bean fixes this: every call goes through the proxy correctly.
 */
@ControllerAdvice
public class GlobalModelAdvice {

    @Autowired
    private UserCacheService userCacheService;

    @ModelAttribute
    public void addLoggedInUser(Model model, HttpServletRequest request) {

        // ── Skip non-page requests ────────────────────────────────────────────
        // REST / API endpoints don't render Thymeleaf templates, so there is
        // no point populating model attributes for them.  More importantly,
        // skipping these prevents every AJAX / SSE / keep-alive call from
        // burning a DB connection (or a cache lookup) just to populate data
        // that will never be used.
        String uri = request.getRequestURI();
        if (uri != null && (
                uri.startsWith("/api/") ||
                uri.startsWith("/css/") ||
                uri.startsWith("/js/")  ||
                uri.startsWith("/images/") ||
                uri.startsWith("/assets/")
        )) {
            return;
        }

        // ── Populate model for authenticated page requests ────────────────────
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();

        if (auth == null || !auth.isAuthenticated()
                || "anonymousUser".equals(auth.getPrincipal())) {
            return;
        }

        String email = auth.getName();

        // Cache hit after first request — no DB round-trip on subsequent pages
        userCacheService.findByEmail(email).ifPresent((User user) -> {
            model.addAttribute("loggedInUsername", user.getUsername());
            model.addAttribute("loggedInEmail",    user.getEmail());
            model.addAttribute("loggedInRole",     getRoleLabel(user.getRole()));
            model.addAttribute("loggedInInitial",  getInitial(user.getUsername()));
            model.addAttribute("loggedInRoleId",   user.getRole());
            model.addAttribute("loggedInAreaId",   user.getAreaId());
            
            // Role flags for Thymeleaf templates
            model.addAttribute("isSystemAdmin",   user.getRole() != null && (user.getRole() == 1 || user.getRole() == 4));
            model.addAttribute("isAreaAdmin",     user.getRole() != null && user.getRole() == 2);
            model.addAttribute("isSrdOperation",  user.getRole() != null && user.getRole() == 4);
        });
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private String getRoleLabel(Integer roleId) {
        if (roleId == null) return "User";
        switch (roleId) {
            case 1:  return "System Admin";
            case 2:  return "Area Admin";
            case 3:  return "User";
            case 4:  return "SRD Operation";
            default: return "User";
        }
    }

    private String getInitial(String username) {
        if (username == null || username.isEmpty()) return "?";
        return String.valueOf(Character.toUpperCase(username.charAt(0)));
    }
}
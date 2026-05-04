package com.pps.profilesystem.Config;

import jakarta.servlet.http.HttpSessionEvent;
import jakarta.servlet.http.HttpSessionListener;
import org.springframework.boot.web.servlet.ServletListenerRegistrationBean;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * Session Timeout Configuration
 *
 * Server-side session timeout: 30 minutes of inactivity.
 * The frontend (session-timeout.js) will warn the user at 25 minutes
 * and redirect to /login?timeout=true when the session expires.
 *
 * You can change SESSION_TIMEOUT_SECONDS to any value you prefer.
 */
@Configuration
public class SessionTimeoutConfig {

    // ✅ Change this value to adjust session timeout (in seconds)
    public static final int SESSION_TIMEOUT_SECONDS = 30 * 60; // 30 minutes

    // Named inner class to avoid NoClassDefFoundError with anonymous classes
    private static class CustomHttpSessionListener implements HttpSessionListener {
        @Override
        public void sessionCreated(HttpSessionEvent event) {
            event.getSession().setMaxInactiveInterval(SESSION_TIMEOUT_SECONDS);
        }

        @Override
        public void sessionDestroyed(HttpSessionEvent event) {
            // Optional: log or clean up when session is destroyed
        }
    }

    @Bean
    public ServletListenerRegistrationBean<HttpSessionListener> sessionListener() {
        return new ServletListenerRegistrationBean<>(new CustomHttpSessionListener());
    }
}
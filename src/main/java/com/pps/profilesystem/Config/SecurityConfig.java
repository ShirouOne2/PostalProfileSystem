package com.pps.profilesystem.Config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.access.AccessDeniedHandler;

import jakarta.servlet.http.HttpServletResponse;

@Configuration
public class SecurityConfig {

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new Md5PasswordEncoder();
    }

    @Bean
    public AccessDeniedHandler customAccessDeniedHandler() {
        return (request, response, accessDeniedException) -> {
            // Log the specific URL and user that caused the denial
            System.err.println("Access Denied to: " + request.getRequestURI() + 
                             " by user: " + request.getUserPrincipal() + 
                             " Reason: " + accessDeniedException.getMessage());
            
            // Check if response is already committed
            if (response.isCommitted()) {
                System.err.println("Response already committed - cannot redirect");
                return;
            }

            // SSE requests may have already started streaming via OutputStream.
            // Writing a JSON body (getWriter) would throw IllegalStateException.
            String accept = request.getHeader("Accept");
            if (accept != null && accept.contains("text/event-stream")) {
                response.setStatus(HttpServletResponse.SC_FORBIDDEN);
                return;
            }
            
            // For AJAX/SSE requests, return 403 JSON
            if ("XMLHttpRequest".equals(request.getHeader("X-Requested-With")) ||
                request.getRequestURI().startsWith("/api/")) {
                response.setStatus(HttpServletResponse.SC_FORBIDDEN);
                response.setCharacterEncoding("UTF-8");
                response.setContentType("application/json;charset=UTF-8");
                try (var writer = response.getWriter()) {
                    writer.write("{\"error\":\"Access denied\",\"status\":403}");
                }
            } else {
                // For regular requests, redirect to access denied page
                response.sendRedirect("/access-denied");
            }
        };
    }

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
            .csrf(csrf -> csrf.disable())
            .authorizeHttpRequests(auth -> auth
                .requestMatchers(
                    "/login",
                    "/error",
                    "/error/**",
                    "/access-denied",
                    "/request-otp",
                    "/verify-otp",
                    "/reset-password",
                    "/css/**",
                    "/js/**",
                    "/images/**",
                    "/assets/**",
                    "/postal-offices/**",
                    "/api/keep-alive",          // public ping for session check
                    "/api/user/current"         // public check for authentication status
                ).permitAll()
                // Only ADMIN, AREA_ADMIN, and SRD_OPERATION can access user management and archive
                // AREA_ADMIN can access but sees only their own area's data
                .requestMatchers("/users", "/register").hasAnyRole("ADMIN", "AREA_ADMIN", "SRD_OPERATION")
                .requestMatchers("/archive", "/api/archive/**", "/api/restore/**").hasAnyRole("ADMIN", "AREA_ADMIN", "SRD_OPERATION")
                // Only AREA_ADMIN and SRD_OPERATION can access approval system
                .requestMatchers("/approvals/**").hasAnyRole("AREA_ADMIN", "SRD_OPERATION")
                // All authenticated users can receive approval/connectivity notifications.
                .requestMatchers("/api/notifications/**").authenticated()
                // Asset login/page restriction
                .requestMatchers("/inventory", "/inventory/**").hasAnyRole("ADMIN", "ASSET")
                .anyRequest().authenticated()
            )
            .formLogin(form -> form
                .loginPage("/login")
                .loginProcessingUrl("/login")
                .usernameParameter("email")
                .passwordParameter("password")
                .defaultSuccessUrl("/dashboard", true)
                .failureUrl("/login?error=true")
                .permitAll()
            )
            .logout(logout -> logout
                .logoutUrl("/logout")
                .logoutSuccessUrl("/login?logout=true")
                .invalidateHttpSession(true)
                .clearAuthentication(true)
                .deleteCookies("JSESSIONID")
                .permitAll()
            )
            .exceptionHandling(exception -> exception
                .accessDeniedHandler(customAccessDeniedHandler())
            )
            // Configure frame options for profile popup - allow same origin
            // Also add cache control headers so authenticated pages are never cached.
            // This prevents the browser Back button from showing protected pages after logout.
            .headers(headers -> headers
                .frameOptions(frameOptions -> frameOptions.sameOrigin())
                .cacheControl(cache -> {})
            );

        return http.build();
    }
}
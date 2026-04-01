package com.pps.profilesystem.Config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;

@Configuration
public class SecurityConfig {

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new Md5PasswordEncoder();
    }

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
            .csrf(csrf -> csrf.disable())
            .authorizeHttpRequests(auth -> auth
                .requestMatchers(
                    "/login",
                    "/error",
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
                // FIX: Notifications SSE — accessible by ADMIN and AREA_ADMIN
                // Previously was hasRole("ADMIN") only — Area Admin (role 2) was getting
                // 403 Forbidden on /api/notifications/stream, causing silent SSE failure.
                .requestMatchers("/api/notifications/**").hasAnyRole("ADMIN", "AREA_ADMIN")
                // Only ADMIN can access user management and archive
                // AREA_ADMIN can access but sees only their own area's data
                .requestMatchers("/users", "/register").hasAnyRole("ADMIN", "AREA_ADMIN")
                .requestMatchers("/archive", "/api/archive/**", "/api/restore/**").hasAnyRole("ADMIN", "AREA_ADMIN")
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
            // Configure frame options for profile popup - allow same origin
            // Also add cache control headers so authenticated pages are never cached.
            // This prevents the browser Back button from showing protected pages after logout.
            .headers(headers -> headers
                .frameOptions(frameOptions -> frameOptions.sameOrigin())
                .cacheControl(cache -> {})   // enables no-cache / no-store / must-revalidate
            );

        return http.build();
    }
}
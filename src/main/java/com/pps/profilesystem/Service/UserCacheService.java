package com.pps.profilesystem.Service;

import com.pps.profilesystem.Entity.User;
import com.pps.profilesystem.Repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;

import java.util.Optional;

/**
 * UserCacheService
 *
 * Wraps user DB lookups with Spring Cache so that GlobalModelAdvice
 * does NOT hit the database on every page request.
 *
 * WHY a separate bean:
 *   @Cacheable uses Spring AOP proxies. Self-invocation (a class calling
 *   its own @Cacheable method) bypasses the proxy → cache never activates.
 *   By putting the cached method here, GlobalModelAdvice calls it through
 *   the proxy and the cache works correctly.
 *
 * Cache: "userByEmail"
 *   - Populated on first lookup per email.
 *   - Evicted when the user record is updated (call evictUser from
 *     any service that modifies a User, e.g. UserCrudController).
 */
@Service
public class UserCacheService {

    @Autowired
    private UserRepository userRepository;

    /**
     * Returns the User for the given email, served from cache after the
     * first DB hit. Cache key = email (unique per user).
     */
    @Cacheable(value = "userByEmail", key = "#email")
    public Optional<User> findByEmail(String email) {
        return userRepository.findByEmail(email);
    }

    /**
     * Call this whenever a user's data changes (role, username, area, etc.)
     * so the next request fetches fresh data from the DB.
     */
    @CacheEvict(value = "userByEmail", key = "#email")
    public void evictUser(String email) {
        // Annotation handles eviction — no body needed.
    }

    /**
     * Nuclear option: clears the entire userByEmail cache.
     * Useful after a bulk update.
     */
    @CacheEvict(value = "userByEmail", allEntries = true)
    public void evictAll() {
        // Annotation handles eviction — no body needed.
    }
}
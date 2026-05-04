package com.pps.profilesystem.Controller;

import com.pps.profilesystem.Entity.User;
import com.pps.profilesystem.Repository.UserRepository;
import com.pps.profilesystem.Service.UserCacheService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/users")
public class UserCrudController {

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Autowired
    private UserCacheService userCacheService;

    /**
     * Get current logged-in user
     */
    private User getCurrentUser() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null) return null;
        return userRepository.findByEmail(auth.getName()).orElse(null);
    }

    /**
     * Check if current user is system admin
     */
    private boolean isSystemAdmin(User user) {
        return user != null && (Integer.valueOf(1).equals(user.getRole()) 
                             || Integer.valueOf(4).equals(user.getRole()));
    }

    /**
     * Filter users by area for area admins
     */
    private List<User> filterUsersByArea(List<User> users, User currentUser) {
        if (isSystemAdmin(currentUser)) {
            return users; // System admin sees all users
        }
        
        Integer userAreaId = currentUser != null ? currentUser.getAreaId() : null;
        if (userAreaId == null) {
            return List.of(); // Area admin with no area assigned sees nothing
        }
        
        // Area admin sees users in their area or users with no area (system admins)
        return users.stream()
            .filter(u -> userAreaId.equals(u.getAreaId()) || u.getAreaId() == null)
            .collect(Collectors.toList());
    }

    /**
     * Check if user can access target user
     */
    private boolean canAccessUser(User targetUser, User currentUser) {
        if (isSystemAdmin(currentUser)) {
            return true; // System admin can access all
        }
        
        Integer userAreaId = currentUser != null ? currentUser.getAreaId() : null;
        Integer targetAreaId = targetUser.getAreaId();
        
        // Area admin can access users in their area or users with no area (system admins)
        return userAreaId != null && (userAreaId.equals(targetAreaId) || targetAreaId == null);
    }

    /**
     * CREATE - Add new user
     * POST /api/users
     */
    @PostMapping
    public ResponseEntity<Map<String, Object>> createUser(@RequestBody UserDTO userDTO) {
        Map<String, Object> response = new HashMap<>();
        
        try {
            User currentUser = getCurrentUser();
            
            // Validate required fields
            if (userDTO.getUsername() == null || userDTO.getUsername().trim().isEmpty()) {
                response.put("success", false);
                response.put("message", "Username is required");
                return ResponseEntity.badRequest().body(response);
            }
            
            if (userDTO.getEmail() == null || userDTO.getEmail().trim().isEmpty()) {
                response.put("success", false);
                response.put("message", "Email is required");
                return ResponseEntity.badRequest().body(response);
            }
            
            if (userDTO.getPassword() == null || userDTO.getPassword().length() < 6) {
                response.put("success", false);
                response.put("message", "Password must be at least 6 characters long");
                return ResponseEntity.badRequest().body(response);
            }
            
            if (userDTO.getRole() == null) {
                response.put("success", false);
                response.put("message", "Role is required");
                return ResponseEntity.badRequest().body(response);
            }
            
            // Area admin restrictions
            if (!isSystemAdmin(currentUser)) {
                // Area admin cannot create system admins
                if (Integer.valueOf(1).equals(userDTO.getRole())) {
                    response.put("success", false);
                    response.put("message", "Area admins cannot create system admin users");
                    return ResponseEntity.badRequest().body(response);
                }
                
                // Area admin can only create users in their area or with no area (system admins)
                Integer userAreaId = currentUser != null ? currentUser.getAreaId() : null;
                Integer targetAreaId = userDTO.getAreaId();
                
                if (userAreaId != null && targetAreaId != null && !userAreaId.equals(targetAreaId)) {
                    response.put("success", false);
                    response.put("message", "Area admins can only create users in their assigned area");
                    return ResponseEntity.badRequest().body(response);
                }
            }
            
            // Check if username already exists
            if (userRepository.findByUsername(userDTO.getUsername()).isPresent()) {
                response.put("success", false);
                response.put("message", "Username already exists");
                return ResponseEntity.status(HttpStatus.CONFLICT).body(response);
            }
            
            // Check if email already exists
            if (userRepository.findByEmail(userDTO.getEmail()).isPresent()) {
                response.put("success", false);
                response.put("message", "Email already exists");
                return ResponseEntity.status(HttpStatus.CONFLICT).body(response);
            }
            
            // Create new user
            User user = new User();
            user.setUsername(userDTO.getUsername().trim());
            user.setEmail(userDTO.getEmail().trim());
            user.setPassword(passwordEncoder.encode(userDTO.getPassword()));
            user.setRole(userDTO.getRole());
            user.setEnabled(userDTO.getEnabled() != null ? userDTO.getEnabled() : true);
            user.setAreaId(userDTO.getAreaId());
            
            // Save user
            User savedUser = userRepository.save(user);
            
            // Prepare success response
            response.put("success", true);
            response.put("message", "User created successfully");
            response.put("user", convertToDTO(savedUser));
            
            return ResponseEntity.status(HttpStatus.CREATED).body(response);
            
        } catch (Exception e) {
            response.put("success", false);
            response.put("message", "Error creating user: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
        }
    }

    /**
     * READ - Get all users
     * GET /api/users
     */
    @GetMapping
    public ResponseEntity<List<Map<String, Object>>> getAllUsers() {
        try {
            User currentUser = getCurrentUser();
            List<User> allUsers = userRepository.findAll();
            List<User> filteredUsers = filterUsersByArea(allUsers, currentUser);
            
            List<Map<String, Object>> result = filteredUsers.stream()
                    .map(this::convertToDTO)
                    .toList();
            return ResponseEntity.ok(result);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    /**
     * READ - Get user by ID
     * GET /api/users/{id}
     */
    @GetMapping("/{id}")
    public ResponseEntity<Map<String, Object>> getUserById(@PathVariable Long id) {
        try {
            User currentUser = getCurrentUser();
            Optional<User> userOpt = userRepository.findById(id);
            
            if (userOpt.isPresent()) {
                User targetUser = userOpt.get();
                if (!canAccessUser(targetUser, currentUser)) {
                    Map<String, Object> errorResponse = new HashMap<>();
                    errorResponse.put("success", false);
                    errorResponse.put("message", "Access denied - you can only view users in your area");
                    return ResponseEntity.status(HttpStatus.FORBIDDEN).body(errorResponse);
                }
                return ResponseEntity.ok(convertToDTO(targetUser));
            } else {
                return ResponseEntity.notFound().build();
            }
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    /**
     * UPDATE - Update existing user
     * PUT /api/users/{id}
     */
    @PutMapping("/{id}")
    public ResponseEntity<Map<String, Object>> updateUser(@PathVariable Long id, @RequestBody UserDTO userDTO) {
        Map<String, Object> response = new HashMap<>();
        
        try {
            User currentUser = getCurrentUser();
            Optional<User> existingUserOpt = userRepository.findById(id);
            
            if (existingUserOpt.isEmpty()) {
                response.put("success", false);
                response.put("message", "User not found");
                return ResponseEntity.notFound().build();
            }
            
            User existingUser = existingUserOpt.get();
            
            // Check access permissions
            if (!canAccessUser(existingUser, currentUser)) {
                response.put("success", false);
                response.put("message", "Access denied - you can only update users in your area");
                return ResponseEntity.status(HttpStatus.FORBIDDEN).body(response);
            }
            
            // Validate required fields
            if (userDTO.getUsername() == null || userDTO.getUsername().trim().isEmpty()) {
                response.put("success", false);
                response.put("message", "Username is required");
                return ResponseEntity.badRequest().body(response);
            }
            
            if (userDTO.getEmail() == null || userDTO.getEmail().trim().isEmpty()) {
                response.put("success", false);
                response.put("message", "Email is required");
                return ResponseEntity.badRequest().body(response);
            }
            
            if (userDTO.getRole() == null) {
                response.put("success", false);
                response.put("message", "Role is required");
                return ResponseEntity.badRequest().body(response);
            }
            
            // Area admin restrictions
            if (!isSystemAdmin(currentUser)) {
                // Area admin cannot promote users to system admin
                if (Integer.valueOf(1).equals(userDTO.getRole()) && !Integer.valueOf(1).equals(existingUser.getRole())) {
                    response.put("success", false);
                    response.put("message", "Area admins cannot promote users to system admin");
                    return ResponseEntity.badRequest().body(response);
                }
                
                // Area admin can only assign users to their area or no area (system admins)
                Integer userAreaId = currentUser != null ? currentUser.getAreaId() : null;
                Integer targetAreaId = userDTO.getAreaId();
                
                if (userAreaId != null && targetAreaId != null && !userAreaId.equals(targetAreaId)) {
                    response.put("success", false);
                    response.put("message", "Area admins can only assign users to their assigned area");
                    return ResponseEntity.badRequest().body(response);
                }
            }
            
            // Check if username is taken by another user
            Optional<User> userWithUsername = userRepository.findByUsername(userDTO.getUsername());
            if (userWithUsername.isPresent() && !userWithUsername.get().getId().equals(id)) {
                response.put("success", false);
                response.put("message", "Username already exists");
                return ResponseEntity.status(HttpStatus.CONFLICT).body(response);
            }
            
            // Check if email is taken by another user
            Optional<User> userWithEmail = userRepository.findByEmail(userDTO.getEmail());
            if (userWithEmail.isPresent() && !userWithEmail.get().getId().equals(id)) {
                response.put("success", false);
                response.put("message", "Email already exists");
                return ResponseEntity.status(HttpStatus.CONFLICT).body(response);
            }
            
            // Update user fields
            existingUser.setUsername(userDTO.getUsername().trim());
            existingUser.setEmail(userDTO.getEmail().trim());
            existingUser.setRole(userDTO.getRole());
            existingUser.setEnabled(userDTO.getEnabled() != null ? userDTO.getEnabled() : true);
            existingUser.setAreaId(userDTO.getAreaId());
            
            // Update password only if provided
            if (userDTO.getPassword() != null && !userDTO.getPassword().trim().isEmpty()) {
                if (userDTO.getPassword().length() < 6) {
                    response.put("success", false);
                    response.put("message", "Password must be at least 6 characters long");
                    return ResponseEntity.badRequest().body(response);
                }
                existingUser.setPassword(passwordEncoder.encode(userDTO.getPassword()));
            }
            
            // Save updated user
            User updatedUser = userRepository.save(existingUser);

            // Evict cached user so GlobalModelAdvice picks up the new data
            userCacheService.evictUser(updatedUser.getEmail());
            // Also evict old email in case the email itself was changed
            if (!existingUser.getEmail().equals(updatedUser.getEmail())) {
                userCacheService.evictUser(existingUser.getEmail());
            }
            
            // Prepare success response
            response.put("success", true);
            response.put("message", "User updated successfully");
            response.put("user", convertToDTO(updatedUser));
            
            return ResponseEntity.ok(response);
            
        } catch (Exception e) {
            response.put("success", false);
            response.put("message", "Error updating user: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
        }
    }

    /**
     * DELETE - Delete user by ID
     * DELETE /api/users/{id}
     */
    @DeleteMapping("/{id}")
    public ResponseEntity<Map<String, Object>> deleteUser(@PathVariable Long id) {
        Map<String, Object> response = new HashMap<>();
        
        try {
            User currentUser = getCurrentUser();
            Optional<User> userOpt = userRepository.findById(id);
            
            if (userOpt.isEmpty()) {
                response.put("success", false);
                response.put("message", "User not found");
                return ResponseEntity.notFound().build();
            }
            
            User targetUser = userOpt.get();
            
            // Check access permissions
            if (!canAccessUser(targetUser, currentUser)) {
                response.put("success", false);
                response.put("message", "Access denied - you can only delete users in your area");
                return ResponseEntity.status(HttpStatus.FORBIDDEN).body(response);
            }
            
            // Area admin cannot delete system admins
            if (!isSystemAdmin(currentUser) && Integer.valueOf(1).equals(targetUser.getRole())) {
                response.put("success", false);
                response.put("message", "Area admins cannot delete system admin users");
                return ResponseEntity.status(HttpStatus.FORBIDDEN).body(response);
            }
            
            // Evict from cache before deleting
            userCacheService.evictUser(targetUser.getEmail());

            // Delete user
            userRepository.deleteById(id);
            
            response.put("success", true);
            response.put("message", "User deleted successfully");
            
            return ResponseEntity.ok(response);
            
        } catch (Exception e) {
            response.put("success", false);
            response.put("message", "Error deleting user: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
        }
    }

    /**
     * Helper method to convert User entity to DTO (without password)
     */
    private Map<String, Object> convertToDTO(User user) {
        Map<String, Object> userMap = new HashMap<>();
        userMap.put("id", user.getId());
        userMap.put("username", user.getUsername());
        userMap.put("email", user.getEmail());
        userMap.put("role", user.getRole());
        userMap.put("enabled", user.isEnabled());
        userMap.put("areaId", user.getAreaId());
        return userMap;
    }

    /**
     * DTO class for User requests
     */

    /**
     * Change password for a user (self-service from profile page)
     * PUT /api/users/{id}/change-password
     */
    @PutMapping("/{id}/change-password")
    public ResponseEntity<Map<String, Object>> changePassword(
            @PathVariable Long id,
            @RequestBody Map<String, String> body) {

        Map<String, Object> response = new HashMap<>();

        String currentPassword = body.get("currentPassword");
        String newPassword     = body.get("newPassword");

        if (currentPassword == null || newPassword == null || newPassword.length() < 6) {
            response.put("success", false);
            response.put("message", "Invalid password data. New password must be at least 6 characters.");
            return ResponseEntity.badRequest().body(response);
        }

        Optional<User> userOpt = userRepository.findById(id);
        if (userOpt.isEmpty()) {
            response.put("success", false);
            response.put("message", "User not found.");
            return ResponseEntity.status(404).body(response);
        }

        User user = userOpt.get();

        // Verify current password
        if (!passwordEncoder.matches(currentPassword, user.getPassword())) {
            response.put("success", false);
            response.put("message", "Current password is incorrect.");
            return ResponseEntity.status(400).body(response);
        }

        // Update password
        user.setPassword(passwordEncoder.encode(newPassword));
        userRepository.save(user);

        response.put("success", true);
        response.put("message", "Password changed successfully.");
        return ResponseEntity.ok(response);
    }


    public static class UserDTO {
        private String username;
        private String email;
        private String password;
        private Integer role;
        private Boolean enabled;
        private Integer areaId;
        
        // Getters and Setters
        public String getUsername() {
            return username;
        }
        
        public void setUsername(String username) {
            this.username = username;
        }
        
        public String getEmail() {
            return email;
        }
        
        public void setEmail(String email) {
            this.email = email;
        }
        
        public String getPassword() {
            return password;
        }
        
        public void setPassword(String password) {
            this.password = password;
        }
        
        public Integer getRole() {
            return role;
        }
        
        public void setRole(Integer role) {
            this.role = role;
        }
        
        public Boolean getEnabled() {
            return enabled;
        }
        
        public void setEnabled(Boolean enabled) {
            this.enabled = enabled;
        }
        
        public Integer getAreaId() {
            return areaId;
        }
        
        public void setAreaId(Integer areaId) {
            this.areaId = areaId;
        }
    }
}
package com.pps.profilesystem.Service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.pps.profilesystem.Entity.User;
import com.pps.profilesystem.Entity.UserApprovalRequest;
import com.pps.profilesystem.Repository.UserApprovalRequestRepository;
import com.pps.profilesystem.Repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@Service
public class UserApprovalService {
    
    @Autowired
    private UserApprovalRequestRepository approvalRequestRepository;
    
    @Autowired
    private UserRepository userRepository;
    
    @Autowired
    private ObjectMapper objectMapper;
    
    // Create approval request for user changes
    @Transactional
    public UserApprovalRequest createApprovalRequest(Long userId, Long requestedBy, 
                                                   UserApprovalRequest.RequestType requestType,
                                                   Map<String, Object> requestedChanges) {
        
        // Get original user data
        Optional<User> userOpt = userRepository.findById(userId);
        String originalData = "";
        
        if (userOpt.isPresent() && requestType != UserApprovalRequest.RequestType.CREATE_USER) {
            try {
                originalData = objectMapper.writeValueAsString(userOpt.get());
            } catch (JsonProcessingException e) {
                throw new RuntimeException("Error serializing original user data", e);
            }
        }
        
        // Create approval request
        UserApprovalRequest approvalRequest = new UserApprovalRequest();
        approvalRequest.setUserId(userId);
        approvalRequest.setRequestedBy(requestedBy);
        approvalRequest.setRequestType(requestType);
        approvalRequest.setStatus(UserApprovalRequest.ApprovalStatus.PENDING);
        
        try {
            approvalRequest.setRequestedChanges(objectMapper.writeValueAsString(requestedChanges));
            approvalRequest.setOriginalData(originalData);
        } catch (JsonProcessingException e) {
            throw new RuntimeException("Error serializing request data", e);
        }
        
        return approvalRequestRepository.save(approvalRequest);
    }
    
    // Area Admin approves request
    @Transactional
    public UserApprovalRequest areaAdminApprove(Long requestId, Long approvedBy, String notes) {
        UserApprovalRequest request = approvalRequestRepository.findById(requestId)
            .orElseThrow(() -> new RuntimeException("Approval request not found"));
        
        if (request.getStatus() != UserApprovalRequest.ApprovalStatus.PENDING) {
            throw new RuntimeException("Request is not pending");
        }
        
        request.setStatus(UserApprovalRequest.ApprovalStatus.AREA_ADMIN_APPROVED);
        request.setAreaAdminApprovedAt(LocalDateTime.now());
        request.setAreaAdminApprovedBy(approvedBy);
        request.setAreaAdminNotes(notes);
        
        return approvalRequestRepository.save(request);
    }
    
    // Area Admin rejects request
    @Transactional
    public UserApprovalRequest areaAdminReject(Long requestId, Long rejectedBy, String notes) {
        UserApprovalRequest request = approvalRequestRepository.findById(requestId)
            .orElseThrow(() -> new RuntimeException("Approval request not found"));
        
        if (request.getStatus() != UserApprovalRequest.ApprovalStatus.PENDING) {
            throw new RuntimeException("Request is not pending");
        }
        
        request.setStatus(UserApprovalRequest.ApprovalStatus.AREA_ADMIN_REJECTED);
        request.setAreaAdminApprovedAt(LocalDateTime.now());
        request.setAreaAdminApprovedBy(rejectedBy);
        request.setAreaAdminNotes(notes);
        
        return approvalRequestRepository.save(request);
    }
    
    // SRD approves request and applies changes
    @Transactional
    public UserApprovalRequest srdApprove(Long requestId, Long approvedBy, String notes) {
        UserApprovalRequest request = approvalRequestRepository.findById(requestId)
            .orElseThrow(() -> new RuntimeException("Approval request not found"));
        
        if (request.getStatus() != UserApprovalRequest.ApprovalStatus.AREA_ADMIN_APPROVED) {
            throw new RuntimeException("Request must be approved by Area Admin first");
        }
        
        // Apply the changes to the user
        try {
            applyUserChanges(request);
            
            request.setStatus(UserApprovalRequest.ApprovalStatus.SRD_APPROVED);
            request.setSrdApprovedAt(LocalDateTime.now());
            request.setSrdApprovedBy(approvedBy);
            request.setSrdNotes(notes);
            
            return approvalRequestRepository.save(request);
        } catch (Exception e) {
            throw new RuntimeException("Error applying user changes", e);
        }
    }
    
    // SRD rejects request
    @Transactional
    public UserApprovalRequest srdReject(Long requestId, Long rejectedBy, String notes) {
        UserApprovalRequest request = approvalRequestRepository.findById(requestId)
            .orElseThrow(() -> new RuntimeException("Approval request not found"));
        
        if (request.getStatus() != UserApprovalRequest.ApprovalStatus.AREA_ADMIN_APPROVED) {
            throw new RuntimeException("Request must be approved by Area Admin first");
        }
        
        request.setStatus(UserApprovalRequest.ApprovalStatus.SRD_REJECTED);
        request.setSrdApprovedAt(LocalDateTime.now());
        request.setSrdApprovedBy(rejectedBy);
        request.setSrdNotes(notes);
        
        return approvalRequestRepository.save(request);
    }
    
    // Apply user changes from approval request
    @SuppressWarnings("unchecked")
    private void applyUserChanges(UserApprovalRequest request) throws JsonProcessingException {
        Map<String, Object> changes = objectMapper.readValue(request.getRequestedChanges(), Map.class);
        
        if (request.getRequestType() == UserApprovalRequest.RequestType.CREATE_USER) {
            // Create new user
            User newUser = new User();
            updateUserFromMap(newUser, changes);
            userRepository.save(newUser);
        } else if (request.getRequestType() == UserApprovalRequest.RequestType.UPDATE_USER) {
            // Update existing user
            User user = userRepository.findById(request.getUserId())
                .orElseThrow(() -> new RuntimeException("User not found"));
            updateUserFromMap(user, changes);
            userRepository.save(user);
        } else if (request.getRequestType() == UserApprovalRequest.RequestType.DELETE_USER) {
            // Delete user
            userRepository.deleteById(request.getUserId());
        }
    }
    
    // Helper method to update user from map
    private void updateUserFromMap(User user, Map<String, Object> changes) {
        if (changes.containsKey("username")) {
            user.setUsername((String) changes.get("username"));
        }
        if (changes.containsKey("email")) {
            user.setEmail((String) changes.get("email"));
        }
        if (changes.containsKey("password")) {
            user.setPassword((String) changes.get("password"));
        }
        if (changes.containsKey("role")) {
            // Convert role string to Integer
            String roleStr = (String) changes.get("role");
            if (roleStr != null) {
                try {
                    user.setRole(Integer.parseInt(roleStr));
                } catch (NumberFormatException e) {
                    throw new RuntimeException("Invalid role value: " + roleStr);
                }
            }
        }
        if (changes.containsKey("active")) {
            user.setEnabled((Boolean) changes.get("active"));
        }
        if (changes.containsKey("areaId")) {
            user.setAreaId((Integer) changes.get("areaId"));
        }
        // Add other fields as needed
    }
    
    // Get pending requests for Area Admin
    public List<UserApprovalRequest> getPendingRequests() {
        return approvalRequestRepository.findPendingRequests();
    }
    
    // Get requests waiting for SRD approval
    public List<UserApprovalRequest> getSrdPendingRequests() {
        return approvalRequestRepository.findAreaAdminApprovedRequests();
    }
    
    // Get requests by user
    public List<UserApprovalRequest> getUserRequests(Long userId) {
        return approvalRequestRepository.findByUserId(userId);
    }
    
    // Get request counts
    public long getPendingCount() {
        return approvalRequestRepository.countPendingRequests();
    }
    
    public long getSrdPendingCount() {
        return approvalRequestRepository.countSrdPendingRequests();
    }
}

package com.pps.profilesystem.Controller;

import com.pps.profilesystem.Entity.ApprovalRequest;
import com.pps.profilesystem.Entity.Area;
import com.pps.profilesystem.Entity.User;
import com.pps.profilesystem.Service.ApprovalService;
import com.pps.profilesystem.Repository.AreaRepository;
import com.pps.profilesystem.Repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

/**
 * ApprovalController — role-aware 2-level approval dashboard.
 *
 * AREA_ADMIN (role 2) : sees PENDING requests for their assigned areas.
 * OPERATION  (role 4) : sees AREA_APPROVED requests (across all areas).
 */
@Controller
@RequestMapping("/approvals")
public class ApprovalController {

    @Autowired private ApprovalService  approvalService;
    @Autowired private AreaRepository   areaRepository;
    @Autowired private UserRepository   userRepository;

    // ── Dashboard ─────────────────────────────────────────────────────────────

    @GetMapping
    public String approvalDashboard(Model model, Authentication auth) {
        User currentUser = userRepository.findByEmail(auth.getName()).orElse(null);
        Integer roleId   = currentUser != null ? currentUser.getRole()   : null;
        Integer areaId   = currentUser != null ? currentUser.getAreaId() : null;

        boolean isOperation  = Integer.valueOf(4).equals(roleId);
        boolean isAreaAdmin  = Integer.valueOf(2).equals(roleId);
        boolean isSystemAdmin= Integer.valueOf(1).equals(roleId);

        List<ApprovalRequest> actionableRequests;
        List<ApprovalRequest> allRequests;

        if (isOperation) {
            // Operation sees AREA_APPROVED requests to give final approval
            actionableRequests = approvalService.getAreaApprovedRequests();
            allRequests        = approvalService.getAllRequests();
        } else {
            // Area Admin sees PENDING requests in their area(s)
            List<Area> areas = (areaId != null
                    ? areaRepository.findById(areaId).map(List::of).orElse(List.of())
                    : List.of());

            List<Integer> areaIds = areas.stream().map(Area::getId).toList();
            
            // Handle case where Area Admin has no area assigned
            if (areaIds.isEmpty()) {
                actionableRequests = List.of();
                allRequests = List.of();
            } else {
                actionableRequests = approvalService.getPendingRequestsForAreas(areaIds);
                allRequests = areaIds.stream()
                        .flatMap(id -> approvalService.getAllRequestsForArea(id).stream())
                        .sorted((a, b) -> b.getRequestedAt().compareTo(a.getRequestedAt()))
                        .toList();
            }
        }

        long pendingCount = actionableRequests.size();
        long totalCount   = allRequests.size();

        model.addAttribute("actionableRequests", actionableRequests);
        model.addAttribute("allRequests",        allRequests);
        model.addAttribute("stats",              Map.of("pending", pendingCount, "total", totalCount));
        model.addAttribute("assignedAreas",      areaRepository.findAll());
        model.addAttribute("activePage",         "approvals");
        model.addAttribute("isOperation",        isOperation);
        model.addAttribute("isAreaAdmin",        isAreaAdmin);
        model.addAttribute("isSystemAdmin",      isSystemAdmin);

        return "approvals";
    }

    // ── Area Admin: Step 2 approve/reject ─────────────────────────────────────

    @PostMapping("/area-approve/{id}")
    @ResponseBody
    public Map<String, Object> areaApprove(
            @PathVariable Long id,
            @RequestParam(required = false) String adminNotes,
            Authentication auth) {
        try {
            approvalService.areaAdminApproveRequest(id, auth.getName(), adminNotes);
            return Map.of("success", true, "message", "Request forwarded to Operation for final approval.");
        } catch (Exception e) {
            return Map.of("success", false, "message", e.getMessage());
        }
    }

    @PostMapping("/area-reject/{id}")
    @ResponseBody
    public Map<String, Object> areaReject(
            @PathVariable Long id,
            @RequestParam(required = false) String adminNotes,
            Authentication auth) {
        try {
            approvalService.areaAdminRejectRequest(id, auth.getName(), adminNotes);
            return Map.of("success", true, "message", "Request rejected.");
        } catch (Exception e) {
            return Map.of("success", false, "message", e.getMessage());
        }
    }

    // ── Operation: Step 3 final approve/reject ────────────────────────────────

    @PostMapping("/operation-approve/{id}")
    @ResponseBody
    public Map<String, Object> operationApprove(
            @PathVariable Long id,
            @RequestParam(required = false) String adminNotes,
            Authentication auth) {
        try {
            approvalService.operationApproveRequest(id, auth.getName(), adminNotes);
            return Map.of("success", true, "message", "Request approved and changes applied to the system.");
        } catch (Exception e) {
            return Map.of("success", false, "message", e.getMessage());
        }
    }

    @PostMapping("/operation-reject/{id}")
    @ResponseBody
    public Map<String, Object> operationReject(
            @PathVariable Long id,
            @RequestParam(required = false) String adminNotes,
            Authentication auth) {
        try {
            approvalService.operationRejectRequest(id, auth.getName(), adminNotes);
            return Map.of("success", true, "message", "Request rejected by Operation.");
        } catch (Exception e) {
            return Map.of("success", false, "message", e.getMessage());
        }
    }

    // ── Legacy shim endpoints (used by old JS) ────────────────────────────────

    @PostMapping("/approve/{id}")
    @ResponseBody
    public Map<String, Object> approve(
            @PathVariable Long id,
            @RequestParam(required = false) String adminNotes,
            Authentication auth) {
        try {
            approvalService.approveRequest(id, auth.getName(), adminNotes);
            return Map.of("success", true, "message", "Request approved.");
        } catch (Exception e) {
            return Map.of("success", false, "message", e.getMessage());
        }
    }

    @PostMapping("/reject/{id}")
    @ResponseBody
    public Map<String, Object> reject(
            @PathVariable Long id,
            @RequestParam(required = false) String adminNotes,
            Authentication auth) {
        try {
            approvalService.rejectRequest(id, auth.getName(), adminNotes);
            return Map.of("success", true, "message", "Request rejected.");
        } catch (Exception e) {
            return Map.of("success", false, "message", e.getMessage());
        }
    }

    @GetMapping("/api/stats")
    @ResponseBody
    public Map<String, Object> getApprovalStats(Authentication auth) {
        try {
            User currentUser = userRepository.findByEmail(auth.getName()).orElse(null);
            Integer roleId   = currentUser != null ? currentUser.getRole()   : null;
            Integer areaId   = currentUser != null ? currentUser.getAreaId() : null;

            List<ApprovalRequest> actionableRequests;
            List<ApprovalRequest> allRequests;

            if (Integer.valueOf(4).equals(roleId)) {
                // Operation sees AREA_APPROVED requests to give final approval
                actionableRequests = approvalService.getAreaApprovedRequests();
                allRequests = approvalService.getAllRequests();
            } else {
                // Area Admin sees PENDING requests in their area(s)
                List<Area> areas = (areaId != null
                        ? areaRepository.findById(areaId).map(List::of).orElse(List.of())
                        : List.of());

                List<Integer> areaIds = areas.stream().map(Area::getId).toList();
                
                // Handle case where Area Admin has no area assigned
                if (areaIds.isEmpty()) {
                    actionableRequests = List.of();
                    allRequests = List.of();
                } else {
                    actionableRequests = approvalService.getPendingRequestsForAreas(areaIds);
                    allRequests = areaIds.stream()
                            .flatMap(id -> approvalService.getAllRequestsForArea(id).stream())
                            .sorted((a, b) -> b.getRequestedAt().compareTo(a.getRequestedAt()))
                            .toList();
                }
            }

            long pendingCount = actionableRequests.size();
            long approvedCount = allRequests.stream()
                    .filter(r -> {
                        if (!ApprovalRequest.RequestStatus.APPROVED.equals(r.getStatus())) return false;
                        if (Integer.valueOf(2).equals(roleId)) {
                            return auth.getName().equalsIgnoreCase(r.getAreaAdminProcessedBy());
                        }
                        return auth.getName().equalsIgnoreCase(r.getProcessedBy());
                    })
                    .count();
            long rejectedCount = allRequests.stream()
                    .filter(r -> {
                        if (!ApprovalRequest.RequestStatus.REJECTED.equals(r.getStatus())) return false;
                        if (Integer.valueOf(2).equals(roleId)) {
                            return auth.getName().equalsIgnoreCase(r.getAreaAdminProcessedBy());
                        }
                        return auth.getName().equalsIgnoreCase(r.getProcessedBy());
                    })
                    .count();

            return Map.of(
                "pending", pendingCount,
                "approved", approvedCount,
                "rejected", rejectedCount
            );
        } catch (Exception e) {
            return Map.of(
                "pending", 0,
                "approved", 0,
                "rejected", 0
            );
        }
    }

    @GetMapping("/api/pending")
    @ResponseBody
    public List<ApprovalRequest> getPendingRequests(Authentication auth) {
        try {
            User currentUser = userRepository.findByEmail(auth.getName()).orElse(null);
            Integer roleId   = currentUser != null ? currentUser.getRole()   : null;
            Integer areaId   = currentUser != null ? currentUser.getAreaId() : null;

            List<ApprovalRequest> actionableRequests;

            if (Integer.valueOf(4).equals(roleId)) {
                // Operation sees AREA_APPROVED requests to give final approval
                actionableRequests = approvalService.getAreaApprovedRequests();
            } else {
                // Area Admin sees PENDING requests in their area(s)
                List<Area> areas = (areaId != null
                        ? areaRepository.findById(areaId).map(List::of).orElse(List.of())
                        : List.of());

                List<Integer> areaIds = areas.stream().map(Area::getId).toList();
                
                // Handle case where Area Admin has no area assigned
                if (areaIds.isEmpty()) {
                    actionableRequests = List.of();
                } else {
                    actionableRequests = approvalService.getPendingRequestsForAreas(areaIds);
                }
            }

            return actionableRequests.stream()
                    .sorted((a, b) -> b.getRequestedAt().compareTo(a.getRequestedAt()))
                    .toList();
        } catch (Exception e) {
            return List.of();
        }
    }

    @GetMapping("/api/pending-count")
    @ResponseBody
    public Map<String, Object> getPendingCount(Authentication auth) {
        try {
            User currentUser = userRepository.findByEmail(auth.getName()).orElse(null);
            Integer roleId   = currentUser != null ? currentUser.getRole()   : null;
            Integer areaId   = currentUser != null ? currentUser.getAreaId() : null;

            long count;
            if (Integer.valueOf(4).equals(roleId)) {
                count = approvalService.getAreaApprovedRequests().size();
            } else {
                // Handle Area Admin with no area assigned
                if (areaId == null) {
                    count = 0;
                } else {
                    List<Integer> areaIds = List.of(areaId);
                    count = approvalService.getPendingRequestsForAreas(areaIds).size();
                }
            }
            return Map.of("count", count);
        } catch (Exception e) {
            return Map.of("count", 0);
        }
    }

    @GetMapping("/api/request/{id}")
    @ResponseBody
    public ApprovalRequest getRequestDetails(@PathVariable Long id, Authentication auth) {
        try {
            return approvalService.getRequestWithDetails(id);
        } catch (Exception e) {
            return null;
        }
    }

    @PostMapping("/api/process")
    @ResponseBody
    public Map<String, Object> processApproval(@RequestBody Map<String, Object> request, Authentication auth) {
        try {
            Long requestId = Long.valueOf(request.get("requestId").toString());
            String action = request.get("action").toString();
            String notes = request.get("notes") != null ? request.get("notes").toString() : null;

            User currentUser = userRepository.findByEmail(auth.getName()).orElse(null);
            Integer roleId = currentUser != null ? currentUser.getRole() : null;

            Map<String, Object> result;
            
            if (Integer.valueOf(4).equals(roleId)) {
                // Operation level approval/rejection
                if ("approve".equals(action)) {
                    approvalService.operationApproveRequest(requestId, auth.getName(), notes);
                    result = Map.of("success", true, "message", "Request approved and changes applied to the system.");
                } else if ("reject".equals(action)) {
                    approvalService.operationRejectRequest(requestId, auth.getName(), notes);
                    result = Map.of("success", true, "message", "Request rejected by Operation.");
                } else {
                    result = Map.of("success", false, "message", "Invalid action.");
                }
            } else {
                // Area Admin level approval/rejection
                if ("approve".equals(action)) {
                    approvalService.areaAdminApproveRequest(requestId, auth.getName(), notes);
                    result = Map.of("success", true, "message", "Request forwarded to Operation for final approval.");
                } else if ("reject".equals(action)) {
                    approvalService.areaAdminRejectRequest(requestId, auth.getName(), notes);
                    result = Map.of("success", true, "message", "Request rejected.");
                } else {
                    result = Map.of("success", false, "message", "Invalid action.");
                }
            }
            
            return result;
        } catch (Exception e) {
            return Map.of("success", false, "message", e.getMessage());
        }
    }
}
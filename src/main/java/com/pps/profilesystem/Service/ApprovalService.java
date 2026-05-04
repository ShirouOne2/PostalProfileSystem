package com.pps.profilesystem.Service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.pps.profilesystem.DTO.ConnectivityNotification;
import com.pps.profilesystem.Entity.*;
import com.pps.profilesystem.Repository.*;
import com.pps.profilesystem.Event.ApprovalRequestEvent;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.*;

/**
 * ApprovalService — 3-Level Approval Workflow
 *
 *  Step 1: User submits edit/new-office  → PENDING        (Area Admin notified)
 *  Step 2: Area Admin approves           → AREA_APPROVED  (Operation notified)
 *          Area Admin rejects            → REJECTED
 *  Step 3: Operation approves            → APPROVED       (data applied to DB)
 *          Operation rejects             → REJECTED
 *
 * The postal_offices table is only modified when Operation gives final approval.
 */
@Service
public class ApprovalService {

    @Autowired private ApprovalRequestRepository approvalRequestRepository;
    @Autowired private PostalOfficeRepository     postalOfficeRepository;
    @Autowired private AreaRepository             areaRepository;
    @Autowired private ApplicationEventPublisher  eventPublisher;
    @Autowired private RegionsRepository          regionsRepository;
    @Autowired private ProvinceRepository         provinceRepository;
    @Autowired private CityMunicipalityRepository cityMunicipalityRepository;
    @Autowired private BarangayRepository         barangayRepository;
    @Autowired private ConnectivityNotificationService notifService;

    private final ObjectMapper objectMapper = new ObjectMapper();

    // ── Create ────────────────────────────────────────────────────────────────

    @Transactional
    public ApprovalRequest createApprovalRequest(
            ApprovalRequest.RequestType requestType,
            Integer officeId,
            String officeName,
            String requestedBy,
            Map<String, Object> oldValues,
            Map<String, Object> newValues,
            Integer areaId) {

        ApprovalRequest request = new ApprovalRequest();
        request.setRequestType(requestType);
        request.setOfficeId(officeId);
        request.setOfficeName(officeName);
        request.setRequestedBy(requestedBy);
        request.setRequestedAt(LocalDateTime.now());
        request.setStatus(ApprovalRequest.RequestStatus.PENDING);

        try {
            if (oldValues != null) request.setOldValues(objectMapper.writeValueAsString(oldValues));
            if (newValues != null) request.setNewValues(objectMapper.writeValueAsString(newValues));
        } catch (Exception e) {
            if (oldValues != null) request.setOldValues(oldValues.toString());
            if (newValues != null) request.setNewValues(newValues.toString());
        }

        if (areaId != null) {
            areaRepository.findById(areaId).ifPresent(request::setArea);
        }

        ApprovalRequest saved = approvalRequestRepository.save(request);

        // Notify Area Admin (approval counters / approvals page listeners)
        eventPublisher.publishEvent(new ApprovalRequestEvent(this, saved, "NEW_REQUEST"));
        eventPublisher.publishEvent(new ApprovalRequestEvent(this, saved, "PENDING_COUNT_UPDATE"));

        // Notify Area Admin bell dropdown/inbox
        notifyAreaAdminForReview(saved);

        return saved;
    }

    /**
     * Creates a request that already passed Area Admin review (AREA_APPROVED),
     * so it goes directly to Operation for final approval.
     *
     * Use case: Area Admin edits should still require SRD Operation approval.
     */
    @Transactional
    public ApprovalRequest createAreaApprovedRequest(
            ApprovalRequest.RequestType requestType,
            Integer officeId,
            String officeName,
            String requestedBy,
            Map<String, Object> oldValues,
            Map<String, Object> newValues,
            Integer areaId,
            String areaAdminEmail,
            String areaAdminNotes) {

        ApprovalRequest request = new ApprovalRequest();
        request.setRequestType(requestType);
        request.setOfficeId(officeId);
        request.setOfficeName(officeName);
        request.setRequestedBy(requestedBy);
        request.setRequestedAt(LocalDateTime.now());
        request.setStatus(ApprovalRequest.RequestStatus.AREA_APPROVED);

        request.setAreaAdminProcessedBy(areaAdminEmail);
        request.setAreaAdminProcessedAt(LocalDateTime.now());
        request.setAreaAdminNotes(areaAdminNotes);

        try {
            if (oldValues != null) request.setOldValues(objectMapper.writeValueAsString(oldValues));
            if (newValues != null) request.setNewValues(objectMapper.writeValueAsString(newValues));
        } catch (Exception e) {
            if (oldValues != null) request.setOldValues(oldValues.toString());
            if (newValues != null) request.setNewValues(newValues.toString());
        }

        if (areaId != null) {
            areaRepository.findById(areaId).ifPresent(request::setArea);
        }

        ApprovalRequest saved = approvalRequestRepository.save(request);

        // Notify Operation that a request is awaiting final approval
        eventPublisher.publishEvent(new ApprovalRequestEvent(this, saved, "AREA_APPROVED"));
        eventPublisher.publishEvent(new ApprovalRequestEvent(this, saved, "PENDING_COUNT_UPDATE"));
        notifySrdForFinalApproval(saved);

        return saved;
    }

    // ── Area Admin: Step 2 ────────────────────────────────────────────────────

    /**
     * Area Admin approves → status becomes AREA_APPROVED.
     * Data is NOT applied yet. Operation must give final approval.
     */
    @Transactional
    public void areaAdminApproveRequest(Long requestId, String areaAdminEmail, String notes) {
        ApprovalRequest request = findPending(requestId);

        request.setStatus(ApprovalRequest.RequestStatus.AREA_APPROVED);
        request.setAreaAdminProcessedBy(areaAdminEmail);
        request.setAreaAdminProcessedAt(LocalDateTime.now());
        request.setAreaAdminNotes(notes);

        approvalRequestRepository.save(request);

        // Notify Operation that a request is awaiting final approval
        eventPublisher.publishEvent(new ApprovalRequestEvent(this, request, "AREA_APPROVED"));
        eventPublisher.publishEvent(new ApprovalRequestEvent(this, request, "PENDING_COUNT_UPDATE"));
        notifySrdForFinalApproval(request);
        notifyRequesterStatus(request, "Area Admin approved your edit request. Waiting for SRD final approval.", areaAdminEmail);
    }

    /**
     * Area Admin rejects → status REJECTED. No further action needed.
     */
    @Transactional
    public void areaAdminRejectRequest(Long requestId, String areaAdminEmail, String notes) {
        ApprovalRequest request = findPending(requestId);

        request.setStatus(ApprovalRequest.RequestStatus.REJECTED);
        request.setAreaAdminProcessedBy(areaAdminEmail);
        request.setAreaAdminProcessedAt(LocalDateTime.now());
        request.setAreaAdminNotes(notes);

        approvalRequestRepository.save(request);
        eventPublisher.publishEvent(new ApprovalRequestEvent(this, request, "PENDING_COUNT_UPDATE"));
        notifyRequesterStatus(request, "Area Admin rejected your edit request.", areaAdminEmail);
    }

    // ── Operation: Step 3 ─────────────────────────────────────────────────────

    /**
     * Operation gives final approval → status APPROVED → data applied to DB.
     */
    @Transactional
    public void operationApproveRequest(Long requestId, String operationEmail, String notes) {
        ApprovalRequest request = approvalRequestRepository.findById(requestId)
                .orElseThrow(() -> new RuntimeException("Request not found: " + requestId));

        if (request.getStatus() != ApprovalRequest.RequestStatus.AREA_APPROVED) {
            throw new RuntimeException("Request must be AREA_APPROVED before Operation can approve. Current status: " + request.getStatus());
        }

        request.setStatus(ApprovalRequest.RequestStatus.APPROVED);
        request.setProcessedBy(operationEmail);
        request.setProcessedAt(LocalDateTime.now());
        request.setAdminNotes(notes);

        approvalRequestRepository.save(request);

        // NOW apply the changes to the actual database
        applyApprovedChanges(request);

        eventPublisher.publishEvent(new ApprovalRequestEvent(this, request, "PENDING_COUNT_UPDATE"));
        notifyRequesterStatus(request, "SRD Operation approved your edit request.", operationEmail);
        notifyAreaAdminStatus(request, "SRD Operation approved the request endorsed by your area.", operationEmail);
    }

    /**
     * Operation rejects a previously area-approved request.
     */
    @Transactional
    public void operationRejectRequest(Long requestId, String operationEmail, String notes) {
        ApprovalRequest request = approvalRequestRepository.findById(requestId)
                .orElseThrow(() -> new RuntimeException("Request not found: " + requestId));

        if (request.getStatus() != ApprovalRequest.RequestStatus.AREA_APPROVED) {
            throw new RuntimeException("Only AREA_APPROVED requests can be rejected by Operation.");
        }

        request.setStatus(ApprovalRequest.RequestStatus.REJECTED);
        request.setProcessedBy(operationEmail);
        request.setProcessedAt(LocalDateTime.now());
        request.setAdminNotes(notes);

        approvalRequestRepository.save(request);
        eventPublisher.publishEvent(new ApprovalRequestEvent(this, request, "PENDING_COUNT_UPDATE"));
        notifyRequesterStatus(request, "SRD Operation rejected your edit request.", operationEmail);
        notifyAreaAdminStatus(request, "SRD Operation rejected the request endorsed by your area.", operationEmail);
    }

    // ── Legacy shim (called by old ApprovalController endpoints) ─────────────

    /**
     * Generic approve — routes to the correct level based on caller's role.
     */
    @Transactional
    public void approveRequest(Long requestId, String processedBy, String adminNotes) {
        ApprovalRequest request = approvalRequestRepository.findById(requestId)
                .orElseThrow(() -> new RuntimeException("Request not found: " + requestId));

        if (request.getStatus() == ApprovalRequest.RequestStatus.PENDING) {
            areaAdminApproveRequest(requestId, processedBy, adminNotes);
        } else if (request.getStatus() == ApprovalRequest.RequestStatus.AREA_APPROVED) {
            operationApproveRequest(requestId, processedBy, adminNotes);
        } else {
            throw new RuntimeException("Request cannot be approved in its current status: " + request.getStatus());
        }
    }

    @Transactional
    public void rejectRequest(Long requestId, String processedBy, String adminNotes) {
        ApprovalRequest request = approvalRequestRepository.findById(requestId)
                .orElseThrow(() -> new RuntimeException("Request not found: " + requestId));

        if (request.getStatus() == ApprovalRequest.RequestStatus.PENDING) {
            areaAdminRejectRequest(requestId, processedBy, adminNotes);
        } else if (request.getStatus() == ApprovalRequest.RequestStatus.AREA_APPROVED) {
            operationRejectRequest(requestId, processedBy, adminNotes);
        } else {
            throw new RuntimeException("Request cannot be rejected in its current status: " + request.getStatus());
        }
    }

    // ── Queries ───────────────────────────────────────────────────────────────

    /** Requests the Area Admin can act on (PENDING in their areas) */
    public List<ApprovalRequest> getPendingRequestsForAreas(List<Integer> areaIds) {
        return approvalRequestRepository.findByStatusAndAreaIds(
                ApprovalRequest.RequestStatus.PENDING, areaIds);
    }

    public List<ApprovalRequest> getPendingRequestsForArea(Integer areaId) {
        return approvalRequestRepository.findByStatusAndAreaId(
                ApprovalRequest.RequestStatus.PENDING, areaId);
    }

    public List<ApprovalRequest> getAllRequestsForArea(Integer areaId) {
        return approvalRequestRepository.findByAreaIdOrderByRequestedAtDesc(areaId);
    }

    /** Requests Operation can act on (AREA_APPROVED, all areas) */
    public List<ApprovalRequest> getAreaApprovedRequests() {
        return approvalRequestRepository.findByStatusOrderByRequestedAtAsc(
                ApprovalRequest.RequestStatus.AREA_APPROVED);
    }

    /** All requests (for Operation dashboard overview) */
    public List<ApprovalRequest> getAllRequests() {
        return approvalRequestRepository.findAll();
    }

    public ApprovalRequest getRequestWithDetails(Long requestId) {
        return approvalRequestRepository.findById(requestId)
                .orElseThrow(() -> new RuntimeException("Request not found: " + requestId));
    }

    public boolean hasPendingRequestForOffice(Integer officeId) {
        return approvalRequestRepository.existsByOfficeIdAndStatus(
                officeId, ApprovalRequest.RequestStatus.PENDING)
            || approvalRequestRepository.existsByOfficeIdAndStatus(
                officeId, ApprovalRequest.RequestStatus.AREA_APPROVED);
    }

    public Optional<ApprovalRequest> getLatestActiveRequestForOffice(Integer officeId) {
        List<ApprovalRequest> active = approvalRequestRepository.findActiveRequestsByOfficeId(officeId);
        if (active == null || active.isEmpty()) {
            return Optional.empty();
        }
        return Optional.of(active.get(0));
    }

    public Map<String, Long> getRequestStatistics(Integer areaId) {
        long pending = approvalRequestRepository.countByStatusAndAreaId(
                ApprovalRequest.RequestStatus.PENDING, areaId);
        long total = approvalRequestRepository.findByAreaIdOrderByRequestedAtDesc(areaId).size();
        return Map.of("pending", pending, "total", total);
    }

    // ── Private helpers ───────────────────────────────────────────────────────

    private ApprovalRequest findPending(Long requestId) {
        ApprovalRequest request = approvalRequestRepository.findById(requestId)
                .orElseThrow(() -> new RuntimeException("Request not found: " + requestId));
        if (request.getStatus() != ApprovalRequest.RequestStatus.PENDING) {
            throw new RuntimeException("Request is not in PENDING status: " + request.getStatus());
        }
        return request;
    }

    /**
     * Applies the approved changes to the PostalOffice table.
     * Only called when Operation gives final approval.
     */
    private void applyApprovedChanges(ApprovalRequest request) {
        try {
            Map<String, Object> newValues = parseJson(request.getNewValues());
            if (newValues == null || newValues.isEmpty()) return;

            if (request.getRequestType() == ApprovalRequest.RequestType.EDIT_OFFICE) {
                applyEditChanges(request.getOfficeId(), newValues);
            } else if (request.getRequestType() == ApprovalRequest.RequestType.NEW_OFFICE) {
                applyNewOffice(newValues);
            }
        } catch (Exception e) {
            throw new RuntimeException("Failed to apply approved changes to DB: " + e.getMessage(), e);
        }
    }

    private void applyEditChanges(Integer officeId, Map<String, Object> values) {
        Optional<PostalOffice> opt = postalOfficeRepository.findById(officeId);
        if (opt.isEmpty()) throw new RuntimeException("Office not found: " + officeId);

        PostalOffice o = opt.get();

        applyStr(values, "name",                      o::setName);
        applyStr(values, "postmaster",                o::setPostmaster);
        applyStr(values, "classification",            o::setClassification);
        applyStr(values, "serviceProvided",           o::setServiceProvided);
        applyStr(values, "address",                   o::setAddress);
        applyStr(values, "zipCode",                   o::setZipCode);
        applyStr(values, "officeStatus",              o::setOfficeStatus);
        applyStr(values, "internetServiceProvider",   o::setInternetServiceProvider);
        applyStr(values, "typeOfConnection",          o::setTypeOfConnection);
        applyStr(values, "speed",                     o::setSpeed);
        applyStr(values, "staticIpAddress",           o::setStaticIpAddress);
        applyStr(values, "postalOfficeContactPerson", o::setPostalOfficeContactPerson);
        applyStr(values, "postalOfficeContactNumber", o::setPostalOfficeContactNumber);
        applyStr(values, "ispContactPerson",          o::setIspContactPerson);
        applyStr(values, "ispContactNumber",          o::setIspContactNumber);
        applyStr(values, "remarks",                   o::setRemarks);

        if (values.containsKey("connectionStatus")) {
            Object v = values.get("connectionStatus");
            if (v instanceof Boolean) o.setConnectionStatus((Boolean) v);
            else if (v != null)       o.setConnectionStatus(Boolean.parseBoolean(v.toString()));
        }
        if (values.containsKey("noOfEmployees"))     applyInt(values, "noOfEmployees",     o::setNoOfEmployees);
        if (values.containsKey("noOfPostalTellers")) applyInt(values, "noOfPostalTellers", o::setNoOfPostalTellers);
        if (values.containsKey("noOfLetterCarriers"))applyInt(values, "noOfLetterCarriers",o::setNoOfLetterCarriers);

        // Location FK references
        applyFk(values, "areaId",     id -> areaRepository.findById(id).ifPresent(o::setArea));
        applyFk(values, "regionId",   id -> regionsRepository.findById(id).ifPresent(o::setRegion));
        applyFk(values, "provinceId", id -> provinceRepository.findById(id).ifPresent(o::setProvince));
        applyFk(values, "cityMunId",  id -> cityMunicipalityRepository.findById(id).ifPresent(o::setCityMunicipality));
        applyFk(values, "barangayId", id -> barangayRepository.findById(id).ifPresent(o::setBarangay));

        postalOfficeRepository.save(o);
    }

    private void applyNewOffice(Map<String, Object> values) {
        PostalOffice o = new PostalOffice();
        applyStr(values, "name",                      o::setName);
        applyStr(values, "postmaster",                o::setPostmaster);
        applyStr(values, "address",                   o::setAddress);
        applyStr(values, "zipCode",                   o::setZipCode);
        applyStr(values, "classification",            o::setClassification);
        applyStr(values, "serviceProvided",           o::setServiceProvided);
        applyStr(values, "officeStatus",              o::setOfficeStatus);
        applyStr(values, "internetServiceProvider",   o::setInternetServiceProvider);
        applyStr(values, "typeOfConnection",          o::setTypeOfConnection);
        applyStr(values, "speed",                     o::setSpeed);
        applyStr(values, "remarks",                   o::setRemarks);
        if (values.containsKey("connectionStatus")) {
            Object v = values.get("connectionStatus");
            o.setConnectionStatus(v instanceof Boolean ? (Boolean) v : Boolean.parseBoolean(String.valueOf(v)));
        }
        postalOfficeRepository.save(o);
    }

    // ── Value applicators ─────────────────────────────────────────────────────

    private void applyStr(Map<String, Object> m, String key, java.util.function.Consumer<String> setter) {
        if (m.containsKey(key)) {
            Object v = m.get(key);
            setter.accept(v == null ? null : v.toString().trim());
        }
    }

    private void applyInt(Map<String, Object> m, String key, java.util.function.Consumer<Integer> setter) {
        if (!m.containsKey(key)) return;
        Object v = m.get(key);
        if (v == null) { setter.accept(null); return; }
        if (v instanceof Number) { setter.accept(((Number) v).intValue()); return; }
        try { setter.accept(Integer.parseInt(v.toString())); } catch (Exception ignored) {}
    }

    private void applyFk(Map<String, Object> m, String key, java.util.function.Consumer<Integer> setter) {
        if (!m.containsKey(key)) return;
        Object v = m.get(key);
        if (v == null) return;
        try {
            int id = (v instanceof Number) ? ((Number) v).intValue() : Integer.parseInt(v.toString());
            setter.accept(id);
        } catch (Exception ignored) {}
    }

    private Map<String, Object> parseJson(String json) {
        if (json == null || json.isBlank()) return null;
        try {
            return objectMapper.readValue(json, new TypeReference<Map<String, Object>>() {});
        } catch (Exception e) {
            // Fallback: stored as toString() map representation — not parseable as JSON
            return null;
        }
    }

    private void notifySrdForFinalApproval(ApprovalRequest request) {
        String officeName = request.getOfficeName() != null ? request.getOfficeName() : "Postal Office";
        String detail = "Approval request #" + request.getId()
                + " is ready for SRD final approval"
                + " · Requested by: " + (request.getRequestedBy() != null ? request.getRequestedBy() : "unknown");

        String actor = request.getAreaAdminProcessedBy() != null ? request.getAreaAdminProcessedBy() : "system";
        notifService.pushAudit(
                ConnectivityNotification.Type.UPDATED,
                officeName,
                request.getOfficeId(),
                actor,
                null,
                detail,
                null,
                "APPROVAL",
                "ApprovalRequest",
                request.getId()
        );
    }

    private void notifyAreaAdminForReview(ApprovalRequest request) {
        String officeName = request.getOfficeName() != null ? request.getOfficeName() : "Postal Office";
        String detail = "Approval request #" + request.getId()
                + " is waiting for Area Admin review"
                + " · Requested by: " + (request.getRequestedBy() != null ? request.getRequestedBy() : "unknown");

        String actor = request.getRequestedBy() != null ? request.getRequestedBy() : "system";
        notifService.pushAudit(
                ConnectivityNotification.Type.UPDATED,
                officeName,
                request.getOfficeId(),
                actor,
                null,
                detail,
                null,
                "APPROVAL",
                "ApprovalRequest",
                request.getId()
        );
    }

    private void notifyRequesterStatus(ApprovalRequest request, String statusMessage, String actorEmail) {
        String officeName = request.getOfficeName() != null ? request.getOfficeName() : "Postal Office";
        String detail = "Request #" + request.getId()
                + " · " + statusMessage
                + " · Requested by: " + (request.getRequestedBy() != null ? request.getRequestedBy() : "unknown");

        notifService.pushAudit(
                ConnectivityNotification.Type.UPDATED,
                officeName,
                request.getOfficeId(),
                actorEmail != null ? actorEmail : "system",
                null,
                detail,
                request.getRequestedBy(),
                "APPROVAL",
                "ApprovalRequest",
                request.getId()
        );
    }

    private void notifyAreaAdminStatus(ApprovalRequest request, String statusMessage, String actorEmail) {
        if (request.getAreaAdminProcessedBy() == null || request.getAreaAdminProcessedBy().isBlank()) return;

        String officeName = request.getOfficeName() != null ? request.getOfficeName() : "Postal Office";
        String detail = "Request #" + request.getId()
                + " · " + statusMessage
                + " · Area Admin: " + request.getAreaAdminProcessedBy();

        notifService.pushAudit(
                ConnectivityNotification.Type.UPDATED,
                officeName,
                request.getOfficeId(),
                actorEmail != null ? actorEmail : "system",
                null,
                detail,
                request.getAreaAdminProcessedBy(),
                "APPROVAL",
                "ApprovalRequest",
                request.getId()
        );
    }
}
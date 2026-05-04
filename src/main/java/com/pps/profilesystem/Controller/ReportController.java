package com.pps.profilesystem.Controller;

import com.pps.profilesystem.Entity.Area;
import com.pps.profilesystem.Entity.User;
import com.pps.profilesystem.Repository.ArchivedOfficeRepository;
import com.pps.profilesystem.Repository.AreaRepository;
import com.pps.profilesystem.Repository.ConnectivityRepository;
import com.pps.profilesystem.Repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.YearMonth;
import java.util.*;

@Controller
@RequestMapping("/report")
public class ReportController {

    @Autowired
    private ConnectivityRepository connectivityRepository;

    @Autowired
    private AreaRepository areaRepository;

    @Autowired
    private ArchivedOfficeRepository archivedOfficeRepository;

    @Autowired
    private UserRepository userRepository;

    @GetMapping
    public String showReportPage(
            @RequestParam(required = false) Integer year,
            @RequestParam(required = false) String areaFilter,
            @RequestParam(required = false) String quarterFilter,
            @RequestParam(required = false) String statusFilter,
            Model model) {

        // Get the logged-in user
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        String email = auth.getName();
        User currentUser = userRepository.findByEmail(email).orElse(null);

        Integer roleId = currentUser != null ? currentUser.getRole()   : null;
        Integer userAreaId = currentUser != null ? currentUser.getAreaId() : null;

        int currentYear = (year != null) ? year : LocalDate.now().getYear();

        // Parse areaId from filter string
        Integer areaId = null;
        if (areaFilter != null && !areaFilter.trim().isEmpty()) {
            try { areaId = Integer.parseInt(areaFilter.trim()); } catch (NumberFormatException ignored) {}
        }

        // Apply user area restrictions: non-system-admin users can only see their assigned area
        if (roleId != null && roleId != 1 && roleId != 4) {
            // User is not a system admin, restrict to their assigned area
            if (userAreaId != null) {
                // If no area filter is set, default to user's area
                if (areaId == null) {
                    areaId = userAreaId;
                } else if (!areaId.equals(userAreaId)) {
                    // User is trying to access an area they're not assigned to - redirect to their area
                    areaId = userAreaId;
                }
            } else {
                // User has no area assigned, show no data
                areaId = -1; // Invalid area ID that will return no results
            }
        }
        // If roleId is null or roleId == 1 (system admin), allow all areas

        model.addAttribute("currentYear",       currentYear);
        model.addAttribute("currentQuarterInfo", getCurrentQuarterInfo());
        model.addAttribute("areas",              getAllAreas(roleId, userAreaId));
        model.addAttribute("connectivityStats",
            getConnectivityStats(currentYear, quarterFilter, areaId, statusFilter));
        model.addAttribute("quartersData",
            buildQuartersData(currentYear, quarterFilter, areaId, statusFilter));

        model.addAttribute("selectedYearFilter",    year != null ? String.valueOf(year) : null);
        model.addAttribute("selectedAreaFilter",    areaId != null && areaId != -1 ? areaId.toString() : "");
        model.addAttribute("selectedQuarterFilter", quarterFilter);
        model.addAttribute("selectedStatusFilter",  statusFilter);
        model.addAttribute("activePage", "report");

        Map<String, Boolean> userAccess = new HashMap<>();
        userAccess.put("can_access_all_areas", roleId != null && (roleId == 1 || roleId == 4));
        model.addAttribute("userAccess", userAccess);
        model.addAttribute("isSystemAdmin", roleId != null && (roleId == 1 || roleId == 4));
        model.addAttribute("isAreaAdmin", roleId != null && roleId == 2);
        model.addAttribute("isAnyAdmin", roleId != null && (roleId == 1 || roleId == 2));

        return "report";
    }

    // ── Build per-quarter rows ────────────────────────────────────────────────

    private List<Map<String, Object>> buildQuartersData(
            int year, String quarterFilter, Integer areaId, String statusFilter) {

        String[] quarters = { "Q1", "Q2", "Q3", "Q4" };
        int[][] qMonths   = { {1,3}, {4,6}, {7,9}, {10,12} };

        LocalDate     today            = LocalDate.now();
        LocalDateTime now              = LocalDateTime.now();
        boolean       currentYearMatch = (today.getYear() == year);

        // Baseline: active/inactive count at Dec 31 of previous year
        LocalDateTime baseline = LocalDateTime.of(year - 1, 12, 31, 23, 59, 59);
        long runningConnected    = countActiveAt(baseline, areaId);
        long runningDisconnected = countInactiveAt(baseline, areaId);

        List<Map<String, Object>> list = new ArrayList<>();

        for (int i = 0; i < 4; i++) {
            String q = quarters[i];

            int startMonth = qMonths[i][0];
            int endMonth   = qMonths[i][1];

            LocalDateTime qStart = LocalDateTime.of(year, startMonth, 1, 0, 0, 0);
            LocalDateTime qEnd   = LocalDateTime.of(year, endMonth,
                    YearMonth.of(year, endMonth).lengthOfMonth(), 23, 59, 59);

            boolean isCurrent = currentYearMatch && !qStart.isAfter(now) && !qEnd.isBefore(now);
            boolean isFuture  = currentYearMatch && qStart.isAfter(now);

            if (isFuture) {
                if (quarterFilter == null || quarterFilter.isEmpty()
                        || quarterFilter.equalsIgnoreCase(q)) {
                    Map<String, Object> row = new LinkedHashMap<>();
                    row.put("quarter",           q);
                    row.put("year",              year);
                    row.put("isCurrent",         false);
                    row.put("isFuture",          true);
                    row.put("connected",         null);
                    row.put("disconnected",      null);
                    row.put("newlyConnected",    null);
                    row.put("newlyDisconnected", null);
                    list.add(row);
                }
                continue;
            }

            LocalDateTime snapshotEnd = isCurrent ? now : qEnd;

            long newlyConnected    = countNewlyConnected(qStart, snapshotEnd, areaId);
            long newlyDisconnected = countNewlyDisconnected(qStart, snapshotEnd, areaId);

            List<String> newlyConnectedNames    = getNewlyConnectedNames(qStart, snapshotEnd, areaId);
            List<String> newlyDisconnectedNames = getNewlyDisconnectedNames(qStart, snapshotEnd, areaId);
            List<String> connectedNames         = getConnectedNames(snapshotEnd, areaId);
            List<String> disconnectedNames      = getDisconnectedNames(snapshotEnd, areaId);

            // Capture PREVIOUS totals BEFORE updating running totals
            long prevConnected    = runningConnected;
            long prevDisconnected = runningDisconnected;

            // For Q1, set the baseline to actual active offices at the end of Q1
            if ("Q1".equals(q)) {
                runningConnected = getConnectedNames(snapshotEnd, areaId).size();
            }
            
            // Update running totals
            if (!"Q1".equals(q)) {
                runningConnected = runningConnected + newlyConnected - newlyDisconnected;
                if (runningConnected < 0) runningConnected = 0;
            }
            runningDisconnected = runningDisconnected + newlyDisconnected;

            // Skip adding to list if quarter filter doesn't match,
            // but still keep running totals updated above
            if (quarterFilter != null && !quarterFilter.isEmpty()
                    && !quarterFilter.equalsIgnoreCase(q)) {
                continue;
            }

            Map<String, Object> row = new LinkedHashMap<>();
            row.put("quarter",              q);
            row.put("year",                 year);
            row.put("isCurrent",            isCurrent);
            row.put("isFuture",             false);
            row.put("previousConnected",    prevConnected);
            row.put("previousDisconnected", prevDisconnected);
            row.put("newlyConnectedNames",    newlyConnectedNames);
            row.put("newlyDisconnectedNames", newlyDisconnectedNames);
            row.put("connectedNames",         connectedNames);
            row.put("disconnectedNames",      disconnectedNames);

            // For quarterly view, show the actual state at the end of the quarter
            long actualConnected = getConnectedNames(snapshotEnd, areaId).size();
            long actualDisconnected = getDisconnectedNames(snapshotEnd, areaId).size();

            if ("active".equals(statusFilter)) {
                row.put("connected",         actualConnected);
                row.put("disconnected",      0L);
                row.put("newlyConnected",    newlyConnected);
                row.put("newlyDisconnected", 0L);
            } else if ("inactive".equals(statusFilter)) {
                row.put("connected",         0L);
                row.put("disconnected",      actualDisconnected);
                row.put("newlyConnected",    0L);
                row.put("newlyDisconnected", newlyDisconnected);
            } else if ("newly_connected".equals(statusFilter)) {
                row.put("connected",         actualConnected);
                row.put("disconnected",      0L);
                row.put("newlyConnected",    newlyConnected);
                row.put("newlyDisconnected", 0L);
            } else if ("newly_disconnected".equals(statusFilter)) {
                row.put("connected",         0L);
                row.put("disconnected",      actualDisconnected);
                row.put("newlyConnected",    0L);
                row.put("newlyDisconnected", newlyDisconnected);
            } else {
                row.put("connected",         actualConnected);
                row.put("disconnected",      actualDisconnected);
                row.put("newlyConnected",    newlyConnected);
                row.put("newlyDisconnected", newlyDisconnected);
            }

            list.add(row);
        }
        return list;
    }

    // ── Stats cards ───────────────────────────────────────────────────────────

    private Map<String, Long> getConnectivityStats(
            int year, String quarterFilter, Integer areaId, String statusFilter) {

        Map<String, Long> stats = new HashMap<>();
        try {
            LocalDateTime snap   = resolveSnapshotDate(year, quarterFilter);
            long active   = countActiveAt(snap, areaId);
            long inactive = countInactiveAt(snap, areaId);
            // Total = active + inactive at the snapshot date (consistent with the selected year/quarter)
            // Do NOT use countTotal() — that returns ALL offices ever, ignoring the time filter
            long total    = active + inactive;

            if ("active".equals(statusFilter) || "newly_connected".equals(statusFilter)) {
                stats.put("totalConnected",    active);
                stats.put("totalDisconnected", 0L);
                stats.put("totalOffices",      active);
            } else if ("inactive".equals(statusFilter) || "newly_disconnected".equals(statusFilter)) {
                stats.put("totalConnected",    0L);
                stats.put("totalDisconnected", inactive);
                stats.put("totalOffices",      inactive);
            } else {
                stats.put("totalConnected",    active);
                stats.put("totalDisconnected", inactive);
                stats.put("totalOffices",      total);
            }
        } catch (Exception e) {
            stats.put("totalConnected",    0L);
            stats.put("totalDisconnected", 0L);
            stats.put("totalOffices",      0L);
        }
        return stats;
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private LocalDateTime resolveSnapshotDate(int year, String quarterFilter) {
        LocalDateTime now   = LocalDateTime.now();
        int           today = java.time.LocalDate.now().getYear();

        // For the current year + current (or unspecified) quarter, snapshot at NOW
        // so future quarters don't pull zero-data into the stats cards
        String currentQ = getCurrentQuarterLabel(java.time.LocalDate.now().getMonthValue());
        boolean isCurrentPeriod = (year == today)
            && (quarterFilter == null || quarterFilter.isEmpty()
                || quarterFilter.equalsIgnoreCase(currentQ));

        if (isCurrentPeriod) return now;

        if (quarterFilter == null || quarterFilter.isEmpty())
            return LocalDateTime.of(year, 12, 31, 23, 59, 59);
        switch (quarterFilter.toUpperCase()) {
            case "Q1": return LocalDateTime.of(year,  3, 31, 23, 59, 59);
            case "Q2": return LocalDateTime.of(year,  6, 30, 23, 59, 59);
            case "Q3": return LocalDateTime.of(year,  9, 30, 23, 59, 59);
            case "Q4": return LocalDateTime.of(year, 12, 31, 23, 59, 59);
            default:   return LocalDateTime.of(year, 12, 31, 23, 59, 59);
        }
    }

    private long countActiveAt(LocalDateTime snap, Integer areaId) {
        // If areaId is -1, return 0 (no access)
        if (areaId != null && areaId == -1) {
            return 0;
        }
        return connectivityRepository.findActiveAtDate(snap).stream()
            .filter(c -> c.getPostalOffice() != null
                && !archivedOfficeRepository.existsByPostalOfficeId(c.getPostalOffice().getId()))
            .filter(c -> areaId == null
                || (c.getPostalOffice().getArea() != null
                    && areaId.equals(c.getPostalOffice().getArea().getId())))
            .map(c -> c.getPostalOffice().getId())
            .distinct()
            .count();
    }

    // Count offices that were DISCONNECTED at the given snapshot date.
    // Uses distinct postalOffice IDs from inactive records at that date.
    private long countInactiveAt(LocalDateTime snap, Integer areaId) {
        // If areaId is -1, return 0 (no access)
        if (areaId != null && areaId == -1) {
            return 0;
        }
        return connectivityRepository.findInactiveAtDate(snap).stream()
            .filter(c -> c.getPostalOffice() != null
                && !archivedOfficeRepository.existsByPostalOfficeId(c.getPostalOffice().getId()))
            .filter(c -> areaId == null
                || (c.getPostalOffice().getArea() != null
                    && areaId.equals(c.getPostalOffice().getArea().getId())))
            .map(c -> c.getPostalOffice().getId())
            .distinct()
            .count();
    }

    private long countNewlyConnected(LocalDateTime start, LocalDateTime end, Integer areaId) {
        // If areaId is -1, return 0 (no access)
        if (areaId != null && areaId == -1) {
            return 0;
        }
        return connectivityRepository.findByDateConnectedBetween(start, end).stream()
            .filter(c -> c.getPostalOffice() != null
                && !archivedOfficeRepository.existsByPostalOfficeId(c.getPostalOffice().getId()))
            .filter(c -> areaId == null
                || (c.getPostalOffice().getArea() != null
                    && areaId.equals(c.getPostalOffice().getArea().getId())))
            .map(c -> c.getPostalOffice().getId())
            .distinct()
            .count();
    }

    private long countNewlyDisconnected(LocalDateTime start, LocalDateTime end, Integer areaId) {
        // If areaId is -1, return 0 (no access)
        if (areaId != null && areaId == -1) {
            return 0;
        }
        return connectivityRepository.findByDateDisconnectedBetween(start, end).stream()
            .filter(c -> c.getPostalOffice() != null
                && !archivedOfficeRepository.existsByPostalOfficeId(c.getPostalOffice().getId()))
            .filter(c -> areaId == null
                || (c.getPostalOffice().getArea() != null
                    && areaId.equals(c.getPostalOffice().getArea().getId())))
            .map(c -> c.getPostalOffice().getId())
            .distinct()
            .count();
    }

    private String getCurrentQuarterLabel(int month) {
        if (month <= 3) return "Q1";
        if (month <= 6) return "Q2";
        if (month <= 9) return "Q3";
        return "Q4";
    }

    private Map<String, Object> getCurrentQuarterInfo() {
        Map<String, Object> info = new HashMap<>();
        LocalDate now   = LocalDate.now();
        int month       = now.getMonthValue();
        info.put("quarter",   getCurrentQuarterLabel(month));
        info.put("monthName", now.getMonth().toString());
        return info;
    }

    private List<Area> getAllAreas(Integer roleId, Integer userAreaId) {
        try {
            List<Area> all = areaRepository.findAll();
            if (roleId != null && (roleId == 1 || roleId == 4)) return all;
            if (userAreaId == null) return new ArrayList<>();
            return all.stream()
                .filter(a -> userAreaId.equals(a.getId()))
                .toList();
        }
        catch (Exception e) { return new ArrayList<>(); }
    }

    // ── Helper: build "ID::Area | Name" entry from a Connectivity record ────────
    // Format: "{officeId}::{areaName} | {officeName}"
    // The ID prefix lets Thymeleaf/JS extract the profile link without a
    // second round-trip.  Sorting is done on the "Area | Name" suffix so the
    // list is still alphabetical by area then office name.
    private String toNameEntry(com.pps.profilesystem.Entity.Connectivity c) {
        String area = c.getPostalOffice().getArea() != null
            ? c.getPostalOffice().getArea().getAreaName() : "N/A";
        String name = c.getPostalOffice().getName() != null
            ? c.getPostalOffice().getName() : "";
        return c.getPostalOffice().getId() + "::" + area + " | " + name;
    }

    private List<String> getNewlyConnectedNames(LocalDateTime start, LocalDateTime end, Integer areaId) {
        // If areaId is -1, return empty list (no access)
        if (areaId != null && areaId == -1) {
            return new ArrayList<>();
        }
        return connectivityRepository.findByDateConnectedBetween(start, end).stream()
            .filter(c -> c.getPostalOffice() != null
                && !archivedOfficeRepository.existsByPostalOfficeId(c.getPostalOffice().getId()))
            .filter(c -> areaId == null
                || (c.getPostalOffice().getArea() != null
                    && areaId.equals(c.getPostalOffice().getArea().getId())))
            .collect(java.util.stream.Collectors.toMap(
                c -> c.getPostalOffice().getId(),
                this::toNameEntry,
                (a, b) -> a
            ))
            .values().stream()
            .filter(entry -> !entry.isEmpty())
            .sorted(java.util.Comparator.comparing(e -> e.contains("::") ? e.substring(e.indexOf("::") + 2) : e))
            .collect(java.util.stream.Collectors.toList());
    }

    private List<String> getNewlyDisconnectedNames(LocalDateTime start, LocalDateTime end, Integer areaId) {
        // If areaId is -1, return empty list (no access)
        if (areaId != null && areaId == -1) {
            return new ArrayList<>();
        }
        return connectivityRepository.findByDateDisconnectedBetween(start, end).stream()
            .filter(c -> c.getPostalOffice() != null
                && !archivedOfficeRepository.existsByPostalOfficeId(c.getPostalOffice().getId()))
            .filter(c -> areaId == null
                || (c.getPostalOffice().getArea() != null
                    && areaId.equals(c.getPostalOffice().getArea().getId())))
            .collect(java.util.stream.Collectors.toMap(
                c -> c.getPostalOffice().getId(),
                this::toNameEntry,
                (a, b) -> a
            ))
            .values().stream()
            .filter(entry -> !entry.isEmpty())
            .sorted(java.util.Comparator.comparing(e -> e.contains("::") ? e.substring(e.indexOf("::") + 2) : e))
            .collect(java.util.stream.Collectors.toList());
    }

    // ── All active offices at a snapshot date ─────────────────────────────────
    private List<String> getConnectedNames(LocalDateTime snap, Integer areaId) {
        // If areaId is -1, return empty list (no access)
        if (areaId != null && areaId == -1) {
            return new ArrayList<>();
        }
        return connectivityRepository.findActiveAtDate(snap).stream()
            .filter(c -> c.getPostalOffice() != null
                && !archivedOfficeRepository.existsByPostalOfficeId(c.getPostalOffice().getId()))
            .filter(c -> areaId == null
                || (c.getPostalOffice().getArea() != null
                    && areaId.equals(c.getPostalOffice().getArea().getId())))
            .collect(java.util.stream.Collectors.toMap(
                c -> c.getPostalOffice().getId(),
                this::toNameEntry,
                (a, b) -> a
            ))
            .values().stream()
            .filter(entry -> !entry.isEmpty())
            .sorted(java.util.Comparator.comparing(e -> e.contains("::") ? e.substring(e.indexOf("::") + 2) : e))
            .collect(java.util.stream.Collectors.toList());
    }

    // ── All inactive offices at a snapshot date ───────────────────────────────
    private List<String> getDisconnectedNames(LocalDateTime snap, Integer areaId) {
        // If areaId is -1, return empty list (no access)
        if (areaId != null && areaId == -1) {
            return new ArrayList<>();
        }
        return connectivityRepository.findInactiveAtDate(snap).stream()
            .filter(c -> c.getPostalOffice() != null
                && !archivedOfficeRepository.existsByPostalOfficeId(c.getPostalOffice().getId()))
            .filter(c -> areaId == null
                || (c.getPostalOffice().getArea() != null
                    && areaId.equals(c.getPostalOffice().getArea().getId())))
            .collect(java.util.stream.Collectors.toMap(
                c -> c.getPostalOffice().getId(),
                this::toNameEntry,
                (a, b) -> a
            ))
            .values().stream()
            .filter(entry -> !entry.isEmpty())
            .sorted(java.util.Comparator.comparing(e -> e.contains("::") ? e.substring(e.indexOf("::") + 2) : e))
            .collect(java.util.stream.Collectors.toList());
    }
}
package com.pps.profilesystem.Scheduler;

import com.pps.profilesystem.Service.ConnectivityHistoryService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.LocalDate;
import java.util.Map;

/**
 * Scheduled tasks for automatic quarterly snapshot creation
 * 
 * IMPORTANT: To enable this scheduler, add @EnableScheduling to your main application class:
 * 
 * @SpringBootApplication
 * @EnableScheduling  // <-- Add this
 * public class ProfileSystemApplication {
 *     public static void main(String[] args) {
 *         SpringApplication.run(ProfileSystemApplication.class, args);
 *     }
 * }
 */
@Component
public class QuarterlySnapshotScheduler {

    private static final Logger logger = LoggerFactory.getLogger(QuarterlySnapshotScheduler.class);

    @Autowired
    private ConnectivityHistoryService connectivityHistoryService;

    /**
     * Automatic snapshot creation at the start of each quarter
     * Runs on: January 1, April 1, July 1, October 1 at 00:01 AM
     * 
     * Cron expression: "0 1 0 1 1,4,7,10 *"
     * Format: second minute hour day month day-of-week
     */
    @Scheduled(cron = "0 1 0 1 1,4,7,10 *")
    public void createQuarterlySnapshotAutomatic() {
        try {
            logger.info("========================================");
            logger.info("Starting automatic quarterly snapshot creation...");
            
            LocalDate now = LocalDate.now();
            logger.info("Current date: {}", now);

            Map<String, Object> result = connectivityHistoryService.createCurrentQuarterSnapshot();

            if ((Boolean) result.get("success")) {
                logger.info("✅ Snapshot created successfully!");
                logger.info("Quarter: Q{} {}", result.get("quarter"), result.get("year"));
                logger.info("Total offices: {}", result.get("totalOffices"));
                logger.info("Connected: {}", result.get("connected"));
                logger.info("Disconnected: {}", result.get("disconnected"));
            } else {
                logger.warn("⚠️ Snapshot already exists: {}", result.get("message"));
            }
            
            logger.info("========================================");

        } catch (Exception e) {
            logger.error("❌ Error creating automatic snapshot: {}", e.getMessage(), e);
        }
    }

    /**
     * OPTIONAL: Daily check to remind if current quarter has no snapshot
     * Runs every day at 8:00 AM
     */
    @Scheduled(cron = "0 0 8 * * *")
    public void checkCurrentQuarterSnapshot() {
        try {
            Map<String, Object> quarterInfo = connectivityHistoryService.getCurrentQuarterInfo();
            
            Boolean hasSnapshot = (Boolean) quarterInfo.get("hasSnapshot");
            Integer quarter = (Integer) quarterInfo.get("quarter");
            Integer year = (Integer) quarterInfo.get("year");
            
            if (!hasSnapshot) {
                logger.warn("⚠️ REMINDER: No snapshot exists for Q{} {}. Consider creating one.", quarter, year);
            }

        } catch (Exception e) {
            logger.error("Error checking current quarter snapshot: {}", e.getMessage());
        }
    }

    /**
     * OPTIONAL: Weekly summary of connectivity changes
     * Runs every Monday at 9:00 AM
     */
    @Scheduled(cron = "0 0 9 * * MON")
    public void weeklyConnectivitySummary() {
        try {
            LocalDate now = LocalDate.now();
            int year = now.getYear();
            int quarter = (now.getMonthValue() - 1) / 3 + 1;

            Map<String, Object> stats = connectivityHistoryService.getQuarterlyStatistics(year, quarter);

            if ((Boolean) stats.getOrDefault("hasData", false)) {
                logger.info("========================================");
                logger.info("📊 WEEKLY CONNECTIVITY SUMMARY - Q{} {}", quarter, year);
                logger.info("Total Offices: {}", stats.get("totalOffices"));
                logger.info("Connected: {}", stats.get("connected"));
                logger.info("Disconnected: {}", stats.get("disconnected"));
                
                if ((Boolean) stats.getOrDefault("hasPreviousData", false)) {
                    logger.info("Changes from previous quarter:");
                    logger.info("  ↑ Newly Connected: {}", stats.get("newlyConnected"));
                    logger.info("  ↓ Newly Disconnected: {}", stats.get("newlyDisconnected"));
                }
                logger.info("========================================");
            }

        } catch (Exception e) {
            logger.error("Error generating weekly summary: {}", e.getMessage());
        }
    }
}

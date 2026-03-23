-- Create archived_offices table for the new archive system
-- This table stores archive information separately from postal_offices

CREATE TABLE IF NOT EXISTS archived_offices (
    id INT AUTO_INCREMENT PRIMARY KEY,
    postal_office_id INT NOT NULL,
    archived_at DATETIME NOT NULL,
    archive_reason TEXT,
    FOREIGN KEY (postal_office_id) REFERENCES postal_offices(id) ON DELETE CASCADE,
    INDEX idx_archived_office_id (postal_office_id),
    INDEX idx_archived_at (archived_at)
);

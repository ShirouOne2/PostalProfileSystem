-- Add System Admin Account
-- Run this script in your MySQL database to create a System Admin account

-- Insert System Admin user
INSERT INTO users (username, password, role_id, is_active, email, area_id) 
VALUES ('admin', '$2a$10$YourHashedPasswordHere', 1, 1, 'admin@pps.gov.ph', NULL);

-- Note: Replace '$2a$10$YourHashedPasswordHere' with a properly hashed password
-- For testing, you can use this BCrypt hash for password "admin123":
-- $2a$10$N.zmdr9k7uOCQb376NoUnuTJ8iAt6Z5EHsM8lE9lBOsl7iKTVEFD.

-- Updated with actual password hash for "admin123"
UPDATE users SET password = '$2a$10$N.zmdr9k7uOCQb376NoUnuTJ8iAt6Z5EHsM8lE9lBOsl7iKTVEFD.' 
WHERE username = 'admin';

-- Verify the user was created
SELECT * FROM users WHERE username = 'admin';

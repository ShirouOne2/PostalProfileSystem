-- Sample postal offices data for testing the map functionality
-- This script inserts sample post offices with coordinates and area assignments

-- First, ensure we have areas (assuming areas table exists with at least 9 areas)
INSERT IGNORE INTO areas (id, area_name) VALUES 
(1, 'Area 1'),
(2, 'Area 2'), 
(3, 'Area 3'),
(4, 'Area 4'),
(5, 'Area 5'),
(6, 'Area 6'),
(7, 'Area 7'),
(8, 'Area 8'),
(9, 'Area 9');

-- Sample postal offices with coordinates around the Philippines
INSERT IGNORE INTO postal_offices (
    id, name, address, zip_code, postmaster, no_of_employees, 
    latitude, longitude, connection_status, office_status, area_id,
    date_created, date_connected
) VALUES 
-- Manila Area Offices
(1001, 'Manila Central Post Office', 'Lawton, Manila', 1000, 'Juan Dela Cruz', 25, 14.5833, 120.9667, 1, 'OPEN', 1, NOW(), NOW()),
(1002, 'Makati Post Office', 'Makati City Hall', 1200, 'Maria Santos', 18, 14.5547, 121.0244, 1, 'OPEN', 1, NOW(), NOW()),
(1003, 'Pasay Post Office', 'Pasay City', 1300, 'Jose Reyes', 15, 14.5378, 121.0014, 0, 'OPEN', 1, NOW(), NOW()),

-- Luzon Area Offices  
(1004, 'Baguio Post Office', 'Baguio City', 2600, 'Carlos Garcia', 20, 16.4023, 120.5960, 1, 'OPEN', 2, NOW(), NOW()),
(1005, 'Pampanga Post Office', 'San Fernando, Pampanga', 2000, 'Rosa Martinez', 12, 15.0330, 120.6838, 1, 'OPEN', 2, NOW(), NOW()),
(1006, 'Batangas Post Office', 'Batangas City', 4200, 'Antonio Lopez', 10, 13.7565, 121.0583, 0, 'OPEN', 2, NOW(), NOW()),

-- Visayas Area Offices
(1007, 'Cebu Post Office', 'Cebu City', 6000, 'Francisco Bautista', 22, 10.3157, 123.8854, 1, 'OPEN', 3, NOW(), NOW()),
(1008, 'Iloilo Post Office', 'Iloilo City', 5000, 'Carmela Rodriguez', 16, 10.7202, 122.5621, 1, 'OPEN', 3, NOW(), NOW()),
(1009, 'Bacolod Post Office', 'Bacolod City', 6100, 'Roberto Tan', 14, 10.6489, 122.9499, 0, 'OPEN', 3, NOW(), NOW()),

-- Mindanao Area Offices
(1010, 'Davao Post Office', 'Davao City', 8000, 'Edgardo Cruz', 24, 7.0731, 125.6128, 1, 'OPEN', 4, NOW(), NOW()),
(1011, 'Cagayan de Oro Post Office', 'Cagayan de Oro', 9000, 'Linda Villanueva', 18, 8.4542, 124.6319, 1, 'OPEN', 4, NOW(), NOW()),
(1012, 'General Santos Post Office', 'General Santos City', 9500, 'Miguel Flores', 12, 6.1164, 125.1756, 0, 'OPEN', 4, NOW(), NOW()),

-- Additional offices for other areas
(1013, 'Laoag Post Office', 'Laoag City', 2900, 'Patricia Lim', 8, 18.1963, 120.5905, 1, 'OPEN', 5, NOW(), NOW()),
(1014, 'Legazpi Post Office', 'Legazpi City', 4500, 'Ramon Mendoza', 11, 13.1391, 123.7438, 1, 'OPEN', 5, NOW(), NOW()),
(1015, 'Tacloban Post Office', 'Tacloban City', 6500, 'Elena Santos', 13, 11.2470, 124.9889, 0, 'OPEN', 6, NOW(), NOW()),
(1016, 'Surigao Post Office', 'Surigao City', 8400, 'Dennis Lee', 9, 9.7843, 125.9373, 1, 'OPEN', 6, NOW(), NOW()),
(1017, 'Zamboanga Post Office', 'Zamboanga City', 7000, 'Grace Garcia', 15, 6.9214, 122.0790, 1, 'OPEN', 7, NOW(), NOW()),
(1018, 'Butuan Post Office', 'Butuan City', 8600, 'Henry Wong', 10, 8.9491, 125.5436, 0, 'OPEN', 7, NOW(), NOW()),
(1019, 'Tuguegarao Post Office', 'Tuguegarao City', 3500, 'Nina Castro', 12, 17.6131, 121.7260, 1, 'OPEN', 8, NOW(), NOW()),
(1020, 'Puerto Princesa Post Office', 'Puerto Princesa', 5300, 'Oliver Torres', 8, 9.7390, 118.7352, 1, 'OPEN', 8, NOW(), NOW()),
(1021, 'Tagbilaran Post Office', 'Tagbilaran City', 6300, 'Sofia Diaz', 7, 9.6434, 123.8544, 0, 'OPEN', 9, NOW(), NOW());

-- Insert connectivity records for the offices
INSERT IGNORE INTO connectivity (postal_office_id, date_connected, connection_status, speed) VALUES
(1001, NOW(), 1, 50),
(1002, NOW(), 1, 75),
(1003, NOW(), 0, 0),
(1004, NOW(), 1, 30),
(1005, NOW(), 1, 45),
(1006, NOW(), 0, 0),
(1007, NOW(), 1, 60),
(1008, NOW(), 1, 40),
(1009, NOW(), 0, 0),
(1010, NOW(), 1, 80),
(1011, NOW(), 1, 55),
(1012, NOW(), 0, 0),
(1013, NOW(), 1, 25),
(1014, NOW(), 1, 35),
(1015, NOW(), 0, 0),
(1016, NOW(), 1, 28),
(1017, NOW(), 1, 42),
(1018, NOW(), 0, 0),
(1019, NOW(), 1, 32),
(1020, NOW(), 1, 38),
(1021, NOW(), 0, 0);

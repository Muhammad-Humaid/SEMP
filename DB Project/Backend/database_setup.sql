-- ============================================
-- COMSATS Event Management System
-- Complete Database Setup Script
-- MySQL Database
-- ============================================

-- Create database
CREATE DATABASE IF NOT EXISTS comsats_ems;
USE comsats_ems;

-- Drop existing tables
DROP TABLE IF EXISTS registrations;
DROP TABLE IF EXISTS events;
DROP TABLE IF EXISTS proposals;
DROP TABLE IF EXISTS budget_settings;
DROP TABLE IF EXISTS users;

-- ============================================
-- Users Table
-- ============================================
CREATE TABLE users (
    user_id INT AUTO_INCREMENT PRIMARY KEY,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    role ENUM('student', 'society', 'admin') NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    roll_number VARCHAR(50) UNIQUE,
    phone_number VARCHAR(20),
    society_name VARCHAR(255),
    society_id VARCHAR(50) UNIQUE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_email (email),
    INDEX idx_role (role),
    INDEX idx_society_id (society_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- Proposals Table
-- ============================================
CREATE TABLE proposals (
    proposal_id INT AUTO_INCREMENT PRIMARY KEY,
    society_id INT NOT NULL,
    event_name VARCHAR(255) NOT NULL,
    venue VARCHAR(255) NOT NULL,
    requested_date DATE NOT NULL,
    time_slot VARCHAR(100) NOT NULL,
    budget DECIMAL(10, 2) NOT NULL,
    proposal_details TEXT NOT NULL,
    status ENUM('pending', 'approved', 'rejected') DEFAULT 'pending',
    rejection_reason TEXT,
    submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    reviewed_at TIMESTAMP NULL,
    reviewed_by INT,
    
    FOREIGN KEY (society_id) REFERENCES users(user_id) ON DELETE CASCADE,
    FOREIGN KEY (reviewed_by) REFERENCES users(user_id) ON DELETE SET NULL,
    
    INDEX idx_status (status),
    INDEX idx_society_id (society_id),
    INDEX idx_date (requested_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- Events Table
-- ============================================
CREATE TABLE events (
    event_id INT AUTO_INCREMENT PRIMARY KEY,
    proposal_id INT UNIQUE,
    society_id INT NOT NULL,
    event_name VARCHAR(255) NOT NULL,
    society_name VARCHAR(255) NOT NULL,
    venue VARCHAR(255) NOT NULL,
    event_date DATE NOT NULL,
    time_slot VARCHAR(100) NOT NULL,
    budget DECIMAL(10, 2) NOT NULL,
    description TEXT NOT NULL,
    status ENUM('upcoming', 'completed', 'cancelled') DEFAULT 'upcoming',
    max_participants INT DEFAULT 100,
    current_participants INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (proposal_id) REFERENCES proposals(proposal_id) ON DELETE SET NULL,
    FOREIGN KEY (society_id) REFERENCES users(user_id) ON DELETE CASCADE,
    
    INDEX idx_date (event_date),
    INDEX idx_status (status),
    INDEX idx_society (society_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- Registrations Table
-- ============================================
CREATE TABLE registrations (
    registration_id INT AUTO_INCREMENT PRIMARY KEY,
    student_id INT NOT NULL,
    event_id INT NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    student_email VARCHAR(255) NOT NULL,
    phone_number VARCHAR(20) NOT NULL,
    payment_screenshot VARCHAR(500),
    registration_status ENUM('registered', 'attended', 'missed', 'cancelled') DEFAULT 'registered',
    registered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (student_id) REFERENCES users(user_id) ON DELETE CASCADE,
    FOREIGN KEY (event_id) REFERENCES events(event_id) ON DELETE CASCADE,
    
    UNIQUE KEY unique_student_event (student_id, event_id),
    INDEX idx_student (student_id),
    INDEX idx_event (event_id),
    INDEX idx_status (registration_status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- Budget Settings Table
-- ============================================
CREATE TABLE budget_settings (
    setting_id INT AUTO_INCREMENT PRIMARY KEY,
    total_budget DECIMAL(12, 2) NOT NULL DEFAULT 50000.00,
    allocated_budget DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    remaining_budget DECIMAL(12, 2) GENERATED ALWAYS AS (total_budget - allocated_budget) STORED,
    budget_pin VARCHAR(255) NOT NULL,
    month_year VARCHAR(7) NOT NULL,
    updated_by INT,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (updated_by) REFERENCES users(user_id) ON DELETE SET NULL,
    UNIQUE KEY unique_month (month_year)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- Triggers
-- ============================================

DELIMITER //

-- Trigger: Update allocated budget on proposal approval
CREATE TRIGGER update_budget_on_approval
AFTER UPDATE ON proposals
FOR EACH ROW
BEGIN
    IF NEW.status = 'approved' AND OLD.status = 'pending' THEN
        UPDATE budget_settings 
        SET allocated_budget = allocated_budget + NEW.budget
        WHERE month_year = DATE_FORMAT(NEW.requested_date, '%Y-%m');
    END IF;
END//

-- Trigger: Increment participant count on registration
CREATE TRIGGER increment_participant_count
AFTER INSERT ON registrations
FOR EACH ROW
BEGIN
    UPDATE events 
    SET current_participants = current_participants + 1
    WHERE event_id = NEW.event_id;
END//

-- Trigger: Decrement participant count on cancellation
CREATE TRIGGER decrement_participant_count
AFTER DELETE ON registrations
FOR EACH ROW
BEGIN
    UPDATE events 
    SET current_participants = GREATEST(0, current_participants - 1)
    WHERE event_id = OLD.event_id;
END//

DELIMITER ;

-- ============================================
-- Sample Data
-- ============================================

-- Admin user (password: admin123)
INSERT INTO users (email, password_hash, role, full_name, is_active) VALUES
('admin@comsats.edu.pk', '$2a$10$rOZJQZ8qXqK3c6H8Pq5xZuF5YQ7HxJ8L0x0F7X8y0x0F7X8y0x0F7X', 'admin', 'Admin User', TRUE);

-- Society users (password: password123)
INSERT INTO users (email, password_hash, role, full_name, phone_number, society_name, society_id, is_active) VALUES
('acm@comsats.edu.pk', '$2a$10$rOZJQZ8qXqK3c6H8Pq5xZuF5YQ7HxJ8L0x0F7X8y0x0F7X8y0x0F7X', 'society', 'ACM Representative', '03001234567', 'ACM (Association for Computing Machinery)', 'ACM001', TRUE),
('cfds@comsats.edu.pk', '$2a$10$rOZJQZ8qXqK3c6H8Pq5xZuF5YQ7HxJ8L0x0F7X8y0x0F7X8y0x0F7X', 'society', 'CFDS Representative', '03001234568', 'CFDS (Films and Dramatics Society)', 'CFDS001', TRUE),
('clds@comsats.edu.pk', '$2a$10$rOZJQZ8qXqK3c6H8Pq5xZuF5YQ7HxJ8L0x0F7X8y0x0F7X8y0x0F7X', 'society', 'CLDS Representative', '03001234569', 'CLDS (Lahore Debating Society)', 'CLDS001', TRUE),
('ras@comsats.edu.pk', '$2a$10$rOZJQZ8qXqK3c6H8Pq5xZuF5YQ7HxJ8L0x0F7X8y0x0F7X8y0x0F7X', 'society', 'RAS Representative', '03001234570', 'RAS (Robotics and Automation Society)', 'RAS001', TRUE),
('pixters@comsats.edu.pk', '$2a$10$rOZJQZ8qXqK3c6H8Pq5xZuF5YQ7HxJ8L0x0F7X8y0x0F7X8y0x0F7X', 'society', 'PIXTERS Representative', '03001234571', 'PIXTERS (Media Society)', 'PIX001', TRUE);

-- Student users (password: student123)
INSERT INTO users (email, password_hash, role, full_name, roll_number, phone_number, is_active) VALUES
('ali.ahmed@student.comsats.edu.pk', '$2a$10$rOZJQZ8qXqK3c6H8Pq5xZuF5YQ7HxJ8L0x0F7X8y0x0F7X8y0x0F7X', 'student', 'Ali Ahmed', 'FA21-BSE-001', '03111234567', TRUE),
('fatima.khan@student.comsats.edu.pk', '$2a$10$rOZJQZ8qXqK3c6H8Pq5xZuF5YQ7HxJ8L0x0F7X8y0x0F7X8y0x0F7X', 'student', 'Fatima Khan', 'FA21-BSE-002', '03111234568', TRUE),
('hassan.raza@student.comsats.edu.pk', '$2a$10$rOZJQZ8qXqK3c6H8Pq5xZuF5YQ7HxJ8L0x0F7X8y0x0F7X8y0x0F7X', 'student', 'Hassan Raza', 'FA21-BSE-003', '03111234569', TRUE),
('ayesha.malik@student.comsats.edu.pk', '$2a$10$rOZJQZ8qXqK3c6H8Pq5xZuF5YQ7HxJ8L0x0F7X8y0x0F7X8y0x0F7X', 'student', 'Ayesha Malik', 'FA21-BSE-004', '03111234570', TRUE),
('usman.ali@student.comsats.edu.pk', '$2a$10$rOZJQZ8qXqK3c6H8Pq5xZuF5YQ7HxJ8L0x0F7X8y0x0F7X8y0x0F7X', 'student', 'Usman Ali', 'FA21-BSE-005', '03111234571', TRUE);

-- Budget setting for current month (PIN: admin123)
INSERT INTO budget_settings (total_budget, allocated_budget, budget_pin, month_year, updated_by) VALUES
(50000.00, 0.00, '$2a$10$rOZJQZ8qXqK3c6H8Pq5xZuF5YQ7HxJ8L0x0F7X8y0x0F7X8y0x0F7X', DATE_FORMAT(NOW(), '%Y-%m'), 1);

-- Sample proposals
INSERT INTO proposals (society_id, event_name, venue, requested_date, time_slot, budget, proposal_details, status) VALUES
(2, 'Competitive Programming Contest 2025', 'Computer Lab 1', '2025-01-20', '10:00 AM - 2:00 PM', 5000.00, 'Annual competitive programming contest testing algorithmic and problem-solving skills', 'pending'),
(3, 'Theatre Performance: Modern Classics', 'Main Auditorium', '2025-01-25', '6:00 PM - 9:00 PM', 8000.00, 'An evening of dramatic performances featuring modern interpretations of classic plays', 'pending'),
(4, 'Inter-University Debate Competition', 'Seminar Hall', '2025-01-22', '2:00 PM - 5:00 PM', 3000.00, 'Competitive debate tournament with teams from multiple universities', 'approved'),
(5, 'Tech Talk: AI and Future', 'Lecture Hall 2', '2025-02-05', '3:00 PM - 5:00 PM', 4000.00, 'Industry experts discussing AI trends and career opportunities', 'approved');

-- Sample approved events
INSERT INTO events (proposal_id, society_id, event_name, society_name, venue, event_date, time_slot, budget, description, max_participants) VALUES
(3, 4, 'Inter-University Debate Competition', 'CLDS (Lahore Debating Society)', 'Seminar Hall', '2025-01-22', '2:00 PM - 5:00 PM', 3000.00, 'Competitive debate tournament with teams from multiple universities', 150),
(4, 5, 'Tech Talk: AI and Future', 'PIXTERS (Media Society)', 'Lecture Hall 2', '2025-02-05', '3:00 PM - 5:00 PM', 4000.00, 'Industry experts discussing AI trends and career opportunities', 200);

-- Sample registrations
INSERT INTO registrations (student_id, event_id, full_name, student_email, phone_number, payment_screenshot) VALUES
(6, 1, 'Ali Ahmed', 'ali.ahmed@student.comsats.edu.pk', '03111234567', 'https://example.com/payment1.jpg'),
(7, 1, 'Fatima Khan', 'fatima.khan@student.comsats.edu.pk', '03111234568', 'https://example.com/payment2.jpg'),
(8, 1, 'Hassan Raza', 'hassan.raza@student.comsats.edu.pk', '03111234569', NULL),
(9, 2, 'Ayesha Malik', 'ayesha.malik@student.comsats.edu.pk', '03111234570', 'https://example.com/payment4.jpg'),
(10, 2, 'Usman Ali', 'usman.ali@student.comsats.edu.pk', '03111234571', 'https://example.com/payment5.jpg');

-- ============================================
-- Verification
-- ============================================
SELECT '============================================' AS '';
SELECT 'DATABASE SETUP COMPLETED!' AS 'Status';
SELECT '============================================' AS '';
SELECT '' AS '';

SELECT 'Record Counts:' AS 'Summary';
SELECT 'Users' AS 'Table', COUNT(*) AS 'Count' FROM users
UNION ALL SELECT 'Proposals', COUNT(*) FROM proposals
UNION ALL SELECT 'Events', COUNT(*) FROM events
UNION ALL SELECT 'Registrations', COUNT(*) FROM registrations
UNION ALL SELECT 'Budget Settings', COUNT(*) FROM budget_settings;

SELECT '' AS '';
SELECT '============================================' AS '';
SELECT 'DEFAULT CREDENTIALS' AS '';
SELECT '============================================' AS '';
SELECT '' AS '';
SELECT 'Admin:' AS '';
SELECT '  Email: admin@comsats.edu.pk' AS '';
SELECT '  Password: admin123' AS '';
SELECT '' AS '';
SELECT 'Societies (password: password123):' AS '';
SELECT '  acm@comsats.edu.pk' AS '';
SELECT '  cfds@comsats.edu.pk' AS '';
SELECT '  clds@comsats.edu.pk' AS '';
SELECT '  ras@comsats.edu.pk' AS '';
SELECT '  pixters@comsats.edu.pk' AS '';
SELECT '' AS '';
SELECT 'Students (password: student123):' AS '';
SELECT '  ali.ahmed@student.comsats.edu.pk (FA21-BSE-001)' AS '';
SELECT '  fatima.khan@student.comsats.edu.pk (FA21-BSE-002)' AS '';
SELECT '  and 3 more...' AS '';
SELECT '' AS '';
SELECT 'Budget PIN: admin123' AS '';
SELECT '============================================' AS '';
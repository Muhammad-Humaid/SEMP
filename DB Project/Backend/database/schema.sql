-- ============================================
-- SEMP Event Management System Database Schema
-- Database: semp_db
-- ============================================

-- Drop existing tables if they exist
DROP TABLE IF EXISTS registrations;
DROP TABLE IF EXISTS events;
DROP TABLE IF EXISTS proposals;
DROP TABLE IF EXISTS budget_settings;
DROP TABLE IF EXISTS users;

-- ============================================
-- Users Table (Students, Society Heads, Admins)
-- ============================================
CREATE TABLE users (
    user_id INT AUTO_INCREMENT PRIMARY KEY,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    role ENUM('student', 'society', 'admin') NOT NULL,
    full_name VARCHAR(255),
    roll_number VARCHAR(50) UNIQUE,
    phone_number VARCHAR(20),
    society_name VARCHAR(255),
    society_id VARCHAR(50) UNIQUE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_email (email),
    INDEX idx_role (role),
    INDEX idx_roll_number (roll_number),
    INDEX idx_society_id (society_id)
);

-- ============================================
-- Proposals Table (Event Proposals by Societies)
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
    INDEX idx_requested_date (requested_date)
);

-- ============================================
-- Events Table (Approved Events)
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
    
    INDEX idx_event_date (event_date),
    INDEX idx_status (status),
    INDEX idx_society_id (society_id)
);

-- ============================================
-- Registrations Table (Student Event Registrations)
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
    INDEX idx_student_id (student_id),
    INDEX idx_event_id (event_id),
    INDEX idx_status (registration_status)
);

-- ============================================
-- Budget Settings Table (Admin Budget Management)
-- ============================================
CREATE TABLE budget_settings (
    setting_id INT AUTO_INCREMENT PRIMARY KEY,
    total_budget DECIMAL(12, 2) NOT NULL DEFAULT 50000.00,
    allocated_budget DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    remaining_budget DECIMAL(12, 2) GENERATED ALWAYS AS (total_budget - allocated_budget) STORED,
    budget_pin VARCHAR(255) NOT NULL,
    month_year VARCHAR(7) NOT NULL, -- Format: 2024-12
    updated_by INT,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (updated_by) REFERENCES users(user_id) ON DELETE SET NULL,
    UNIQUE KEY unique_month_year (month_year)
);

-- ============================================
-- Create Views for Common Queries
-- ============================================

-- View: Pending Proposals with Society Details
CREATE VIEW v_pending_proposals AS
SELECT 
    p.proposal_id,
    p.event_name,
    p.venue,
    p.requested_date,
    p.time_slot,
    p.budget,
    p.proposal_details,
    p.submitted_at,
    u.society_name,
    u.email AS society_email,
    u.phone_number AS society_phone
FROM proposals p
INNER JOIN users u ON p.society_id = u.user_id
WHERE p.status = 'pending'
ORDER BY p.submitted_at DESC;

-- View: Upcoming Events with Registration Count
CREATE VIEW v_upcoming_events AS
SELECT 
    e.event_id,
    e.event_name,
    e.society_name,
    e.venue,
    e.event_date,
    e.time_slot,
    e.description,
    e.budget,
    e.max_participants,
    COUNT(r.registration_id) AS total_registrations
FROM events e
LEFT JOIN registrations r ON e.event_id = r.event_id
WHERE e.status = 'upcoming' AND e.event_date >= CURDATE()
GROUP BY e.event_id
ORDER BY e.event_date ASC;

-- View: Student Registrations with Event Details
CREATE VIEW v_student_registrations AS
SELECT 
    r.registration_id,
    r.student_id,
    r.full_name,
    r.student_email,
    r.phone_number,
    r.registration_status,
    r.registered_at,
    e.event_id,
    e.event_name,
    e.society_name,
    e.venue,
    e.event_date,
    e.time_slot,
    e.description
FROM registrations r
INNER JOIN events e ON r.event_id = e.event_id;

-- ============================================
-- Triggers
-- ============================================

-- Trigger: Update allocated budget when proposal is approved
DELIMITER //
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
DELIMITER ;

-- Trigger: Increment event participant count on registration
DELIMITER //
CREATE TRIGGER increment_participant_count
AFTER INSERT ON registrations
FOR EACH ROW
BEGIN
    UPDATE events 
    SET current_participants = current_participants + 1
    WHERE event_id = NEW.event_id;
END//
DELIMITER ;

-- Trigger: Decrement participant count on registration cancellation
DELIMITER //
CREATE TRIGGER decrement_participant_count
AFTER DELETE ON registrations
FOR EACH ROW
BEGIN
    UPDATE events 
    SET current_participants = current_participants - 1
    WHERE event_id = OLD.event_id;
END//
DELIMITER ;
-- ============================================
-- Seed Data for Testing
-- ============================================

-- Insert Admin User (password: admin123)
INSERT INTO users (email, password_hash, role, full_name) VALUES
('admin@cuilahore.edu.pk', '$2a$10$rKzYwQxH8XZJqKJ8qKJ8qO8qKJ8qKJ8qKJ8qKJ8qKJ8qKJ8qKJ8qK', 'admin', 'System Administrator');

-- Insert Society Users (password: society123)
INSERT INTO users (email, password_hash, role, society_name, society_id, phone_number) VALUES
('litclub@cuilahore.edu.pk', '$2a$10$rKzYwQxH8XZJqKJ8qKJ8qO8qKJ8qKJ8qKJ8qKJ8qKJ8qKJ8qKJ8qK', 'society', 'Literary Club', 'LIT-001', '03001234567'),
('csclub@cuilahore.edu.pk', '$2a$10$rKzYwQxH8XZJqKJ8qKJ8qO8qKJ8qKJ8qKJ8qKJ8qKJ8qKJ8qKJ8qK', 'society', 'CS Club', 'CS-001', '03001234568'),
('entrepreneur@cuilahore.edu.pk', '$2a$10$rKzYwQxH8XZJqKJ8qKJ8qO8qKJ8qKJ8qKJ8qKJ8qKJ8qKJ8qKJ8qK', 'society', 'Entrepreneur Society', 'ENT-001', '03001234569');

-- Insert Student Users (password: student123)
INSERT INTO users (email, password_hash, role, full_name, roll_number, phone_number) VALUES
('ciit-lhr-12345@cuilahore.edu.pk', '$2a$10$rKzYwQxH8XZJqKJ8qKJ8qO8qKJ8qKJ8qKJ8qKJ8qKJ8qKJ8qKJ8qK', 'student', 'John Doe', 'CIIT-LHR-12345', '03111234567'),
('ciit-lhr-12346@cuilahore.edu.pk', '$2a$10$rKzYwQxH8XZJqKJ8qKJ8qO8qKJ8qKJ8qKJ8qKJ8qKJ8qKJ8qKJ8qK', 'student', 'Jane Smith', 'CIIT-LHR-12346', '03111234568');

-- Insert Budget Settings for current month
INSERT INTO budget_settings (total_budget, allocated_budget, budget_pin, month_year, updated_by) VALUES
(50000.00, 0.00, '$2a$10$rKzYwQxH8XZJqKJ8qKJ8qO8qKJ8qKJ8qKJ8qKJ8qKJ8qKJ8qKJ8qK', DATE_FORMAT(NOW(), '%Y-%m'), 1);

-- Insert Sample Proposals
INSERT INTO proposals (society_id, event_name, venue, requested_date, time_slot, budget, proposal_details, status) VALUES
(2, 'Annual Debate Competition', 'Main Auditorium', '2025-03-15', '10:00 AM - 1:00 PM', 8000.00, 'Inter-university debate competition with 20 teams', 'pending'),
(3, 'AI Workshop Series', 'Computer Lab 5', '2025-04-10', '2:00 PM - 5:00 PM', 12000.00, 'Hands-on machine learning workshop for students', 'approved'),
(4, 'Startup Pitch Night', 'Seminar Room 301', '2025-10-02', '6:00 PM - 9:00 PM', 5000.00, 'Students pitch their startup ideas to investors', 'approved');

-- Insert Sample Events (from approved proposals)
INSERT INTO events (proposal_id, society_id, event_name, society_name, venue, event_date, time_slot, budget, description, max_participants) VALUES
(2, 3, 'AI Workshop Series', 'CS Club', 'Computer Lab 5', '2025-04-10', '2:00 PM - 5:00 PM', 12000.00, 'Hands-on machine learning workshop for students', 50),
(3, 4, 'Startup Pitch Night', 'Entrepreneur Society', 'Seminar Room 301', '2025-10-02', '6:00 PM - 9:00 PM', 5000.00, 'Students pitch their startup ideas to investors', 100);

-- Insert Sample Registrations
INSERT INTO registrations (student_id, event_id, full_name, student_email, phone_number, payment_screenshot) VALUES
(4, 1, 'John Doe', 'ciit-lhr-12345@cuilahore.edu.pk', '03111234567', '/uploads/payment-screenshots/payment-1234567890.jpg');
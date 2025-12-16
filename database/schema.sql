-- Create Database
CREATE DATABASE IF NOT EXISTS hr_system;
USE hr_system;

-- ===== Employees Table =====
CREATE TABLE IF NOT EXISTS employees (
  id INT PRIMARY KEY AUTO_INCREMENT,
  fullname VARCHAR(255) NOT NULL,
  nickname VARCHAR(100),
  email VARCHAR(255) UNIQUE NOT NULL,
  phone VARCHAR(20),
  username VARCHAR(100) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  
  -- Job Information
  department VARCHAR(100),
  position VARCHAR(100),
  start_date DATE,
  
  -- Personal Information
  date_of_birth DATE,
  id_card VARCHAR(20),
  address TEXT,
  
  -- Emergency Contact
  emergency_contact_name VARCHAR(255),
  emergency_contact_relationship VARCHAR(100),
  emergency_contact_phone VARCHAR(20),
  
  -- Bank Information
  bank_name VARCHAR(100),
  bank_account VARCHAR(50),
  
  -- Documents
  photo_url VARCHAR(500),
  id_card_url VARCHAR(500),
  contract_url VARCHAR(500),
  
  -- Role and Status
  role ENUM('admin', 'hr', 'manager', 'employee') DEFAULT 'employee',
  status ENUM('active', 'inactive', 'terminated') DEFAULT 'active',
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  INDEX idx_department (department),
  INDEX idx_status (status),
  INDEX idx_role (role)
);

-- ===== Departments Table =====
CREATE TABLE IF NOT EXISTS departments (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(255) NOT NULL UNIQUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Add employees.department_id column (safe - will error if exists, but that's ok)
ALTER TABLE employees ADD COLUMN department_id INT NULL;

-- Backfill departments from existing employee department names
INSERT IGNORE INTO departments(name)
SELECT DISTINCT department FROM employees WHERE department IS NOT NULL AND department <> '';

-- Link employees.department_id via name match
UPDATE employees e
LEFT JOIN departments d ON d.name = e.department
SET e.department_id = d.id
WHERE e.department_id IS NULL AND e.department IS NOT NULL AND e.department <> '';

-- Add FK constraint (ignore if already exists)
ALTER TABLE employees
ADD CONSTRAINT fk_employees_department_id
FOREIGN KEY (department_id) REFERENCES departments(id)
ON UPDATE CASCADE ON DELETE SET NULL;

-- Drop legacy text column after backfill (run only if exists)
ALTER TABLE employees DROP COLUMN department;

-- ===== Attendance Table =====
CREATE TABLE IF NOT EXISTS attendance (
  id INT PRIMARY KEY AUTO_INCREMENT,
  employee_id INT NOT NULL,
  date DATE NOT NULL,
  
  -- Old format (for backward compatibility)
  time TIME,
  location VARCHAR(255),
  note TEXT,
  
  -- New check-in/check-out format
  checkin_time TIME,
  checkout_time TIME,
  checkin_photo LONGBLOB,
  checkout_photo LONGBLOB,
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE,
  INDEX idx_employee_date (employee_id, date),
  UNIQUE KEY unique_daily_attendance (employee_id, date)
);

-- ===== Leave Requests Table =====
CREATE TABLE IF NOT EXISTS leave_requests (
  id INT PRIMARY KEY AUTO_INCREMENT,
  employee_id INT NOT NULL,
  date_from DATE NOT NULL,
  date_to DATE NOT NULL,
  leave_type ENUM('personal', 'sick', 'vacation', 'unpaid', 'other') NOT NULL,
  reason TEXT,
  status ENUM('pending', 'approved', 'rejected', 'cancelled') DEFAULT 'pending',
  
  approved_by INT,
  approved_at DATETIME,
  notes TEXT,
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE,
  FOREIGN KEY (approved_by) REFERENCES employees(id) ON DELETE SET NULL,
  INDEX idx_employee_status (employee_id, status),
  INDEX idx_date_range (date_from, date_to)
);

-- ===== Shift Templates Table (Shift Setup/Configuration) =====
CREATE TABLE IF NOT EXISTS shifts (
  id INT PRIMARY KEY AUTO_INCREMENT,
  shift_name VARCHAR(100) NOT NULL,
  shift_start TIME NOT NULL,
  shift_end TIME NOT NULL,
  break_start TIME,
  break_end TIME,
  description TEXT,
  is_active BOOLEAN DEFAULT 1,
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  INDEX idx_shift_name (shift_name),
  INDEX idx_is_active (is_active)
);

-- ===== Working Shifts Table (Employee Work Schedule) =====
CREATE TABLE IF NOT EXISTS working_shifts (
  id INT PRIMARY KEY AUTO_INCREMENT,
  employee_id INT NOT NULL,
  shift_id INT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  note TEXT,
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE,
  FOREIGN KEY (shift_id) REFERENCES shifts(id) ON DELETE RESTRICT,
  INDEX idx_employee_dates (employee_id, start_date, end_date),
  INDEX idx_shift_id (shift_id),
  INDEX idx_date_range (start_date, end_date)
);

-- ===== Payroll Table =====
CREATE TABLE IF NOT EXISTS payroll (
  id INT PRIMARY KEY AUTO_INCREMENT,
  employee_id INT NOT NULL,
  month DATE NOT NULL,
  
  -- Earnings
  base_salary DECIMAL(12, 2) DEFAULT 0,
  overtime_pay DECIMAL(12, 2) DEFAULT 0,
  bonus DECIMAL(12, 2) DEFAULT 0,
  allowance DECIMAL(12, 2) DEFAULT 0,
  
  -- Deductions
  social_security DECIMAL(12, 2) DEFAULT 0,
  tax DECIMAL(12, 2) DEFAULT 0,
  health_insurance DECIMAL(12, 2) DEFAULT 0,
  loan_deduction DECIMAL(12, 2) DEFAULT 0,
  other_deduction DECIMAL(12, 2) DEFAULT 0,
  
  -- Totals
  total_earnings DECIMAL(12, 2) DEFAULT 0,
  total_deductions DECIMAL(12, 2) DEFAULT 0,
  net_salary DECIMAL(12, 2) DEFAULT 0,
  
  status ENUM('draft', 'processed', 'paid', 'cancelled') DEFAULT 'draft',
  paid_date DATE,
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE,
  INDEX idx_employee_month (employee_id, month),
  UNIQUE KEY unique_payroll_period (employee_id, month)
);

-- ===== Warnings/Discipline Table =====
CREATE TABLE IF NOT EXISTS warnings (
  id INT PRIMARY KEY AUTO_INCREMENT,
  employee_id INT NOT NULL,
  issued_by INT,
  date_issued DATE NOT NULL,
  
  reason VARCHAR(255) NOT NULL,
  description TEXT,
  level ENUM('verbal', 'written', 'suspension', 'termination') DEFAULT 'verbal',
  
  resolved_at DATETIME,
  resolution_note TEXT,
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE,
  FOREIGN KEY (issued_by) REFERENCES employees(id) ON DELETE SET NULL,
  INDEX idx_employee_date (employee_id, date_issued)
);

-- ===== Performance Reviews Table =====
CREATE TABLE IF NOT EXISTS performance_reviews (
  id INT PRIMARY KEY AUTO_INCREMENT,
  employee_id INT NOT NULL,
  reviewer_id INT,
  review_period_start DATE NOT NULL,
  review_period_end DATE NOT NULL,
  
  rating INT,
  comments TEXT,
  strengths TEXT,
  areas_for_improvement TEXT,
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE,
  FOREIGN KEY (reviewer_id) REFERENCES employees(id) ON DELETE SET NULL,
  INDEX idx_employee_period (employee_id, review_period_start)
);

-- ===== Leave Balance Table =====
CREATE TABLE IF NOT EXISTS leave_balance (
  id INT PRIMARY KEY AUTO_INCREMENT,
  employee_id INT NOT NULL,
  year INT NOT NULL,
  
  personal_leave_available INT DEFAULT 3,
  personal_leave_used INT DEFAULT 0,
  
  sick_leave_available INT DEFAULT 30,
  sick_leave_used INT DEFAULT 0,
  
  vacation_leave_available INT DEFAULT 6,
  vacation_leave_used INT DEFAULT 0,
  
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE,
  UNIQUE KEY unique_employee_year (employee_id, year)
);

-- ===== Audit Log Table =====
CREATE TABLE IF NOT EXISTS audit_log (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT,
  action VARCHAR(255),
  table_name VARCHAR(100),
  record_id INT,
  old_value JSON,
  new_value JSON,
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (user_id) REFERENCES employees(id) ON DELETE SET NULL,
  INDEX idx_created_at (created_at)
);

-- ===== Insert Sample Admin User =====
INSERT INTO employees (
  fullname, email, username, password, 
  department, position, role, status, start_date
) VALUES (
  'Administrator', 
  'admin@bunnyphone.com', 
  'admin', 
  '$2a$10$QyCQlT8qR.JGI0y9m5ySF.7dU5yL5E2pZqRwhjI7m.Q8KpgEIxZzy', -- password: admin123
  'Admin', 
  'System Admin', 
  'admin', 
  'active',
  CURDATE()
)
ON DUPLICATE KEY UPDATE password = VALUES(password);

INSERT INTO employees (
  fullname, email, username, password, 
  department, position, role, status, start_date
) VALUES (
  'HR Manager', 
  'hr@bunnyphone.com', 
  'hrmanager', 
  '$2a$10$dCxN6YhCaLVf2X9zK2J5K.JGYzL2m3N4pQrStuVwXyZ8AbCdEf1ni', -- password: hr123
  'Human Resources', 
  'HR Manager', 
  'hr', 
  'active',
  CURDATE()
)
ON DUPLICATE KEY UPDATE password = VALUES(password);
-- ===== Holidays/Days Off Table =====
CREATE TABLE IF NOT EXISTS holidays (
  id INT PRIMARY KEY AUTO_INCREMENT,
  working_shift_id INT NOT NULL,
  employee_id INT NOT NULL,
  week_day INT NOT NULL, -- 0=Sunday, 1=Monday, ..., 6=Saturday
  day_name VARCHAR(20), -- 'Monday', 'Tuesday', etc.
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (working_shift_id) REFERENCES working_shifts(id) ON DELETE CASCADE,
  FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE,
  INDEX idx_working_shift (working_shift_id),
  INDEX idx_employee (employee_id),
  UNIQUE KEY unique_working_shift_day (working_shift_id, week_day)
);
#!/bin/bash
# Database Setup Instructions for Shifts Refactoring

echo "=========================================="
echo "  HR System - Shifts Refactoring Setup"
echo "=========================================="
echo ""

# Step 1: Backup current database (optional)
echo "Step 1: Backup Current Database (Optional)"
echo "  Run: mysqldump -u root -p hr_system > backup_$(date +%Y%m%d_%H%M%S).sql"
echo ""

# Step 2: Recreate schema
echo "Step 2: Update Database Schema"
echo "  The new schema.sql includes:"
echo "  - shifts table (templates only)"
echo "  - working_shifts table (assignments)"
echo "  - updated holidays table (with working_shift_id FK)"
echo ""
echo "  To apply: mysql -u root -p hr_system < database/schema.sql"
echo ""

# Step 3: Run migration
echo "Step 3: Run Migration Script"
echo "  This transforms existing shifts data into new structure:"
echo ""
echo "  $ node migrate-separate-shifts.js"
echo ""
echo "  This will:"
echo "  - Extract unique shift times"
echo "  - Create shift templates"
echo "  - Create working_shifts from old shifts"
echo "  - Map holidays to working_shift_id"
echo ""

# Step 4: Verify
echo "Step 4: Verify Migration"
echo "  Check MySQL:"
echo ""
echo "  mysql> SELECT COUNT(*) FROM shifts;"
echo "  mysql> SELECT COUNT(*) FROM working_shifts;"
echo "  mysql> SELECT COUNT(*) FROM holidays;"
echo ""

# Step 5: Test API
echo "Step 5: Test New API Endpoints"
echo ""
echo "  # Start server"
echo "  $ npm start"
echo ""
echo "  # In another terminal, test endpoints:"
echo "  $ curl http://localhost:3000/api/shift-templates -H 'Authorization: Bearer {token}'"
echo "  $ curl http://localhost:3000/api/shifts -H 'Authorization: Bearer {token}'"
echo "  $ curl http://localhost:3000/api/holidays -H 'Authorization: Bearer {token}'"
echo ""

echo "=========================================="
echo "  Complete Database Schema Structure"
echo "=========================================="
echo ""

cat << 'EOF'
## shifts Table (Templates)
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

## working_shifts Table (Assignments)
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

## holidays Table (Updated)
CREATE TABLE IF NOT EXISTS holidays (
  id INT PRIMARY KEY AUTO_INCREMENT,
  working_shift_id INT NOT NULL,
  employee_id INT NOT NULL,
  week_day INT NOT NULL,
  day_name VARCHAR(20),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (working_shift_id) REFERENCES working_shifts(id) ON DELETE CASCADE,
  FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE,
  INDEX idx_working_shift (working_shift_id),
  INDEX idx_employee (employee_id),
  UNIQUE KEY unique_working_shift_day (working_shift_id, week_day)
);
EOF

echo ""
echo "=========================================="
echo "  Migration Script Execution"
echo "=========================================="
echo ""
echo "File: migrate-separate-shifts.js"
echo ""
echo "Usage: node migrate-separate-shifts.js"
echo ""
echo "Process:"
echo "  1. Back up existing shifts data"
echo "  2. Create shift templates from unique times"
echo "  3. Create working_shifts from old shifts"
echo "  4. Map holidays to working_shift_id"
echo "  5. Verify data integrity"
echo ""
echo "Expected Output:"
echo "  ✓ Found N existing shifts"
echo "  ✓ Created M shift templates"
echo "  ✓ Created N working shifts"
echo "  ✓ Updated K holidays"
echo "  ✓ Migration Completed Successfully!"
echo ""

echo "=========================================="
echo "  API Endpoints Summary"
echo "=========================================="
echo ""
echo "Shift Templates (NEW):"
echo "  GET    /api/shift-templates"
echo "  POST   /api/shift-templates"
echo "  PUT    /api/shift-templates/:id"
echo "  DELETE /api/shift-templates/:id"
echo ""
echo "Working Shifts (UPDATED):"
echo "  GET    /api/shifts"
echo "  POST   /api/shifts          (requires shift_id, removed shift times)"
echo "  PUT    /api/shifts/:id      (requires shift_id)"
echo "  DELETE /api/shifts/:id"
echo ""
echo "Holidays (UPDATED):"
echo "  GET    /api/holidays        (query param: working_shift_id)"
echo "  POST   /api/holidays        (body param: working_shift_id)"
echo "  DELETE /api/holidays/:id"
echo ""

echo "=========================================="
echo "  Key Changes Summary"
echo "=========================================="
echo ""
echo "✅ BENEFITS:"
echo "  - Shift templates are reusable"
echo "  - Clear separation: template vs assignment"
echo "  - Simpler UI dropdown selection"
echo "  - Automatic cascade delete of holidays"
echo "  - Employee can have multiple shifts"
echo ""
echo "⚠️  BREAKING CHANGES:"
echo "  - shifts table no longer stores employee_id"
echo "  - POST /api/shifts no longer accepts shift_start/shift_end"
echo "  - Holidays now link to working_shift_id not shift_id"
echo "  - Frontend must fetch templates separately"
echo ""

echo "=========================================="
echo "  Next Steps"
echo "=========================================="
echo ""
echo "1. Apply new schema:"
echo "   $ mysql -u root -p hr_system < database/schema.sql"
echo ""
echo "2. Run migration script:"
echo "   $ node migrate-separate-shifts.js"
echo ""
echo "3. Update frontend (js/app.js):"
echo "   - Load shift templates: GET /api/shift-templates"
echo "   - Create shift template selector dropdown"
echo "   - Remove shift time input fields"
echo "   - Update POST body to use shift_id"
echo "   - Update holidays query to use working_shift_id"
echo ""
echo "4. Test the system:"
echo "   - Login works"
echo "   - Can create shift templates"
echo "   - Can assign shifts to employees"
echo "   - Calendar displays correctly"
echo "   - Holidays link properly"
echo ""
echo "=========================================="

# Shifts Table Refactoring - Separation of Concerns

## ✅ Completed Tasks

### 1. Database Schema Update (`database/schema.sql`)
**Refactored the shifts table into two distinct tables:**

#### Table 1: `shifts` - Shift Templates (Configuration)
- **Purpose**: Define available shift times and configurations
- **Columns**:
  - `id`: Primary key
  - `shift_name`: Name of the shift (e.g., "Morning", "Evening", "Night")
  - `shift_start`: Start time (e.g., 09:00)
  - `shift_end`: End time (e.g., 17:00)
  - `break_start`: Break start time (optional)
  - `break_end`: Break end time (optional)
  - `description`: Additional details
  - `is_active`: Boolean flag (1=active, 0=inactive)
  - `created_at`, `updated_at`: Timestamps

#### Table 2: `working_shifts` - Employee Work Schedule
- **Purpose**: Assign shift templates to employees with specific date ranges
- **Columns**:
  - `id`: Primary key
  - `employee_id`: Foreign key → `employees.id` (ON DELETE CASCADE)
  - `shift_id`: Foreign key → `shifts.id` (ON DELETE RESTRICT)
  - `start_date`: Start date of the shift assignment
  - `end_date`: End date of the shift assignment
  - `note`: Optional notes
  - `created_at`, `updated_at`: Timestamps
- **Indexes**: 
  - `idx_employee_dates`: For efficient employee shift lookups
  - `idx_shift_id`: For template reference tracking
  - `idx_date_range`: For date-based queries

#### Updated Table: `holidays`
- **Changed foreign key reference**:
  - From: `shift_id` → `shifts.id`
  - To: `working_shift_id` → `working_shifts.id` (ON DELETE CASCADE)
- **Purpose**: Holidays are now tied to specific employee work schedules, not templates
- **Benefit**: When a working shift is deleted, its holidays are automatically cascade-deleted

### 2. Backend API Endpoints (`backend/server.js`)

#### New Endpoints: Shift Template Management
```
GET    /api/shift-templates
POST   /api/shift-templates
PUT    /api/shift-templates/:id
DELETE /api/shift-templates/:id (soft delete via is_active)
```

**Endpoint Details:**

**GET /api/shift-templates**
- Returns all active shift templates
- No authentication required (templates are read-only for selection)
- Response:
  ```json
  {
    "templates": [
      {
        "id": 1,
        "shift_name": "Morning",
        "shift_start": "09:00",
        "shift_end": "17:00",
        "break_start": "12:00",
        "break_end": "13:00",
        "description": "Standard morning shift",
        "is_active": 1
      }
    ]
  }
  ```

**POST /api/shift-templates** (Admin/HR only)
- Creates new shift template
- Body:
  ```json
  {
    "shift_name": "Night Shift",
    "shift_start": "22:00",
    "shift_end": "06:00",
    "break_start": "02:00",
    "break_end": "03:00",
    "description": "Night work hours"
  }
  ```

**PUT /api/shift-templates/:id** (Admin/HR only)
- Updates existing template
- Body: Same as POST

**DELETE /api/shift-templates/:id** (Admin only)
- Soft deletes template (sets is_active = 0)
- Returns error if template is in use

#### Updated Endpoints: Working Shifts
```
GET    /api/shifts       (Working shifts for employee)
POST   /api/shifts       (Create working shift + holidays)
PUT    /api/shifts/:id   (Update working shift + holidays)
DELETE /api/shifts/:id   (Delete working shift + cascade holidays)
```

**Key Changes:**
- Now references `working_shifts` table instead of `shifts`
- Requires `shift_id` parameter (FK to shift template)
- Returns shift template details (`shift_name`, `shift_start`, `shift_end`) in response

**POST /api/shifts** (Admin/HR only)
- Creates employee working shift
- Old Body:
  ```json
  {
    "employee_id": 1,
    "start_date": "2025-12-12",
    "end_date": "2025-12-30",
    "shift_start": "09:00",    // REMOVED
    "shift_end": "17:00",      // REMOVED
    "shift_name": "Morning",   // REMOVED
    "note": "Notes",
    "holidays": [0, 6]         // Sunday, Saturday
  }
  ```
- New Body:
  ```json
  {
    "employee_id": 1,
    "shift_id": 1,             // NEW: Template reference
    "start_date": "2025-12-12",
    "end_date": "2025-12-30",
    "note": "Notes",
    "holidays": [0, 6]         // Holidays are now linked to working_shift_id
  }
  ```

#### Updated Endpoints: Holidays
**GET /api/holidays**
- Changed query parameter from `shift_id` to `working_shift_id`
- Updated joins to include shift templates

**POST /api/holidays**
- Changed request body field from `shift_id` to `working_shift_id`
- Now validates against `working_shifts` table

### 3. Migration Script (`migrate-separate-shifts.js`)
**Automatically transforms existing data:**

1. **Extracts unique shift times** from old shifts table
2. **Creates shift templates** for each unique time combination
3. **Creates working_shifts** records from old shifts data
4. **Maps holidays** from old references to new working_shift_id references
5. **Validates data integrity** with summary output

**Usage:**
```bash
node migrate-separate-shifts.js
```

**Expected Output:**
```
════════════════════════════════════════
  Migrating Shifts Schema Separation
════════════════════════════════════════

Step 1: Backing up existing shift data...
  ✓ Found 2 existing shifts

Step 2: Creating default shift templates...
  ✓ Created shift template: Morning Shift (09:00-17:00)
  ✓ Created shift template: Day Shift (10:00-18:00)

Step 3: Creating working shifts from old data...
  ✓ Created 2 working shifts

Step 4: Updating holidays to reference working_shifts...
  ✓ Updated 0 holidays

Step 5: Verifying migration...
  ✓ Shift templates: 2
  ✓ Working shifts: 2
  ✓ Holidays: 0
```

## 🔄 Data Flow Comparison

### Before Refactoring:
```
Shift Setup Form
    ↓
shifts table (contains both template AND assignment)
    ├─ employee_id (assignment)
    ├─ shift_start, shift_end (template)
    └─ start_date, end_date (assignment)
    ↓
holidays table ← shift_id
```
❌ **Problem**: Mixed concerns - can't reuse shift times, confusing selector UI

### After Refactoring:
```
Shift Template Form (Admin)
    ↓
shifts table (ONLY templates)
    ├─ shift_name
    ├─ shift_start, shift_end
    └─ is_active flag
    
Shift Assignment Form (Admin/HR)
    ↓
working_shifts table (ONLY assignments)
    ├─ employee_id
    ├─ shift_id ← (references template)
    └─ start_date, end_date
    
holidays table ← working_shift_id (CASCADE delete)
```
✅ **Benefits**:
- Clear separation of concerns
- Reusable shift templates
- Simpler UI dropdown selection
- Cascading deletes prevent orphans
- Employee can have multiple shifts with different dates

## 📋 Implementation Checklist

- [x] Updated `database/schema.sql` with new table structure
- [x] Created `migrate-separate-shifts.js` migration script
- [x] Added `/api/shift-templates` endpoints (GET, POST, PUT, DELETE)
- [x] Updated `/api/shifts` endpoints for working_shifts
- [x] Updated `/api/holidays` endpoints for working_shift_id references
- [ ] Update `frontend/js/app.js` with new UI logic
- [ ] Execute migration script on database
- [ ] Test shift creation with template selection
- [ ] Test calendar display
- [ ] Test holiday assignment
- [ ] Test cascade delete (delete shift → holidays auto-deleted)

## 🚀 Next Steps

### Step 1: Execute Migration
```bash
node migrate-separate-shifts.js
```

### Step 2: Update Frontend
- Fetch shift templates separately: `GET /api/shift-templates`
- Show templates in dropdown when creating working shift
- Update calendar display to use working_shifts with template info
- Ensure holiday assignment uses `working_shift_id`

### Step 3: Test Complete Flow
1. Create shift template (e.g., "Morning 09:00-17:00")
2. Create working shift for employee (select template, set dates, assign holidays)
3. View calendar - should show shift with correct times
4. Delete shift - holidays should auto-delete
5. Login & verify everything works

## 📝 Notes for Frontend Development

### Calendar Display Logic
```javascript
// Get shifts + templates
const shifts = await fetch('/api/shifts?employee_id=1').then(r => r.json());

// Each shift now has template info:
shift = {
  id: 5,
  employee_id: 1,
  shift_id: 1,              // Template ID
  start_date: "2025-12-12",
  end_date: "2025-12-30",
  shift_name: "Morning",    // From template
  shift_start: "09:00",     // From template
  shift_end: "17:00"        // From template
}

// Get holidays for this working shift
const holidays = await fetch('/api/holidays?working_shift_id=5').then(r => r.json());
```

### Shift Creation Form Changes
**Old**: Direct time input
**New**: 
1. Dropdown: Select shift template
2. Date range: Start & end dates
3. Holidays: Days off (optional)

### Key API Parameters Changed
| Old | New | Reason |
|-----|-----|--------|
| POST body: `shift_start`, `shift_end` | Removed | Come from template |
| POST body: `shift_name` | Removed | Comes from template |
| POST body: (none) | Added `shift_id` | Select template |
| Holidays FK: `shift_id` | Changed to `working_shift_id` | Links to assignment, not template |
| Query param: `?shift_id=` | Changed to `?working_shift_id=` | For holidays filtering |

## 🔍 Validation & Error Handling

**Template Delete Protection:**
- Prevents deletion if template is in use
- Returns: `{ message: 'Cannot delete: shift template is in use' }`

**Duplicate Holiday Validation:**
- Unique constraint on `(working_shift_id, week_day)`
- Returns: `{ message: 'Holiday already exists' }`

**Foreign Key Cascades:**
- `working_shifts.employee_id` → `employees.id` (CASCADE DELETE)
- `working_shifts.shift_id` → `shifts.id` (RESTRICT - prevents template deletion)
- `holidays.working_shift_id` → `working_shifts.id` (CASCADE DELETE)
- `holidays.employee_id` → `employees.id` (CASCADE DELETE)

---

**Version**: 1.0
**Status**: Ready for Implementation
**Last Updated**: 2025-12-16

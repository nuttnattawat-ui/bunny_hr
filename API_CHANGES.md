# API Changes Quick Reference

## Shift Templates (NEW)

### GET /api/shift-templates
Returns all active shift templates for selection
```bash
curl http://localhost:3000/api/shift-templates \
  -H "Authorization: Bearer {token}"
```

Response:
```json
{
  "templates": [
    {
      "id": 1,
      "shift_name": "Morning",
      "shift_start": "09:00",
      "shift_end": "17:00"
    }
  ]
}
```

### POST /api/shift-templates (Admin/HR)
Create new shift template
```bash
curl -X POST http://localhost:3000/api/shift-templates \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{
    "shift_name": "Night",
    "shift_start": "22:00",
    "shift_end": "06:00",
    "description": "Night shift"
  }'
```

---

## Working Shifts (UPDATED)

### GET /api/shifts
```bash
# Get all shifts (for admin/hr)
curl http://localhost:3000/api/shifts \
  -H "Authorization: Bearer {token}"

# Get shifts for specific employee
curl "http://localhost:3000/api/shifts?employee_id=1" \
  -H "Authorization: Bearer {token}"

# Get shifts in date range
curl "http://localhost:3000/api/shifts?start_date=2025-12-12&end_date=2025-12-30" \
  -H "Authorization: Bearer {token}"
```

**Changed**: Now queries `working_shifts` table

### POST /api/shifts (Admin/HR)
Create working shift by selecting template
```bash
curl -X POST http://localhost:3000/api/shifts \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{
    "employee_id": 1,
    "shift_id": 1,
    "start_date": "2025-12-12",
    "end_date": "2025-12-30",
    "note": "Holiday season",
    "holidays": [0, 6]
  }'
```

**Changed Parameters**:
- ❌ REMOVED: `shift_start`, `shift_end`, `shift_name`
- ✅ ADDED: `shift_id` (template ID)
- ✅ SAME: `employee_id`, `start_date`, `end_date`, `note`, `holidays`

### PUT /api/shifts/:id (Admin/HR)
Update working shift
```bash
curl -X PUT http://localhost:3000/api/shifts/5 \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{
    "employee_id": 1,
    "shift_id": 2,
    "start_date": "2025-12-15",
    "end_date": "2026-01-15",
    "holidays": [0, 6, 1]
  }'
```

### DELETE /api/shifts/:id (Admin)
Delete working shift (holidays cascade delete)
```bash
curl -X DELETE http://localhost:3000/api/shifts/5 \
  -H "Authorization: Bearer {token}"
```

---

## Holidays (UPDATED)

### GET /api/holidays
```bash
# Get holidays for working shift
curl "http://localhost:3000/api/holidays?working_shift_id=5" \
  -H "Authorization: Bearer {token}"

# Get holidays for employee
curl "http://localhost:3000/api/holidays?employee_id=1" \
  -H "Authorization: Bearer {token}"
```

**Changed Parameter**: `shift_id` → `working_shift_id`

### POST /api/holidays (Admin/HR)
Add holiday to working shift
```bash
curl -X POST http://localhost:3000/api/holidays \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{
    "working_shift_id": 5,
    "employee_id": 1,
    "week_day": 0,
    "day_name": "Sunday"
  }'
```

**Changed Parameter**: `shift_id` → `working_shift_id`

---

## Database Changes

### Before
```
shifts table:
- id, employee_id, shift_name, shift_start, shift_end
- start_date, end_date, note

holidays table:
- FK: shift_id → shifts(id)
```

### After
```
shifts table (Templates):
- id, shift_name, shift_start, shift_end
- break_start, break_end, description, is_active

working_shifts table (Assignments):
- id, employee_id, shift_id (FK), start_date, end_date, note

holidays table:
- FK: working_shift_id → working_shifts(id) (CASCADE)
- FK: employee_id → employees(id) (CASCADE)
```

---

## Migration Script

**File**: `migrate-separate-shifts.js`

**What it does**:
1. Extracts unique shift times from old shifts table
2. Creates shift templates for each unique configuration
3. Creates working_shifts records from old data
4. Maps holidays to working_shift references

**Run it**:
```bash
node migrate-separate-shifts.js
```

---

## Testing Checklist

- [ ] GET /api/shift-templates returns templates
- [ ] POST /api/shift-templates creates template
- [ ] GET /api/shifts returns working shifts with template info
- [ ] POST /api/shifts creates working shift with template selection
- [ ] PUT /api/shifts/:id updates shift and holidays
- [ ] DELETE /api/shifts/:id deletes shift and cascades delete holidays
- [ ] Holidays are linked to working_shift_id correctly
- [ ] Template cannot be deleted if in use
- [ ] Calendar display works with new structure
- [ ] Login still works with admin/admin123

---

## Frontend Update Guide

### 1. Load Shift Templates
```javascript
async function loadShiftTemplates() {
  const response = await fetch('/api/shift-templates', {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  return await response.json();
}
```

### 2. Create Shift Selector
```html
<select name="shift_id">
  <option value="">Select Shift Template</option>
  <!-- Options from templates API -->
</select>
```

### 3. Remove Time Input Fields
```html
<!-- REMOVE THESE -->
<input type="time" name="shift_start" />
<input type="time" name="shift_end" />
<input type="text" name="shift_name" />
```

### 4. Update POST Body
```javascript
const body = {
  employee_id: parseInt(employeeId),
  shift_id: parseInt(shiftId),  // NEW
  start_date: startDate,
  end_date: endDate,
  holidays: selectedHolidays
  // REMOVED: shift_start, shift_end, shift_name
};
```

### 5. Update Holiday Endpoint
```javascript
// OLD
const holidays = await fetch(`/api/holidays?shift_id=${shiftId}`);

// NEW
const holidays = await fetch(`/api/holidays?working_shift_id=${workingShiftId}`);
```

---

**Version**: 1.0  
**Last Updated**: 2025-12-16

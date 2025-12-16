# Shifts Refactoring - Visual Architecture

## Data Structure Diagram

### BEFORE Refactoring
```
┌─────────────────────────────┐
│       SHIFTS TABLE          │
├─────────────────────────────┤
│ id (PK)                     │
│ employee_id (FK)       ────────┐
│ shift_name                  │   │
│ shift_start                 │   │ MIXED
│ shift_end                   │   │ CONCERNS
│ start_date                  │   │
│ end_date                    │   │
│ note                        │   │
└────────────────────┬────────┘   │
                     │             │
                     └─────┬───────┘
                           │
                    ❌ PROBLEM:
                    - Can't reuse times
                    - Confusing selector
                    - Template + Assignment mixed
```

### AFTER Refactoring
```
┌──────────────────────────┐
│    SHIFTS TABLE          │  ← Shift Templates
│   (Configuration)        │
├──────────────────────────┤
│ id (PK)                  │
│ shift_name               │    CREATE ONCE
│ shift_start              │    REUSE MANY
│ shift_end                │    TIMES
│ break_start (optional)   │
│ break_end (optional)     │
│ description              │
│ is_active                │
└──────────────┬───────────┘
               │
               │ Referenced by (shift_id)
               │
┌──────────────▼──────────────┐
│  WORKING_SHIFTS TABLE       │  ← Employee Assignments
│    (Assignment)             │
├─────────────────────────────┤
│ id (PK)                     │
│ employee_id (FK) ──────┐    │ ASSIGN TO
│ shift_id (FK) ─────────┤────┤ MULTIPLE DATES
│ start_date             │    │
│ end_date               │    │
│ note                   │    │
└──────────┬─────────────┘    │
           │                  │
           │ Referenced by (working_shift_id)
           │
    ┌──────▼──────────────┐
    │  HOLIDAYS TABLE     │   CASCADE DELETE
    ├─────────────────────┤
    │ id (PK)             │
    │ working_shift_id FK │ (ON DELETE CASCADE)
    │ employee_id FK      │ (ON DELETE CASCADE)
    │ week_day            │
    │ day_name            │
    └─────────────────────┘

✅ BENEFITS:
- Clear separation
- Reusable templates
- Simple UI selection
- No orphaned data
```

## Data Flow Diagram

### Shift Setup & Assignment Flow

```
┌──────────────────────────┐
│   Admin/HR User          │
└───────────┬──────────────┘
            │
            │ 1. CREATE TEMPLATES (One-time setup)
            ▼
   ┌────────────────────┐
   │ Shift Template UI  │  (shift_name, times)
   └────────┬───────────┘
            │
            │ POST /api/shift-templates
            ▼
   ┌────────────────────┐
   │  SHIFTS Table      │  Morning, Evening, Night
   │  (Templates)       │
   └────────────────────┘
            │
            │ 2. ASSIGN TO EMPLOYEES (Multiple times)
            │
   ┌────────▼──────────────┐
   │ Shift Assignment UI   │  (employee, template, dates)
   └────────┬──────────────┘
            │
            │ POST /api/shifts
            │ Body: {employee_id, shift_id, start_date, end_date}
            ▼
   ┌────────────────────────┐
   │ WORKING_SHIFTS Table   │  Jane: Morning 2025-12-12 to 12-30
   │ (Assignments)          │  John: Evening 2025-12-15 to 1-15
   └────────┬───────────────┘
            │
            │ 3. ASSIGN HOLIDAYS (Per assignment)
            │
   ┌────────▼──────────────┐
   │ Holiday Selection UI   │  (days of week)
   └────────┬──────────────┘
            │
            │ POST /api/holidays
            │ Body: {working_shift_id, employee_id, week_day}
            ▼
   ┌────────────────────────┐
   │ HOLIDAYS Table         │  Jane: Sun & Sat off
   │ (Days off)             │  John: Fri off
   └────────────────────────┘
```

## API Endpoint Hierarchy

```
/api/
│
├── /shift-templates        ← ADMIN: Configure available shifts
│   ├── GET                 (Get all templates)
│   ├── POST                (Create new template)
│   ├── PUT /:id            (Update template)
│   └── DELETE /:id         (Deactivate template)
│
├── /shifts                 ← ADMIN/HR: Assign to employees
│   ├── GET                 (Get assignments for employee/dates)
│   ├── POST                (Create assignment)
│   ├── PUT /:id            (Update assignment)
│   └── DELETE /:id         (Delete assignment)
│
└── /holidays               ← ADMIN/HR: Set days off
    ├── GET                 (Get holidays)
    ├── POST                (Add holiday)
    └── DELETE /:id         (Remove holiday)
```

## Request/Response Flow

```
1. CREATE SHIFT TEMPLATE
   ┌─ Request ────────────────────────────┐
   │ POST /api/shift-templates            │
   │ {                                    │
   │   "shift_name": "Morning",           │
   │   "shift_start": "09:00",            │
   │   "shift_end": "17:00"               │
   │ }                                    │
   └──────────────────────────────────────┘
                    │
                    │ Validates
                    ▼
   ┌─ Response ────────────────────────────┐
   │ Status 201                           │
   │ {                                    │
   │   "message": "created",              │
   │   "id": 1                            │
   │ }                                    │
   └──────────────────────────────────────┘

2. CREATE WORKING SHIFT
   ┌─ Request ────────────────────────────┐
   │ POST /api/shifts                     │
   │ {                                    │
   │   "employee_id": 1,                  │
   │   "shift_id": 1,        ← Use template│
   │   "start_date": "2025-12-12",        │
   │   "end_date": "2025-12-30",          │
   │   "holidays": [0, 6]    ← Sun, Sat  │
   │ }                                    │
   └──────────────────────────────────────┘
                    │
                    │ Validates + Creates working_shift
                    │ + Creates holidays
                    ▼
   ┌─ Response ────────────────────────────┐
   │ Status 201                           │
   │ {                                    │
   │   "message": "Working shift created",│
   │   "id": 5                            │
   │ }                                    │
   └──────────────────────────────────────┘

3. GET SHIFTS FOR CALENDAR
   ┌─ Request ────────────────────────────┐
   │ GET /api/shifts?employee_id=1        │
   └──────────────────────────────────────┘
                    │
                    │ Joins working_shifts + shifts
                    ▼
   ┌─ Response ────────────────────────────┐
   │ Status 200                           │
   │ {                                    │
   │   "shifts": [                        │
   │     {                                │
   │       "id": 5,                       │
   │       "employee_id": 1,              │
   │       "shift_id": 1,                 │
   │       "start_date": "2025-12-12",    │
   │       "end_date": "2025-12-30",      │
   │       "shift_name": "Morning",  ← From│
   │       "shift_start": "09:00",  │template
   │       "shift_end": "17:00"     │    │
   │     }                                │
   │   ]                                  │
   │ }                                    │
   └──────────────────────────────────────┘

4. GET HOLIDAYS FOR SHIFT
   ┌─ Request ────────────────────────────┐
   │ GET /api/holidays?working_shift_id=5 │
   └──────────────────────────────────────┘
                    │
                    │ Filters by working_shift_id
                    ▼
   ┌─ Response ────────────────────────────┐
   │ Status 200                           │
   │ {                                    │
   │   "holidays": [                      │
   │     {                                │
   │       "id": 10,                      │
   │       "working_shift_id": 5,         │
   │       "employee_id": 1,              │
   │       "week_day": 0,                 │
   │       "day_name": "Sunday"           │
   │     },                               │
   │     {                                │
   │       "id": 11,                      │
   │       "working_shift_id": 5,         │
   │       "employee_id": 1,              │
   │       "week_day": 6,                 │
   │       "day_name": "Saturday"         │
   │     }                                │
   │   ]                                  │
   │ }                                    │
   └──────────────────────────────────────┘
```

## Database Relationship Diagram

```
EMPLOYEES
    │
    │ (1)
    │────────┐
    │        │
    │    (N) WORKING_SHIFTS
    │        │       │
    │        │       │ (1)
    │        │       └─────── SHIFTS
    │        │                │
    │        │ (N)            │
    │        └── HOLIDAYS ◄───┘
    │             (N)
    │
    └─ (N) ATTENDANCE
    └─ (N) LEAVE_REQUESTS
```

**Cascade Rules:**
- Delete EMPLOYEE → Deletes WORKING_SHIFTS → Cascade deletes HOLIDAYS
- Delete WORKING_SHIFT → Cascade deletes HOLIDAYS
- Delete SHIFT (template) → RESTRICTED (in use check)

## Calendar Display Logic

```
User Views Calendar for Employee
        │
        │ GET /api/shifts?employee_id=1&start_date=2025-12&end_date=2026-01
        ▼
Get WORKING_SHIFTS + SHIFT templates
        │
        │ For each day in calendar:
        │   - Check if day falls within working_shift date range
        │   - If yes, show shift with template info (name, times)
        │ 
        │ For each day:
        │   - Check if day is a holiday (week_day match)
        │   - If yes, show holiday marker (🎉)
        ▼
Render Calendar
  ┌────────────┐
  │ M  T  W  T  F  S  S │
  ├────────────┤
  │12 13 14 15 16 17 18│
  │09 09 09 09 09 -- -- │ (Morning 09:00-17:00)
  │                   🎉 │ (Saturday: Holiday)
  ├────────────┤
  │19 20 21 22 23 24 25│
  │09 09 09 09 09 🎉 🎉 │
  └────────────┘
```

---

**Visual Architecture Version**: 1.0  
**Last Updated**: 2025-12-16

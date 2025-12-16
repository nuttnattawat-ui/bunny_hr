const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const mysql = require('mysql2/promise');
require('dotenv').config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Database Connection Pool
const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'hr_system',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// Handle pool errors gracefully
pool.on('error', (err) => {
  console.warn('Database connection pool error:', err.message);
});

// Auth Middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ message: 'No token provided' });
  }

  jwt.verify(token, process.env.JWT_SECRET || 'secret123', (err, user) => {
    if (err) {
      return res.status(403).json({ message: 'Invalid token' });
    }
    req.user = user;
    next();
  });
};

// Routes
// ===== Authentication =====
app.post('/api/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    const connection = await pool.getConnection();

    const [rows] = await connection.query(
      'SELECT * FROM employees WHERE username = ?',
      [username]
    );

    if (!rows || rows.length === 0) {
      connection.release();
      return res.status(401).json({ message: 'Invalid username or password' });
    }

    const employee = rows[0];
    const validPassword = await bcrypt.compare(password, employee.password);

    if (!validPassword) {
      connection.release();
      return res.status(401).json({ message: 'Invalid username or password' });
    }

    const token = jwt.sign(
      {
        id: employee.id,
        username: employee.username,
        role: employee.role
      },
      process.env.JWT_SECRET || 'secret123',
      { expiresIn: '24h' }
    );

    // Resolve department name via departments table
    let departmentName = null;
    try {
      if (employee.department_id) {
        const [drows] = await connection.query('SELECT name FROM departments WHERE id = ?', [employee.department_id]);
        if (drows && drows.length > 0) {
          departmentName = drows[0].name;
        }
      }
    } catch (e) {
      // ignore lookup errors; fallback to text column
    }

    connection.release();

    res.json({
      token,
      user: {
        id: employee.id,
        fullname: employee.fullname,
        username: employee.username,
        email: employee.email,
        role: employee.role,
        department: departmentName
      }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ===== Sign Up (Public) =====
app.post('/api/auth/signup', async (req, res) => {
  try {
    const { first_name, last_name, fullname, nickname, email, username, password, department, position, start_date } = req.body;

    if (!first_name || !last_name || !email || !username || !password || !department || !position) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    const connection = await pool.getConnection();
    await ensureDepartmentsTable(connection);
    await ensureEmployeesDepartmentId(connection);

    // Check if username already exists
    const [existingUser] = await connection.query(
      'SELECT id FROM employees WHERE username = ?',
      [username]
    );

    if (existingUser && existingUser.length > 0) {
      connection.release();
      return res.status(409).json({ message: 'Username already exists' });
    }

    // Check if email already exists
    const [existingEmail] = await connection.query(
      'SELECT id FROM employees WHERE email = ?',
      [email]
    );

    if (existingEmail && existingEmail.length > 0) {
      connection.release();
      return res.status(409).json({ message: 'Email already exists' });
    }

    // Resolve department id; department must exist (creation is admin-only)
    const [drows] = await connection.query('SELECT id FROM departments WHERE name = ?', [department]);
    if (!drows || drows.length === 0) {
      connection.release();
      return res.status(400).json({ message: 'Department not found' });
    }
    const departmentId = drows[0].id;

    const hashedPassword = await bcrypt.hash(password, 10);

    const [result] = await connection.query(
      `INSERT INTO employees (first_name, last_name, fullname, nickname, email, username, password, department_id, position, start_date, role, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [first_name, last_name, fullname, nickname, email, username, hashedPassword, departmentId, position, start_date || new Date().toISOString().split('T')[0], 'employee', 'active']
    );

    connection.release();

    res.status(201).json({
      message: 'Employee created successfully',
      id: result.insertId
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ===== Employees =====
app.get('/api/employees/:id', authenticateToken, async (req, res) => {
  try {
    const connection = await pool.getConnection();
    const [rows] = await connection.query(
      'SELECT e.*, d.name AS department_name FROM employees e LEFT JOIN departments d ON e.department_id = d.id WHERE e.id = ?',
      [req.params.id]
    );
    
    connection.release();

    if (!rows || rows.length === 0) {
      return res.status(404).json({ message: 'Employee not found' });
    }

    const employee = rows[0];
    if (employee && employee.department_name) {
      employee.department = employee.department_name;
      delete employee.department_name;
    }
    // Keep password for display (not sent to user display, but kept in response)

    res.json({ employee });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

app.get('/api/employees', authenticateToken, async (req, res) => {
  try {
    const connection = await pool.getConnection();
    const [rows] = await connection.query(
      `SELECT e.id, e.fullname, e.email, d.name AS department, e.position, e.role, e.start_date
       FROM employees e
       LEFT JOIN departments d ON e.department_id = d.id
       WHERE e.status = 'active'`
    );
    
    connection.release();
    res.json({ employees: rows });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ===== Departments =====
// Helper to ensure departments table exists
async function ensureDepartmentsTable(connection) {
  try {
    await connection.query(`
      CREATE TABLE IF NOT EXISTS departments (
        id INT PRIMARY KEY AUTO_INCREMENT,
        name VARCHAR(255) NOT NULL UNIQUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
  } catch (err) {
    console.warn('ensureDepartmentsTable error:', err.message);
  }
}

// Helper to ensure employees.department_id exists and is linked to departments
async function ensureEmployeesDepartmentId(connection) {
  try {
    await ensureDepartmentsTable(connection);

    // Add department_id column if missing
    try {
      await connection.query(`
        ALTER TABLE employees
        ADD COLUMN department_id INT NULL
      `);
    } catch (e) {
      // Ignore if column already exists
      if (e.code !== 'ER_DUP_FIELDNAME') {
        console.warn('add department_id column error:', e.message);
      }
    }

    // Skip backfill - department column no longer exists (using department_id only)

    // Add FK if not exists (best-effort)
    try {
      await connection.query(`
        ALTER TABLE employees
        ADD CONSTRAINT fk_employees_department_id
        FOREIGN KEY (department_id) REFERENCES departments(id)
        ON UPDATE CASCADE ON DELETE SET NULL
      `);
    } catch (e) {
      // If it already exists, ignore
      if (!(e && (e.code === 'ER_DUP_KEY' || e.code === 'ER_CANT_CREATE_TABLE' || e.message.includes('Duplicate') || e.message.includes('already exists')))) {
        console.warn('add FK employees.department_id error:', e.message);
      }
    }
  } catch (err) {
    console.warn('ensureEmployeesDepartmentId error:', err.message);
  }
}

// Initialize schema best-effort at startup
(async () => {
  try {
    const conn = await pool.getConnection();
    try {
      await ensureDepartmentsTable(conn);
      await ensureEmployeesDepartmentId(conn);
    } finally {
      conn.release();
    }
  } catch (e) {
    console.warn('Startup schema initialization warning:', e.message);
  }
})();

// Get departments list
app.get('/api/departments', async (req, res) => {
  try {
    const connection = await pool.getConnection();
    let departments = [];
    try {
      const [rows] = await connection.query('SELECT name FROM departments ORDER BY name');
      departments = rows.map(r => r.name);
    } catch (err) {
      // If table missing, fallback to distinct departments from employees
      if (err.code === 'ER_NO_SUCH_TABLE') {
        const [rows] = await connection.query(
          'SELECT DISTINCT department FROM employees WHERE department IS NOT NULL AND department <> "" ORDER BY department'
        );
        departments = rows.map(r => r.department);
      } else {
        throw err;
      }
    } finally {
      connection.release();
    }
    res.json({ departments });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Create a department (admin/hr only)
app.post('/api/departments', authenticateToken, async (req, res) => {
  try {
    // Admin only
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied' });
    }

    const { name } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ message: 'Department name is required' });
    }

    const connection = await pool.getConnection();
    await ensureDepartmentsTable(connection);
    try {
      const [result] = await connection.query('INSERT INTO departments (name) VALUES (?)', [name.trim()]);
      connection.release();
      return res.status(201).json({ message: 'Department created', id: result.insertId });
    } catch (err) {
      connection.release();
      if (err.code === 'ER_DUP_ENTRY') {
        return res.status(409).json({ message: 'Department already exists' });
      }
      throw err;
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

app.post('/api/employees', authenticateToken, async (req, res) => {
  try {
    // Check if admin/hr
    if (req.user.role !== 'admin' && req.user.role !== 'hr') {
      return res.status(403).json({ message: 'Access denied' });
    }

    const {
      fullname, email, username, password,
      department, position, start_date, phone, role
    } = req.body;

    if (!fullname || !email || !username || !password || !department || !position) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    // Split fullname into first_name and last_name
    const nameParts = fullname.trim().split(' ');
    let first_name = nameParts[0];
    let last_name = nameParts.slice(1).join(' ') || '';

    const hashedPassword = await bcrypt.hash(password, 10);
    const connection = await pool.getConnection();
    await ensureDepartmentsTable(connection);
    await ensureEmployeesDepartmentId(connection);

    // Check if username already exists
    const [existingUser] = await connection.query(
      'SELECT id FROM employees WHERE username = ?',
      [username]
    );

    if (existingUser && existingUser.length > 0) {
      connection.release();
      return res.status(409).json({ message: 'Username already exists' });
    }

    // Resolve department id; must exist (creation via admin)
    const [drows] = await connection.query('SELECT id FROM departments WHERE name = ?', [department]);
    if (!drows || drows.length === 0) {
      connection.release();
      return res.status(400).json({ message: 'Department not found' });
    }
    const departmentId = drows[0].id;

    const [result] = await connection.query(
      `INSERT INTO employees (fullname, first_name, last_name, email, username, password, department_id, position, start_date, phone, role, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [fullname, first_name, last_name, email, username, hashedPassword, departmentId, position, start_date || new Date().toISOString().split('T')[0], phone || null, role || 'employee', 'active']
    );

    connection.release();

    res.status(201).json({
      message: 'Employee created',
      id: result.insertId
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

app.delete('/api/employees/:id', authenticateToken, async (req, res) => {
  try {
    // Check if admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied' });
    }

    const { id } = req.params;
    const connection = await pool.getConnection();

    const [result] = await connection.query(
      'DELETE FROM employees WHERE id = ?',
      [id]
    );

    connection.release();

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Employee not found' });
    }

    res.json({ message: 'Employee deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

app.put('/api/employees/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const isAdminOrHr = req.user.role === 'admin' || req.user.role === 'hr';

    // Permission: admin/hr can edit any employee, employee can only edit themselves
    if (!isAdminOrHr && parseInt(id) !== req.user.id) {
      return res.status(403).json({ message: 'Access denied - you can only edit your own profile' });
    }

    const connection = await pool.getConnection();
    await ensureDepartmentsTable(connection);
    await ensureEmployeesDepartmentId(connection);

    // Load existing values to avoid overwriting with NULL/undefined
    const [existingRows] = await connection.query(
      'SELECT id, fullname, first_name, last_name, email, phone, nickname, department_id, position, date_of_birth, address, emergency_contact_name, emergency_contact_relationship, emergency_contact_phone, start_date, role, status FROM employees WHERE id = ?',
      [id]
    );

    if (!existingRows || existingRows.length === 0) {
      connection.release();
      return res.status(404).json({ message: 'Employee not found' });
    }

    const existing = existingRows[0];

    const {
      fullname, first_name, last_name, email, phone, nickname,
      department, position, date_of_birth, address,
      emergency_contact_name, emergency_contact_relationship, emergency_contact_phone,
      start_date, role, status
    } = req.body;

    // Employees cannot modify role/status/start_date; admins/hr can. Also preserve existing when missing.
    const newRole = isAdminOrHr ? (role ?? existing.role) : existing.role;
    const newStatus = isAdminOrHr ? (status ?? existing.status) : existing.status;
    const newStartDate = isAdminOrHr ? (start_date ?? existing.start_date) : existing.start_date;

    // Resolve department id if department provided; otherwise keep existing
    let newDepartmentId = existing.department_id || null;
    if (department !== undefined) {
      if (department === null || department === '') {
        newDepartmentId = null;
      } else {
        const [drows] = await connection.query('SELECT id FROM departments WHERE name = ?', [department]);
        if (!drows || drows.length === 0) {
          connection.release();
          return res.status(400).json({ message: 'Department not found' });
        }
        newDepartmentId = drows[0].id;
      }
    }

    const [result] = await connection.query(
      `UPDATE employees SET 
        fullname = ?, first_name = ?, last_name = ?, email = ?, phone = ?, nickname = ?,
        department_id = ?, position = ?, date_of_birth = ?, address = ?,
        emergency_contact_name = ?, emergency_contact_relationship = ?, emergency_contact_phone = ?,
        start_date = ?, role = ?, status = ?
      WHERE id = ?`,
      [
        (fullname ?? existing.fullname),
        (first_name ?? existing.first_name),
        (last_name ?? existing.last_name),
        (email ?? existing.email),
        (phone ?? existing.phone),
        (nickname ?? existing.nickname),
        newDepartmentId,
        (position ?? existing.position),
        (date_of_birth ?? existing.date_of_birth),
        (address ?? existing.address),
        (emergency_contact_name ?? existing.emergency_contact_name),
        (emergency_contact_relationship ?? existing.emergency_contact_relationship),
        (emergency_contact_phone ?? existing.emergency_contact_phone),
        newStartDate,
        newRole,
        newStatus,
        id
      ]
    );

    connection.release();

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Employee not found' });
    }

    res.json({ message: 'Employee updated successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ===== Attendance =====
app.get('/api/attendance', authenticateToken, async (req, res) => {
  try {
    const { employee_id, date, start_date, end_date } = req.query;
    const connection = await pool.getConnection();

    let query = `SELECT a.id, a.employee_id, DATE_FORMAT(a.date, '%Y-%m-%d') as date, a.checkin_time, a.checkout_time, a.location, a.created_at,
                        e.fullname as employee_name
                 FROM attendance a
                 LEFT JOIN employees e ON a.employee_id = e.id`;
    let params = [];

    // Permission: employees can only see their own attendance
    // admin/hr can see all or specific employee
    if (req.user.role === 'employee') {
      query += ' WHERE a.employee_id = ?';
      params.push(req.user.id);
    } else if (employee_id) {
      query += ' WHERE a.employee_id = ?';
      params.push(employee_id);
    }

    // Add date filter if provided
    if (date) {
      query += params.length > 0 ? ' AND a.date = ?' : ' WHERE a.date = ?';
      params.push(date);
    } else if (start_date && end_date) {
      // Date range filter for calendar view
      query += params.length > 0 ? ' AND a.date BETWEEN ? AND ?' : ' WHERE a.date BETWEEN ? AND ?';
      params.push(start_date, end_date);
    }

    query += ' ORDER BY a.date DESC';

    const [rows] = await connection.query(query, params);
    connection.release();

    res.json({ attendance: rows || [] });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

app.post('/api/attendance', authenticateToken, async (req, res) => {
  try {
    const { employee_id, date, checkin_time, checkout_time, location } = req.body;
    const connection = await pool.getConnection();

    if (!employee_id || !date) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    const [result] = await connection.query(
      `INSERT INTO attendance (employee_id, date, checkin_time, checkout_time, location)
       VALUES (?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE 
       checkin_time = COALESCE(?, checkin_time),
       checkout_time = COALESCE(?, checkout_time)`,
      [employee_id, date, checkin_time || null, checkout_time || null, location || null,
       checkin_time, checkout_time]
    );

    connection.release();

    res.status(201).json({
      message: 'Attendance recorded',
      id: result.insertId
    });
  } catch (error) {
    console.error('Attendance error:', error);
    res.status(500).json({ message: error.message });
  }
});

// Update attendance (check-out)
app.put('/api/attendance/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { checkout_time } = req.body;
    const connection = await pool.getConnection();

    const [result] = await connection.query(
      `UPDATE attendance SET checkout_time = ? WHERE id = ?`,
      [checkout_time, id]
    );

    connection.release();

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Attendance not found' });
    }

    res.json({ message: 'Checkout recorded successfully' });
  } catch (error) {
    console.error('Checkout error:', error);
    res.status(500).json({ message: error.message });
  }
});

// ===== Shifts (Work Schedule) =====
// ===== Shift Templates (Template Setup) =====
app.get('/api/shift-templates', authenticateToken, async (req, res) => {
  try {
    const connection = await pool.getConnection();

    const [rows] = await connection.query(
      'SELECT id, shift_name, shift_start, shift_end, break_start, break_end, description, is_active FROM shifts WHERE is_active = 1 ORDER BY shift_name'
    );
    connection.release();

    res.json({ templates: rows || [] });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

app.post('/api/shift-templates', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin' && req.user.role !== 'hr') {
      return res.status(403).json({ message: 'Access denied' });
    }

    const { shift_name, shift_start, shift_end, break_start, break_end, description } = req.body;

    if (!shift_name || !shift_start || !shift_end) {
      return res.status(400).json({ message: 'Missing required fields: shift_name, shift_start, shift_end' });
    }

    const connection = await pool.getConnection();
    const [result] = await connection.query(
      'INSERT INTO shifts (shift_name, shift_start, shift_end, break_start, break_end, description, is_active) VALUES (?, ?, ?, ?, ?, ?, 1)',
      [shift_name, shift_start, shift_end, break_start || null, break_end || null, description || null]
    );
    connection.release();

    res.status(201).json({
      message: 'Shift template created successfully',
      id: result.insertId
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

app.put('/api/shift-templates/:id', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin' && req.user.role !== 'hr') {
      return res.status(403).json({ message: 'Access denied' });
    }

    const { id } = req.params;
    const { shift_name, shift_start, shift_end, break_start, break_end, description, is_active } = req.body;

    const connection = await pool.getConnection();
    const [result] = await connection.query(
      'UPDATE shifts SET shift_name = ?, shift_start = ?, shift_end = ?, break_start = ?, break_end = ?, description = ?, is_active = ? WHERE id = ?',
      [shift_name, shift_start, shift_end, break_start || null, break_end || null, description || null, is_active ? 1 : 0, id]
    );
    connection.release();

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Shift template not found' });
    }

    res.json({ message: 'Shift template updated successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ===== Working Shifts (Employee Work Schedule) =====
app.get('/api/shifts', authenticateToken, async (req, res) => {
  try {
    const { employee_id, start_date, end_date } = req.query;
    const connection = await pool.getConnection();

     let query = `SELECT ws.id, ws.employee_id, ws.shift_id, ws.start_date, ws.end_date, ws.note, 
                  s.shift_name, s.shift_start, s.shift_end,
                    e.fullname as employee_name, d.name as team
                 FROM working_shifts ws
                 LEFT JOIN shifts s ON ws.shift_id = s.id
                 LEFT JOIN employees e ON ws.employee_id = e.id
                 LEFT JOIN departments d ON e.department_id = d.id`;
    let params = [];

    // Permission: employees can only see their own shifts
    // admin/hr can see all shifts
    if (req.user.role === 'employee') {
      query += ' WHERE ws.employee_id = ?';
      params.push(req.user.id);
    } else if (employee_id) {
      query += ' WHERE ws.employee_id = ?';
      params.push(employee_id);
    }

    // Date range filters - check if shift overlaps with requested date range
    if (start_date && end_date) {
      query += params.length > 0 ? ' AND ws.start_date <= ? AND ws.end_date >= ?' : ' WHERE ws.start_date <= ? AND ws.end_date >= ?';
      params.push(end_date, start_date);
    } else if (start_date) {
      query += params.length > 0 ? ' AND ws.end_date >= ?' : ' WHERE ws.end_date >= ?';
      params.push(start_date);
    } else if (end_date) {
      query += params.length > 0 ? ' AND ws.start_date <= ?' : ' WHERE ws.start_date <= ?';
      params.push(end_date);
    }

    query += ' ORDER BY ws.start_date DESC';

    const [rows] = await connection.query(query, params);
    connection.release();

    res.json({ shifts: rows || [] });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

app.post('/api/shifts', authenticateToken, async (req, res) => {
  try {
    // Check if admin/hr
    if (req.user.role !== 'admin' && req.user.role !== 'hr') {
      return res.status(403).json({ message: 'Access denied' });
    }

    const { employee_id, shift_id, start_date, end_date, note, holidays } = req.body;

    if (!employee_id || !shift_id || !start_date || !end_date) {
      return res.status(400).json({ message: 'Missing required fields: employee_id, shift_id, start_date, end_date' });
    }

    const connection = await pool.getConnection();

    // Insert working shift record with date range and shift template reference
    const [result] = await connection.query(
      `INSERT INTO working_shifts (employee_id, shift_id, start_date, end_date, note)
       VALUES (?, ?, ?, ?, ?)`,
      [employee_id, shift_id, start_date, end_date, note || null]
    );

    console.log('Created working shift:', result.insertId, 'with template:', shift_id, 'from', start_date, 'to', end_date);

    // Save holidays if provided (linked to working shift with working_shift_id)
    if (holidays && Array.isArray(holidays) && holidays.length > 0) {
      const dayNames = ['อาทิตย์', 'จันทร์', 'อังคาร', 'พุธ', 'พฤหัสบดี', 'ศุกร์', 'เสาร์'];
      for (const dayOfWeek of holidays) {
        try {
          await connection.query(
            `INSERT INTO holidays (working_shift_id, employee_id, week_day, day_name) VALUES (?, ?, ?, ?)
             ON DUPLICATE KEY UPDATE day_name = day_name`,
            [result.insertId, employee_id, dayOfWeek, dayNames[dayOfWeek] || null]
          );
        } catch (err) {
          console.log('Holiday already exists:', err.message);
        }
      }
    }

    connection.release();

    res.status(201).json({
      message: 'Working shift created successfully',
      id: result.insertId
    });
  } catch (error) {
    console.error('Error creating working shift:', error);
    res.status(500).json({ message: error.message });
  }
});

app.put('/api/shifts/:id', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin' && req.user.role !== 'hr') {
      return res.status(403).json({ message: 'Access denied' });
    }

    const { id } = req.params;
    const { employee_id, shift_id, start_date, end_date, note, holidays } = req.body;

    const connection = await pool.getConnection();

    const [result] = await connection.query(
      `UPDATE working_shifts SET employee_id = ?, shift_id = ?, start_date = ?, end_date = ?, note = ? WHERE id = ?`,
      [employee_id, shift_id, start_date, end_date, note || null, id]
    );

    if (result.affectedRows === 0) {
      connection.release();
      return res.status(404).json({ message: 'Working shift not found' });
    }

    // Update holidays if provided (delete old ones and insert new ones)
    if (holidays && Array.isArray(holidays)) {
      // Delete existing holidays for this working shift
      await connection.query('DELETE FROM holidays WHERE working_shift_id = ?', [id]);
      
      // Insert new holidays if any
      if (holidays.length > 0) {
        const dayNames = ['อาทิตย์', 'จันทร์', 'อังคาร', 'พุธ', 'พฤหัสบดี', 'ศุกร์', 'เสาร์'];
        for (const dayOfWeek of holidays) {
          try {
            await connection.query(
              `INSERT INTO holidays (working_shift_id, employee_id, week_day, day_name) VALUES (?, ?, ?, ?)`,
              [id, employee_id, dayOfWeek, dayNames[dayOfWeek] || null]
            );
          } catch (err) {
            console.log('Holiday insert error:', err.message);
          }
        }
      }
    }

    connection.release();

    res.json({ message: 'Working shift updated' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

app.delete('/api/shifts/:id', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied' });
    }

    const { id } = req.params;
    const connection = await pool.getConnection();

    const [result] = await connection.query('DELETE FROM working_shifts WHERE id = ?', [id]);
    connection.release();

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Working shift not found' });
    }

    res.json({ message: 'Working shift deleted' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ===== Leave Requests =====
app.get('/api/leave-requests', authenticateToken, async (req, res) => {
  try {
    const { employee_id } = req.query;
    const connection = await pool.getConnection();

    let query = 'SELECT * FROM leave_requests';
    let params = [];

    // Permission: employees can only see their own leave requests
    // admin/hr can see all or specific employee
    if (req.user.role === 'employee') {
      query += ' WHERE employee_id = ?';
      params.push(req.user.id);
    } else if (employee_id) {
      query += ' WHERE employee_id = ?';
      params.push(employee_id);
    }

    query += ' ORDER BY created_at DESC';

    const [rows] = await connection.query(query, params);
    connection.release();

    res.json({ records: rows || [] });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

app.post('/api/leave-requests', authenticateToken, async (req, res) => {
  try {
    const { employee_id, date_from, date_to, leave_type, reason } = req.body;
    const connection = await pool.getConnection();

    const [result] = await connection.query(
      `INSERT INTO leave_requests (employee_id, date_from, date_to, leave_type, reason, status)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [employee_id, date_from, date_to, leave_type, reason || null, 'pending']
    );

    connection.release();

    res.status(201).json({
      message: 'Leave request created',
      id: result.insertId
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

app.put('/api/leave-requests/:id/approve', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin' && req.user.role !== 'hr' && req.user.role !== 'manager') {
      return res.status(403).json({ message: 'Access denied' });
    }

    const { status, notes } = req.body;
    const connection = await pool.getConnection();

    await connection.query(
      `UPDATE leave_requests SET status = ?, approved_by = ?, approved_at = NOW(), notes = ?
       WHERE id = ?`,
      [status, req.user.id, notes || null, req.params.id]
    );

    connection.release();

    res.json({ message: `Leave request ${status}` });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ===== Reports =====
app.get('/api/reports/attendance', authenticateToken, async (req, res) => {
  try {
    const { date_from, date_to } = req.query;
    const connection = await pool.getConnection();

    const [rows] = await connection.query(
      `SELECT e.fullname, a.date, a.time, a.location
       FROM attendance a
       JOIN employees e ON a.employee_id = e.id
       WHERE a.date BETWEEN ? AND ?
       ORDER BY a.date DESC`,
      [date_from, date_to]
    );

    connection.release();

    res.json({ records: rows || [] });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

app.get('/api/reports/leave', authenticateToken, async (req, res) => {
  try {
    const { date_from, date_to } = req.query;
    const connection = await pool.getConnection();

    const [rows] = await connection.query(
      `SELECT e.fullname, lr.leave_type, lr.date_from, lr.date_to, lr.status
       FROM leave_requests lr
       JOIN employees e ON lr.employee_id = e.id
       WHERE lr.date_from >= ? AND lr.date_to <= ?
       ORDER BY lr.date_from DESC`,
      [date_from, date_to]
    );

    connection.release();

    res.json({ records: rows || [] });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

app.get('/api/reports/payroll', authenticateToken, async (req, res) => {
  try {
    const { date_from, date_to } = req.query;
    const connection = await pool.getConnection();

    const [rows] = await connection.query(
      `SELECT e.fullname, p.month, p.base_salary, p.deductions, p.net_salary
       FROM payroll p
       JOIN employees e ON p.employee_id = e.id
       WHERE p.month BETWEEN ? AND ?
       ORDER BY p.month DESC`,
      [date_from, date_to]
    );

    connection.release();

    res.json({ records: rows || [] });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Health Check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK' });
});

// ===== Holidays Management =====
app.get('/api/holidays', authenticateToken, async (req, res) => {
  try {
    const { employee_id, working_shift_id } = req.query;
    const connection = await pool.getConnection();

    let query = 'SELECT h.*, s.shift_name FROM holidays h LEFT JOIN working_shifts ws ON h.working_shift_id = ws.id LEFT JOIN shifts s ON ws.shift_id = s.id';
    let params = [];

    if (working_shift_id) {
      query += ' WHERE h.working_shift_id = ?';
      params.push(working_shift_id);
    } else if (employee_id) {
      query += ' WHERE h.employee_id = ?';
      params.push(employee_id);
    } else if (req.user.role === 'employee') {
      query += ' WHERE h.employee_id = ?';
      params.push(req.user.id);
    }

    query += ' ORDER BY h.working_shift_id DESC, h.week_day ASC';

    const [rows] = await connection.query(query, params);
    connection.release();

    res.json({ holidays: rows || [] });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

app.post('/api/holidays', authenticateToken, async (req, res) => {
  try {
    const { working_shift_id, employee_id, week_day, day_name } = req.body;
    
    if (!working_shift_id || !employee_id || week_day === undefined) {
      return res.status(400).json({ message: 'Missing required fields: working_shift_id, employee_id, week_day' });
    }

    const connection = await pool.getConnection();

    const query = 'INSERT INTO holidays (working_shift_id, employee_id, week_day, day_name) VALUES (?, ?, ?, ?)';
    const [result] = await connection.query(query, [working_shift_id, employee_id, week_day, day_name]);

    connection.release();

    res.json({ 
      message: 'Holiday added successfully',
      id: result.insertId
    });
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ message: 'Holiday already exists for this working shift on this day' });
    }
    res.status(500).json({ message: error.message });
  }
});

app.delete('/api/holidays/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const connection = await pool.getConnection();

    const query = 'DELETE FROM holidays WHERE id = ?';
    const [result] = await connection.query(query, [id]);

    connection.release();

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Holiday not found' });
    }

    res.json({ message: 'Holiday deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Error Handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: 'Internal server error' });
});

// Start Server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

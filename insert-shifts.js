const mysql = require('mysql2/promise');

(async () => {
  const conn = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'chpfelaa00',
    database: 'hr_system'
  });
  
  try {
    // Insert shift with date range for Dec 12-30, 2025 for employee ID 1 (admin)
    const [result] = await conn.query(
      'INSERT INTO shifts (employee_id, start_date, end_date, shift_start, shift_end, shift_name, note) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [1, '2025-12-12', '2025-12-30', '09:00:00', '17:00:00', 'Morning Shift', 'Sample shift']
    );
    console.log('✓ Shift inserted with ID:', result.insertId);
    
    // Also insert for employee 2 (hrmanager)
    await conn.query(
      'INSERT INTO shifts (employee_id, start_date, end_date, shift_start, shift_end, shift_name, note) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [2, '2025-12-15', '2025-12-25', '10:00:00', '18:00:00', 'Evening Shift', 'HR Manager shift']
    );
    
    const [rows] = await conn.query(
      'SELECT COUNT(*) as cnt FROM shifts'
    );
    console.log('✓ Total shifts inserted:', rows[0].cnt);
    
  } catch (e) {
    console.log('Error:', e.message);
  } finally {
    conn.end();
  }
})();

const mysql = require('mysql2/promise');

(async () => {
  const conn = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'chpfelaa00',
    database: 'hr_system'
  });
  
  try {
    // Drop old shifts table
    await conn.query('DROP TABLE IF EXISTS shifts');
    console.log('✓ Dropped old shifts table');
    
    // Create new shifts table with start_date and end_date
    await conn.query(`
      CREATE TABLE shifts (
        id INT PRIMARY KEY AUTO_INCREMENT,
        employee_id INT NOT NULL,
        start_date DATE NOT NULL,
        end_date DATE NOT NULL,
        shift_start TIME NOT NULL,
        shift_end TIME NOT NULL,
        shift_name VARCHAR(50),
        note TEXT,
        
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        
        FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE,
        INDEX idx_employee_dates (employee_id, start_date, end_date)
      )
    `);
    console.log('✓ Created new shifts table with date ranges');
    
    // Insert sample data: Dec 12-30, 2025
    await conn.query(
      'INSERT INTO shifts (employee_id, start_date, end_date, shift_start, shift_end, shift_name, note) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [3, '2025-12-12', '2025-12-30', '08:00:00', '17:00:00', 'Morning Shift', 'Regular work schedule']
    );
    console.log('✓ Inserted sample shift: Dec 12-30');
    
    const [rows] = await conn.query('SELECT * FROM shifts WHERE employee_id = 3');
    console.log('Shifts for employee 3:', rows);
    
  } catch (e) {
    console.log('Error:', e.message);
  } finally {
    conn.end();
  }
})();

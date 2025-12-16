const mysql = require('mysql2/promise');

(async () => {
  const conn = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'chpfelaa00',
    database: 'hr_system'
  });
  
  try {
    const [rows] = await conn.query('SELECT id, fullname, username, role FROM employees');
    console.log('✓ Total employees:', rows.length);
    rows.forEach(e => {
      console.log('  ', e.id, '|', e.fullname, '|', e.username, '|', e.role);
    });
  } catch (e) {
    console.log('Error:', e.message);
  } finally {
    conn.end();
  }
})();

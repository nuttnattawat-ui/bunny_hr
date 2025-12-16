// Quick fix: restore 'employee' role for any employees with NULL role
const mysql = require('mysql2/promise');

(async () => {
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'chpfelaa00',
    database: 'hr_system'
  });

  try {
    const [rows] = await connection.query('SELECT COUNT(*) AS cnt FROM employees WHERE role IS NULL');
    const nullCount = rows?.[0]?.cnt ?? 0;
    console.log(`Found ${nullCount} employees with NULL role`);
    if (nullCount > 0) {
      const [res] = await connection.query("UPDATE employees SET role = 'employee' WHERE role IS NULL");
      console.log(`Updated ${res.affectedRows} employees to role='employee'`);
    } else {
      console.log('No NULL roles found.');
    }
  } catch (err) {
    console.error('Error fixing roles:', err.message);
  } finally {
    await connection.end();
  }
})();

// Quick fix: restore 'active' status for any employees with NULL status
const mysql = require('mysql2/promise');

(async () => {
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'chpfelaa00',
    database: 'hr_system'
  });

  try {
    const [rows] = await connection.query('SELECT COUNT(*) AS cnt FROM employees WHERE status IS NULL');
    const nullCount = rows?.[0]?.cnt ?? 0;
    console.log(`Found ${nullCount} employees with NULL status`);
    if (nullCount > 0) {
      const [res] = await connection.query("UPDATE employees SET status = 'active' WHERE status IS NULL");
      console.log(`Updated ${res.affectedRows} employees to status='active'`);
    } else {
      console.log('No NULL statuses found.');
    }
  } catch (err) {
    console.error('Error fixing statuses:', err.message);
  } finally {
    await connection.end();
  }
})();

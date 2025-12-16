const mysql = require('mysql2/promise');

(async () => {
  try {
    const connection = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: 'chpfelaa00',
      database: 'hr_system'
    });

    console.log('=== HOLIDAYS TABLE STRUCTURE ===');
    const [tableInfo] = await connection.query('DESCRIBE holidays');
    console.table(tableInfo);

    console.log('\n=== ALL HOLIDAYS DATA ===');
    const [holidays] = await connection.query(`
      SELECT h.*, e.fullname 
      FROM holidays h 
      LEFT JOIN employees e ON h.employee_id = e.id
      ORDER BY h.employee_id, h.week_day
    `);
    console.table(holidays);

    console.log('\n=== HOLIDAY COUNT BY EMPLOYEE ===');
    const [counts] = await connection.query(`
      SELECT e.id, e.fullname, COUNT(h.id) as holiday_count
      FROM employees e
      LEFT JOIN holidays h ON e.id = h.employee_id
      GROUP BY e.id, e.fullname
    `);
    console.table(counts);

    connection.end();
  } catch (err) {
    console.error('Error:', err.message);
  }
})();

const mysql = require('mysql2/promise');

(async () => {
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'chpfelaa00',
    database: 'hr_system'
  });

  try {
    // Get all employees
    const [employees] = await connection.query('SELECT id, fullname FROM employees WHERE first_name IS NULL OR first_name = ""');

    console.log(`Updating ${employees.length} employees...`);

    for (const emp of employees) {
      const nameParts = emp.fullname.trim().split(' ');
      const first_name = nameParts[0];
      const last_name = nameParts.slice(1).join(' ') || '';

      await connection.query(
        'UPDATE employees SET first_name = ?, last_name = ? WHERE id = ?',
        [first_name, last_name, emp.id]
      );

      console.log(`✓ ${emp.fullname} → first: "${first_name}", last: "${last_name}"`);
    }

    console.log(`\n✓ Updated ${employees.length} employees successfully!`);
  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    connection.end();
  }
})();

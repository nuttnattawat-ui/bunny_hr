const mysql = require('mysql2/promise');

(async () => {
  try {
    const connection = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: 'chpfelaa00',
      database: 'hr_system'
    });

    console.log('Deleting holidays for employee_id 3...');
    const [result] = await connection.query(
      'DELETE FROM holidays WHERE employee_id = 3'
    );
    
    console.log(`✓ Deleted ${result.affectedRows} holiday records`);
    
    // Verify
    const [remaining] = await connection.query('SELECT * FROM holidays');
    console.log('\nRemaining holidays:', remaining.length > 0 ? remaining : 'None');

    connection.end();
  } catch (err) {
    console.error('Error:', err.message);
  }
})();

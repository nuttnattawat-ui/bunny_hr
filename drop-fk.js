const mysql = require('mysql2/promise');

(async () => {
  const conn = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'chpfelaa00',
    database: 'hr_system'
  });
  
  try {
    // Show constraints on shifts table
    const [constraints] = await conn.query(`
      SELECT CONSTRAINT_NAME, COLUMN_NAME, REFERENCED_TABLE_NAME, REFERENCED_COLUMN_NAME
      FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
      WHERE TABLE_NAME = 'shifts' AND REFERENCED_TABLE_NAME IS NOT NULL
    `);
    
    console.log('Foreign keys on shifts table:');
    constraints.forEach(c => {
      console.log(`  - ${c.CONSTRAINT_NAME}: ${c.COLUMN_NAME} -> ${c.REFERENCED_TABLE_NAME}(${c.REFERENCED_COLUMN_NAME})`);
    });
    
    if (constraints.length > 0) {
      for (const c of constraints) {
        try {
          await conn.query(`ALTER TABLE shifts DROP FOREIGN KEY ${c.CONSTRAINT_NAME}`);
          console.log(`✓ Dropped: ${c.CONSTRAINT_NAME}`);
        } catch (e) {
          console.log(`✗ Failed to drop ${c.CONSTRAINT_NAME}: ${e.message}`);
        }
      }
    }
    
    // Now try to drop employee_id
    try {
      await conn.query('ALTER TABLE shifts DROP COLUMN employee_id');
      console.log('✓ Dropped employee_id column from shifts');
    } catch (e) {
      console.log(`Note: ${e.message}`);
    }
    
  } catch (err) {
    console.error('Error:', err.message);
  }
  
  conn.end();
})();

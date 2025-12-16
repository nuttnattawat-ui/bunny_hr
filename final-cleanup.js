const mysql = require('mysql2/promise');

(async () => {
  const conn = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'chpfelaa00',
    database: 'hr_system'
  });
  
  try {
    console.log('Final cleanup of shifts table...');
    
    // Remove employee_id if it still exists
    try {
      await conn.query('ALTER TABLE shifts DROP COLUMN employee_id');
      console.log('✓ Removed employee_id from shifts table');
    } catch (e) {
      if (e.message.includes('check that column/key exists')) {
        console.log('ℹ employee_id already removed');
      } else {
        console.log('Note: ', e.message);
      }
    }
    
    // Remove shift_id from holidays if it exists and isn't used as FK
    try {
      // Check if there are foreign keys on shift_id
      const [fks] = await conn.query(`
        SELECT CONSTRAINT_NAME FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE 
        WHERE TABLE_NAME = 'holidays' AND COLUMN_NAME = 'shift_id' AND REFERENCED_TABLE_NAME IS NOT NULL
      `);
      
      if (fks.length > 0) {
        // Drop foreign key first
        for (const fk of fks) {
          await conn.query(`ALTER TABLE holidays DROP FOREIGN KEY ${fk.CONSTRAINT_NAME}`);
          console.log(`✓ Dropped foreign key: ${fk.CONSTRAINT_NAME}`);
        }
      }
      
      // Now drop the column
      await conn.query('ALTER TABLE holidays DROP COLUMN shift_id');
      console.log('✓ Removed shift_id from holidays table');
    } catch (e) {
      if (e.message.includes('check that column/key exists')) {
        console.log('ℹ shift_id already removed from holidays');
      } else {
        console.log('Note:', e.message);
      }
    }
    
    console.log('\n✓ Cleanup complete!');
  } catch (err) {
    console.error('Error:', err.message);
  }
  
  conn.end();
})();

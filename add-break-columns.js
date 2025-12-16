const mysql = require('mysql2/promise');

(async () => {
  const conn = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'chpfelaa00',
    database: 'hr_system'
  });
  
  try {
    console.log('Adding break_start and break_end columns to shifts table...\n');
    
    // Add break_start
    try {
      await conn.query('ALTER TABLE shifts ADD COLUMN break_start TIME AFTER shift_start');
      console.log('✓ Added break_start column');
    } catch (e) {
      if (e.message.includes('Duplicate')) {
        console.log('✓ break_start column already exists');
      } else {
        throw e;
      }
    }
    
    // Add break_end
    try {
      await conn.query('ALTER TABLE shifts ADD COLUMN break_end TIME AFTER break_start');
      console.log('✓ Added break_end column');
    } catch (e) {
      if (e.message.includes('Duplicate')) {
        console.log('✓ break_end column already exists');
      } else {
        throw e;
      }
    }
    
    console.log('\n✓ Shifts table updated successfully!');
    
  } catch (err) {
    console.error('✗ Error:', err.message);
  }
  
  conn.end();
})();

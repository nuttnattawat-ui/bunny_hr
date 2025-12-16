const mysql = require('mysql2/promise');

(async () => {
  const conn = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'chpfelaa00',
    database: 'hr_system'
  });
  
  try {
    console.log('Updating holidays table structure...');
    
    // Add working_shift_id column if it doesn't exist
    try {
      await conn.query('ALTER TABLE holidays ADD COLUMN working_shift_id INT AFTER id');
      console.log('✓ Added working_shift_id column');
    } catch (e) {
      if (e.message.includes('Duplicate column')) {
        console.log('ℹ working_shift_id column already exists');
      } else {
        throw e;
      }
    }
    
    // Add foreign key if it doesn't exist
    try {
      await conn.query('ALTER TABLE holidays ADD FOREIGN KEY (working_shift_id) REFERENCES working_shifts(id) ON DELETE CASCADE');
      console.log('✓ Added foreign key constraint');
    } catch (e) {
      if (e.message.includes('Duplicate key name') || e.message.includes('already exists')) {
        console.log('ℹ Foreign key constraint already exists');
      } else {
        throw e;
      }
    }
    
    console.log('✓ holidays table structure updated');
  } catch (err) {
    console.error('Error:', err.message);
  }
  
  conn.end();
})();

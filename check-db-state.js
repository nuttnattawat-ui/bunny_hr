const mysql = require('mysql2/promise');

(async () => {
  const conn = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'chpfelaa00',
    database: 'hr_system'
  });
  
  try {
    // Check shifts table
    const [shiftsCols] = await conn.query('DESCRIBE shifts');
    console.log('=== SHIFTS table structure ===');
    shiftsCols.forEach(col => console.log(`${col.Field}: ${col.Type}`));
    
    // Count shifts data
    const [[{count}]] = await conn.query('SELECT COUNT(*) as count FROM shifts');
    console.log(`\nShifts records: ${count}`);
    
    // Check if working_shifts exists
    try {
      const [wsCols] = await conn.query('DESCRIBE working_shifts');
      console.log('\n✓ working_shifts table exists');
      const [[{wsCount}]] = await conn.query('SELECT COUNT(*) as wsCount FROM working_shifts');
      console.log(`working_shifts records: ${wsCount}`);
    } catch (e) {
      console.log('\n✗ working_shifts table does NOT exist');
    }
    
    // Check holidays
    try {
      const [holCols] = await conn.query('DESCRIBE holidays');
      console.log('\n=== HOLIDAYS table structure ===');
      holCols.forEach(col => console.log(`${col.Field}: ${col.Type}`));
    } catch (e) {
      console.log('\n✗ holidays table structure issue:', e.message);
    }
    
  } catch (err) {
    console.error('Error:', err.message);
  }
  
  conn.end();
})();

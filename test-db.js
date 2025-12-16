const mysql = require('mysql2/promise');

(async () => {
  try {
    const conn = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: 'chpfelaa00',
      database: 'hr_system'
    });
    
    console.log('✓ Database connection successful\n');
    
    // Try to get shift templates
    const [templates] = await conn.query('SELECT * FROM shifts WHERE is_active = 1');
    console.log(`✓ Shift templates found: ${templates.length}`);
    templates.forEach(t => {
      console.log(`  - ${t.shift_name} (${t.shift_start} - ${t.shift_end})`);
    });
    
    // Try to get working shifts
    const [wshifts] = await conn.query('SELECT ws.*, s.shift_name FROM working_shifts ws JOIN shifts s ON ws.shift_id = s.id');
    console.log(`\n✓ Working shifts found: ${wshifts.length}`);
    wshifts.forEach(ws => {
      console.log(`  - Employee ${ws.employee_id} assigned to ${ws.shift_name}`);
    });
    
    conn.end();
  } catch (err) {
    console.error('✗ Error:', err.message);
  }
})();

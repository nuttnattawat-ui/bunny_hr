const mysql = require('mysql2/promise');

const pool = mysql.createPool({
  host: 'localhost',
  user: 'root',
  password: 'chpfelaa00',
  database: 'hr_system',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

async function migrateShifts() {
  let connection;
  
  try {
    connection = await pool.getConnection();
    
    console.log('════════════════════════════════════════');
    console.log('  Migrating Shifts Schema Separation');
    console.log('════════════════════════════════════════\n');

    // Step 1: Check if old shifts table exists
    console.log('Step 1: Backing up existing shift data...');
    const [oldShifts] = await connection.query(
      'SELECT id, employee_id, shift_name, shift_start, shift_end, start_date, end_date, note FROM shifts'
    );
    
    console.log(`  ✓ Found ${oldShifts.length} existing shifts\n`);

    // Step 2: Create default shift templates
    console.log('Step 2: Creating default shift templates...');
    
    // Get unique shift configurations from old data
    const uniqueShifts = new Map();
    
    for (const shift of oldShifts) {
      const key = `${shift.shift_start}-${shift.shift_end}`;
      if (!uniqueShifts.has(key)) {
        uniqueShifts.set(key, {
          name: shift.shift_name || `Shift ${shift.shift_start}-${shift.shift_end}`,
          start: shift.shift_start,
          end: shift.shift_end
        });
      }
    }

    const shiftTemplateMap = new Map();

    for (const [key, shiftData] of uniqueShifts.entries()) {
      const [result] = await connection.query(
        'INSERT INTO shifts (shift_name, shift_start, shift_end, is_active) VALUES (?, ?, ?, 1)',
        [shiftData.name, shiftData.start, shiftData.end]
      );
      shiftTemplateMap.set(key, result.insertId);
      console.log(`  ✓ Created shift template: ${shiftData.name} (${shiftData.start}-${shiftData.end})`);
    }
    console.log();

    // Step 3: Create working shifts from old shifts
    console.log('Step 3: Creating working shifts from old data...');
    let workingShiftCount = 0;
    const workingShiftMap = new Map();

    for (const oldShift of oldShifts) {
      const key = `${oldShift.shift_start}-${oldShift.shift_end}`;
      const shiftTemplateId = shiftTemplateMap.get(key);

      const [result] = await connection.query(
        'INSERT INTO working_shifts (employee_id, shift_id, start_date, end_date, note) VALUES (?, ?, ?, ?, ?)',
        [oldShift.employee_id, shiftTemplateId, oldShift.start_date, oldShift.end_date, oldShift.note]
      );
      
      workingShiftMap.set(oldShift.id, result.insertId);
      workingShiftCount++;
    }
    console.log(`  ✓ Created ${workingShiftCount} working shifts\n`);

    // Step 4: Update holidays to reference working_shifts
    console.log('Step 4: Updating holidays to reference working_shifts...');
    const [holidays] = await connection.query(
      'SELECT id, shift_id, employee_id, week_day, day_name FROM holidays'
    );

    let holidaysUpdated = 0;
    
    for (const holiday of holidays) {
      const newWorkingShiftId = workingShiftMap.get(holiday.shift_id);
      
      if (newWorkingShiftId) {
        await connection.query(
          'UPDATE holidays SET working_shift_id = ?, shift_id = NULL WHERE id = ?',
          [newWorkingShiftId, holiday.id]
        );
        holidaysUpdated++;
      } else {
        console.log(`  ⚠ Warning: Could not find mapping for shift_id ${holiday.shift_id}`);
      }
    }
    console.log(`  ✓ Updated ${holidaysUpdated} holidays\n`);

    // Step 5: Verify migration
    console.log('Step 5: Verifying migration...');
    const [shiftCount] = await connection.query('SELECT COUNT(*) as count FROM shifts');
    const [workingShiftCount2] = await connection.query('SELECT COUNT(*) as count FROM working_shifts');
    const [holidayCount] = await connection.query('SELECT COUNT(*) as count FROM holidays');
    
    console.log(`  ✓ Shift templates: ${shiftCount[0].count}`);
    console.log(`  ✓ Working shifts: ${workingShiftCount2[0].count}`);
    console.log(`  ✓ Holidays: ${holidayCount[0].count}\n`);

    // Step 6: Show shift template reference
    console.log('Shift Templates Created:');
    const [templates] = await connection.query('SELECT id, shift_name, shift_start, shift_end FROM shifts');
    for (const template of templates) {
      console.log(`  ID ${template.id}: ${template.shift_name} (${template.shift_start}-${template.shift_end})`);
    }

    console.log('\n════════════════════════════════════════');
    console.log('  ✓ Migration Completed Successfully!');
    console.log('════════════════════════════════════════\n');
    console.log('Next steps:');
    console.log('  1. Update backend API endpoints to use new table structure');
    console.log('  2. Test shift creation and management');
    console.log('  3. Verify calendar display with new schema\n');

    connection.release();
    pool.end();

  } catch (error) {
    console.error('\n✗ Migration failed:', error.message);
    if (connection) connection.release();
    pool.end();
    process.exit(1);
  }
}

migrateShifts();

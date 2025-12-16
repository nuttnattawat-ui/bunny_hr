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

async function migrateToNewSchema() {
  let connection;
  
  try {
    connection = await pool.getConnection();
    
    console.log('════════════════════════════════════════');
    console.log('  Migrating to New Shift Schema');
    console.log('════════════════════════════════════════\n');

    // Step 1: Get all existing shifts
    console.log('Step 1: Reading existing shifts...');
    const [oldShifts] = await connection.query(
      'SELECT id, employee_id, shift_name, shift_start, shift_end, start_date, end_date, note FROM shifts WHERE employee_id IS NOT NULL'
    );
    
    console.log(`  ✓ Found ${oldShifts.length} employee shifts\n`);

    // Step 2: Create shift templates (unique configurations)
    console.log('Step 2: Creating shift templates...');
    
    const uniqueConfigs = new Map();
    for (const shift of oldShifts) {
      const key = `${shift.shift_start}-${shift.shift_end}-${shift.shift_name}`;
      if (!uniqueConfigs.has(key)) {
        uniqueConfigs.set(key, {
          name: shift.shift_name,
          start: shift.shift_start,
          end: shift.shift_end
        });
      }
    }

    const templateMap = new Map();
    for (const [key, template] of uniqueConfigs.entries()) {
      // Check if this template already exists
      const [[existing]] = await connection.query(
        'SELECT id FROM shifts WHERE shift_start = ? AND shift_end = ? AND shift_name = ? LIMIT 1',
        [template.start, template.end, template.name]
      );
      
      if (existing) {
        templateMap.set(key, existing.id);
        console.log(`  ✓ Template already exists: ${template.name} (${template.start}-${template.end})`);
      } else {
        // Insert new template - but first delete any old data with employee_id
        const [result] = await connection.query(
          'INSERT INTO shifts (shift_name, shift_start, shift_end) VALUES (?, ?, ?)',
          [template.name, template.start, template.end]
        );
        templateMap.set(key, result.insertId);
        console.log(`  ✓ Created: ${template.name} (${template.start}-${template.end})`);
      }
    }
    console.log();

    // Step 3: Migrate old shifts to working_shifts
    console.log('Step 3: Creating working shifts...');
    let createdCount = 0;
    const wsMap = new Map();

    for (const oldShift of oldShifts) {
      const key = `${oldShift.shift_start}-${oldShift.shift_end}-${oldShift.shift_name}`;
      const templateId = templateMap.get(key);

      const [result] = await connection.query(
        'INSERT INTO working_shifts (employee_id, shift_id, start_date, end_date, note) VALUES (?, ?, ?, ?, ?)',
        [oldShift.employee_id, templateId, oldShift.start_date, oldShift.end_date, oldShift.note || null]
      );
      
      wsMap.set(oldShift.id, result.insertId);
      createdCount++;
    }
    console.log(`  ✓ Created ${createdCount} working shifts\n`);

    // Step 4: Update holidays to reference working_shifts
    console.log('Step 4: Updating holidays...');
    const [oldHolidays] = await connection.query(
      'SELECT id, shift_id, employee_id, week_day, day_name FROM holidays WHERE shift_id IS NOT NULL'
    );

    let updatedCount = 0;
    for (const holiday of oldHolidays) {
      const newWSId = wsMap.get(holiday.shift_id);
      if (newWSId) {
        await connection.query(
          'UPDATE holidays SET working_shift_id = ? WHERE id = ?',
          [newWSId, holiday.id]
        );
        updatedCount++;
      }
    }
    console.log(`  ✓ Updated ${updatedCount} holiday references\n`);

    // Step 5: Remove old employee_id and shift_id columns from shifts table
    console.log('Step 5: Cleaning up old shifts table structure...');
    try {
      await connection.query('ALTER TABLE shifts DROP COLUMN employee_id');
      console.log('  ✓ Removed employee_id column');
    } catch (e) {
      console.log('  ℹ employee_id column already removed or doesn\'t exist');
    }
    
    try {
      await connection.query('ALTER TABLE shifts DROP COLUMN start_date');
      console.log('  ✓ Removed start_date column');
    } catch (e) {
      console.log('  ℹ start_date column already removed or doesn\'t exist');
    }
    
    try {
      await connection.query('ALTER TABLE shifts DROP COLUMN end_date');
      console.log('  ✓ Removed end_date column');
    } catch (e) {
      console.log('  ℹ end_date column already removed or doesn\'t exist');
    }

    try {
      await connection.query('ALTER TABLE shifts DROP COLUMN note');
      console.log('  ✓ Removed note column');
    } catch (e) {
      console.log('  ℹ note column already removed or doesn\'t exist');
    }

    // Add is_active if it doesn't exist
    try {
      await connection.query('ALTER TABLE shifts ADD COLUMN is_active BOOLEAN DEFAULT 1');
      console.log('  ✓ Added is_active column');
    } catch (e) {
      if (e.message.includes('Duplicate')) {
        console.log('  ℹ is_active column already exists');
      } else {
        throw e;
      }
    }

    console.log();

    // Step 6: Summary
    console.log('════════════════════════════════════════');
    console.log('  ✓ MIGRATION COMPLETE');
    console.log('════════════════════════════════════════');
    console.log(`  • Shift Templates: ${templateMap.size}`);
    console.log(`  • Working Shifts: ${createdCount}`);
    console.log(`  • Holidays Updated: ${updatedCount}`);
    console.log();

  } catch (err) {
    console.error('\n✗ Migration failed:', err.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

migrateToNewSchema();

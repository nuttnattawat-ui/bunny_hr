#!/usr/bin/env node

/**
 * Migration: Link Holidays to Shifts
 * This migration modifies the holidays table to be linked to shifts instead of being independent
 * When a shift is deleted, its holidays are automatically deleted (CASCADE)
 */

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

async function migrate() {
  const connection = await pool.getConnection();
  
  try {
    console.log('🔄 Starting migration: Link Holidays to Shifts...\n');

    // Step 1: Drop existing holidays table (if it exists)
    console.log('Step 1: Dropping existing holidays table...');
    await connection.query('DROP TABLE IF EXISTS holidays');
    console.log('✓ Dropped old holidays table\n');

    // Step 2: Create new holidays table with shift_id foreign key
    console.log('Step 2: Creating new holidays table with shift_id...');
    const createHolidaysSQL = `
      CREATE TABLE holidays (
        id INT PRIMARY KEY AUTO_INCREMENT,
        shift_id INT NOT NULL,
        employee_id INT NOT NULL,
        week_day INT NOT NULL,
        day_name VARCHAR(20),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        
        FOREIGN KEY (shift_id) REFERENCES shifts(id) ON DELETE CASCADE,
        FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE,
        INDEX idx_shift (shift_id),
        INDEX idx_employee (employee_id),
        UNIQUE KEY unique_shift_day (shift_id, week_day)
      )
    `;
    await connection.query(createHolidaysSQL);
    console.log('✓ Created new holidays table with shift_id foreign key\n');

    // Step 3: Verify the structure
    console.log('Step 3: Verifying table structure...');
    const [columns] = await connection.query(
      'SELECT COLUMN_NAME, COLUMN_TYPE, IS_NULLABLE, COLUMN_KEY FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = "holidays" AND TABLE_SCHEMA = "hr_system"'
    );
    console.log('✓ Holidays table structure:');
    columns.forEach(col => {
      console.log(`  - ${col.COLUMN_NAME}: ${col.COLUMN_TYPE} (Nullable: ${col.IS_NULLABLE}, Key: ${col.COLUMN_KEY || 'None'})`);
    });
    console.log('');

    // Step 4: Verify foreign keys
    console.log('Step 4: Verifying foreign key constraints...');
    const [fks] = await connection.query(`
      SELECT CONSTRAINT_NAME, TABLE_NAME, COLUMN_NAME, REFERENCED_TABLE_NAME, REFERENCED_COLUMN_NAME
      FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
      WHERE TABLE_NAME = 'holidays' AND TABLE_SCHEMA = 'hr_system'
    `);
    console.log('✓ Foreign keys configured:');
    fks.forEach(fk => {
      if (fk.REFERENCED_TABLE_NAME) {
        console.log(`  - ${fk.CONSTRAINT_NAME}: ${fk.COLUMN_NAME} → ${fk.REFERENCED_TABLE_NAME}.${fk.REFERENCED_COLUMN_NAME}`);
      }
    });
    console.log('');

    // Step 5: Summary
    console.log('✅ Migration completed successfully!\n');
    console.log('Summary of changes:');
    console.log('  • Holidays table now has shift_id foreign key');
    console.log('  • Holidays are linked to specific shifts');
    console.log('  • When a shift is deleted, its holidays are automatically deleted (ON DELETE CASCADE)');
    console.log('  • Unique constraint prevents duplicate holidays for same week_day in a shift\n');

  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    process.exit(1);
  } finally {
    await connection.release();
    await pool.end();
  }
}

migrate();

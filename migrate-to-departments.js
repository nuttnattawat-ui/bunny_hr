const mysql = require('mysql2/promise');
require('dotenv').config();

async function migrate() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || 'chpfelaa00',
    database: process.env.DB_NAME || 'hr_system'
  });

  console.log('🔄 Starting departments table migration...\n');

  try {
    // 1. Create departments table
    console.log('1️⃣ Creating departments table...');
    await connection.query(`
      CREATE TABLE IF NOT EXISTS departments (
        id INT PRIMARY KEY AUTO_INCREMENT,
        name VARCHAR(255) NOT NULL UNIQUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✓ Departments table created\n');

    // 2. Check if department_id column exists
    console.log('2️⃣ Checking employees.department_id column...');
    const [cols] = await connection.query(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = 'hr_system' 
        AND TABLE_NAME = 'employees' 
        AND COLUMN_NAME = 'department_id'
    `);
    
    if (cols.length === 0) {
      console.log('   Adding department_id column...');
      await connection.query('ALTER TABLE employees ADD COLUMN department_id INT NULL');
      console.log('✓ Added department_id column\n');
    } else {
      console.log('✓ department_id column already exists\n');
    }

    // 3. Backfill departments table from existing employee departments
    console.log('3️⃣ Backfilling departments...');
    const [depts] = await connection.query(`
      SELECT DISTINCT department 
      FROM employees 
      WHERE department IS NOT NULL AND department <> ''
    `);
    
    for (const row of depts) {
      try {
        await connection.query('INSERT IGNORE INTO departments (name) VALUES (?)', [row.department]);
        console.log(`   ✓ Added department: ${row.department}`);
      } catch (err) {
        if (err.code !== 'ER_DUP_ENTRY') {
          console.log(`   ⚠ Could not add ${row.department}: ${err.message}`);
        }
      }
    }
    console.log('✓ Departments backfilled\n');

    // 4. Link employees to departments via department_id
    console.log('4️⃣ Linking employees to departments...');
    await connection.query(`
      UPDATE employees e
      LEFT JOIN departments d ON d.name = e.department
      SET e.department_id = d.id
      WHERE e.department_id IS NULL 
        AND e.department IS NOT NULL 
        AND e.department <> ''
    `);
    const [linked] = await connection.query('SELECT COUNT(*) as count FROM employees WHERE department_id IS NOT NULL');
    console.log(`✓ Linked ${linked[0].count} employees to departments\n`);

    // 5. Add foreign key constraint
    console.log('5️⃣ Adding foreign key constraint...');
    const [fks] = await connection.query(`
      SELECT CONSTRAINT_NAME 
      FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE 
      WHERE TABLE_SCHEMA = 'hr_system' 
        AND TABLE_NAME = 'employees' 
        AND CONSTRAINT_NAME = 'fk_employees_department_id'
    `);
    
    if (fks.length === 0) {
      await connection.query(`
        ALTER TABLE employees
        ADD CONSTRAINT fk_employees_department_id
        FOREIGN KEY (department_id) REFERENCES departments(id)
        ON UPDATE CASCADE ON DELETE SET NULL
      `);
      console.log('✓ Foreign key added\n');
    } else {
      console.log('✓ Foreign key already exists\n');
    }

    // 6. Drop old department column
    console.log('6️⃣ Dropping legacy department column...');
    const [depCols] = await connection.query(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = 'hr_system' 
        AND TABLE_NAME = 'employees' 
        AND COLUMN_NAME = 'department'
    `);
    
    if (depCols.length > 0) {
      // First drop the index
      try {
        await connection.query('ALTER TABLE employees DROP INDEX idx_department');
      } catch (err) {
        // Index might not exist
      }
      
      await connection.query('ALTER TABLE employees DROP COLUMN department');
      console.log('✓ Dropped legacy department column\n');
    } else {
      console.log('✓ Legacy department column already removed\n');
    }

    // 7. Add first_name and last_name if missing
    console.log('7️⃣ Ensuring first_name and last_name columns...');
    const [nameCols] = await connection.query(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = 'hr_system' 
        AND TABLE_NAME = 'employees' 
        AND COLUMN_NAME IN ('first_name', 'last_name')
    `);
    
    const hasFirstName = nameCols.some(c => c.COLUMN_NAME === 'first_name');
    const hasLastName = nameCols.some(c => c.COLUMN_NAME === 'last_name');
    
    if (!hasFirstName) {
      await connection.query('ALTER TABLE employees ADD COLUMN first_name VARCHAR(255) AFTER fullname');
      console.log('✓ Added first_name column');
    }
    if (!hasLastName) {
      await connection.query('ALTER TABLE employees ADD COLUMN last_name VARCHAR(255) AFTER first_name');
      console.log('✓ Added last_name column');
    }
    if (hasFirstName && hasLastName) {
      console.log('✓ Name columns already exist');
    }
    console.log('');

    // 8. Show final state
    console.log('📊 Final state:');
    const [finalDepts] = await connection.query('SELECT COUNT(*) as count FROM departments');
    const [finalEmps] = await connection.query('SELECT COUNT(*) as count FROM employees WHERE department_id IS NOT NULL');
    console.log(`   Departments: ${finalDepts[0].count}`);
    console.log(`   Employees linked: ${finalEmps[0].count}`);
    
    const [deptList] = await connection.query('SELECT name FROM departments ORDER BY name');
    console.log('\n📋 Departments in system:');
    deptList.forEach(d => console.log(`   - ${d.name}`));

    console.log('\n✅ Migration completed successfully!');

  } catch (error) {
    console.error('\n❌ Migration failed:', error.message);
    throw error;
  } finally {
    await connection.end();
  }
}

migrate().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});

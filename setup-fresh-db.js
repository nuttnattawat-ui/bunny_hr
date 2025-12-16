const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
require('dotenv').config();

async function setupFreshDatabase() {
  let connection;
  
  try {
    console.log('🔄 Creating fresh hr_system database...\n');
    
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || 'chpfelaa00',
      database: 'hr_system'
    });

    // Create all tables
    console.log('1️⃣ Creating employees table...');
    await connection.query(`
      CREATE TABLE IF NOT EXISTS employees (
        id INT PRIMARY KEY AUTO_INCREMENT,
        fullname VARCHAR(255) NOT NULL,
        first_name VARCHAR(255),
        last_name VARCHAR(255),
        nickname VARCHAR(100),
        email VARCHAR(255) UNIQUE NOT NULL,
        phone VARCHAR(20),
        username VARCHAR(100) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        
        department_id INT NULL,
        position VARCHAR(100),
        start_date DATE,
        
        date_of_birth DATE,
        id_card VARCHAR(20),
        address TEXT,
        
        emergency_contact_name VARCHAR(255),
        emergency_contact_relationship VARCHAR(100),
        emergency_contact_phone VARCHAR(20),
        
        bank_name VARCHAR(100),
        bank_account VARCHAR(50),
        
        photo_url VARCHAR(500),
        id_card_url VARCHAR(500),
        contract_url VARCHAR(500),
        
        role ENUM('admin', 'hr', 'manager', 'employee') DEFAULT 'employee',
        status ENUM('active', 'inactive', 'terminated') DEFAULT 'active',
        
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        
        INDEX idx_status (status),
        INDEX idx_role (role)
      )
    `);
    console.log('✓ Employees table created\n');

    console.log('2️⃣ Creating departments table...');
    await connection.query(`
      CREATE TABLE IF NOT EXISTS departments (
        id INT PRIMARY KEY AUTO_INCREMENT,
        name VARCHAR(255) NOT NULL UNIQUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✓ Departments table created\n');

    console.log('3️⃣ Adding foreign key...');
    await connection.query(`
      ALTER TABLE employees
      ADD CONSTRAINT fk_employees_department_id
      FOREIGN KEY (department_id) REFERENCES departments(id)
      ON UPDATE CASCADE ON DELETE SET NULL
    `);
    console.log('✓ Foreign key added\n');

    console.log('4️⃣ Creating shifts table...');
    await connection.query(`
      CREATE TABLE IF NOT EXISTS shifts (
        id INT PRIMARY KEY AUTO_INCREMENT,
        shift_name VARCHAR(100) NOT NULL,
        shift_start TIME NOT NULL,
        shift_end TIME NOT NULL,
        break_start TIME,
        break_end TIME,
        description TEXT,
        is_active BOOLEAN DEFAULT 1,
        
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        
        INDEX idx_shift_name (shift_name),
        INDEX idx_is_active (is_active)
      )
    `);
    console.log('✓ Shifts table created\n');

    console.log('5️⃣ Creating working_shifts table...');
    await connection.query(`
      CREATE TABLE IF NOT EXISTS working_shifts (
        id INT PRIMARY KEY AUTO_INCREMENT,
        employee_id INT NOT NULL,
        shift_id INT NOT NULL,
        start_date DATE NOT NULL,
        end_date DATE NOT NULL,
        note TEXT,
        
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        
        FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE,
        FOREIGN KEY (shift_id) REFERENCES shifts(id) ON DELETE RESTRICT,
        INDEX idx_employee_dates (employee_id, start_date, end_date),
        INDEX idx_shift_id (shift_id),
        INDEX idx_date_range (start_date, end_date)
      )
    `);
    console.log('✓ Working shifts table created\n');

    console.log('6️⃣ Creating holidays table...');
    await connection.query(`
      CREATE TABLE IF NOT EXISTS holidays (
        id INT PRIMARY KEY AUTO_INCREMENT,
        working_shift_id INT NOT NULL,
        employee_id INT NOT NULL,
        week_day INT NOT NULL,
        day_name VARCHAR(20),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (working_shift_id) REFERENCES working_shifts(id) ON DELETE CASCADE,
        FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE,
        INDEX idx_working_shift (working_shift_id),
        INDEX idx_employee (employee_id),
        UNIQUE KEY unique_working_shift_day (working_shift_id, week_day)
      )
    `);
    console.log('✓ Holidays table created\n');

    console.log('7️⃣ Creating other tables...');
    
    await connection.query(`
      CREATE TABLE IF NOT EXISTS attendance (
        id INT PRIMARY KEY AUTO_INCREMENT,
        employee_id INT NOT NULL,
        date DATE NOT NULL,
        time TIME,
        location VARCHAR(255),
        note TEXT,
        checkin_time TIME,
        checkout_time TIME,
        checkin_photo LONGBLOB,
        checkout_photo LONGBLOB,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE,
        INDEX idx_employee_date (employee_id, date),
        UNIQUE KEY unique_daily_attendance (employee_id, date)
      )
    `);

    await connection.query(`
      CREATE TABLE IF NOT EXISTS leave_requests (
        id INT PRIMARY KEY AUTO_INCREMENT,
        employee_id INT NOT NULL,
        date_from DATE NOT NULL,
        date_to DATE NOT NULL,
        leave_type ENUM('personal', 'sick', 'vacation', 'unpaid', 'other') NOT NULL,
        reason TEXT,
        status ENUM('pending', 'approved', 'rejected', 'cancelled') DEFAULT 'pending',
        approved_by INT,
        approved_at DATETIME,
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE,
        FOREIGN KEY (approved_by) REFERENCES employees(id) ON DELETE SET NULL,
        INDEX idx_employee_status (employee_id, status),
        INDEX idx_date_range (date_from, date_to)
      )
    `);

    console.log('✓ Other tables created\n');

    // Insert default departments
    console.log('8️⃣ Creating default departments...');
    const defaultDepts = ['Admin', 'Human Resources', 'Sales', 'Marketing', 'IT', 'Finance', 'Operations'];
    for (const dept of defaultDepts) {
      await connection.query('INSERT IGNORE INTO departments (name) VALUES (?)', [dept]);
    }
    console.log('✓ Default departments created\n');

    // Get Admin department ID
    const [adminDept] = await connection.query('SELECT id FROM departments WHERE name = ?', ['Admin']);
    const adminDeptId = adminDept[0].id;

    const [hrDept] = await connection.query('SELECT id FROM departments WHERE name = ?', ['Human Resources']);
    const hrDeptId = hrDept[0].id;

    // Insert default users
    console.log('9️⃣ Creating default users...');
    const adminPass = await bcrypt.hash('admin123', 10);
    const hrPass = await bcrypt.hash('hr123', 10);

    await connection.query(`
      INSERT INTO employees (fullname, first_name, last_name, email, username, password, department_id, position, role, status, start_date)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURDATE())
      ON DUPLICATE KEY UPDATE password = VALUES(password)
    `, ['Administrator', 'Admin', '', 'admin@bunnyphone.com', 'admin', adminPass, adminDeptId, 'System Admin', 'admin', 'active']);

    await connection.query(`
      INSERT INTO employees (fullname, first_name, last_name, email, username, password, department_id, position, role, status, start_date)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURDATE())
      ON DUPLICATE KEY UPDATE password = VALUES(password)
    `, ['HR Manager', 'HR', 'Manager', 'hr@bunnyphone.com', 'hrmanager', hrPass, hrDeptId, 'HR Manager', 'hr', 'active']);

    console.log('✓ Default users created\n');

    console.log('✅ Database setup completed successfully!\n');
    console.log('📊 Database: hr_system');
    console.log('📋 Departments:', defaultDepts.join(', '));
    console.log('\n👤 Default Login:');
    console.log('   Admin    → username: admin      password: admin123');
    console.log('   HR       → username: hrmanager  password: hr123');
    console.log('\n⚠️  IMPORTANT: Change these credentials in production!\n');

    await connection.end();

  } catch (error) {
    console.error('\n❌ Setup failed:', error.message);
    if (connection) await connection.end();
    throw error;
  }
}

setupFreshDatabase().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});

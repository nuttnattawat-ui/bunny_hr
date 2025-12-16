const bcrypt = require('bcryptjs');
const mysql = require('mysql2/promise');
require('dotenv').config();

async function updateAdminPasswords() {
  try {
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || 'chpfelaa00',
      database: process.env.DB_NAME || 'hr_system'
    });

    console.log('🔐 Updating admin passwords...\n');

    // Hash the passwords
    const adminHash = await bcrypt.hash('admin123', 10);
    const hrHash = await bcrypt.hash('hr123', 10);

    console.log('✅ Password 1:', adminHash);
    console.log('✅ Password 2:', hrHash);
    console.log();

    // Update admin user
    await connection.query(
      'UPDATE employees SET password = ? WHERE username = ?',
      [adminHash, 'admin']
    );
    console.log('✅ Updated admin password');

    // Update hrmanager user
    await connection.query(
      'UPDATE employees SET password = ? WHERE username = ?',
      [hrHash, 'hrmanager']
    );
    console.log('✅ Updated hrmanager password');

    await connection.end();
    console.log('\n✅ Password update completed!');
    console.log('Test with: admin / admin123 or hrmanager / hr123');
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

updateAdminPasswords();

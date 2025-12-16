const mysql = require('mysql2/promise');
require('dotenv').config();

async function checkAdminUsers() {
  try {
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || 'chpfelaa00',
      database: process.env.DB_NAME || 'hr_system'
    });

    console.log('✅ Connected to database');

    const [rows] = await connection.query(
      "SELECT id, username, email, role, password FROM employees WHERE username IN ('admin', 'hrmanager');"
    );

    console.log('\n📊 Admin Users in Database:');
    if (rows.length === 0) {
      console.log('❌ No admin users found!');
    } else {
      rows.forEach(row => {
        console.log(`  Username: ${row.username}`);
        console.log(`  Role: ${row.role}`);
        console.log(`  Email: ${row.email}`);
        console.log(`  Password Hash: ${row.password?.substring(0, 50) || 'NULL'}...`);
        console.log();
      });
    }

    await connection.end();
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

checkAdminUsers();

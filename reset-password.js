const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || 'chpfelaa00',
  database: process.env.DB_NAME || 'hr_system',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

async function resetAdminPassword() {
  try {
    const connection = await pool.getConnection();
    
    // Hash the password
    const password = 'admin123';
    const hashedPassword = await bcrypt.hash(password, 10);
    
    console.log('🔄 Updating admin password...');
    console.log('Hashed password:', hashedPassword);
    
    const [result] = await connection.query(
      'UPDATE employees SET password = ? WHERE username = ?',
      [hashedPassword, 'admin']
    );
    
    connection.release();
    
    if (result.affectedRows > 0) {
      console.log('✅ Admin password updated successfully!');
      console.log('Username: admin');
      console.log('Password: admin123');
    } else {
      console.log('❌ Admin user not found');
    }
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

resetAdminPassword();

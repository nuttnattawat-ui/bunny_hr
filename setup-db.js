const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

async function setupDatabase() {
  let connection;
  try {
    console.log('🔄 Connecting to MySQL...');
    
    // First connection without database to create it
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      multipleStatements: true
    });

    console.log('✅ Connected to MySQL');
    
    // Read schema file
    const schemaPath = path.join(__dirname, 'database', 'schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf8');
    
    console.log('🔄 Creating database and tables...');
    
    // Execute schema
    await connection.query(schema);
    
    console.log('✅ Database setup completed successfully!');
    console.log('\n📊 Database: hr_system');
    console.log('👤 Default Users:');
    console.log('   - Username: admin, Password: admin123');
    console.log('   - Username: hrmanager, Password: hr123');
    console.log('\n⚠️  IMPORTANT: Change these credentials in production!');
    
    await connection.end();
  } catch (error) {
    console.error('❌ Error setting up database:', error.message);
    if (error.code === 'PROTOCOL_CONNECTION_LOST') {
      console.error('\n💡 MySQL is not running!');
      console.error('   On Windows: Open Services and start MySQL service');
      console.error('   Or use: net start MySQL80');
    }
    if (error.code === 'ER_ACCESS_DENIED_ERROR') {
      console.error('\n💡 Access denied - check your MySQL password in .env');
    }
    process.exit(1);
  }
}

setupDatabase();

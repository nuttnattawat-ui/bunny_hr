const fetch = require('node-fetch');

async function testLogin() {
  try {
    console.log('Testing login API...');
    const response = await fetch('http://localhost:3000/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: 'admin',
        password: 'admin123'
      })
    });

    console.log(`Status: ${response.status}`);
    const data = await response.json();
    
    if (response.ok) {
      console.log('✅ Login successful!');
      console.log(`Token: ${data.token.substring(0, 50)}...`);
      console.log(`User: ${JSON.stringify(data.user, null, 2)}`);
    } else {
      console.log(`❌ Login failed: ${data.message}`);
    }
  } catch (err) {
    console.error('❌ Error:', err.message);
  }
}

testLogin();

const axios = require('axios');

async function testConnection() {
  try {
    const response = await axios.get('http://localhost:5000/api/auth/test');
    console.log('Connection successful:', response.data);
  } catch (error) {
    if (error.code === 'ECONNREFUSED') {
      console.log('Server is not running or refusing connections');
    } else {
      console.log('Error:', error.message);
    }
  }
}

testConnection();

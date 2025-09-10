const axios = require('axios');

async function testRecalculateAPI() {
  try {
    // You'll need to get a valid token from your system
    // For this demo, I'll show how to call the API
    
    const courseId = '68bec2fbc1a9d9ac3fa6a393'; // The course from our test
    const token = 'YOUR_ADMIN_TOKEN_HERE'; // Replace with actual admin token
    
    console.log('🔄 Testing recalculate unit access API...');
    
    const response = await axios.post(
      `http://localhost:5000/api/unit/recalculate-access/${courseId}`,
      {},
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    console.log('✅ API Response:', response.data);
    
  } catch (error) {
    if (error.response) {
      console.error('❌ API Error:', error.response.status, error.response.data);
    } else {
      console.error('❌ Request Error:', error.message);
    }
  }
}

console.log('📝 To test the API manually:');
console.log('1. Login as admin/teacher to get a token');
console.log('2. Replace YOUR_ADMIN_TOKEN_HERE with the actual token');
console.log('3. Run this script again');
console.log('');
console.log('Or use the "Fix Unit Access" button in the admin dashboard!');

// Uncomment the line below and add a real token to test
// testRecalculateAPI();

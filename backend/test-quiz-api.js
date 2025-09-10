const axios = require('axios');

// Test configuration
const API_BASE = 'http://localhost:5000/api/student';

// Test data - replace with actual values from your database
const TEST_UNIT_ID = '68bffe017818abcf8b12a584'; // Replace with actual unit ID
const TEST_TOKEN = 'your-jwt-token-here'; // Replace with actual student JWT token

const testQuizAPI = async () => {
  try {
    console.log('🧪 Testing Quiz API Endpoints\n');
    
    // Test 1: Check quiz availability
    console.log('1️⃣ Testing quiz availability check...');
    const availabilityResponse = await axios.get(
      `${API_BASE}/unit/${TEST_UNIT_ID}/quiz/availability`,
      {
        headers: { Authorization: `Bearer ${TEST_TOKEN}` }
      }
    );
    console.log('✅ Availability Response:', availabilityResponse.data);
    
    if (!availabilityResponse.data.available) {
      console.log('❌ Quiz not available, stopping test');
      return;
    }
    
    // Test 2: Generate quiz
    console.log('\n2️⃣ Testing quiz generation...');
    const generateResponse = await axios.post(
      `${API_BASE}/unit/${TEST_UNIT_ID}/quiz/generate`,
      {},
      {
        headers: { Authorization: `Bearer ${TEST_TOKEN}` }
      }
    );
    console.log('✅ Generate Response:', generateResponse.data);
    
    const attemptId = generateResponse.data.attemptId;
    if (!attemptId) {
      console.log('❌ No attempt ID returned, stopping test');
      return;
    }
    
    // Test 3: Get quiz attempt
    console.log('\n3️⃣ Testing quiz attempt retrieval...');
    const attemptResponse = await axios.get(
      `${API_BASE}/quiz/attempt/${attemptId}`,
      {
        headers: { Authorization: `Bearer ${TEST_TOKEN}` }
      }
    );
    console.log('✅ Attempt Response:', attemptResponse.data);
    
    console.log('\n🎉 All tests passed! Quiz API is working correctly.');
    
  } catch (error) {
    console.error('❌ Test failed:', {
      message: error.message,
      status: error.response?.status,
      data: error.response?.data
    });
  }
};

// Helper function to get student token (you'll need to implement login)
const getStudentToken = async () => {
  try {
    const loginResponse = await axios.post('http://localhost:5000/api/auth/login', {
      email: 'student@example.com', // Replace with actual student email
      password: 'password123' // Replace with actual password
    });
    
    return loginResponse.data.token;
  } catch (error) {
    console.error('Login failed:', error.response?.data);
    return null;
  }
};

// Run the test
if (require.main === module) {
  console.log('Instructions:');
  console.log('1. Update TEST_UNIT_ID with a valid unit ID from your database');
  console.log('2. Update TEST_TOKEN with a valid student JWT token');
  console.log('3. Or implement the getStudentToken function with valid credentials\n');
  
  // Uncomment to run the test
  // testQuizAPI();
}

module.exports = { testQuizAPI, getStudentToken };

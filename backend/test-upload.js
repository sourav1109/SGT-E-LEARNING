const fs = require('fs');
const FormData = require('form-data');
const axios = require('axios');

async function testBulkUpload() {
  try {
    // First, let's login as admin to get a token
    const loginResponse = await axios.post('http://localhost:5000/api/auth/login', {
      email: 'sourav11092002@gmail.com',
      password: 'Admin@1234'
    });
    
    const token = loginResponse.data.token;
    console.log('Login successful, token obtained');
    
    // Create form data for file upload
    const form = new FormData();
    form.append('file', fs.createReadStream('./test-students.csv'));
    
    // Make the bulk upload request
    const uploadResponse = await axios.post('http://localhost:5000/api/admin/student/bulk', form, {
      headers: {
        ...form.getHeaders(),
        'Authorization': `Bearer ${token}`
      }
    });
    
    console.log('Upload successful:', uploadResponse.data);
    
  } catch (error) {
    console.error('Error details:', {
      message: error.message,
      response: error.response?.data,
      status: error.response?.status,
      statusText: error.response?.statusText
    });
  }
}

testBulkUpload();

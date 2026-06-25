const axios = require('axios');

async function createOTMPSUser() {
  try {
    const response = await axios.post('http://localhost:5000/api/auth/register', {
      email: 'valenzuelahydie28@gmail.com',
      password: 'hydiev_28',
      role: 'otmps'
    });
    console.log('OTMPS user created successfully:', response.data);
  } catch (error) {
    console.error('Error creating OTMPS user:', error.response?.data || error.message);
  }
}

createOTMPSUser();

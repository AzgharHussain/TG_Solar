const axios = require('axios');

async function test() {
  try {
    const loginRes = await axios.post('http://localhost:5000/api/auth/login', {
      username: 'sarpanch_ram',
      password: 'Admin@123'
    });
    const token = loginRes.data.data.token;
    console.log('Logged in...');

    const dashRes = await axios.get('http://localhost:5000/api/dashboard/sarpanch', {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log('Dashboard response received:', Object.keys(dashRes.data.data));
  } catch (err) {
    if (err.response) {
      console.error('API Error:', err.response.status, err.response.data);
    } else {
      console.error('Crash Error:', err.message);
    }
  }
}

test();

async function test() {
  try {
    const loginRes = await fetch('http://localhost:5000/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: 'sarpanch_ram',
        password: 'Admin@123'
      })
    });
    
    if (!loginRes.ok) throw new Error("Login failed");
    
    const loginData = await loginRes.json();
    console.log("Login returned:", loginData);
    
    const token = loginData.token;
    console.log('Logged in...', token.substring(0, 10));

    const dashRes = await fetch('http://localhost:5000/api/dashboard/sarpanch', {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    if (!dashRes.ok) {
       console.log('Dashboard failed!', dashRes.status);
       const text = await dashRes.text();
       console.log('Error Text:', text);
       return;
    }
    
    const dashData = await dashRes.json();
    console.log('Dashboard data keys:', Object.keys(dashData));
    console.log('Internal data keys:', Object.keys(dashData.data || {}));
  } catch (err) {
    console.error('Crash Error:', err.message);
  }
}

test();

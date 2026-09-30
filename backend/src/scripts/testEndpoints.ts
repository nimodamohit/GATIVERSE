import 'dotenv/config';

async function testEndpoints() {
  console.log('Testing GET http://127.0.0.1:5000/api/data-provider/verify...');
  try {
    const resVerify = await fetch('http://127.0.0.1:5000/api/data-provider/verify');
    console.log('Verify Status Code:', resVerify.status);
    const jsonVerify = await resVerify.json();
    console.log('Verify Response:\n', JSON.stringify(jsonVerify, null, 2));
  } catch (err) {
    console.error('Verify error:', err);
  }

  console.log('\nTesting GET http://127.0.0.1:5000/api/live-trains/12952 (3 calls)...');
  for (let i = 1; i <= 3; i++) {
    try {
      const res = await fetch('http://127.0.0.1:5000/api/live-trains/12952');
      console.log(`\n--- Call #${i} ---`);
      console.log('HTTP status:', res.status);
      const body = await res.json();
      console.log('Response Body:\n', JSON.stringify(body, null, 2));
    } catch (err) {
      console.error(`Call #${i} error:`, err);
    }
  }
}

testEndpoints().catch(console.error);

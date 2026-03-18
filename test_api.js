const fetch = require('node-fetch');

async function test() {
  const email = "test12345@test.com"; // we can register this
  // 1. send OTP
  console.log("sending otp...");
  let res = await fetch('https://api.mysscguide.com/api/v1/auth/send-otp', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email })
  });
  console.log("send-otp:", await res.text());

  // Since we don't have the OTP to verify, we can just try to signup a random email and then login.
  const randEmail = `test_${Date.now()}@test.com`;
  const dummyPassword = `dummy_${randEmail.toLowerCase().trim()}_SSC123!`;
  
  console.log("signing up:", randEmail);
  res = await fetch('https://api.mysscguide.com/api/v1/auth/signup', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ fullName: "Test User", email: randEmail, password: dummyPassword })
  });
  console.log("signup:", await res.text());

  console.log("logging in:", randEmail);
  res = await fetch('https://api.mysscguide.com/api/v1/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: randEmail, password: dummyPassword })
  });
  console.log("login:", await res.status, await res.text());
}
test();

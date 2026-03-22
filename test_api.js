const fs = require('fs');

async function testFetch() {
  try {
    const res = await fetch('https://api.mysscguide.com/api/v1/challenges/public?type=public');
    const data = await res.json();
    fs.writeFileSync('c:\\Users\\kamde\\Desktop\\MySSCGuide\\test_api_node_resp.json', JSON.stringify(data, null, 2));
    console.log('Done writing node response');
  } catch (err) {
    console.error(err);
  }
}

testFetch();

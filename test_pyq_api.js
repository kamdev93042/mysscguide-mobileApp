const https = require('https');

const options = {
  hostname: 'api.mysscguide.com',
  path: '/api/v1/pyq/papers',
  method: 'GET'
};

const req = https.request(options, res => {
  let data = '';
  res.on('data', chunk => { data += chunk; });
  res.on('end', () => {
    try {
      const json = JSON.parse(data);
      const papers = json.data;
      if (papers && papers.length > 0) {
        const testId = papers[0]._id || papers[0].id;
        console.log(`Found paper ID: ${testId}, fetching /init...`);
        
        https.get(`https://api.mysscguide.com/api/v1/pyq/papers/${testId}/init`, initRes => {
           let iData = '';
           initRes.on('data', c => iData += c);
           initRes.on('end', () => {
             console.log(`Init response:`, iData.substring(0, 300));
             
             https.get(`https://api.mysscguide.com/api/v1/pyq/papers/${testId}/start`, startRes => {
               let sData = '';
               startRes.on('data', c => sData += c);
               startRes.on('end', () => {
                 const sJson = JSON.parse(sData);
                 console.log(`\nStart response keys:`, Object.keys(sJson));
                 if (sJson.data && sJson.data.questions) {
                   console.log(`\nFirst Question:\n`, JSON.stringify(sJson.data.questions[0], null, 2));
                 } else if (sJson.questions) {
                   console.log(`\nFirst Question:\n`, JSON.stringify(sJson.questions[0], null, 2));
                 } else {
                   console.log(`\nFull Start response (truncated):\n`, sData.substring(0, 1000));
                 }
               });
             });
           });
        });
      } else {
        console.log('No test papers found.');
      }
    } catch(e) {
      console.log('Error parsing papers:', e.message);
    }
  });
});
req.on('error', e => console.error(e));
req.end();

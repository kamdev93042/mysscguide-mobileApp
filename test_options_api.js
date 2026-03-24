const https = require('https');

https.get('https://api.mysscguide.com/api/v1/challenges/public?type=public', res => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    try {
      const json = JSON.parse(data);
      const challenges = json.data?.challenges || json.challenges;
      if (challenges && challenges.length > 0) {
        const testId = challenges[0].id || challenges[0]._id;
        console.log(`Found challenge ID: ${testId}, fetching /start...`);
        
        // Let's assume public challenge start is at /challenges/${testId}/start
        https.get(`https://api.mysscguide.com/api/v1/challenges/${testId}/start`, startRes => {
           let sData = '';
           startRes.on('data', c => sData += c);
           startRes.on('end', () => {
             try {
               const sJson = JSON.parse(sData);
               const questions = sJson.data?.questions || sJson.questions || [];
               if (questions.length > 0) {
                 const q = questions[0];
                 console.log("Q.options is array?", Array.isArray(q.options));
                 console.log("First question options format:\n", JSON.stringify(q.options, null, 2));
                 console.log("First question text format:\n", JSON.stringify(q.questionText || q.content, null, 2));
               } else {
                 console.log("No questions found. Response keys:", Object.keys(sJson));
               }
             } catch(e) {
               console.log("Failed parsing start", e.message);
             }
           });
        });
      }
    } catch(e) {
      console.log('Error parsing challenges:', e.message);
    }
  });
});

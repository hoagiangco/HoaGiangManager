const axios = require('axios');

async function testDailyReportList() {
  try {
    const response = await axios.get('http://localhost:3000/api/damage-reports/daily-report-list', {
      headers: {
        'Cookie': 'next-auth.session-token=...' // I don't have a token here, but I can check the code logic
      }
    });
    console.log(response.data);
  } catch (error) {
    console.error('Error status:', error.response?.status);
    console.error('Error data:', error.response?.data);
  }
}

// Since I can't easily run with auth, I'll just rely on the code review or try to run it if I can mock auth.
// Actually, I'll just check if the code builds.

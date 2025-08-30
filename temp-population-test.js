// Test comprehensive population for 2022/23 season
const fetch = require('node-fetch');

async function testComprehensivePopulation() {
  try {
    console.log('Testing comprehensive population for 2022/23...');
    
    const response = await fetch('http://localhost:5000/api/historical-player-stats/populate-all', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ season: '2022/23' })
    });
    
    const result = await response.json();
    console.log('Result:', result);
    
  } catch (error) {
    console.error('Error:', error);
  }
}

testComprehensivePopulation();
require('dotenv').config();
const express = require('express');
const fetch = require('node-fetch');
const path = require('path');

const app = express();

// connection bna diya
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static(path.join(__dirname, 'public')));

//api ki calling ki
const API_KEY = 'fecfb6c9b950e2035d6e6c9f69615ab9';
const API_URL = 'https://v3.football.api-sports.io/fixtures';

// Helper function to get date ranges
function getDateRanges() {
  const today = new Date();
  const dates = {
    today: [],
    next7: [],
    next15: []
  };
  
  // Today's date
  const todayStr = today.toISOString().split('T')[0];
  dates.today.push(todayStr);
  
  // Next 7 days (tomorrow to 7 days from now)
  for (let i = 1; i <= 7; i++) {
    const date = new Date(today);
    date.setDate(today.getDate() + i);
    dates.next7.push(date.toISOString().split('T')[0]);
  }
  
  // Next 15 days (8 to 15 days from now)
  for (let i = 8; i <= 15; i++) {
    const date = new Date(today);
    date.setDate(today.getDate() + i);
    dates.next15.push(date.toISOString().split('T')[0]);
  }
  
  return dates;
}

// Format fixture data
function formatFixture(match) {
  const { fixture, league, teams, goals, score } = match;
  return {
    id: fixture.id,
    date: new Date(fixture.date).toLocaleString(),
    status: fixture.status.short,
    venue: fixture.venue?.name || 'TBD',
    league: league.name,
    country: league.country,
    homeTeam: teams.home.name,
    awayTeam: teams.away.name,
    homeLogo: teams.home.logo,
    awayLogo: teams.away.logo,
    score: goals.home !== null ? `${goals.home}-${goals.away}` : 'VS',
    halftime: score.halftime?.home !== null ? 
      `${score.halftime.home}-${score.halftime.away}` : '-'
  };
}

app.get('/fixtures', async (req, res) => {
  try {
    const dateRanges = getDateRanges();
    const allDates = [...dateRanges.today, ...dateRanges.next7, ...dateRanges.next15];
    const fixturesData = {};
    
    // Fetch fixtures for all dates
    for (const date of allDates) {
      console.log(`Fetching fixtures for: ${date}`);
      const response = await fetch(`${API_URL}?date=${date}`, {
        headers: { 'x-apisports-key': API_KEY }
      });
      
      if (!response.ok) {
        console.error(`API error for ${date}: ${response.statusText}`);
        fixturesData[date] = [];
        continue;
      }
      
      const data = await response.json();
      fixturesData[date] = data.response?.map(formatFixture) || [];
    }
    
    // Categorize fixtures
    const categorized = {
      today: dateRanges.today.flatMap(date => fixturesData[date]),
      next7: dateRanges.next7.flatMap(date => fixturesData[date]),
      next15: dateRanges.next15.flatMap(date => fixturesData[date])
    };
    
    // Render the template
    res.render('fixtures', {
      todayDate: new Date().toLocaleDateString('en-US', { 
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' 
      }),
      categorized
    });
    
  } catch (error) {
    console.error('Server Error:', error);
    res.status(500).render('error', { error: error.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log(`Fixtures endpoint: http://localhost:${PORT}/fixtures`);
}); 

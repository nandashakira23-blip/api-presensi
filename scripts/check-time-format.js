/**
 * Check the actual time format returned by API
 */

const axios = require('axios');

const BASE_URL = 'http://192.168.1.102:3000/api';

async function checkTimeFormat() {
  try {
    console.log('=== CHECKING TIME FORMAT FROM API ===\n');

    // Login
    const loginResponse = await axios.post(`${BASE_URL}/auth/login`, {
      nik: '1111111111111111',
      pin: '1111'
    });

    const token = loginResponse.data.data?.tokens?.access_token;
    const employeeId = loginResponse.data.data?.employee?.id;

    // Get attendance status
    const statusResponse = await axios.get(`${BASE_URL}/attendance/status/${employeeId}`, {
      headers: { Authorization: `Bearer ${token}` }
    });

    const data = statusResponse.data.data;

    console.log('=== CHECK IN DATA ===');
    if (data.checkIn) {
      console.log('Full checkIn object:');
      console.log(JSON.stringify(data.checkIn, null, 2));
      console.log('\ncheckIn.time value:', data.checkIn.time);
      console.log('Type:', typeof data.checkIn.time);
      
      // Try to parse
      console.log('\n=== PARSING ATTEMPTS ===');
      
      // Method 1: Split by T
      const parts = data.checkIn.time.split('T');
      console.log('Split by T:', parts);
      
      if (parts.length >= 2) {
        const timePart = parts[1];
        console.log('Time part:', timePart);
        
        if (timePart.length >= 5) {
          const formatted = timePart.substring(0, 5);
          console.log('Formatted (HH:MM):', formatted);
        }
      }
      
    } else {
      console.log('No check-in data');
    }

    console.log('\n=== CHECK OUT DATA ===');
    if (data.checkOut) {
      console.log('Full checkOut object:');
      console.log(JSON.stringify(data.checkOut, null, 2));
    } else {
      console.log('No check-out data');
    }

  } catch (error) {
    console.error('Error:', error.message);
    if (error.response) {
      console.error('Response:', error.response.data);
    }
  }
}

checkTimeFormat();

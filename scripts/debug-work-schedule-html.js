const axios = require('axios');
const fs = require('fs');

async function debugWorkScheduleHTML() {
    try {
        console.log('Debugging work schedule page HTML...\n');
        
        // Login
        console.log('1. Logging in...');
        const loginResponse = await axios.post('http://localhost:3000/admin/login', {
            username: 'admin',
            password: 'admin123'
        }, {
            maxRedirects: 0,
            validateStatus: (status) => status < 400
        });
        
        const cookies = loginResponse.headers['set-cookie'];
        console.log('✓ Login successful');
        
        // Get page
        console.log('\n2. Getting work schedule page...');
        const pageResponse = await axios.get('http://localhost:3000/admin/work-schedule', {
            headers: {
                Cookie: cookies.join('; ')
            }
        });
        
        const html = pageResponse.data;
        
        // Save to file for inspection
        fs.writeFileSync('debug-work-schedule.html', html);
        console.log('✓ HTML saved to debug-work-schedule.html');
        
        // Check for key elements
        console.log('\n3. Checking HTML content:');
        console.log('- Contains "Jadwal Kerja":', html.includes('Jadwal Kerja'));
        console.log('- Contains "Morning Shift":', html.includes('Morning Shift'));
        console.log('- Contains "Belum ada jadwal kerja":', html.includes('Belum ada jadwal kerja'));
        console.log('- Contains schedule table:', html.includes('NAMA JADWAL'));
        
        // Extract schedule section
        const scheduleMatch = html.match(/<div class="bg-dark-800 rounded-xl shadow-2xl overflow-hidden border border-brown-600\/30">([\s\S]*?)<\/div>\s*<\/div>\s*<\/div>\s*<\/div>/);
        if (scheduleMatch) {
            const scheduleSection = scheduleMatch[0];
            console.log('\n4. Schedule section found, length:', scheduleSection.length);
            
            // Check if it has data
            if (scheduleSection.includes('Morning Shift')) {
                console.log('✓ Schedule section contains data');
            } else if (scheduleSection.includes('Belum ada jadwal kerja')) {
                console.log('✗ Schedule section shows empty state');
            }
        } else {
            console.log('\n4. Schedule section NOT found');
        }
        
        console.log('\n=== Debug Complete ===');
        console.log('Check debug-work-schedule.html file for full HTML');
        process.exit(0);
    } catch (error) {
        console.error('Error:', error.message);
        process.exit(1);
    }
}

debugWorkScheduleHTML();

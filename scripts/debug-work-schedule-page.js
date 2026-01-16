const axios = require('axios');

async function debugWorkSchedulePage() {
    try {
        console.log('=== Debugging Work Schedule Page ===\n');
        
        // First login to get session cookie
        console.log('1. Logging in as admin...');
        const loginResponse = await axios.post('http://localhost:3000/admin/login', {
            username: 'admin',
            password: 'admin123'
        }, {
            maxRedirects: 0,
            validateStatus: (status) => status < 400
        });
        
        const cookies = loginResponse.headers['set-cookie'];
        console.log('✓ Login successful\n');
        
        // Access work schedule page
        console.log('2. Fetching work schedule page...');
        const pageResponse = await axios.get('http://localhost:3000/admin/work-schedule', {
            headers: {
                Cookie: cookies.join('; ')
            }
        });
        
        console.log('✓ Page loaded (Status:', pageResponse.status, ')\n');
        
        // Check page content
        const html = pageResponse.data;
        
        console.log('3. Analyzing page content...\n');
        
        // Check for empty message
        const hasEmptyMessage = html.includes('Belum ada jadwal kerja');
        console.log('   "Belum ada jadwal kerja" found:', hasEmptyMessage);
        
        // Check for schedule names
        const hasScheduleData = html.includes('Morning Shift') || 
                               html.includes('Day Shift') || 
                               html.includes('Evening Shift');
        console.log('   Schedule data found:', hasScheduleData);
        
        // Check for table structure
        const hasTable = html.includes('<table') && html.includes('</table>');
        console.log('   Table structure found:', hasTable);
        
        // Check for error/success messages
        const hasError = html.includes('bg-red-900');
        const hasSuccess = html.includes('bg-green-900');
        console.log('   Error message:', hasError);
        console.log('   Success message:', hasSuccess);
        
        // Extract a sample of the tbody content
        const tbodyMatch = html.match(/<tbody[^>]*>([\s\S]*?)<\/tbody>/);
        if (tbodyMatch) {
            const tbodyContent = tbodyMatch[1].substring(0, 500);
            console.log('\n   Sample tbody content:');
            console.log('   ' + tbodyContent.replace(/\n/g, '\n   ').substring(0, 300) + '...');
        }
        
        console.log('\n=== Debug Complete ===');
        
        if (hasEmptyMessage && !hasScheduleData) {
            console.log('\n❌ PROBLEM: Page shows empty but database has data!');
            console.log('   The view is rendering the empty state instead of schedule data.');
        } else if (hasScheduleData) {
            console.log('\n✅ SUCCESS: Page is displaying schedule data correctly!');
        }
        
        process.exit(0);
    } catch (error) {
        console.error('\n❌ Error:', error.message);
        if (error.response) {
            console.error('   Status:', error.response.status);
        }
        process.exit(1);
    }
}

debugWorkSchedulePage();

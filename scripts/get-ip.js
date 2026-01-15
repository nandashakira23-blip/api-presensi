#!/usr/bin/env node

/**
 * Get Local IP Address for Android Testing
 * Helps find the correct IP to use in Android app
 */

const os = require('os');

function getLocalIPAddress() {
    const interfaces = os.networkInterfaces();
    const results = [];
    
    console.log('Network Interfaces for Android Testing:');
    console.log('='.repeat(50));
    
    for (const name of Object.keys(interfaces)) {
        for (const interface of interfaces[name]) {
            // Skip internal and non-IPv4 addresses
            if (interface.family === 'IPv4' && !interface.internal) {
                results.push({
                    name: name,
                    address: interface.address
                });
                
                console.log(`${name}: ${interface.address}`);
            }
        }
    }
    
    console.log('='.repeat(50));
    
    if (results.length > 0) {
        const primaryIP = results[0].address;
        console.log('Android Configuration:');
        console.log('');
        console.log('For Android Emulator:');
        console.log('   API_BASE_URL = "http://10.0.2.2:3000/api/"');
        console.log('');
        console.log('For Physical Device:');
        console.log(`   API_BASE_URL = "http://${primaryIP}:3000/api/"`);
        console.log('');
        console.log('Make sure:');
        console.log('1. Your phone and computer are on the same WiFi network');
        console.log('2. Windows Firewall allows connections on port 3000');
        console.log('3. Server is running with: npm run dev');
        console.log('');
        console.log('Test URLs:');
        console.log(`   Health Check: http://${primaryIP}:3000/api/health`);
        console.log(`   Admin Panel: http://${primaryIP}:3000/admin/login`);
        
    } else {
        console.log('No network interfaces found');
        console.log('Make sure you are connected to WiFi or Ethernet');
    }
    
    console.log('='.repeat(50));
}

getLocalIPAddress();

const fs = require('fs');
const path = require('path');

// Read admin.js
const adminPath = path.join(__dirname, '..', 'routes', 'admin.js');
let content = fs.readFileSync(adminPath, 'utf8');

console.log('Converting callback-style db.query to async/await...\n');

// Pattern 1: Simple db.query with callback
// db.query(query, (err, results) => { ... })
const pattern1 = /db\.query\(([^,]+),\s*\(err,\s*(\w+)\)\s*=>\s*\{/g;
let matches1 = 0;

// Pattern 2: db.query with params
// db.query(query, params, (err, results) => { ... })
const pattern2 = /db\.query\(([^,]+),\s*(\[[^\]]+\]),\s*\(err,\s*(\w+)\)\s*=>\s*\{/g;
let matches2 = 0;

// First, convert all route handlers to async
content = content.replace(/router\.(get|post|put|delete)\(([^,]+),\s*requireAuth,\s*\(req,\s*res\)\s*=>\s*\{/g, 
    'router.$1($2, requireAuth, async (req, res) => {');

content = content.replace(/router\.(get|post|put|delete)\(([^,]+),\s*\(req,\s*res\)\s*=>\s*\{/g, 
    'router.$1($2, async (req, res) => {');

console.log('✓ Converted route handlers to async');

// Now we need to manually handle the nested callbacks
// This is complex, so let's create a simpler version that wraps db.query

const wrapperCode = `
// Wrapper function to convert callback-style db.query to promise
function queryAsync(query, params) {
    return new Promise((resolve, reject) => {
        const callback = (err, results) => {
            if (err) reject(err);
            else resolve(results);
        };
        
        if (params) {
            db.query(query, params, callback);
        } else {
            db.query(query, callback);
        }
    });
}
`;

// Insert wrapper after db import
const dbImportPattern = /const db = require\('\.\.\/config\/database'\);/;
if (content.match(dbImportPattern)) {
    content = content.replace(dbImportPattern, `const db = require('../config/database');${wrapperCode}`);
    console.log('✓ Added queryAsync wrapper function');
}

// Save the file
fs.writeFileSync(adminPath, content, 'utf8');

console.log('\n✓ Phase 1 complete: Added async wrapper');
console.log('\nNOTE: You still need to manually replace db.query() calls with:');
console.log('  const results = await queryAsync(query, params);');
console.log('\nOr better yet, use db.query() directly as it returns a promise:');
console.log('  const results = await db.query(query, params);');

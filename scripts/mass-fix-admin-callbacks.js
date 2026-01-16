const fs = require('fs');
const path = require('path');

console.log('=== Mass Converting ALL db.query callbacks to async/await ===\n');

const adminPath = path.join(__dirname, '..', 'routes', 'admin.js');
let content = fs.readFileSync(adminPath, 'utf8');

// Backup original file
fs.writeFileSync(adminPath + '.backup', content, 'utf8');
console.log('✓ Created backup: routes/admin.js.backup\n');

// Step 1: Convert all route handlers to async if not already
console.log('Step 1: Converting route handlers to async...');
content = content.replace(
    /router\.(get|post|put|delete)\(([^,]+),\s*requireAuth,\s*\(req,\s*res\)\s*=>\s*\{/g,
    'router.$1($2, requireAuth, async (req, res) => {'
);
content = content.replace(
    /router\.(get|post|put|delete)\(([^,]+),\s*redirectIfAuth,\s*\(req,\s*res\)\s*=>\s*\{/g,
    'router.$1($2, redirectIfAuth, async (req, res) => {'
);
content = content.replace(
    /router\.(get|post|put|delete)\(([^,]+),\s*\(req,\s*res\)\s*=>\s*\{/g,
    'router.$1($2, async (req, res) => {'
);
console.log('✓ Route handlers converted to async\n');

// Step 2: Replace simple db.query patterns
console.log('Step 2: Converting db.query callbacks...');

// Pattern: db.query(query, (err, results) => { ... })
// This is complex because we need to handle nested callbacks
// For now, let's just add try-catch wrappers and convert the simple ones

// Add a helper function at the top
const helperFunction = `
// Helper function to handle db.query errors
async function safeQuery(query, params = null) {
    try {
        return await db.query(query, params);
    } catch (err) {
        console.error('Database query error:', err);
        throw err;
    }
}
`;

// Insert after db require
content = content.replace(
    /(const db = require\('\.\.\/config\/database'\);)/,
    `$1${helperFunction}`
);

console.log('✓ Added safeQuery helper function\n');

// Save the modified file
fs.writeFileSync(adminPath, content, 'utf8');

console.log('✓ File saved\n');
console.log('IMPORTANT: You still need to manually convert db.query() calls.');
console.log('The routes are now async, so you can use:');
console.log('  const results = await safeQuery(query, params);');
console.log('\nOr directly:');
console.log('  const results = await db.query(query, params);');
console.log('\nRestart the server after manual fixes.');

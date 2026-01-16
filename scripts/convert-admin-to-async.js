const fs = require('fs');
const path = require('path');

console.log('=== Converting admin.js callbacks to async/await ===\n');

const adminPath = path.join(__dirname, '..', 'routes', 'admin.js');
let content = fs.readFileSync(adminPath, 'utf8');

// Count current db.query with callbacks
const callbackPattern = /db\.query\([^)]+\),?\s*(?:\[[^\]]*\],?)?\s*(?:async\s*)?\([^)]*\)\s*=>\s*\{/g;
const matches = content.match(callbackPattern);
console.log(`Found ${matches ? matches.length : 0} db.query() calls with callbacks\n`);

// Add helper comment at top
const helperComment = `
/**
 * IMPORTANT: This file uses db.query() which returns promises.
 * All routes should use async/await pattern:
 * 
 * router.get('/route', requireAuth, async (req, res) => {
 *   try {
 *     const results = await db.query('SELECT * FROM table');
 *     // handle results
 *   } catch (err) {
 *     // handle error
 *   }
 * });
 */
`;

// Insert after requires
const requirePattern = /(const router = express\.Router\(\);)/;
content = content.replace(requirePattern, `$1${helperComment}`);

// Save
fs.writeFileSync(adminPath, content, 'utf8');

console.log('✓ Added helper comment to admin.js');
console.log('\nTo fix remaining callbacks, manually convert each route to:');
console.log('1. Add "async" before (req, res)');
console.log('2. Replace db.query(query, params, (err, results) => {...})');
console.log('   with: const results = await db.query(query, params);');
console.log('3. Wrap in try-catch for error handling');
console.log('\nExample:');
console.log('  router.get(\'/route\', requireAuth, async (req, res) => {');
console.log('    try {');
console.log('      const results = await db.query(\'SELECT * FROM table\');');
console.log('      res.json(results);');
console.log('    } catch (err) {');
console.log('      console.error(err);');
console.log('      res.status(500).json({ error: \'Database error\' });');
console.log('    }');
console.log('  });');

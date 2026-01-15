/**
 * Simple webhook server untuk auto-deploy dari GitHub
 * 
 * Setup:
 * 1. Install: npm install express body-parser
 * 2. Jalankan: pm2 start scripts/webhook-server.js --name webhook
 * 3. Setup webhook di GitHub: http://YOUR_IP:3001/webhook
 * 4. Secret: masukkan WEBHOOK_SECRET dari .env
 */

const express = require('express');
const bodyParser = require('body-parser');
const { exec } = require('child_process');
const crypto = require('crypto');
require('dotenv').config();

const app = express();
const PORT = process.env.WEBHOOK_PORT || 3001;
const SECRET = process.env.WEBHOOK_SECRET || 'your-secret-here';

app.use(bodyParser.json());

// Verify GitHub signature
function verifySignature(req) {
  const signature = req.headers['x-hub-signature-256'];
  if (!signature) return false;

  const hmac = crypto.createHmac('sha256', SECRET);
  const digest = 'sha256=' + hmac.update(JSON.stringify(req.body)).digest('hex');
  
  return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(digest));
}

// Webhook endpoint
app.post('/webhook', (req, res) => {
  console.log('========================================');
  console.log('Webhook received:', new Date().toISOString());
  
  // Verify signature (optional but recommended)
  if (SECRET !== 'your-secret-here' && !verifySignature(req)) {
    console.log('Invalid signature');
    return res.status(401).send('Invalid signature');
  }

  const event = req.headers['x-github-event'];
  const branch = req.body.ref;

  console.log('Event:', event);
  console.log('Branch:', branch);

  // Only deploy on push to main branch
  if (event === 'push' && branch === 'refs/heads/main') {
    console.log('Triggering deploy...');
    
    // Execute deploy script
    exec('bash /var/www/api-presensi/scripts/deploy.sh', (error, stdout, stderr) => {
      if (error) {
        console.error('Deploy error:', error);
        console.error('stderr:', stderr);
        return;
      }
      console.log('Deploy output:', stdout);
    });

    res.status(200).send('Deploy triggered');
  } else {
    console.log('Skipping deploy (not main branch or not push event)');
    res.status(200).send('Event ignored');
  }
});

// Health check
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'ok', 
    timestamp: new Date().toISOString() 
  });
});

app.listen(PORT, () => {
  console.log(`Webhook server running on port ${PORT}`);
  console.log(`Webhook URL: http://YOUR_IP:${PORT}/webhook`);
  console.log(`Health check: http://YOUR_IP:${PORT}/health`);
});

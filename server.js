/**
 * NeuGlow Store — Backend Server
 *
 * All sensitive config (Stripe keys, SMTP, JWT secret) is stored in MongoDB.
 * The ONLY file not committed to git is mongo-uri.json (gitignored).
 * Everything else lives in the database.
 *
 * First time setup:
 *   1. Create mongo-uri.json: { "uri": "mongodb+srv://..." }
 *   2. node server.js
 *   3. Visit http://localhost:3000/setup  ← admin-only setup wizard
 */

const express  = require('express');
const cors     = require('cors');
const path     = require('path');

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.static(__dirname)); // serve HTML files from root

// ── Bootstrap ─────────────────────────────────────────────────────────────────
const { connectDB, loadConfig } = require('./config/db');

async function start() {
  // Read the bootstrap Mongo URI from mongo-uri.json (gitignored)
  let bootstrapURI;
  try {
    const fs = require('fs');
    const data = fs.readFileSync(path.join(__dirname, 'mongo-uri.json'), 'utf8');
    bootstrapURI = JSON.parse(data).uri;
  } catch {
    console.error('\n⚠  mongo-uri.json not found or invalid.');
    console.error('   Create it: { "uri": "mongodb+srv://user:pass@cluster/neuglow" }');
    console.error('   This file is gitignored and must be created manually on each server.\n');
    process.exit(1);
  }

  await connectDB(bootstrapURI);

  // Load store config from DB and attach to app
  app.locals.cfg = await loadConfig();

  // ── Mount routes ─────────────────────────────────────────────────────────
  app.use('/api/auth',     require('./routes/auth'));
  app.use('/api/products', require('./routes/products'));
  app.use('/api/orders',   require('./routes/orders'));
  app.use('/api/admin',    require('./routes/admin'));
  app.use('/api/config',   require('./routes/configRoute'));

  // ── HTML pages ────────────────────────────────────────────────────────────
  const send = f => (_, res) => res.sendFile(path.join(__dirname, f));
  app.get('/',         send('index.html'));
  app.get('/cart',     send('cart.html'));
  app.get('/checkout', send('checkout.html'));
  app.get('/account',  send('account.html'));
  app.get('/admin',    send('admin.html'));
  app.get('/setup',    send('setup.html'));

  app.get('/api/health', (_, res) => res.json({ ok: true, time: new Date() }));

  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => console.log(`\n🌟 NeuGlow → http://localhost:${PORT}\n`));
}

start().catch(e => { console.error(e); process.exit(1); });

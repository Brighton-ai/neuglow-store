/**
 * NeuGlow Store — Backend Server
 *
 * All sensitive config (Stripe keys, SMTP, JWT secret) is stored in MongoDB.
 * Bootstrap URI comes from:
 *   - Production: MONGO_URI environment variable (Render)
 *   - Local dev:  mongo-uri.json (gitignored)
 */

const express  = require('express');
const cors     = require('cors');
const path     = require('path');

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));

const { connectDB, loadConfig } = require('./config/db');

async function start() {
  // 1. Try environment variable first (Render/production)
  // 2. Fall back to mongo-uri.json (local dev)
  let bootstrapURI = process.env.MONGO_URI;

  if (!bootstrapURI) {
    try {
      const fs   = require('fs');
      const data = fs.readFileSync(path.join(__dirname, 'mongo-uri.json'), 'utf8');
      bootstrapURI = JSON.parse(data).uri;
    } catch {
      console.error('\n⚠  No MONGO_URI environment variable and no mongo-uri.json found.');
      console.error('   Local dev: create mongo-uri.json with { "uri": "mongodb+srv://..." }');
      console.error('   Production: set MONGO_URI environment variable in Render dashboard\n');
      process.exit(1);
    }
  }

  await connectDB(bootstrapURI);

  app.locals.cfg = await loadConfig();

  // ── Routes ────────────────────────────────────────────────────────────────
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

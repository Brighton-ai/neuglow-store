const router      = require('express').Router();
const adminOnly   = require('../middleware/adminOnly');
const StoreConfig = require('../models/StoreConfig');
const { refreshConfig } = require('../config/db');

// GET /api/config
router.get('/', adminOnly, async (req, res) => {
  const cfg = await StoreConfig.findOne({ key: 'main' });
  if (!cfg) return res.json({});
  const obj = cfg.toObject();
  if (obj.stripeSecretKey) obj.stripeSecretKey = '••••' + obj.stripeSecretKey.slice(-4);
  if (obj.smtpPass)        obj.smtpPass        = '••••';
  if (obj.jwtSecret)       obj.jwtSecret       = '••••';
  res.json(obj);
});

// POST /api/config
router.post('/', adminOnly, async (req, res) => {
  try {
    const updates = { ...req.body };
    for (const key of ['stripeSecretKey', 'smtpPass', 'jwtSecret']) {
      if (updates[key]?.startsWith('••••')) delete updates[key];
    }
    const cfg = await StoreConfig.findOneAndUpdate(
      { key: 'main' },
      { $set: updates },
      { upsert: true, new: true }
    );
    refreshConfig(cfg.toObject());
    req.app.locals.cfg = cfg.toObject();
    res.json({ ok: true, message: 'Configuration saved to database' });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// POST /api/config/test-connection
router.post('/test-connection', adminOnly, async (req, res) => {
  const mongoose = require('mongoose');
  const state = mongoose.connection.readyState;
  res.json({
    ok: state === 1,
    status: ['disconnected','connected','connecting','disconnecting'][state] || 'unknown',
  });
});

// POST /api/config/test-email  — sends a real test email to the admin's inbox
router.post('/test-email', adminOnly, async (req, res) => {
  try {
    const cfg = req.app.locals.cfg;
    if (!cfg?.smtpUser || !cfg?.smtpPass) {
      return res.status(400).json({ error: 'SMTP not configured. Add your email settings in Config first.' });
    }

    const { sendMail } = require('../config/mailer');
    const User = require('../models/User');
    const admin = await User.findById(req.user.id).select('email name');
    const to = req.body.to || admin?.email || cfg.smtpUser;

    await sendMail(cfg, to, {
      subject: '✅ NeuGlow Email Test — SMTP is working!',
      html: `
        <!DOCTYPE html><html><head><meta charset="UTF-8"></head>
        <body style="margin:0;padding:0;background:#F8F4EE;font-family:Arial,sans-serif">
          <div style="max-width:520px;margin:40px auto;background:#fff;border-radius:16px;overflow:hidden;border:1px solid rgba(232,82,10,0.15)">
            <div style="background:#1A1208;padding:28px 32px;text-align:center">
              <div style="font-size:24px;font-weight:300;color:#E8520A">Neu<span style="color:#F8F4EE">Glow</span></div>
            </div>
            <div style="padding:32px">
              <h2 style="color:#1A1208;margin:0 0 12px">✅ Email is working!</h2>
              <p style="color:#5C3D1E;line-height:1.7">Your SMTP settings are correctly configured. NeuGlow can now send:</p>
              <ul style="color:#5C3D1E;line-height:2">
                <li>Welcome emails to new customers</li>
                <li>Order confirmation emails</li>
                <li>Admin order notifications</li>
                <li>Shipping updates</li>
              </ul>
              <p style="color:#BCA98A;font-size:13px;margin-top:24px">Sent to: <strong>${to}</strong><br>Time: ${new Date().toLocaleString()}</p>
            </div>
          </div>
        </body></html>
      `,
    });

    res.json({ ok: true, message: `Test email sent to ${to}` });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/config/setup
router.post('/setup', async (req, res) => {
  try {
    const User = require('../models/User');
    const adminExists = await User.findOne({ role: 'admin' });
    if (adminExists) return res.status(403).json({ error: 'Setup already complete' });

    const { adminName, adminEmail, adminPassword, ...configData } = req.body;
    if (!adminEmail || !adminPassword)
      return res.status(400).json({ error: 'Admin email and password required' });

    await User.create({ name: adminName || 'Admin', email: adminEmail, password: adminPassword, role: 'admin' });

    const cfg = await StoreConfig.findOneAndUpdate(
      { key: 'main' },
      { $set: { ...configData, setupComplete: true } },
      { upsert: true, new: true }
    );

    refreshConfig(cfg.toObject());
    req.app.locals.cfg = cfg.toObject();

    res.json({ ok: true, message: 'Setup complete! Please log in.' });
  } catch (e) { res.status(500).json({ error: e.message }); }
});


// GET /api/config/public — returns only tax/shipping info (no secrets, no auth needed)
router.get('/public', async (req, res) => {
  try {
    const cfg = await require('../models/StoreConfig').findOne({ key: 'main' });
    res.json({
      taxRate:          cfg?.taxRate ?? 8,
      shippingFee:      cfg?.shippingFee ?? 0,
      freeShippingOver: cfg?.freeShippingOver ?? 0,
      currency:         cfg?.currency ?? 'SGD',
    });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;

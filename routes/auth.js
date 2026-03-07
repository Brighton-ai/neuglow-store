const router = require('express').Router();
const jwt    = require('jsonwebtoken');
const User   = require('../models/User');
const auth   = require('../middleware/auth');
const { sendMail, welcomeEmail } = require('../config/mailer');

const sign = (user, secret, expiry) =>
  jwt.sign({ id: user._id, email: user.email, role: user.role, name: user.name },
            secret, { expiresIn: expiry || '7d' });

// POST /api/auth/register
router.post('/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password)
      return res.status(400).json({ error: 'All fields required' });

    const exists = await User.findOne({ email });
    if (exists) return res.status(409).json({ error: 'Email already registered' });

    const user  = await User.create({ name, email, password });
    const cfg   = req.app.locals.cfg;
    const token = sign(user, cfg.jwtSecret, cfg.jwtExpiry);

    // Send welcome email (non-blocking)
    sendMail(cfg, email, welcomeEmail(user)).catch(() => {});

    res.status(201).json({ token, user: { id: user._id, name, email, role: user.role } });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user || !(await user.comparePassword(password)))
      return res.status(401).json({ error: 'Invalid credentials' });

    const cfg   = req.app.locals.cfg;
    const token = sign(user, cfg.jwtSecret, cfg.jwtExpiry);
    res.json({ token, user: { id: user._id, name: user.name, email, role: user.role } });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// GET /api/auth/me
router.get('/me', auth, async (req, res) => {
  const user = await User.findById(req.user.id).select('-password');
  res.json(user);
});

module.exports = router;
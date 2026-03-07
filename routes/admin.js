const router    = require('express').Router();
const adminOnly = require('../middleware/adminOnly');
const Product   = require('../models/Product');
const Order     = require('../models/Order');
const User      = require('../models/User');
const bcrypt    = require('bcryptjs');

// ── Products ──────────────────────────────────────────────────────────────────

router.get('/products', adminOnly, async (req, res) => {
  const products = await Product.find().sort({ createdAt: -1 });
  res.json(products);
});

router.post('/products', adminOnly, async (req, res) => {
  try {
    const p = await Product.create(req.body);
    res.status(201).json(p);
  } catch (e) { res.status(400).json({ error: e.message }); }
});

router.put('/products/:id', adminOnly, async (req, res) => {
  try {
    const p = await Product.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!p) return res.status(404).json({ error: 'Not found' });
    res.json(p);
  } catch (e) { res.status(400).json({ error: e.message }); }
});

router.delete('/products/:id', adminOnly, async (req, res) => {
  await Product.findByIdAndDelete(req.params.id);
  res.json({ ok: true });
});

router.patch('/products/:id/stock', adminOnly, async (req, res) => {
  const { stock } = req.body;
  const p = await Product.findByIdAndUpdate(req.params.id, { stock }, { new: true });
  res.json(p);
});

// ── Orders ────────────────────────────────────────────────────────────────────

router.get('/orders', adminOnly, async (req, res) => {
  const { status, page = 1, limit = 20 } = req.query;
  const filter = status ? { status } : {};
  const orders = await Order.find(filter)
    .populate('user', 'name email')
    .sort({ createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(+limit);
  const total = await Order.countDocuments(filter);
  res.json({ orders, total, page: +page, pages: Math.ceil(total / limit) });
});

router.put('/orders/:id', adminOnly, async (req, res) => {
  try {
    const o = await Order.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(o);
  } catch (e) { res.status(400).json({ error: e.message }); }
});

// DELETE single order
router.delete('/orders/:id', adminOnly, async (req, res) => {
  try {
    await Order.findByIdAndDelete(req.params.id);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// DELETE all orders (clear all)
router.delete('/orders', adminOnly, async (req, res) => {
  try {
    const result = await Order.deleteMany({});
    res.json({ ok: true, deleted: result.deletedCount });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── Users ─────────────────────────────────────────────────────────────────────

router.get('/users', adminOnly, async (req, res) => {
  const users = await User.find().select('-password').sort({ createdAt: -1 });
  res.json(users);
});

router.put('/users/:id/role', adminOnly, async (req, res) => {
  const { role } = req.body;
  const u = await User.findByIdAndUpdate(req.params.id, { role }, { new: true }).select('-password');
  res.json(u);
});

// UPDATE user email + name
router.put('/users/:id', adminOnly, async (req, res) => {
  try {
    const { name, email } = req.body;
    // Check email not taken by another user
    if (email) {
      const existing = await User.findOne({ email, _id: { $ne: req.params.id } });
      if (existing) return res.status(409).json({ error: 'Email already in use' });
    }
    const u = await User.findByIdAndUpdate(
      req.params.id,
      { ...(name && { name }), ...(email && { email }) },
      { new: true }
    ).select('-password');
    if (!u) return res.status(404).json({ error: 'User not found' });
    res.json(u);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// CHANGE user password
router.put('/users/:id/password', adminOnly, async (req, res) => {
  try {
    const { password } = req.body;
    if (!password || password.length < 6)
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    const hash = await bcrypt.hash(password, 12);
    await User.findByIdAndUpdate(req.params.id, { password: hash });
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// DELETE user
router.delete('/users/:id', adminOnly, async (req, res) => {
  try {
    // Prevent deleting yourself
    if (req.params.id === req.user.id)
      return res.status(400).json({ error: 'You cannot delete your own account' });

    // Prevent deleting other admins
    const target = await User.findById(req.params.id);
    if (!target) return res.status(404).json({ error: 'User not found' });
    if (target.role === 'admin')
      return res.status(400).json({ error: 'Cannot delete an admin account. Demote to customer first.' });

    await User.findByIdAndDelete(req.params.id);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── Dashboard stats ───────────────────────────────────────────────────────────

router.get('/stats', adminOnly, async (req, res) => {
  const [totalOrders, totalUsers, totalProducts, revenueData] = await Promise.all([
    Order.countDocuments(),
    User.countDocuments({ role: 'customer' }),
    Product.countDocuments({ active: true }),
    Order.aggregate([
      { $match: { status: { $in: ['paid', 'processing', 'shipped', 'delivered'] } } },
      { $group: { _id: null, total: { $sum: '$total' } } },
    ]),
  ]);

  const lowStock = await Product.find({ stock: { $lte: 5 }, trackStock: true, active: true })
    .select('name stock sku');

  res.json({
    totalOrders,
    totalUsers,
    totalProducts,
    revenue: revenueData[0]?.total || 0,
    lowStock,
  });
});

module.exports = router;
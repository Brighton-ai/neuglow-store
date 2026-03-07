const router  = require('express').Router();
const Product = require('../models/Product');

// GET /api/products
router.get('/', async (req, res) => {
  try {
    const filter = { active: true };
    if (req.query.featured === 'true') filter.featured = true;
    const products = await Product.find(filter).sort({ createdAt: -1 });
    res.json(products);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// GET /api/products/:id
router.get('/:id', async (req, res) => {
  try {
    const p = await Product.findById(req.params.id);
    if (!p || !p.active) return res.status(404).json({ error: 'Not found' });
    res.json(p);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;

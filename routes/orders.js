const router  = require('express').Router();
const Order   = require('../models/Order');
const Product = require('../models/Product');
const User    = require('../models/User');
const auth    = require('../middleware/auth');
const { sendMail, orderConfirmationEmail, adminOrderEmail, orderShippedEmail } = require('../config/mailer');

const TAX_RATE = 0.08;

// POST /api/orders  — place an order (non-Stripe fallback)
router.post('/', auth, async (req, res) => {
  try {
    const { items, shippingAddress, paymentIntent } = req.body;
    if (!items?.length) return res.status(400).json({ error: 'No items' });

    let subtotal = 0;
    const enriched = [];
    for (const item of items) {
      const p = await Product.findById(item.product);
      if (!p) return res.status(400).json({ error: `Product not found: ${item.product}` });
      if (p.trackStock) {
        if (p.stock < item.qty && !p.allowBackorder)
          return res.status(400).json({ error: `${p.name} out of stock` });
        p.stock -= item.qty;
        await p.save();
      }
      subtotal += p.price * item.qty;
      enriched.push({ product: p._id, name: p.name, price: p.price, qty: item.qty });
    }

    const tax   = +(subtotal * TAX_RATE).toFixed(2);
    const total = +(subtotal + tax).toFixed(2);

    const order = await Order.create({
      user: req.user.id,
      items: enriched,
      subtotal, tax, total,
      shippingAddress,
      paymentIntent,
      status: paymentIntent ? 'paid' : 'pending',
    });

    const cfg  = req.app.locals.cfg;
    const user = await User.findById(req.user.id).select('name email');
    if (user) {
      sendMail(cfg, user.email, orderConfirmationEmail(order, user)).catch(() => {});
      if (cfg.supportEmail || cfg.smtpUser) {
        sendMail(cfg, cfg.supportEmail || cfg.smtpUser, adminOrderEmail(order, user)).catch(() => {});
      }
    }

    res.status(201).json(order);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// POST /api/orders/checkout — create Stripe Checkout Session
router.post('/checkout', auth, async (req, res) => {
  try {
    const cfg = req.app.locals.cfg;
    if (!cfg?.stripeSecretKey) {
      return res.status(400).json({ error: 'Stripe is not configured. Please add your keys in Admin → Config.' });
    }

    const stripe = require('stripe')(cfg.stripeSecretKey);
    const { items, shippingAddress } = req.body;
    if (!items?.length) return res.status(400).json({ error: 'No items' });

    const enriched = [];
    for (const item of items) {
      const p = await Product.findById(item.product);
      if (!p) return res.status(400).json({ error: `Product not found: ${item.product}` });
      if (p.trackStock && p.stock < item.qty && !p.allowBackorder)
        return res.status(400).json({ error: `${p.name} out of stock` });
      enriched.push({ product: p, qty: item.qty });
    }

    const subtotal = enriched.reduce((s, { product: p, qty }) => s + p.price * qty, 0);
    const tax      = +(subtotal * TAX_RATE).toFixed(2);
    const total    = +(subtotal + tax).toFixed(2);

    // Build Stripe line items — products + tax as a separate line
    const line_items = [
      ...enriched.map(({ product: p, qty }) => ({
        price_data: {
          currency: (cfg.currency || 'sgd').toLowerCase(),
          product_data: {
            name: p.name,
            description: p.description || undefined,
            images: p.images?.[0] ? [p.images[0]] : undefined,
          },
          unit_amount: Math.round(p.price * 100),
        },
        quantity: qty,
      })),
      // Tax line item
      {
        price_data: {
          currency: (cfg.currency || 'sgd').toLowerCase(),
          product_data: { name: 'Tax (8%)' },
          unit_amount: Math.round(tax * 100),
        },
        quantity: 1,
      },
    ];

    const order = await Order.create({
      user: req.user.id,
      items: enriched.map(({ product: p, qty }) => ({
        product: p._id, name: p.name, price: p.price, qty,
      })),
      subtotal, tax, total,
      shippingAddress,
      status: 'pending',
    });

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items,
      mode: 'payment',
      success_url: `${req.protocol}://${req.get('host')}/checkout?success=true&order=${order._id}`,
      cancel_url:  `${req.protocol}://${req.get('host')}/checkout?cancelled=true`,
      metadata: { orderId: order._id.toString(), userId: req.user.id },
      shipping_address_collection: { allowed_countries: ['US','GB','CA','AU','ZA','KE'] },
    });

    res.json({ url: session.url, orderId: order._id });
  } catch (e) {
    console.error('Stripe error:', e.message);
    res.status(500).json({ error: e.message });
  }
});

// POST /api/orders/webhook — Stripe webhook to mark orders paid + send emails
router.post('/webhook', require('express').raw({ type: 'application/json' }), async (req, res) => {
  let event;
  try { event = JSON.parse(req.body); }
  catch { return res.status(400).send('Bad request'); }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    const orderId = session.metadata?.orderId;
    if (orderId) {
      await Order.findByIdAndUpdate(orderId, {
        status: 'paid',
        paymentIntent: session.payment_intent,
      });
      const order = await Order.findById(orderId).populate('user', 'name email');
      if (order) {
        for (const item of order.items) {
          await Product.findByIdAndUpdate(item.product, { $inc: { stock: -item.qty } });
        }
        const cfg = req.app?.locals?.cfg;
        if (cfg && order.user) {
          sendMail(cfg, order.user.email, orderConfirmationEmail(order, order.user)).catch(() => {});
          if (cfg.supportEmail || cfg.smtpUser) {
            sendMail(cfg, cfg.supportEmail || cfg.smtpUser, adminOrderEmail(order, order.user)).catch(() => {});
          }
        }
      }
    }
  }
  res.json({ received: true });
});

// GET /api/orders/mine
router.get('/mine', auth, async (req, res) => {
  const orders = await Order.find({ user: req.user.id }).sort({ createdAt: -1 });
  res.json(orders);
});

// PUT /api/orders/:id/ship — mark shipped + send email
router.put('/:id/ship', auth, async (req, res) => {
  try {
    const { trackingNumber } = req.body;
    const order = await Order.findByIdAndUpdate(
      req.params.id,
      { status: 'shipped', trackingNumber },
      { new: true }
    ).populate('user', 'name email');
    if (!order) return res.status(404).json({ error: 'Order not found' });
    const cfg = req.app.locals.cfg;
    if (order.user) {
      sendMail(cfg, order.user.email, orderShippedEmail(order, order.user)).catch(() => {});
    }
    res.json(order);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;

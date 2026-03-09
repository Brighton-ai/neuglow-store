const mongoose = require('mongoose');

const StoreConfigSchema = new mongoose.Schema({
  key: { type: String, default: 'main', unique: true },

  // JWT
  jwtSecret:      { type: String, default: 'change-me-in-setup' },
  jwtExpiry:      { type: String, default: '7d' },

  // Stripe
  stripePublishableKey: { type: String, default: '' },
  stripeSecretKey:      { type: String, default: '' },

  // Cloudinary
  cloudinaryCloud:  { type: String, default: '' },
  cloudinaryPreset: { type: String, default: '' },

  // SMTP / Email
  smtpHost:     { type: String, default: '' },
  smtpPort:     { type: Number, default: 587 },
  smtpUser:     { type: String, default: '' },
  smtpPass:     { type: String, default: '' },
  smtpFrom:     { type: String, default: 'hello@neuglow.com' },

  // Store meta
  storeName:    { type: String, default: 'NeuGlow' },
  supportEmail: { type: String, default: '' },
  currency:     { type: String, default: 'SGD' },

  // Tax & Shipping
  taxRate:          { type: Number, default: 8 },    // percentage e.g. 8 = 8%
  shippingFee:      { type: Number, default: 0 },    // flat fee, 0 = free
  freeShippingOver: { type: Number, default: 0 },    // 0 = always charge shipping fee

  // Admin setup
  setupComplete: { type: Boolean, default: false },

}, { timestamps: true });

module.exports = mongoose.model('StoreConfig', StoreConfigSchema);

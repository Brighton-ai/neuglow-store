/**
 * models/StoreConfig.js
 * Single document (key: "main") storing all sensitive store configuration.
 * Stripe keys, SMTP credentials, JWT secret — all live here, not in .env.
 */

const mongoose = require('mongoose');

const StoreConfigSchema = new mongoose.Schema({
  key: { type: String, default: 'main', unique: true },

  // JWT
  jwtSecret:      { type: String, default: 'change-me-in-setup' },
  jwtExpiry:      { type: String, default: '7d' },

  // Stripe
  stripePublishableKey: { type: String, default: '' },
  stripeSecretKey:      { type: String, default: '' },

  // Cloudinary (image uploads)
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

  // Admin setup done flag
  setupComplete: { type: Boolean, default: false },

}, { timestamps: true });

module.exports = mongoose.model('StoreConfig', StoreConfigSchema);

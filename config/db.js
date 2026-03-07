/**
 * config/db.js
 * Connects to MongoDB and loads/caches the store config document.
 * All sensitive keys (Stripe, SMTP, JWT) live in the `store_config` collection.
 */

const mongoose = require('mongoose');

let _cfg = null;

async function connectDB(uri) {
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 8000 });
  console.log('✅ MongoDB connected');
}

async function loadConfig() {
  if (_cfg) return _cfg;
  const StoreConfig = require('../models/StoreConfig');
  const doc = await StoreConfig.findOne({ key: 'main' });
  _cfg = doc ? doc.toObject() : {};
  return _cfg;
}

// Call this after updating config in the DB so routes pick up the new values
function refreshConfig(newCfg) {
  _cfg = newCfg;
}

module.exports = { connectDB, loadConfig, refreshConfig };

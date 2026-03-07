const mongoose = require('mongoose');

const ProductSchema = new mongoose.Schema({
  name:        { type: String, required: true },
  slug:        { type: String, unique: true },
  price:       { type: Number, required: true },
  compareAt:   { type: Number },           // original price for sale badge
  description: { type: String },
  features:    [String],
  badge:       { type: String },           // e.g. "Best Seller", "New"
  category:    { type: String, default: 'lamp' },
  images:      [String],                   // image URLs / paths
  icon:        { type: String },           // emoji or icon class fallback

  // Inventory
  stock:       { type: Number, default: 0 },
  sku:         { type: String },
  trackStock:  { type: Boolean, default: true },
  allowBackorder: { type: Boolean, default: false },

  // Display
  rating:      { type: Number, default: 4.8, min: 0, max: 5 },
  reviewCount: { type: Number, default: 0 },
  featured:    { type: Boolean, default: false },
  active:      { type: Boolean, default: true },

}, { timestamps: true });

// Auto-generate slug from name
ProductSchema.pre('save', function (next) {
  if (this.isModified('name') && !this.slug) {
    this.slug = this.name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  }
  next();
});

module.exports = mongoose.model('Product', ProductSchema);

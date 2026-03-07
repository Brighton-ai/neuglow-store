const mongoose = require('mongoose');

const OrderItemSchema = new mongoose.Schema({
  product:  { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
  name:     String,
  price:    Number,
  qty:      Number,
  image:    String,
});

const OrderSchema = new mongoose.Schema({
  orderNumber: { type: String, unique: true },
  user:        { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  guestEmail:  String,

  items:       [OrderItemSchema],
  subtotal:    Number,
  shipping:    { type: Number, default: 0 },
  tax:         { type: Number, default: 0 },
  total:       Number,

  shippingAddress: {
    name:    String,
    line1:   String,
    line2:   String,
    city:    String,
    state:   String,
    zip:     String,
    country: String,
  },

  status: {
    type: String,
    enum: ['pending', 'paid', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded'],
    default: 'pending',
  },

  paymentIntent:  String,   // Stripe PaymentIntent ID
  trackingNumber: String,
  notes:          String,

}, { timestamps: true });

// Auto order number
OrderSchema.pre('save', async function (next) {
  if (!this.orderNumber) {
    const count = await mongoose.model('Order').countDocuments();
    this.orderNumber = `NG-${String(count + 1001).padStart(5, '0')}`;
  }
  next();
});

module.exports = mongoose.model('Order', OrderSchema);

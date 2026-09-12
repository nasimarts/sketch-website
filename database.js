const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  customer_name: { type: String, required: true },
  phone: String,
  email: String,
  sketch_type: { type: String, required: true },
  paper_size: { type: String, required: true },
  num_people: { type: Number, default: 1 },
  base_price: { type: Number, required: true },
  total_price: { type: Number, required: true },
  reference_photo: String, // This will store the Cloudinary image URL
  notes: String,
  status: { type: String, default: 'pending' },
  created_at: { type: Date, default: Date.now }
});

const Order = mongoose.model('Order', orderSchema);

async function initDatabase() {
  try {
    const mongoURI = process.env.MONGODB_URI;
    if (!mongoURI) {
      console.warn("WARNING: MONGODB_URI is not set in environment variables.");
      return;
    }
    await mongoose.connect(mongoURI);
    console.log('✅ Connected to MongoDB Cloud Database');
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
  }
}

module.exports = { Order, initDatabase };

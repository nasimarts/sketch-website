require('dotenv').config();
const express = require('express');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const { v4: uuidv4 } = require('uuid');
const { Order, initDatabase } = require('./database');
const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');

const app = express();
const PORT = process.env.PORT || 3000;

// Cloudinary Configuration
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// Multer Storage for Cloudinary
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'sketch_website_references',
    allowed_formats: ['jpg', 'jpeg', 'png', 'gif']
  },
});

const upload = multer({ 
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 } 
});

// Ensure local gallery folder exists for static viewing
const galleryDir = path.join(__dirname, 'public', 'images', 'gallery');
if (!fs.existsSync(galleryDir)) {
  fs.mkdirSync(galleryDir, { recursive: true });
}

// Connect to MongoDB
initDatabase();

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use(express.static(path.join(__dirname, 'public')));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app.get('/', (req, res) => {
  try { res.render('index'); } 
  catch (error) { res.status(500).send('Server Error'); }
});

app.get('/gallery', (req, res) => {
  try {
    const files = fs.readdirSync(galleryDir);
    const images = files.filter(f => f.match(/\.(jpg|jpeg|png|gif)$/i)).map(filename => {
      let category = 'portrait';
      if (filename.startsWith('portrait')) category = 'portrait';
      else if (filename.startsWith('character')) category = 'character';
      else if (filename.startsWith('couple') || filename.startsWith('group')) category = 'couple_group';
      return { filename, category };
    });
    res.render('gallery', { images });
  } catch (error) {
    console.error(error);
    res.status(500).send('Server Error');
  }
});

app.get('/order', (req, res) => {
  try { res.render('order'); } 
  catch (error) { res.status(500).send('Server Error'); }
});

app.post('/order', upload.single('reference_photo'), async (req, res) => {
  try {
    const { customer_name, phone, email, sketch_type, paper_size, num_people, notes } = req.body;
    
    let base_price = 0;
    if (sketch_type === 'portrait') base_price = 500;
    else if (sketch_type === 'character') base_price = 600;
    else if (sketch_type === 'couple_group') base_price = 800;
    else base_price = 500;

    let paper_multiplier = 1.0;
    if (paper_size === 'A3') paper_multiplier = 1.5;
    else if (paper_size === 'A2') paper_multiplier = 2.0;

    let people_count = parseInt(num_people) || 1;
    let extra_people_charge = 0;

    if (sketch_type === 'couple_group' && people_count > 2) {
      extra_people_charge = (people_count - 2) * 200 * paper_multiplier;
    }

    const total_price = (base_price * paper_multiplier) + extra_people_charge;
    
    // Cloudinary puts the final image URL directly into req.file.path
    const reference_photo = req.file ? req.file.path : null;
    const id = uuidv4();

    // Save to MongoDB
    const newOrder = new Order({
      id, customer_name, phone, email, sketch_type, paper_size, 
      num_people: people_count, base_price, total_price, reference_photo, notes
    });

    await newOrder.save();

    res.redirect(`/order/confirmation/${id}`);
  } catch (error) {
    console.error(error);
    res.status(500).send('Server Error');
  }
});

app.get('/order/confirmation/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const order = await Order.findOne({ id: id });

    if (!order) {
      return res.status(404).send('Order not found');
    }

    res.render('confirmation', {
      order,
      whatsappNumber: '8801817610145',
      artistEmail: 'saikatshil72@gmail.com'
    });
  } catch (error) {
    console.error(error);
    res.status(500).send('Server Error');
  }
});

app.get('/api/orders', async (req, res) => {
  try {
    const orders = await Order.find().sort({ created_at: -1 });
    res.json(orders);
  } catch (error) {
    console.error(error);
    res.status(500).send('Server Error');
  }
});

app.use((req, res) => {
  res.status(404).send('Not Found');
});

app.listen(PORT, () => {
  console.log(`Saikat's Sketch Studio running at http://localhost:${PORT}`);
});

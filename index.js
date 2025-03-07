// index.js
const express = require('express');
const cors = require('cors');
// const { Model } = require('objection');
const Knex = require('knex');
require('dotenv').config();

const connectDB = require('./configs/mongodb');
// ... existing imports and setup ...
const roleRoutes = require('./routes/roleRoutes');
const adminRoutes = require('./routes/adminRoutes');
const shopRoutes = require('./routes/shopRoutes');
const productRoutes = require('./routes/productRoutes');
const userRoutes = require('./routes/userRoutes');
const orderRoutes = require('./routes/orderRoutes');
const deliveryChargeRoutes = require('./routes/deliveryChargeRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');

// Initialize knex.
// const knexConfig = require('./knexfile');
// const knex = Knex(knexConfig);

// Connect to MongoDB
connectDB();

// Bind all Models to the knex instance.
// Model.knex(knex);

const app = express();

// Middleware
app.use(cors({ origin: '*' }));
app.use(express.json());


// ... after your middleware setup ...
app.use('/api/roles', roleRoutes);
app.use('/api/admins', adminRoutes);
app.use('/api/shops', shopRoutes);
app.use('/api/products', productRoutes);
app.use('/api/users', userRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/delivery-charges', deliveryChargeRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/uploads', express.static('public/uploads'));

// Start the server
const PORT = process.env.PORT || 7000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
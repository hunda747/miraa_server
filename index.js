// index.js
const express = require('express');
const { Model } = require('objection');
const Knex = require('knex');
require('dotenv').config();

// ... existing imports and setup ...
const roleRoutes = require('./routes/roleRoutes');

// Initialize knex.
const knexConfig = require('./knexfile');
const knex = Knex(knexConfig);

// Bind all Models to the knex instance.
Model.knex(knex);

const app = express();

// Middleware
app.use(express.json());


// ... after your middleware setup ...
app.use('/api/roles', roleRoutes);

// Test route to check database connection
app.get('/test-db', async (req, res) => {
  try {
    const result = await knex.raw('SELECT 1+1 AS result');
    res.json({ success: true, result: result[0] });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
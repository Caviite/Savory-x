require('dotenv').config();
const path = require('path');
const express = require('express');
const mongoose = require('mongoose');

const app = express();

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/api/products', require('./server/routes/product'));

app.use('/api', (req, res) => res.status(404).json({ error: 'Not found' }));

mongoose.connect(process.env.MONGODB_URI)
    .then(() => {
        console.log('MongoDB connected');
        app.listen(process.env.PORT || 3000, () =>
            console.log('Running on http://localhost:' + (process.env.PORT || 3000)));
    })
    .catch(err => { console.error('DB connection failed:', err.message); process.exit(1); });
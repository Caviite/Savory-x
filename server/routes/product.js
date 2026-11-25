const express = require('express');
const Product = require('../models/product');
const router = express.Router();

router.get('/', async (req, res) => {
    try {
        const products = await Product.find({}, '-_id -__v').sort({ id: 1 });
        res.json(products);
    } catch (err) {
        res.status(500).json({ error: 'Could not load products' });
    }
});

router.get('/:id', async (req, res) => {
    try {
        const product = await Product.findOne({ id: Number(req.params.id) }, '-_id -__v');
        if (!product) return res.status(404).json({ error: 'Product not found' });
        res.json(product);
    } catch (err) {
        res.status(500).json({ error: 'Could not load product' });
    }
});

module.exports = router;
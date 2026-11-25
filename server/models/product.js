const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
    id: { type: Number, required: true, unique: true },
    name: { type: String, required: true, trim: true },
    category: { type: String, required: true, enum: ['kitchen', 'house', 'workspace'] },
    price: { type: Number, required: true, min: 0 },
    image: { type: String, default: 'images/placeholder.jpg' },
    alt: { type: String, default: '' },
    stock: { type: Number, default: 0, min: 0 },
    description: { type: String, default: '' },
    details: { type: mongoose.Schema.Types.Mixed, default: {} }
});

module.exports = mongoose.model('Product', productSchema);
require('dotenv').config();
const mongoose = require('mongoose');
const Product = require('./models/product');
const products = require('./data/products');

(async () => {
    await mongoose.connect(process.env.MONGODB_URI);
    await Product.deleteMany({});
    await Product.insertMany(products);
    console.log('Seeded ' + products.length + ' products');
    await mongoose.disconnect();
})();
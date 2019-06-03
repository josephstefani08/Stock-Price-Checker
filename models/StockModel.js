const mongoose = require('mongoose');
const Schema = mongoose.Schema;

// Defining schema
let stockSchema = new mongoose.Schema({
  symbol: String,
  likes: Number,
  ipAddresses: []
});

module.exports = mongoose.model('stock', stockSchema);
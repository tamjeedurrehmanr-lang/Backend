const mongoose = require("mongoose");

module.exports = mongoose.model("Offer", new mongoose.Schema({}, { strict: false, timestamps: true }));

const mongoose = require("mongoose");

module.exports = mongoose.model("Inquiry", new mongoose.Schema({}, { strict: false, timestamps: true }));

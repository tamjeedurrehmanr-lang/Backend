const mongoose = require("mongoose");

module.exports = mongoose.model("Report", new mongoose.Schema({}, { strict: false, timestamps: true }));

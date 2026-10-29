const mongoose = require("mongoose");

const listingSchema = new mongoose.Schema(
  {
    _id: Number,
    seller_name: String,
    phone: String,
    email: String,
    city: String,
    brand: String,
    model: String,
    year: Number,
    price: Number,
    mileage: Number,
    condition: String,
    description: String,
    status: { type: String, default: "Pending" },
  },
  { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } }
);

module.exports = mongoose.model("Listing", listingSchema);

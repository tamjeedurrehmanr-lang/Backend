const express = require("express");
const mongoose = require("mongoose");
const userRoutes = require("./routes/users");
const connectDB = require("./connection");
const Listing = require("./models/Listing");
const Counter = require("./models/Counter");
const User = require("./models/User");
const Offer = require("./models/Offer");
const Inquiry = require("./models/Inquiry");
const Report = require("./models/Report");
const { hashPassword, verifyPassword } = require("./utils/password");

const app = express();
const PORT = process.env.PORT || 5000;

app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ extended: true }));

app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
  res.header("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS");

  if (req.method === "OPTIONS") return res.sendStatus(204);
  next();
});

app.use((req, res, next) => {
  if ((req.path.startsWith("/api/") || req.path === "/users" || req.path.startsWith("/users/")) &&
      req.path !== "/api/health" && mongoose.connection.readyState !== 1) {
    return res.status(503).json({ error: "Database is not connected. Please try again later." });
  }
  next();
});

app.use("/users", userRoutes);

const required = (body, fields) => fields.filter((field) => body[field] === undefined || body[field] === "");

async function seedListings() {
  if (await Listing.countDocuments() === 0) {
    await Listing.create([
      { _id: 101, seller_name: "CarHub Demo", phone: "03001234567", email: "demo@carhub.com", city: "Lahore", brand: "Toyota", model: "Corolla", year: 2022, price: 4500000, mileage: 25000, condition: "Used - Excellent", description: "Well maintained car.", status: "Active" },
      { _id: 102, seller_name: "CarHub Demo", phone: "03001234567", email: "demo@carhub.com", city: "Karachi", brand: "Honda", model: "Civic", year: 2021, price: 7800000, mileage: 32000, condition: "Used - Good", description: "Clean family car.", status: "Pending" },
    ]);
  }

  const lastListing = await Listing.findOne().sort({ _id: -1 }).select("_id");
  await Counter.findOneAndUpdate(
    { _id: "listing" },
    { $max: { sequence: lastListing?._id || 0 } },
    { upsert: true }
  );
}

app.get("/api/health", (req, res) => {
  res.json({ status: "ok", service: "CarHub backend", timestamp: new Date().toISOString() });
});

app.get("/api/listings", async (req, res) => {
  res.json({ listings: await Listing.find().sort({ _id: 1 }) });
});

app.get("/api/listings/:id", async (req, res) => {
  const listing = await Listing.findById(req.params.id);
  if (!listing) return res.status(404).json({ error: "Listing not found" });
  res.json({ listing });
});

app.post("/api/listings", async (req, res) => {
  const missing = required(req.body, ["seller_name", "phone", "email", "city", "brand", "model", "year", "price", "mileage", "condition", "description"]);
  if (missing.length) return res.status(400).json({ error: `Missing required fields: ${missing.join(", ")}` });

  const counter = await Counter.findOneAndUpdate(
    { _id: "listing" },
    { $inc: { sequence: 1 } },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  );
  const listing = await Listing.create({ ...req.body, _id: counter.sequence, status: "Pending" });
  res.status(201).json({ message: "Listing created", listing });
});

app.patch("/api/listings/:id", async (req, res) => {
  const { _id, id, ...changes } = req.body;
  const listing = await Listing.findByIdAndUpdate(req.params.id, changes, { new: true, runValidators: true });
  if (!listing) return res.status(404).json({ error: "Listing not found" });
  res.json({ message: "Listing updated", listing });
});

app.delete("/api/listings/:id", async (req, res) => {
  const listing = await Listing.findByIdAndDelete(req.params.id);
  if (!listing) return res.status(404).json({ error: "Listing not found" });
  res.json({ message: "Listing deleted", listing });
});

app.post("/api/register/:role", async (req, res) => {
  if (!["buyer", "seller"].includes(req.params.role)) return res.status(400).json({ error: "Invalid role" });
  const missing = required(req.body, ["full_name", "email", "phone", "city", "password"]);
  if (missing.length) return res.status(400).json({ error: `Missing required fields: ${missing.join(", ")}` });

  const user = await User.create({
    name: req.body.full_name,
    full_name: req.body.full_name,
    email: req.body.email,
    phone: req.body.phone,
    city: req.body.city,
    role: req.params.role,
    passwordHash: await hashPassword(req.body.password),
  });
  res.status(201).json({ message: `${req.params.role} registered successfully`, user });
});

app.post("/api/login", async (req, res) => {
  const user = await User.findOne({ email: req.body.email, ...(req.body.role && { role: req.body.role }) }).select("+passwordHash");
  if (!user || !await verifyPassword(req.body.password || "", user.passwordHash)) {
    return res.status(401).json({ error: "Invalid email or password" });
  }
  res.json({ message: "Signed in successfully", user: user.toJSON() });
});

app.patch("/api/profile", async (req, res) => {
  const { email, password, passwordHash, role, ...changes } = req.body;
  const user = await User.findOneAndUpdate({ email }, changes, { new: true, runValidators: true });
  if (!user) return res.status(404).json({ error: "User not found" });
  res.json({ message: "Profile updated", user });
});

app.post("/api/profile/password", async (req, res) => {
  const user = await User.findOne({ email: req.body.email }).select("+passwordHash");
  if (!user || !await verifyPassword(req.body.current_password || "", user.passwordHash)) {
    return res.status(401).json({ error: "Current password is incorrect" });
  }
  user.passwordHash = await hashPassword(req.body.password);
  await user.save();
  res.json({ message: "Password updated" });
});

app.post("/api/offers", async (req, res) => {
  const missing = required(req.body, ["buyer_name", "phone", "email", "selected_car", "offer_price"]);
  if (missing.length) return res.status(400).json({ error: `Missing required fields: ${missing.join(", ")}` });
  const offer = await Offer.create({ ...req.body, status: "Submitted" });
  res.status(201).json({ message: "Offer submitted", offer });
});

app.post("/api/inquiries", async (req, res) => {
  const missing = required(req.body, ["buyer_name", "phone", "email", "message"]);
  if (missing.length) return res.status(400).json({ error: `Missing required fields: ${missing.join(", ")}` });
  const inquiry = await Inquiry.create({ ...req.body, status: "Submitted" });
  res.status(201).json({ message: "Inquiry sent", inquiry });
});

app.post("/api/reports", async (req, res) => {
  const missing = required(req.body, ["name", "email", "car_ad", "reason"]);
  if (missing.length) return res.status(400).json({ error: `Missing required fields: ${missing.join(", ")}` });
  const report = await Report.create({ ...req.body, status: "Submitted" });
  res.status(201).json({ message: "Report submitted", report });
});

app.use((req, res) => res.status(404).json({ error: "Route not found" }));

app.use((err, req, res, next) => {
  if (err.code === 11000) return res.status(409).json({ error: "This email is already registered." });
  if (err.name === "ValidationError" || err.name === "CastError") return res.status(400).json({ error: err.message });
  res.status(500).json({ error: err.message });
});

if (require.main === module) {
  connectDB()
    .then(seedListings)
    .then(() => app.listen(PORT, () => console.log(`CarHub API listening on http://localhost:${PORT}`)))
    .catch((error) => {
      console.error(`MongoDB connection failed: ${error.message.includes("bad auth") ? "check database credentials in Backend/.env" : error.name}`);
      process.exitCode = 1;
    });
}

module.exports = app;

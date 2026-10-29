if (require("express/package.json").version.startsWith("4.")) {
  require("express-async-errors");
}

const express = require("express");
const User = require("../models/User");

const router = express.Router();

router.post("/", async (req, res) => {
  const { password, passwordHash, ...data } = req.body;
  const user = await User.create(data);
  res.status(201).json(user);
});

router.get("/", async (req, res) => {
  res.json(await User.find());
});

router.get("/:id", async (req, res) => {
  res.json(await User.findById(req.params.id));
});

router.put("/:id", async (req, res) => {
  const { password, passwordHash, ...changes } = req.body;
  const user = await User.findByIdAndUpdate(req.params.id, changes, { new: true, runValidators: true });
  res.json(user);
});

router.delete("/:id", async (req, res) => {
  await User.findByIdAndDelete(req.params.id);
  res.json({ message: "User deleted" });
});

module.exports = router;

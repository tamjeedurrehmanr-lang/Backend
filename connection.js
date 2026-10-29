const path = require("path");
const mongoose = require("mongoose");
const dotenv = require("dotenv");

dotenv.config({ path: path.join(__dirname, ".env"), quiet: true });

function encodeCredential(value) {
  return value
    .split(/(%[0-9a-f]{2})/gi)
    .map((part) => part.startsWith("%")
      ? part
      : encodeURIComponent(part).replace(/[!'()*]/g, (char) => `%${char.charCodeAt(0).toString(16).toUpperCase()}`))
    .join("");
}

async function connectDB() {
  if (!process.env.MONGODB_URI) {
    throw new Error("MONGODB_URI is not configured");
  }

  const uri = process.env.MONGODB_URI.trim();
  const schemeEnd = uri.indexOf("://") + 3;
  const separator = uri.lastIndexOf("@");
  const credentials = separator === -1 ? -1 : uri.indexOf(":", schemeEnd);
  const connectionString = credentials === -1
    ? uri
    : `${uri.slice(0, schemeEnd)}${encodeCredential(uri.slice(schemeEnd, credentials))}:${encodeCredential(uri.slice(credentials + 1, separator))}@${uri.slice(separator + 1)}`;

  await mongoose.connect(connectionString);
  console.log("MongoDB connected");
}

module.exports = connectDB;

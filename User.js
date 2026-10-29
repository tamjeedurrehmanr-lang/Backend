const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    full_name: String,
    email: { type: String, required: true, unique: true },
    phone: String,
    city: String,
    father_name: String,
    role: { type: String, enum: ["buyer", "seller", "admin"] },
    passwordHash: { type: String, select: false },
  },
  {
    timestamps: true,
    toJSON: {
      transform: (doc, value) => {
        delete value.passwordHash;
        return value;
      },
    },
  }
);

userSchema.pre("validate", function () {
  this.name = this.name || this.full_name;
  this.full_name = this.full_name || this.name;
});

userSchema.pre("findOneAndUpdate", function () {
  const update = this.getUpdate();
  const changes = update.$set || update;
  if (changes.full_name && !changes.name) changes.name = changes.full_name;
  if (changes.name && !changes.full_name) changes.full_name = changes.name;
});

module.exports = mongoose.model("User", userSchema);

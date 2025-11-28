const jwt = require("jsonwebtoken");

function generateAccessToken(user) {
  // Có thể set JWT_EXPIRES_IN trong .env để override
  return jwt.sign(
    { id: user._id, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || "7d" }
  );
}

module.exports = { generateAccessToken };
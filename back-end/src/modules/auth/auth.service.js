const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const User = require("../user/user.model");
const { sendPasswordResetEmail } = require("../../utils/email.service");

async function registerUser({ name, email, password, phone }) {
  const existing = await User.findOne({ email });
  if (existing) {
    const err = new Error("Email already exists");
    err.status = 400;
    throw err;
  }

  const hashed = await bcrypt.hash(password, 10);
  const user = await User.create({
    name,
    email,
    password: hashed,
    phone: phone || undefined,
    role: "customer"
  });
  return user;
}

async function validateCredentials({ email, password }) {
  const user = await User.findOne({ email });
  if (!user) return null;

  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) return null;

  return user;
}

async function requestPasswordReset(email) {
  const user = await User.findOne({ email });
  if (!user) {
    return { success: true };
  }

  const resetToken = crypto.randomBytes(32).toString("hex");
  const resetTokenExpiry = Date.now() + 3600000; // 1 hour

  user.resetPasswordToken = resetToken;
  user.resetPasswordExpires = new Date(resetTokenExpiry);
  await user.save();

  try {
    await sendPasswordResetEmail(user.email, resetToken);
  } catch (error) {
    console.error("Failed to send reset email:", error.message || error);
    // Log chi tiết để debug
    if (error.message && error.message.includes("Email configuration missing")) {
      console.error("⚠️  Please configure EMAIL_USER and EMAIL_PASSWORD in .env file");
    }
  }

  return {
    success: true,
    message: "If an account with that email exists, we've sent a password reset link."
  };
}

async function resetPasswordWithToken(token, newPassword) {
  const user = await User.findOne({
    resetPasswordToken: token,
    resetPasswordExpires: { $gt: Date.now() }
  });

  if (!user) {
    const err = new Error("Invalid or expired reset token");
    err.status = 400;
    throw err;
  }

  const hashedPassword = await bcrypt.hash(newPassword, 10);

  user.password = hashedPassword;
  user.resetPasswordToken = undefined;
  user.resetPasswordExpires = undefined;
  await user.save();

  return { success: true, message: "Password reset successfully" };
}

module.exports = {
  registerUser,
  validateCredentials,
  requestPasswordReset,
  resetPasswordWithToken
};
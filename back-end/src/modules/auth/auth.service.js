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
  }

  return {
    success: true,
    message: "If an account with that email exists, we've sent a password reset link."
  };
}

async function resetPasswordWithToken(token, newPassword) {
  if (!token) {
    const err = new Error("Reset token is required");
    err.status = 400;
    throw err;
  }

  const userWithToken = await User.findOne({
    resetPasswordToken: token
  });

  if (!userWithToken) {
    const err = new Error("Invalid reset token");
    err.status = 400;
    throw err;
  }

  // Check if token has expired
  const now = new Date();
  if (!userWithToken.resetPasswordExpires || userWithToken.resetPasswordExpires < now) {
    const err = new Error("Reset token has expired. Please request a new password reset.");
    err.status = 400;
    throw err;
  }

  // Token is valid, proceed with password reset
  const hashedPassword = await bcrypt.hash(newPassword, 10);

  userWithToken.password = hashedPassword;
  userWithToken.resetPasswordToken = undefined;
  userWithToken.resetPasswordExpires = undefined;
  await userWithToken.save();

  return { success: true, message: "Password reset successfully" };
}

module.exports = {
  registerUser,
  validateCredentials,
  requestPasswordReset,
  resetPasswordWithToken
};
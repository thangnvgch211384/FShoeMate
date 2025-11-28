const { validationResult } = require("express-validator");
const { generateAccessToken } = require("../../utils/token");
const { registerUser, validateCredentials, requestPasswordReset, resetPasswordWithToken } = require("./auth.service");

function formatUser(user) {
  const baseUser = {
    id: user._id,
    name: user.name,
    email: user.email,
    phone: user.phone || null,
    role: user.role
  };
  
  if (user.role === "customer") {
    return {
      ...baseUser,
      membershipLevel: user.membershipLevel || null,
      loyaltyPoints: user.loyaltyPoints || 0
    };
  }
  
  return baseUser;
}

async function handleRegister(req, res, next) {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(422).json({ errors: errors.array() });
    }

    const user = await registerUser(req.body);
    const token = generateAccessToken(user);

    res.status(201).json({
      success: true,
      user: formatUser(user),
      token
    });
  } catch (error) {
    next(error);
  }
}

async function handleLogin(req, res, next) {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(422).json({ errors: errors.array() });
    }

    const user = await validateCredentials(req.body);
    if (!user) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    const token = generateAccessToken(user);
    res.json({ success: true, user: formatUser(user), token });
  } catch (error) {
    next(error);
  }
}

async function handleForgotPassword(req, res, next) {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(422).json({ errors: errors.array() });
    }

    const { email } = req.body;
    const result = await requestPasswordReset(email);
    
    // Always return success to prevent email enumeration
    res.json({
      success: true,
      message: "If an account with that email exists, we've sent a password reset link."
    });
  } catch (error) {
    next(error);
  }
}

async function handleResetPassword(req, res, next) {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(422).json({ errors: errors.array() });
    }

    const { token, password } = req.body;
    const result = await resetPasswordWithToken(token, password);
    
    res.json({
      success: true,
      message: "Password reset successfully"
    });
  } catch (error) {
    next(error);
  }
}

module.exports = { handleRegister, handleLogin, handleForgotPassword, handleResetPassword };
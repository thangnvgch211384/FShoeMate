const express = require("express");
const { body } = require("express-validator");
const { handleRegister, handleLogin, handleForgotPassword, handleResetPassword } = require("./auth.controller");

const router = express.Router();

const registerValidation = [
  body("name").trim().notEmpty().withMessage("Name is required"),
  body("email").isEmail().withMessage("Email is required"),
  body("password").isLength({ min: 6 }).withMessage("Password must be at least 6 characters"),
];

const loginValidation = [
  body("email").isEmail().withMessage("Email is required"),
  body("password").notEmpty().withMessage("Password is required"),
];

const forgotPasswordValidation = [
  body("email").isEmail().withMessage("Email is required"),
];

const resetPasswordValidation = [
  body("token").notEmpty().withMessage("Reset token is required"),
  body("password").isLength({ min: 6 }).withMessage("Password must be at least 6 characters"),
];

router.post("/register", registerValidation, handleRegister);
router.post("/login", loginValidation, handleLogin);
router.post("/forgot-password", forgotPasswordValidation, handleForgotPassword);
router.post("/reset-password", resetPasswordValidation, handleResetPassword);

module.exports = router;
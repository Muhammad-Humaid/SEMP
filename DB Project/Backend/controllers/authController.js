const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { promisePool } = require('../config/database');

// Generate JWT Token
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE || '7d'
  });
};

// @desc    Register user
// @route   POST /api/auth/register
// @access  Public
exports.register = async (req, res, next) => {
  try {
    const { email, password, fullName, role, rollNumber, phoneNumber, societyName, societyId } = req.body;

    // Validation
    if (!email || !password || !fullName || !role) {
      return res.status(400).json({
        success: false,
        message: 'Please provide email, password, full name, and role'
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters'
      });
    }

    // Check if user exists
    const [existingUser] = await promisePool.query(
      'SELECT user_id FROM users WHERE email = ?',
      [email]
    );

    if (existingUser.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Email already registered'
      });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Insert user
    const [result] = await promisePool.query(
      `INSERT INTO users (email, password_hash, full_name, role, roll_number, phone_number, society_name, society_id) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [email, hashedPassword, fullName, role, rollNumber || null, phoneNumber || null, societyName || null, societyId || null]
    );

    // Generate token
    const token = generateToken(result.insertId);

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      data: {
        userId: result.insertId,
        email,
        fullName,
        role,
        token
      }
    });

  } catch (error) {
    console.error('Register error:', error);
    next(error);
  }
};

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    // Validation
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide email and password'
      });
    }

    // Get user
    const [users] = await promisePool.query(
      'SELECT * FROM users WHERE email = ?',
      [email]
    );

    if (users.length === 0) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    const user = users[0];

    // Check if active
    if (!user.is_active) {
      return res.status(401).json({
        success: false,
        message: 'Account has been deactivated'
      });
    }

    // Check password
    const isMatch = await bcrypt.compare(password, user.password_hash);

    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Generate token
    const token = generateToken(user.user_id);

    res.json({
      success: true,
      message: 'Login successful',
      data: {
        userId: user.user_id,
        email: user.email,
        fullName: user.full_name,
        role: user.role,
        societyName: user.society_name,
        societyId: user.society_id,
        rollNumber: user.roll_number,
        token
      }
    });

  } catch (error) {
    console.error('Login error:', error);
    next(error);
  }
};

// @desc    Get current user
// @route   GET /api/auth/me
// @access  Private
exports.getMe = async (req, res, next) => {
  try {
    const [users] = await promisePool.query(
      `SELECT user_id, email, full_name, role, roll_number, phone_number, 
              society_name, society_id, is_active, created_at 
       FROM users WHERE user_id = ?`,
      [req.user.user_id]
    );

    res.json({
      success: true,
      data: users[0]
    });

  } catch (error) {
    console.error('Get me error:', error);
    next(error);
  }
};

// @desc    Update password
// @route   PUT /api/auth/updatepassword
// @access  Private
exports.updatePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Please provide current and new password'
      });
    }

    // Get user with password
    const [users] = await promisePool.query(
      'SELECT password_hash FROM users WHERE user_id = ?',
      [req.user.user_id]
    );

    // Check current password
    const isMatch = await bcrypt.compare(currentPassword, users[0].password_hash);

    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Current password is incorrect'
      });
    }

    // Hash new password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    // Update password
    await promisePool.query(
      'UPDATE users SET password_hash = ? WHERE user_id = ?',
      [hashedPassword, req.user.user_id]
    );

    res.json({
      success: true,
      message: 'Password updated successfully'
    });

  } catch (error) {
    console.error('Update password error:', error);
    next(error);
  }
};
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { promisePool } = require('../config/database');

// Generate JWT Token
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE
  });
};

// @desc    Register new user
// @route   POST /api/auth/register
// @access  Public
exports.register = async (req, res) => {
  try {
    const { 
      email, 
      password, 
      role, 
      fullName, 
      rollNumber, 
      phoneNumber, 
      societyName, 
      societyId 
    } = req.body;

    // Validate required fields
    if (!email || !password || !role) {
      return res.status(400).json({ 
        success: false, 
        message: 'Please provide email, password, and role' 
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
        message: 'User with this email already exists' 
      });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    // Insert user
    const [result] = await promisePool.query(
      `INSERT INTO users (email, password_hash, role, full_name, roll_number, phone_number, society_name, society_id) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [email, passwordHash, role, fullName || null, rollNumber || null, phoneNumber || null, societyName || null, societyId || null]
    );

    // Generate token
    const token = generateToken(result.insertId);

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      data: {
        userId: result.insertId,
        email,
        role,
        token
      }
    });
  } catch (error) {
    console.error('Register Error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error during registration',
      error: error.message 
    });
  }
};

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
exports.login = async (req, res) => {
  try {
    const { email, password, role } = req.body;

    // Validate input
    if (!email || !password || !role) {
      return res.status(400).json({ 
        success: false, 
        message: 'Please provide email, password, and role' 
      });
    }

    // Check for user
    const [rows] = await promisePool.query(
      `SELECT user_id, email, password_hash, role, full_name, society_name, is_active 
       FROM users 
       WHERE email = ? AND role = ?`,
      [email, role]
    );

    if (rows.length === 0) {
      return res.status(401).json({ 
        success: false, 
        message: 'Invalid credentials' 
      });
    }

    const user = rows[0];

    // Check if user is active
    if (!user.is_active) {
      return res.status(401).json({ 
        success: false, 
        message: 'Account is inactive. Please contact administrator.' 
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
        role: user.role,
        fullName: user.full_name,
        societyName: user.society_name,
        token
      }
    });
  } catch (error) {
    console.error('Login Error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error during login',
      error: error.message 
    });
  }
};

// @desc    Get current logged in user
// @route   GET /api/auth/me
// @access  Private
exports.getMe = async (req, res) => {
  try {
    const [rows] = await promisePool.query(
      `SELECT user_id, email, role, full_name, roll_number, phone_number, society_name, society_id, created_at 
       FROM users 
       WHERE user_id = ?`,
      [req.user.user_id]
    );

    res.json({
      success: true,
      data: rows[0],
    });
  } catch (error) {
    console.error('Get Me Error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error',
      error: error.message 
    });
  }
};
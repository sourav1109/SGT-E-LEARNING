
const User = require('../models/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const nodemailer = require('nodemailer');

// Logout (optional: implement token blacklisting)
exports.logout = async (req, res) => {
  try {
    // If you implement token blacklisting, add the token to the blacklist here
    // For a simple implementation, just return success since the frontend will handle clearing localStorage
    res.json({ message: 'Logged out successfully' });
  } catch (err) {
    console.error('Logout error:', err);
    res.status(500).json({ message: err.message });
  }
};
// Request password reset (send email with link)
exports.requestPasswordReset = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ message: 'Email is required' });
    }
    
    // Normalize email (trim whitespace and convert to lowercase)
    const normalizedEmail = email.trim().toLowerCase();
    console.log('Received password reset request for email:', normalizedEmail);
    
    // Do a case-insensitive search to maximize chances of finding the user
    const user = await User.findOne({ email: normalizedEmail });
    
    console.log('User found:', user ? 'Yes' : 'No');
    if (!user) {
      // Try a more flexible search if exact match not found
      const similarEmailUser = await User.findOne({ 
        email: { $regex: new RegExp(normalizedEmail.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i') } 
      });
      
      if (similarEmailUser) {
        console.log('Found user with similar email:', similarEmailUser.email);
        return res.status(404).json({ 
          message: 'User not found. Did you mean ' + similarEmailUser.email + '?',
          suggestedEmail: similarEmailUser.email
        });
      }
      
      return res.status(404).json({ message: 'User not found with this email address. Please check for typos or contact support.' });
    }
    
    const token = crypto.randomBytes(32).toString('hex');
    user.resetPasswordToken = token;
    user.resetPasswordExpires = Date.now() + 5 * 60 * 1000; // 5 minutes
    await user.save();

    const resetUrl = `${req.protocol}://${req.get('host')}/api/auth/reset-password/${token}`;

    // Send email
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
      }
    });
    await transporter.sendMail({
      to: user.email,
      subject: 'Password Reset',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 5px;">
          <h2 style="color: #1976d2;">Password Reset Request</h2>
          <p>You requested a password reset for your account. Click the button below to reset your password. This link is valid for 5 minutes.</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${resetUrl}" style="background-color: #1976d2; color: white; padding: 12px 20px; text-decoration: none; border-radius: 4px; font-weight: bold;">Reset Password</a>
          </div>
          <p>If you didn't request this, please ignore this email or contact support if you have concerns.</p>
          <p>If the button doesn't work, copy and paste this URL into your browser:</p>
          <p style="word-break: break-all; background-color: #f5f5f5; padding: 10px; border-radius: 4px;">${resetUrl}</p>
        </div>
      `
    });
    res.json({ message: 'Password reset email sent' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Password strength validation helper
function isStrongPassword(password) {
  // At least 8 chars, 1 uppercase, 1 lowercase, 1 number, 1 special char
  return /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]).{8,}$/.test(password);
}

// Redirect to frontend reset password page
exports.redirectToResetPage = async (req, res) => {
  try {
    const { token } = req.params;
    
    // Check if token is valid before redirecting
    const user = await User.findOne({
      resetPasswordToken: token,
      resetPasswordExpires: { $gt: Date.now() }
    });
    
    if (!user) {
      // If token is invalid, redirect to frontend with error parameter
      return res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:3000'}/reset-password-error?reason=invalid`);
    }
    
    // Redirect to frontend reset password page with token
    res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:3000'}/reset-password/${token}`);
  } catch (err) {
    console.error('Reset page redirect error:', err);
    res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:3000'}/reset-password-error?reason=error`);
  }
};

// Reset password (via link)
exports.resetPassword = async (req, res) => {
  try {
    const { token } = req.params;
    const { newPassword } = req.body;
    console.log('Received password reset token:', token);
    
    if (!isStrongPassword(newPassword)) {
      return res.status(400).json({ message: 'Password must be at least 8 characters and include uppercase, lowercase, number, and special character.' });
    }
    
    const user = await User.findOne({
      resetPasswordToken: token,
      resetPasswordExpires: { $gt: Date.now() }
    });
    
    console.log('User found with token:', user ? 'Yes' : 'No');
    if (!user) return res.status(400).json({ message: 'Invalid or expired token' });
    
    user.password = await bcrypt.hash(newPassword, 10);
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();
    console.log('Password reset successful for user:', user.email);
    
    res.json({ message: 'Password reset successful' });
  } catch (err) {
    console.error('Password reset error:', err);
    res.status(500).json({ message: err.message });
  }
};

// Signup (for admin only, initial setup)
exports.signup = async (req, res) => {
  try {
    const { name, email, password, role } = req.body;
    if (role !== 'admin') return res.status(403).json({ message: 'Only admin signup allowed here' });
    if (!isStrongPassword(password)) {
      return res.status(400).json({ message: 'Password must be at least 8 characters and include uppercase, lowercase, number, and special character.' });
    }
    const existing = await User.findOne({ email });
    if (existing) return res.status(400).json({ message: 'Admin already exists' });
    const hashedPassword = await bcrypt.hash(password, 10);
    const admin = new User({ name, email, password: hashedPassword, role });
    await admin.save();
    res.status(201).json({ message: 'Admin created' });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

// Login (all roles)
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }
    
    // Normalize email (trim whitespace and convert to lowercase)
    const normalizedEmail = email.trim().toLowerCase();
    
    const user = await User.findOne({ email: normalizedEmail });
    if (!user) {
      // Try a more flexible search if exact match not found
      const similarEmailUser = await User.findOne({ 
        email: { $regex: new RegExp(normalizedEmail.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i') } 
      });
      
      if (similarEmailUser) {
        console.log('Found user with similar email during login:', similarEmailUser.email);
        // Don't suggest the email for security reasons, just use a generic message
        return res.status(400).json({ message: 'Invalid credentials. Please check your email address.' });
      }
      
      return res.status(400).json({ message: 'Invalid credentials' });
    }
    
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ message: 'Invalid credentials' });
    if (!user.isActive) return res.status(403).json({ message: 'Account deactivated' });
    
    // Ensure permissions exist in both formats (lowercase with underscores and title case with spaces)
    const normalizedPermissions = [];
    
    if (user.permissions && Array.isArray(user.permissions)) {
      // First add all original permissions
      normalizedPermissions.push(...user.permissions);
      
      // Then add normalized versions in both formats
      user.permissions.forEach(perm => {
        // Convert snake_case to Title Case
        if (perm.includes('_')) {
          const titleCasePerm = perm.split('_')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ');
          
          if (!normalizedPermissions.includes(titleCasePerm)) {
            normalizedPermissions.push(titleCasePerm);
          }
        } 
        // Convert Title Case to snake_case
        else if (/[A-Z]/.test(perm)) {
          const snakeCasePerm = perm.toLowerCase().replace(/\s+/g, '_');
          
          if (!normalizedPermissions.includes(snakeCasePerm)) {
            normalizedPermissions.push(snakeCasePerm);
          }
        }
      });
    }
    
    console.log('Normalized permissions:', normalizedPermissions);
    
    const token = jwt.sign({ 
      id: user._id, 
      role: user.role,
      permissions: normalizedPermissions
    }, process.env.JWT_SECRET, { expiresIn: '1d' });
    
    res.json({ 
      token, 
      user: { 
        id: user._id, 
        name: user.name, 
        email: user.email, 
        role: user.role,
        permissions: normalizedPermissions
      } 
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(400).json({ message: err.message });
  }
};

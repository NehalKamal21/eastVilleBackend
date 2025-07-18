const jwt = require('jsonwebtoken');
const User = require('../models/User');
const config = require('../config/config');
const logger = require('../utils/logger');

// Generate JWT token
const generateToken = (user) => {
    return jwt.sign(
        { 
            id: user._id, 
            email: user.email, 
            username: user.username,
            role: user.role 
        }, 
        config.jwt.secret, 
        { expiresIn: config.jwt.expiresIn }
    );
};

// Set JWT cookie
const setTokenCookie = (res, token) => {
    res.cookie(config.jwt.cookieName, token, {
        httpOnly: config.nodeEnv === 'production',
        secure: config.nodeEnv === 'production',
        sameSite: 'lax',
        maxAge: 24 * 60 * 60 * 1000, // 24 hours
    });
};

// User registration
const register = async (req, res) => {
    try {
        const { username, email, password } = req.body;

        // Check if user already exists
        const existingUser = await User.findOne({ 
            $or: [{ email }, { username }] 
        });

        if (existingUser) {
            return res.status(400).json({
                error: 'User already exists',
                details: existingUser.email === email ? 'Email already registered' : 'Username already taken'
            });
        }

        // Create new user
        const user = new User({
            username,
            email,
            password,
        });

        await user.save();

        // Generate token
        const token = generateToken(user);
        setTokenCookie(res, token);

        logger.info(`New user registered: ${user.email}`);

        res.status(201).json({
            message: 'User registered successfully!',
            user: user.toPublicJSON(),
            token
        });

    } catch (error) {
        logger.error('Registration error:', error);
        
        if (error.code === 11000) {
            return res.status(400).json({
                error: 'User already exists',
                details: 'Email or username already registered'
            });
        }

        res.status(500).json({
            error: 'Internal server error during registration'
        });
    }
};

// User login
const login = async (req, res) => {
    try {
        const { email, password } = req.body;

        // Find user by email
        const user = await User.findOne({ email });

        if (!user) {
            return res.status(400).json({
                error: 'Invalid credentials',
                details: 'Email or password is incorrect'
            });
        }

        // Check if user is active
        if (!user.isActive) {
            return res.status(400).json({
                error: 'Account disabled',
                details: 'Your account has been deactivated. Please contact support.'
            });
        }

        // Verify password
        const isPasswordValid = await user.comparePassword(password);
        if (!isPasswordValid) {
            return res.status(400).json({
                error: 'Invalid credentials',
                details: 'Email or password is incorrect'
            });
        }

        // Update last login
        user.lastLogin = new Date();
        await user.save();

        // Generate token
        const token = generateToken(user);
        setTokenCookie(res, token);

        logger.info(`User logged in: ${user.email}`);

        res.json({
            message: 'Login successful',
            user: user.toPublicJSON(),
            token
        });

    } catch (error) {
        logger.error('Login error:', error);
        res.status(500).json({
            error: 'Internal server error during login'
        });
    }
};

// User logout
const logout = (req, res) => {
    res.clearCookie(config.jwt.cookieName);
    logger.info(`User logged out: ${req.user?.email || 'Unknown'}`);
    
    res.json({
        message: 'Logged out successfully!'
    });
};

// Get current user profile
const getProfile = async (req, res) => {
    try {
        const user = await User.findById(req.user._id).select('-password');
        
        if (!user) {
            return res.status(404).json({
                error: 'User not found'
            });
        }

        res.json({
            user: user.toPublicJSON()
        });

    } catch (error) {
        logger.error('Get profile error:', error);
        res.status(500).json({
            error: 'Internal server error while fetching profile'
        });
    }
};

// Update user profile
const updateProfile = async (req, res) => {
    try {
        const { username, email } = req.body;
        const updateData = {};

        if (username) updateData.username = username;
        if (email) updateData.email = email;

        // Check if email is already taken by another user
        if (email && email !== req.user.email) {
            const existingUser = await User.findOne({ email });
            if (existingUser) {
                return res.status(400).json({
                    error: 'Email already taken',
                    details: 'This email is already registered by another user'
                });
            }
        }

        const updatedUser = await User.findByIdAndUpdate(
            req.user._id,
            updateData,
            { new: true, runValidators: true }
        ).select('-password');

        logger.info(`User profile updated: ${updatedUser.email}`);

        res.json({
            message: 'Profile updated successfully',
            user: updatedUser.toPublicJSON()
        });

    } catch (error) {
        logger.error('Update profile error:', error);
        
        if (error.code === 11000) {
            return res.status(400).json({
                error: 'Username already taken',
                details: 'This username is already in use'
            });
        }

        res.status(500).json({
            error: 'Internal server error while updating profile'
        });
    }
};

// Change password
const changePassword = async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;

        const user = await User.findById(req.user._id);

        // Verify current password
        const isCurrentPasswordValid = await user.comparePassword(currentPassword);
        if (!isCurrentPasswordValid) {
            return res.status(400).json({
                error: 'Current password is incorrect'
            });
        }

        // Update password
        user.password = newPassword;
        await user.save();

        logger.info(`Password changed for user: ${user.email}`);

        res.json({
            message: 'Password changed successfully'
        });

    } catch (error) {
        logger.error('Change password error:', error);
        res.status(500).json({
            error: 'Internal server error while changing password'
        });
    }
};

module.exports = {
    register,
    login,
    logout,
    getProfile,
    updateProfile,
    changePassword,
}; 
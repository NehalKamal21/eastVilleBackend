const jwt = require('jsonwebtoken');
const config = require('../config/config');
const User = require('../models/User');
const logger = require('../utils/logger');

// Middleware to authenticate JWT token
const authenticateToken = async (req, res, next) => {
    try {
        const token = req.cookies[config.jwt.cookieName] || req.headers.authorization?.split(' ')[1];

        if (!token) {
            return res.status(401).json({ 
                error: 'Access denied. No token provided.',
                code: 'NO_TOKEN'
            });
        }

        const decoded = jwt.verify(token, config.jwt.secret);
        
        // Get user from database to ensure they still exist and are active
        const user = await User.findById(decoded.id).select('-password');
        
        if (!user || !user.isActive) {
            return res.status(401).json({ 
                error: 'Invalid token. User not found or inactive.',
                code: 'INVALID_USER'
            });
        }

        req.user = user;
        return next();
    } catch (error) {
        logger.error('Authentication error:', error);
        
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({ 
                error: 'Token expired.',
                code: 'TOKEN_EXPIRED'
            });
        }
        
        if (error.name === 'JsonWebTokenError') {
            return res.status(401).json({ 
                error: 'Invalid token.',
                code: 'INVALID_TOKEN'
            });
        }

        return res.status(500).json({ 
            error: 'Internal server error during authentication.',
            code: 'AUTH_ERROR'
        });
    }
};

// Middleware to check if user has required role
const requireRole = (roles) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ 
                error: 'Authentication required.',
                code: 'AUTH_REQUIRED'
            });
        }

        const userRole = req.user.role;
        const allowedRoles = Array.isArray(roles) ? roles : [roles];

        if (!allowedRoles.includes(userRole)) {
            return res.status(403).json({ 
                error: 'Insufficient permissions.',
                code: 'INSUFFICIENT_PERMISSIONS',
                required: allowedRoles,
                current: userRole
            });
        }

        return next();
    };
};

// Middleware to check if user is admin
const requireAdmin = requireRole('admin');

// Middleware to check if user is admin or the resource owner
const requireAdminOrOwner = (resourceUserIdField = 'userId') => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ 
                error: 'Authentication required.',
                code: 'AUTH_REQUIRED'
            });
        }

        const userRole = req.user.role;
        const resourceUserId = req.params[resourceUserIdField] || req.body[resourceUserIdField];

        if (userRole === 'admin' || req.user._id.toString() === resourceUserId) {
            return next();
        }

        return res.status(403).json({ 
            error: 'Insufficient permissions.',
            code: 'INSUFFICIENT_PERMISSIONS'
        });
    };
};

module.exports = {
    authenticateToken,
    requireRole,
    requireAdmin,
    requireAdminOrOwner,
}; 
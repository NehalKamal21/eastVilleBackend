const { body, param, query, validationResult } = require('express-validator');

// Middleware to handle validation errors
const handleValidationErrors = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({
            error: 'Validation failed',
            details: errors.array().map(err => ({
                field: err.path,
                message: err.msg,
                value: err.value
            }))
        });
    }
    next();
};

// User registration validation
const validateRegistration = [
    body('username')
        .trim()
        .isLength({ min: 3, max: 30 })
        .withMessage('Username must be between 3 and 30 characters')
        .matches(/^[a-zA-Z0-9_]+$/)
        .withMessage('Username can only contain letters, numbers, and underscores'),
    
    body('email')
        .isEmail()
        .normalizeEmail()
        .withMessage('Please provide a valid email address'),
    
    body('password')
        .isLength({ min: 6 })
        .withMessage('Password must be at least 6 characters long')
        .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
        .withMessage('Password must contain at least one uppercase letter, one lowercase letter, and one number'),
    
    handleValidationErrors
];

// User login validation
const validateLogin = [
    body('email')
        .isEmail()
        .normalizeEmail()
        .withMessage('Please provide a valid email address'),
    
    body('password')
        .notEmpty()
        .withMessage('Password is required'),
    
    handleValidationErrors
];

// Contact form validation
const validateContact = [
    body('name')
        .trim()
        .isLength({ min: 2, max: 100 })
        .withMessage('Name must be between 2 and 100 characters')
        .matches(/^[a-zA-Z\s]+$/)
        .withMessage('Name can only contain letters and spaces'),
    
    body('email')
        .isEmail()
        .normalizeEmail()
        .withMessage('Please provide a valid email address'),
    
    body('phone')
        .matches(/^[+]?[1-9][\d]{0,15}$/)
        .withMessage('Please provide a valid phone number'),
    
    body('message')
        .trim()
        .isLength({ min: 10, max: 1000 })
        .withMessage('Message must be between 10 and 1000 characters'),
    
    body('interestedUnit')
        .optional()
        .trim()
        .isLength({ max: 200 })
        .withMessage('Interested unit cannot exceed 200 characters'),
    
    handleValidationErrors
];

// Cluster creation validation
const validateCluster = [
    body('clusterName')
        .trim()
        .isLength({ min: 2, max: 100 })
        .withMessage('Cluster name must be between 2 and 100 characters'),
    
    body('clusterId')
        .trim()
        .isLength({ min: 1, max: 50 })
        .withMessage('Cluster ID must be between 1 and 50 characters')
        .matches(/^[a-zA-Z0-9_-]+$/)
        .withMessage('Cluster ID can only contain letters, numbers, hyphens, and underscores'),
    
    body('x')
        .isNumeric()
        .withMessage('X coordinate must be a number'),
    
    body('y')
        .isNumeric()
        .withMessage('Y coordinate must be a number'),
    
    body('villas')
        .isArray({ min: 1 })
        .withMessage('At least one villa is required'),
    
    body('villas.*.id')
        .trim()
        .notEmpty()
        .withMessage('Villa ID is required'),
    
    body('villas.*.size')
        .isNumeric({ min: 1 })
        .withMessage('Villa size must be a positive number'),
    
    body('villas.*.type')
        .trim()
        .notEmpty()
        .withMessage('Villa type is required'),
    
    handleValidationErrors
];

// Villa search validation
const validateVillaSearch = [
    param('combinedId')
        .matches(/^[a-zA-Z0-9_-]+_[a-zA-Z0-9_-]+$/)
        .withMessage('Combined ID must be in format: clusterId_villaId'),
    
    handleValidationErrors
];

// Contact update validation
const validateContactUpdate = [
    param('id')
        .isMongoId()
        .withMessage('Invalid contact ID format'),
    
    body('status')
        .optional()
        .isIn(['Pending', 'In Progress', 'Resolved', 'Cancelled'])
        .withMessage('Invalid status value'),
    
    body('priority')
        .optional()
        .isIn(['Low', 'Medium', 'High', 'Urgent'])
        .withMessage('Invalid priority value'),
    
    body('salesComment')
        .optional()
        .trim()
        .isLength({ max: 500 })
        .withMessage('Sales comment cannot exceed 500 characters'),
    
    handleValidationErrors
];

// Pagination validation
const validatePagination = [
    query('page')
        .optional()
        .isInt({ min: 1 })
        .withMessage('Page must be a positive integer'),
    
    query('limit')
        .optional()
        .isInt({ min: 1, max: 100 })
        .withMessage('Limit must be between 1 and 100'),
    
    handleValidationErrors
];

module.exports = {
    handleValidationErrors,
    validateRegistration,
    validateLogin,
    validateContact,
    validateCluster,
    validateVillaSearch,
    validateContactUpdate,
    validatePagination,
}; 
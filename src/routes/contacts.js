const express = require('express');
const router = express.Router();
const contactController = require('../controllers/contactController');
const { authenticateToken, requireAdmin } = require('../middleware/auth');
const { 
    validateContact, 
    validateContactUpdate,
    validatePagination 
} = require('../middleware/validation');

// Public routes
router.post('/', validateContact, contactController.createContact);

// Admin routes
router.get('/', authenticateToken, requireAdmin, validatePagination, contactController.getAllContacts);
router.get('/stats', authenticateToken, requireAdmin, contactController.getContactStats);
router.get('/export', authenticateToken, requireAdmin, contactController.exportContacts);
router.get('/:id', authenticateToken, requireAdmin, contactController.getContactById);
router.put('/:id', authenticateToken, requireAdmin, validateContactUpdate, contactController.updateContact);
router.delete('/:id', authenticateToken, requireAdmin, contactController.deleteContact);
router.put('/bulk/update', authenticateToken, requireAdmin, contactController.bulkUpdateContacts);

module.exports = router; 
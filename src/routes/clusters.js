const express = require('express');
const router = express.Router();
const clusterController = require('../controllers/clusterController');
const { authenticateToken, requireAdmin } = require('../middleware/auth');
const { 
    validateCluster, 
    validateVillaSearch,
    validatePagination 
} = require('../middleware/validation');

// Public routes
router.get('/', validatePagination, clusterController.getAllClusters);
router.get('/stats', clusterController.getClusterStats);
router.get('/clusterId/:clusterId', clusterController.getClusterById);
router.get('/villa/search/:combinedId', validateVillaSearch, clusterController.searchVilla);

// Admin routes
router.post('/', authenticateToken, requireAdmin, validateCluster, clusterController.createCluster);
router.put('/:clusterId', authenticateToken, requireAdmin, validateCluster, clusterController.updateCluster);
router.delete('/:clusterId', authenticateToken, requireAdmin, clusterController.deleteCluster);

module.exports = router; 
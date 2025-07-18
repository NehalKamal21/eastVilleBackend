const Cluster = require('../models/Cluster');
const logger = require('../utils/logger');

// Get all clusters with filtering
const getAllClusters = async (req, res) => {
    try {
        const { status, search } = req.query;

        // Build filter object
        const filter = { isActive: true };
        
        if (status) {
            filter['villas.status'] = status;
        }
        
        if (search) {
            filter.$or = [
                { clusterName: { $regex: search, $options: 'i' } },
                { clusterId: { $regex: search, $options: 'i' } },
            ];
        }

        const clusters = await Cluster.find(filter)
            .sort({ createdAt: -1 });

        logger.info(`Retrieved ${clusters.length} clusters`);

        res.json({
            clusters
        });

    } catch (error) {
        logger.error('Get clusters error:', error);
        res.status(500).json({
            error: 'Internal server error while fetching clusters'
        });
    }
};

// Get cluster by ID
const getClusterById = async (req, res) => {
    try {
        const { clusterId } = req.params;

        const cluster = await Cluster.findOne({ 
            clusterId, 
            isActive: true 
        });

        if (!cluster) {
            return res.status(404).json({
                error: 'Cluster not found',
                details: 'The requested cluster does not exist or is inactive'
            });
        }

        logger.info(`Retrieved cluster: ${cluster.clusterId}`);

        res.json({
            cluster,
            stats: cluster.getVillaStats()
        });

    } catch (error) {
        logger.error('Get cluster error:', error);
        res.status(500).json({
            error: 'Internal server error while fetching cluster'
        });
    }
};

// Create new cluster
const createCluster = async (req, res) => {
    try {
        const clusterData = req.body;

        // Check if cluster ID already exists
        const existingCluster = await Cluster.findOne({ 
            clusterId: clusterData.clusterId 
        });

        if (existingCluster) {
            return res.status(400).json({
                error: 'Cluster ID already exists',
                details: 'A cluster with this ID already exists'
            });
        }

        const cluster = new Cluster(clusterData);
        await cluster.save();

        logger.info(`New cluster created: ${cluster.clusterId} by user: ${req.user?.email}`);

        res.status(201).json({
            message: 'Cluster created successfully!',
            cluster,
            stats: cluster.getVillaStats()
        });

    } catch (error) {
        logger.error('Create cluster error:', error);
        
        if (error.code === 11000) {
            return res.status(400).json({
                error: 'Cluster ID already exists',
                details: 'A cluster with this ID already exists'
            });
        }

        res.status(500).json({
            error: 'Internal server error while creating cluster'
        });
    }
};

// Update cluster
const updateCluster = async (req, res) => {
    try {
        const { clusterId } = req.params;
        const updateData = req.body;

        const cluster = await Cluster.findOneAndUpdate(
            { clusterId, isActive: true },
            updateData,
            { new: true, runValidators: true }
        );

        if (!cluster) {
            return res.status(404).json({
                error: 'Cluster not found',
                details: 'The requested cluster does not exist or is inactive'
            });
        }

        logger.info(`Cluster updated: ${cluster.clusterId} by user: ${req.user?.email}`);

        res.json({
            message: 'Cluster updated successfully!',
            cluster,
            stats: cluster.getVillaStats()
        });

    } catch (error) {
        logger.error('Update cluster error:', error);
        res.status(500).json({
            error: 'Internal server error while updating cluster'
        });
    }
};

// Delete cluster (soft delete)
const deleteCluster = async (req, res) => {
    try {
        const { clusterId } = req.params;

        const cluster = await Cluster.findOneAndUpdate(
            { clusterId, isActive: true },
            { isActive: false },
            { new: true }
        );

        if (!cluster) {
            return res.status(404).json({
                error: 'Cluster not found',
                details: 'The requested cluster does not exist or is already deleted'
            });
        }

        logger.info(`Cluster deleted: ${cluster.clusterId} by user: ${req.user?.email}`);

        res.json({
            message: 'Cluster deleted successfully!'
        });

    } catch (error) {
        logger.error('Delete cluster error:', error);
        res.status(500).json({
            error: 'Internal server error while deleting cluster'
        });
    }
};

// Search villa by combined ID
const searchVilla = async (req, res) => {
    try {
        const { combinedId } = req.params;
        const [clusterId, villaId] = combinedId.split('_');

        if (!clusterId || !villaId) {
            return res.status(400).json({
                error: 'Invalid format',
                details: 'Use format: clusterId_villaId'
            });
        }

        const cluster = await Cluster.findOne({ 
            clusterId, 
            isActive: true 
        });

        if (!cluster) {
            return res.status(404).json({
                error: 'Cluster not found',
                details: 'The requested cluster does not exist or is inactive'
            });
        }

        const villa = cluster.findVillaById(villaId);

        if (!villa) {
            return res.status(404).json({
                error: 'Villa not found',
                details: 'The requested villa does not exist in this cluster'
            });
        }

        logger.info(`Villa searched: ${combinedId}`);

        res.json({
            cluster: {
                clusterId: cluster.clusterId,
                clusterName: cluster.clusterName,
            },
            villa,
        });

    } catch (error) {
        logger.error('Search villa error:', error);
        res.status(500).json({
            error: 'Internal server error while searching villa'
        });
    }
};

// Get cluster statistics
const getClusterStats = async (req, res) => {
    try {
        const stats = await Cluster.aggregate([
            { $match: { isActive: true } },
            {
                $project: {
                    clusterName: 1,
                    clusterId: 1,
                    villaCount: { $size: '$villas' },
                    availableVillas: {
                        $size: {
                            $filter: {
                                input: '$villas',
                                cond: { $eq: ['$$this.status', 'Available'] }
                            }
                        }
                    },
                    soldVillas: {
                        $size: {
                            $filter: {
                                input: '$villas',
                                cond: { $eq: ['$$this.status', 'Sold'] }
                            }
                        }
                    },
                    underConstructionVillas: {
                        $size: {
                            $filter: {
                                input: '$villas',
                                cond: { $eq: ['$$this.status', 'Under Construction'] }
                            }
                        }
                    }
                }
            }
        ]);

        const totalStats = stats.reduce((acc, cluster) => {
            acc.totalVillas += cluster.villaCount;
            acc.totalAvailable += cluster.availableVillas;
            acc.totalSold += cluster.soldVillas;
            acc.totalUnderConstruction += cluster.underConstructionVillas;
            return acc;
        }, {
            totalVillas: 0,
            totalAvailable: 0,
            totalSold: 0,
            totalUnderConstruction: 0
        });

        logger.info('Cluster statistics retrieved');

        res.json({
            clusters: stats,
            totals: totalStats
        });

    } catch (error) {
        logger.error('Get cluster stats error:', error);
        res.status(500).json({
            error: 'Internal server error while fetching statistics'
        });
    }
};

module.exports = {
    getAllClusters,
    getClusterById,
    createCluster,
    updateCluster,
    deleteCluster,
    searchVilla,
    getClusterStats,
}; 
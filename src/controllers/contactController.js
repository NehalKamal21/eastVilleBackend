const Contact = require('../models/Contact');
const logger = require('../utils/logger');

// Create new contact inquiry
const createContact = async (req, res) => {
    try {
        const contactData = req.body;

        const contact = new Contact(contactData);
        await contact.save();

        logger.info(`New contact inquiry created: ${contact.email}`);

        res.status(201).json({
            message: 'Your message has been received! We will get back to you soon.',
            contact: contact.getSummary()
        });

    } catch (error) {
        logger.error('Create contact error:', error);
        res.status(500).json({
            error: 'Internal server error while saving contact message'
        });
    }
};

// Get all contacts with pagination and filtering
const getAllContacts = async (req, res) => {
    try {
        const { 
            page = 1, 
            limit = 10, 
            status, 
            priority, 
            source, 
            search,
            sortBy = 'createdAt',
            sortOrder = 'desc'
        } = req.query;

        const skip = (page - 1) * limit;

        // Build filter object
        const filter = {};
        
        if (status) filter.status = status;
        if (priority) filter.priority = priority;
        if (source) filter.source = source;
        
        if (search) {
            filter.$or = [
                { name: { $regex: search, $options: 'i' } },
                { email: { $regex: search, $options: 'i' } },
                { phone: { $regex: search, $options: 'i' } },
                { message: { $regex: search, $options: 'i' } },
                { interestedUnit: { $regex: search, $options: 'i' } },
            ];
        }

        // Build sort object
        const sort = {};
        sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

        const contacts = await Contact.find(filter)
            .sort(sort)
            .limit(parseInt(limit, 10))
            .skip(skip);

        const total = await Contact.countDocuments(filter);

        logger.info(`Retrieved ${contacts.length} contacts`);

        res.json({
            contacts,
            pagination: {
                current: parseInt(page, 10),
                total: Math.ceil(total / limit),
                hasNext: page * limit < total,
                hasPrev: page > 1,
                totalItems: total,
            }
        });

    } catch (error) {
        logger.error('Get contacts error:', error);
        res.status(500).json({
            error: 'Internal server error while fetching contacts'
        });
    }
};

// Get contact by ID
const getContactById = async (req, res) => {
    try {
        const { id } = req.params;

        const contact = await Contact.findById(id);

        if (!contact) {
            return res.status(404).json({
                error: 'Contact not found',
                details: 'The requested contact does not exist'
            });
        }

        logger.info(`Retrieved contact: ${contact._id}`);

        res.json({
            contact
        });

    } catch (error) {
        logger.error('Get contact error:', error);
        res.status(500).json({
            error: 'Internal server error while fetching contact'
        });
    }
};

// Update contact
const updateContact = async (req, res) => {
    try {
        const { id } = req.params;
        const updateData = req.body;

        // Add update tracking
        updateData.updatedBy = {
            username: req.user.username,
            email: req.user.email,
            userId: req.user._id,
        };
        updateData.updatedAt = new Date();

        const contact = await Contact.findByIdAndUpdate(
            id,
            updateData,
            { new: true, runValidators: true }
        );

        if (!contact) {
            return res.status(404).json({
                error: 'Contact not found',
                details: 'The requested contact does not exist'
            });
        }

        logger.info(`Contact updated: ${contact._id} by user: ${req.user.email}`);

        res.json({
            message: 'Contact updated successfully',
            contact
        });

    } catch (error) {
        logger.error('Update contact error:', error);
        res.status(500).json({
            error: 'Internal server error while updating contact'
        });
    }
};

// Delete contact
const deleteContact = async (req, res) => {
    try {
        const { id } = req.params;

        const contact = await Contact.findByIdAndDelete(id);

        if (!contact) {
            return res.status(404).json({
                error: 'Contact not found',
                details: 'The requested contact does not exist'
            });
        }

        logger.info(`Contact deleted: ${contact._id} by user: ${req.user.email}`);

        res.json({
            message: 'Contact deleted successfully'
        });

    } catch (error) {
        logger.error('Delete contact error:', error);
        res.status(500).json({
            error: 'Internal server error while deleting contact'
        });
    }
};

// Get contact statistics
const getContactStats = async (req, res) => {
    try {
        const stats = await Contact.getStats();

        // Get additional statistics
        const priorityStats = await Contact.aggregate([
            {
                $group: {
                    _id: '$priority',
                    count: { $sum: 1 },
                },
            },
        ]);

        const sourceStats = await Contact.aggregate([
            {
                $group: {
                    _id: '$source',
                    count: { $sum: 1 },
                },
            },
        ]);

        // Get recent activity (last 7 days)
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

        const recentActivity = await Contact.aggregate([
            {
                $match: {
                    createdAt: { $gte: sevenDaysAgo }
                }
            },
            {
                $group: {
                    _id: {
                        $dateToString: { format: '%Y-%m-%d', date: '$createdAt' }
                    },
                    count: { $sum: 1 }
                }
            },
            {
                $sort: { _id: 1 }
            }
        ]);

        logger.info('Contact statistics retrieved');

        res.json({
            statusStats: stats,
            priorityStats,
            sourceStats,
            recentActivity
        });

    } catch (error) {
        logger.error('Get contact stats error:', error);
        res.status(500).json({
            error: 'Internal server error while fetching statistics'
        });
    }
};

// Bulk update contacts
const bulkUpdateContacts = async (req, res) => {
    try {
        const { contactIds, updateData } = req.body;

        if (!contactIds || !Array.isArray(contactIds) || contactIds.length === 0) {
            return res.status(400).json({
                error: 'Invalid request',
                details: 'Contact IDs array is required'
            });
        }

        // Add update tracking
        updateData.updatedBy = {
            username: req.user.username,
            email: req.user.email,
            userId: req.user._id,
        };
        updateData.updatedAt = new Date();

        const result = await Contact.updateMany(
            { _id: { $in: contactIds } },
            updateData
        );

        logger.info(`Bulk updated ${result.modifiedCount} contacts by user: ${req.user.email}`);

        res.json({
            message: `Successfully updated ${result.modifiedCount} contacts`,
            modifiedCount: result.modifiedCount
        });

    } catch (error) {
        logger.error('Bulk update contacts error:', error);
        res.status(500).json({
            error: 'Internal server error while bulk updating contacts'
        });
    }
};

// Export contacts
const exportContacts = async (req, res) => {
    try {
        const { format = 'json', status, priority, source } = req.query;

        // Build filter object
        const filter = {};
        if (status) filter.status = status;
        if (priority) filter.priority = priority;
        if (source) filter.source = source;

        const contacts = await Contact.find(filter).sort({ createdAt: -1 });

        if (format === 'csv') {
            // Convert to CSV format
            const csvHeaders = 'Name,Email,Phone,Interested Unit,Message,Status,Priority,Source,Created At\n';
            const csvData = contacts.map(contact => 
                `"${contact.name}","${contact.email}","${contact.phone}","${contact.interestedUnit || ''}","${contact.message}","${contact.status}","${contact.priority}","${contact.source}","${contact.createdAt}"`
            ).join('\n');

            res.setHeader('Content-Type', 'text/csv');
            res.setHeader('Content-Disposition', 'attachment; filename=contacts.csv');
            res.send(csvHeaders + csvData);
        } else {
            res.json({
                contacts,
                exportInfo: {
                    total: contacts.length,
                    filters: { status, priority, source },
                    exportedAt: new Date()
                }
            });
        }

        logger.info(`Exported ${contacts.length} contacts in ${format} format`);

    } catch (error) {
        logger.error('Export contacts error:', error);
        res.status(500).json({
            error: 'Internal server error while exporting contacts'
        });
    }
};

module.exports = {
    createContact,
    getAllContacts,
    getContactById,
    updateContact,
    deleteContact,
    getContactStats,
    bulkUpdateContacts,
    exportContacts,
}; 
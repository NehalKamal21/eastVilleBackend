const mongoose = require('mongoose');

// Villa Schema as a subdocument
const VillaSchema = new mongoose.Schema({
    id: {
        type: String,
        required: [true, 'Villa ID is required'],
        trim: true,
    },
    status: {
        type: String,
        enum: ['Available', 'Sold', 'Under Construction'],
        required: [true, 'Villa status is required'],
        default: 'Available',
    },
    size: {
        type: Number,
        required: [true, 'Villa size is required'],
        min: [1, 'Size must be at least 1'],
    },
    type: {
        type: String,
        required: [true, 'Villa type is required'],
        trim: true,
    },
    price: {
        type: Number,
        min: [0, 'Price cannot be negative'],
    },
    bedrooms: {
        type: Number,
        min: [1, 'Must have at least 1 bedroom'],
    },
    bathrooms: {
        type: Number,
        min: [1, 'Must have at least 1 bathroom'],
    },
    description: {
        type: String,
        maxlength: [500, 'Description cannot exceed 500 characters'],
    },
    features: [{
        type: String,
        trim: true,
    }],
    images: [{
        type: String,
        trim: true,
    }],
}, {
    timestamps: true,
});

// Cluster Schema
const ClusterSchema = new mongoose.Schema({
    clusterName: {
        type: String,
        required: [true, 'Cluster name is required'],
        trim: true,
        maxlength: [100, 'Cluster name cannot exceed 100 characters'],
    },
    clusterId: {
        type: String,
        required: [true, 'Cluster ID is required'],
        unique: true,
        trim: true,
    },
    villas: [VillaSchema],
    x: {
        type: Number,
        required: [true, 'X coordinate is required'],
    },
    y: {
        type: Number,
        required: [true, 'Y coordinate is required'],
    },
    description: {
        type: String,
        maxlength: [1000, 'Description cannot exceed 1000 characters'],
    },
    amenities: [{
        type: String,
        trim: true,
    }],
    isActive: {
        type: Boolean,
        default: true,
    },
}, {
    timestamps: true,
});

// Index for better query performance
ClusterSchema.index({ clusterId: 1 });
ClusterSchema.index({ 'villas.id': 1 });

// Method to find villa by ID
ClusterSchema.methods.findVillaById = function(villaId) {
    return this.villas.find(villa => villa.id === villaId);
};

// Method to get available villas
ClusterSchema.methods.getAvailableVillas = function() {
    return this.villas.filter(villa => villa.status === 'Available');
};

// Method to get villa statistics
ClusterSchema.methods.getVillaStats = function() {
    const stats = {
        total: this.villas.length,
        available: 0,
        sold: 0,
        underConstruction: 0,
    };

    this.villas.forEach(villa => {
        stats[villa.status.toLowerCase().replace(' ', '')]++;
    });

    return stats;
};

module.exports = mongoose.model('Cluster', ClusterSchema); 
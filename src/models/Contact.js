const mongoose = require('mongoose');

const ContactSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Name is required'],
        trim: true,
        maxlength: [100, 'Name cannot exceed 100 characters'],
    },
    email: {
        type: String,
        required: [true, 'Email is required'],
        lowercase: true,
        trim: true,
        match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email'],
    },
    phone: {
        type: String,
        required: [true, 'Phone number is required'],
        trim: true,
        match: [/^[+]?[1-9][\d]{0,15}$/, 'Please enter a valid phone number'],
    },
    interestedUnit: {
        type: String,
        trim: true,
        maxlength: [200, 'Interested unit cannot exceed 200 characters'],
    },
    message: {
        type: String,
        required: [true, 'Message is required'],
        trim: true,
        maxlength: [1000, 'Message cannot exceed 1000 characters'],
    },
    status: {
        type: String,
        enum: ['Pending', 'In Progress', 'Resolved', 'Cancelled'],
        default: 'Pending',
    },
    priority: {
        type: String,
        enum: ['Low', 'Medium', 'High', 'Urgent'],
        default: 'Medium',
    },
    source: {
        type: String,
        enum: ['Website', 'Phone', 'Email', 'Walk-in', 'Referral'],
        default: 'Website',
    },
    updatedBy: {
        username: {
            type: String,
            trim: true,
        },
        email: {
            type: String,
            trim: true,
        },
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
        },
    },
    salesComment: {
        type: String,
        maxlength: [500, 'Sales comment cannot exceed 500 characters'],
    },
    followUpDate: {
        type: Date,
    },
    tags: [{
        type: String,
        trim: true,
    }],
}, {
    timestamps: true,
});

// Index for better query performance
ContactSchema.index({ status: 1, createdAt: -1 });
ContactSchema.index({ email: 1 });
ContactSchema.index({ 'updatedBy.userId': 1 });

// Method to get contact summary
ContactSchema.methods.getSummary = function() {
    return {
        id: this._id,
        name: this.name,
        email: this.email,
        phone: this.phone,
        status: this.status,
        priority: this.priority,
        createdAt: this.createdAt,
        interestedUnit: this.interestedUnit,
    };
};

// Static method to get contact statistics
ContactSchema.statics.getStats = async function() {
    const stats = await this.aggregate([
        {
            $group: {
                _id: '$status',
                count: { $sum: 1 },
            },
        },
    ]);

    const result = {
        total: 0,
        pending: 0,
        inProgress: 0,
        resolved: 0,
        cancelled: 0,
    };

    stats.forEach(stat => {
        result.total += stat.count;
        result[stat._id.toLowerCase().replace(' ', '')] = stat.count;
    });

    return result;
};

module.exports = mongoose.model('Contact', ContactSchema); 
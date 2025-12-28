const mongoose = require('mongoose');

const memberSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true
    },
    role: {
        type: String,
        required: true,
        enum: ['Member', 'Koki Masak', 'Atmin'],
        default: 'Member'
    },
    descriptor: {
        type: [Number],
        required: true
    },
    // QR Code Data
    qrCode: {
        type: String, // Unique QR code identifier
        unique: true,
        sparse: true
    },
    // Profile Information
    profile: {
        email: {
            type: String,
            trim: true,
            lowercase: true
        },
        phone: {
            type: String,
            trim: true
        },
        address: {
            type: String,
            trim: true
        },
        dateOfBirth: {
            type: Date
        },
        joinDate: {
            type: Date,
            default: Date.now
        },
        bio: {
            type: String,
            maxlength: 500
        },
        avatar: {
            type: String, // Base64 or URL
            default: ''
        },
        socialMedia: {
            instagram: String,
            facebook: String,
            twitter: String,
            linkedin: String
        }
    },
    // Statistics
    stats: {
        totalCheckIns: {
            type: Number,
            default: 0
        },
        lastCheckIn: {
            type: Date
        },
        streak: {
            type: Number,
            default: 0
        },
        longestStreak: {
            type: Number,
            default: 0
        }
    },
    registeredAt: {
        type: Date,
        default: Date.now
    },
    isActive: {
        type: Boolean,
        default: true
    }
}, {
    timestamps: true
});

// Index untuk pencarian
memberSchema.index({ name: 1 });
memberSchema.index({ isActive: 1 });
memberSchema.index({ 'profile.email': 1 });

// Generate QR code before save
memberSchema.pre('save', function(next) {
    if (!this.qrCode) {
        // Generate unique QR code: LA-{timestamp}-{random}
        this.qrCode = `LA-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    }
    next();
});

// Update stats after check-in
memberSchema.methods.updateCheckInStats = async function() {
    this.stats.totalCheckIns += 1;
    this.stats.lastCheckIn = new Date();
    
    // Calculate streak (consecutive days)
    // This is simplified - you might want more complex logic
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    if (this.stats.lastCheckIn) {
        const lastCheckIn = new Date(this.stats.lastCheckIn);
        lastCheckIn.setHours(0, 0, 0, 0);
        
        const daysDiff = Math.floor((today - lastCheckIn) / (1000 * 60 * 60 * 24));
        
        if (daysDiff === 1) {
            this.stats.streak += 1;
        } else if (daysDiff > 1) {
            this.stats.streak = 1;
        }
    } else {
        this.stats.streak = 1;
    }
    
    // Update longest streak
    if (this.stats.streak > this.stats.longestStreak) {
        this.stats.longestStreak = this.stats.streak;
    }
    
    await this.save();
};

module.exports = mongoose.model('Member', memberSchema);

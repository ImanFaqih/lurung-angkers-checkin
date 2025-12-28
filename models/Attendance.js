const mongoose = require('mongoose');

const attendanceSchema = new mongoose.Schema({
    memberId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Member',
        required: true
    },
    memberName: {
        type: String,
        required: true,
        trim: true
    },
    memberRole: {
        type: String,
        required: true,
        enum: ['Member', 'Koki Masak', 'Atmin'],
        default: 'Member'
    },
    checkInTime: {
        type: Date,
        default: Date.now
    },
    method: {
        type: String,
        enum: ['face', 'qr', 'manual'],
        default: 'face'
    },
    location: {
        type: String,
        trim: true
    },
    notes: {
        type: String,
        trim: true
    }
}, {
    timestamps: true
});

// Index for efficient queries
attendanceSchema.index({ memberId: 1, checkInTime: -1 });
attendanceSchema.index({ checkInTime: -1 });

module.exports = mongoose.model('Attendance', attendanceSchema);

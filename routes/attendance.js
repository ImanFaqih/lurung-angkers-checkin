const express = require('express');
const router = express.Router();
const Attendance = require('../models/Attendance');
const Member = require('../models/Member');
const { sendWhatsAppNotification } = require('../utils/whatsapp');

// Get all attendance records
router.get('/', async (req, res) => {
    try {
        const { startDate, endDate, memberId } = req.query;
        let query = {};

        // Filter by date range
        if (startDate || endDate) {
            query.checkInTime = {};
            if (startDate) query.checkInTime.$gte = new Date(startDate);
            if (endDate) query.checkInTime.$lte = new Date(endDate);
        }

        // Filter by member
        if (memberId) {
            query.memberId = memberId;
        }

        const attendances = await Attendance.find(query)
            .populate('memberId', 'name role profile.avatar')
            .sort({ checkInTime: -1 })
            .limit(100);

        res.json({ success: true, data: attendances });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// Get today's attendance
router.get('/today', async (req, res) => {
    try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        const attendances = await Attendance.find({
            checkInTime: {
                $gte: today,
                $lt: tomorrow
            }
        })
        .populate('memberId', 'name role profile.avatar')
        .sort({ checkInTime: -1 });

        res.json({ success: true, data: attendances });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// Get member's attendance history
router.get('/member/:memberId', async (req, res) => {
    try {
        const { limit = 10, skip = 0 } = req.query;
        
        const attendances = await Attendance.find({
            memberId: req.params.memberId
        })
        .sort({ checkInTime: -1 })
        .limit(parseInt(limit))
        .skip(parseInt(skip));
        
        const total = await Attendance.countDocuments({
            memberId: req.params.memberId
        });
        
        res.json({ 
            success: true, 
            data: attendances,
            total,
            hasMore: total > (parseInt(skip) + parseInt(limit))
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// Helper function: Check if member already checked in today
async function hasCheckedInToday(memberId) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const existingCheckIn = await Attendance.findOne({
        memberId: memberId,
        checkInTime: {
            $gte: today,
            $lt: tomorrow
        }
    });
    
    return existingCheckIn !== null;
}

// Create attendance (check-in) - Face Detection
router.post('/', async (req, res) => {
    try {
        const { memberId, memberName, memberRole, location, notes, method } = req.body;

        if (!memberId || !memberName) {
            return res.status(400).json({ 
                success: false, 
                message: 'Member ID and name are required' 
            });
        }

        // Check if member exists
        const member = await Member.findById(memberId);
        if (!member) {
            return res.status(404).json({ 
                success: false, 
                message: 'Member not found' 
            });
        }

        // NEW: Check if already checked in today (1x per day limit)
        const alreadyCheckedIn = await hasCheckedInToday(memberId);
        if (alreadyCheckedIn) {
            return res.status(400).json({ 
                success: false, 
                message: '⚠️ Anda sudah absen hari ini! Absen hanya bisa 1x per hari.',
                alreadyCheckedIn: true
            });
        }

        const attendance = new Attendance({
            memberId,
            memberName,
            memberRole: memberRole || member.role,
            location,
            notes,
            method: method || 'face'
        });

        const savedAttendance = await attendance.save();
        
        // Update member stats
        await member.updateCheckInStats();
        
        // NEW: Send WhatsApp notification to group
        try {
            const checkInTime = new Date(savedAttendance.checkInTime);
            const timeString = checkInTime.toLocaleTimeString('id-ID', { 
                hour: '2-digit', 
                minute: '2-digit' 
            });
            
            await sendWhatsAppNotification({
                memberName: memberName,
                memberRole: memberRole || member.role,
                checkInTime: timeString,
                method: method || 'face',
                location: location || 'Unknown'
            });
        } catch (notifError) {
            // Log error but don't fail the check-in
            console.error('WhatsApp notification error:', notifError);
        }
        
        res.status(201).json({ success: true, data: savedAttendance });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// QR Code Check-in
router.post('/qr-checkin', async (req, res) => {
    try {
        const { qrCode, location, notes } = req.body;

        if (!qrCode) {
            return res.status(400).json({ 
                success: false, 
                message: 'QR code is required' 
            });
        }

        // Find member by QR code
        const member = await Member.findOne({ qrCode, isActive: true });
        if (!member) {
            return res.status(404).json({ 
                success: false, 
                message: 'Invalid QR code or member not found' 
            });
        }

        // NEW: Check if already checked in today (1x per day limit)
        const alreadyCheckedIn = await hasCheckedInToday(member._id);
        if (alreadyCheckedIn) {
            return res.status(400).json({ 
                success: false, 
                message: '⚠️ Anda sudah absen hari ini! Absen hanya bisa 1x per hari.',
                alreadyCheckedIn: true,
                member: {
                    id: member._id,
                    name: member.name,
                    role: member.role
                }
            });
        }

        const attendance = new Attendance({
            memberId: member._id,
            memberName: member.name,
            memberRole: member.role,
            location: location || 'QR Scan Location',
            notes: notes || 'Check-in via QR Code',
            method: 'qr'
        });

        const savedAttendance = await attendance.save();
        
        // Update member stats
        await member.updateCheckInStats();
        
        // NEW: Send WhatsApp notification to group
        try {
            const checkInTime = new Date(savedAttendance.checkInTime);
            const timeString = checkInTime.toLocaleTimeString('id-ID', { 
                hour: '2-digit', 
                minute: '2-digit' 
            });
            
            await sendWhatsAppNotification({
                memberName: member.name,
                memberRole: member.role,
                checkInTime: timeString,
                method: 'qr',
                location: location || 'QR Scan Location'
            });
        } catch (notifError) {
            // Log error but don't fail the check-in
            console.error('WhatsApp notification error:', notifError);
        }
        
        res.status(201).json({ 
            success: true, 
            data: savedAttendance,
            member: {
                id: member._id,
                name: member.name,
                role: member.role,
                avatar: member.profile.avatar
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// Get attendance statistics
router.get('/stats/summary', async (req, res) => {
    try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        // Today's attendance count
        const todayCount = await Attendance.countDocuments({
            checkInTime: {
                $gte: today,
                $lt: tomorrow
            }
        });

        // Total attendance count
        const totalCount = await Attendance.countDocuments();

        // Total active members
        const totalMembers = await Member.countDocuments({ isActive: true });

        // Attendance rate today
        const attendanceRate = totalMembers > 0 
            ? Math.round((todayCount / totalMembers) * 100) 
            : 0;

        // Check-in methods breakdown (last 7 days)
        const sevenDaysAgo = new Date(today);
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        
        const methodStats = await Attendance.aggregate([
            {
                $match: {
                    checkInTime: { $gte: sevenDaysAgo }
                }
            },
            {
                $group: {
                    _id: '$method',
                    count: { $sum: 1 }
                }
            }
        ]);

        res.json({ 
            success: true, 
            data: {
                todayCount,
                totalCount,
                totalMembers,
                attendanceRate,
                methodStats: methodStats.reduce((acc, item) => {
                    acc[item._id || 'face'] = item.count;
                    return acc;
                }, {})
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// Get attendance by date range
router.get('/range/:startDate/:endDate', async (req, res) => {
    try {
        const { startDate, endDate } = req.params;
        
        const attendances = await Attendance.find({
            checkInTime: {
                $gte: new Date(startDate),
                $lte: new Date(endDate)
            }
        })
        .populate('memberId', 'name role profile.avatar')
        .sort({ checkInTime: -1 });

        res.json({ success: true, data: attendances });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// Delete attendance record
router.delete('/:id', async (req, res) => {
    try {
        const attendance = await Attendance.findByIdAndDelete(req.params.id);
        
        if (!attendance) {
            return res.status(404).json({ 
                success: false, 
                message: 'Attendance record not found' 
            });
        }

        res.json({ 
            success: true, 
            message: 'Attendance record deleted successfully' 
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

module.exports = router;

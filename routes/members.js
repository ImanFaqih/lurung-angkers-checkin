const express = require('express');
const router = express.Router();
const Member = require('../models/Member');

// Get all members
router.get('/', async (req, res) => {
    try {
        const members = await Member.find({ isActive: true })
            .sort({ name: 1 });
        res.json({ success: true, data: members });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// Get member by ID
router.get('/:id', async (req, res) => {
    try {
        const member = await Member.findById(req.params.id);
        if (!member) {
            return res.status(404).json({ success: false, message: 'Member not found' });
        }
        res.json({ success: true, data: member });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// Get member by QR Code
router.get('/qr/:qrCode', async (req, res) => {
    try {
        const member = await Member.findOne({ 
            qrCode: req.params.qrCode,
            isActive: true 
        });
        
        if (!member) {
            return res.status(404).json({ 
                success: false, 
                message: 'Member not found with this QR code' 
            });
        }
        
        res.json({ success: true, data: member });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// Create new member
router.post('/', async (req, res) => {
    try {
        const { name, role, descriptor, profile } = req.body;

        if (!name || !descriptor) {
            return res.status(400).json({ 
                success: false, 
                message: 'Name and face descriptor are required' 
            });
        }

        const member = new Member({
            name,
            role: role || 'Member',
            descriptor,
            profile: profile || {}
        });

        const savedMember = await member.save();
        res.status(201).json({ success: true, data: savedMember });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// Update member
router.put('/:id', async (req, res) => {
    try {
        const { name, role, isActive, profile } = req.body;
        
        const updateData = {};
        if (name) updateData.name = name;
        if (role) updateData.role = role;
        if (isActive !== undefined) updateData.isActive = isActive;
        if (profile) updateData.profile = profile;
        
        const member = await Member.findByIdAndUpdate(
            req.params.id,
            updateData,
            { new: true, runValidators: true }
        );

        if (!member) {
            return res.status(404).json({ success: false, message: 'Member not found' });
        }

        res.json({ success: true, data: member });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// Update member profile
router.patch('/:id/profile', async (req, res) => {
    try {
        const { email, phone, address, dateOfBirth, bio, avatar, socialMedia } = req.body;
        
        const member = await Member.findById(req.params.id);
        if (!member) {
            return res.status(404).json({ success: false, message: 'Member not found' });
        }
        
        // Update profile fields
        if (email !== undefined) member.profile.email = email;
        if (phone !== undefined) member.profile.phone = phone;
        if (address !== undefined) member.profile.address = address;
        if (dateOfBirth !== undefined) member.profile.dateOfBirth = dateOfBirth;
        if (bio !== undefined) member.profile.bio = bio;
        if (avatar !== undefined) member.profile.avatar = avatar;
        if (socialMedia !== undefined) member.profile.socialMedia = socialMedia;
        
        await member.save();
        res.json({ success: true, data: member });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// Delete member (soft delete)
router.delete('/:id', async (req, res) => {
    try {
        const member = await Member.findByIdAndUpdate(
            req.params.id,
            { isActive: false },
            { new: true }
        );

        if (!member) {
            return res.status(404).json({ success: false, message: 'Member not found' });
        }

        res.json({ success: true, message: 'Member deleted successfully' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// Get member count
router.get('/stats/count', async (req, res) => {
    try {
        const count = await Member.countDocuments({ isActive: true });
        res.json({ success: true, count });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// Regenerate QR code for member
router.post('/:id/regenerate-qr', async (req, res) => {
    try {
        const member = await Member.findById(req.params.id);
        if (!member) {
            return res.status(404).json({ success: false, message: 'Member not found' });
        }
        
        // Generate new QR code
        member.qrCode = `LA-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        await member.save();
        
        res.json({ 
            success: true, 
            data: member,
            message: 'QR code regenerated successfully' 
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

module.exports = router;

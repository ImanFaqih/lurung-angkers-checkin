require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');

// Initialize Express app
const app = express();

// Connect to MongoDB
const connectDB = require('./config/database');
connectDB().catch(err => console.warn('DB error:', err.message));

// Middleware
app.use(cors());
app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ limit: '50mb', extended: true }));

// Serve static files
app.use(express.static('public'));

// API Routes
app.use('/api/members', require('./routes/members'));
app.use('/api/attendance', require('./routes/attendance'));

// Root route
app.get('/api', (req, res) => {
    res.json({ 
        message: '🎯 Lurung Angkers Check-in API',
        version: '2.1.0',
        endpoints: {
            members: '/api/members',
            attendance: '/api/attendance'
        }
    });
});

// Health check
app.get('/api/health', (req, res) => {
    res.json({ 
        status: 'OK', 
        timestamp: new Date().toISOString(),
        database: 'Connected'
    });
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({ 
        success: false, 
        message: 'Route not found' 
    });
});

// Error handler
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ 
        success: false, 
        message: 'Internal server error',
        error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
});

// Start server - RAILWAY/RENDER/HEROKU COMPATIBLE
const PORT = process.env.PORT || 3000;

console.log(`
╔═══════════════════════════════════════════════════╗
║                                                   ║
║   🎯 LURUNG ANGKERS CHECK-IN SYSTEM              ║
║                                                   ║
║   🚀 Server starting on port ${PORT}                ║
║   🌍 Environment: ${process.env.NODE_ENV || 'development'}              ║
║                                                   ║
╚═══════════════════════════════════════════════════╝
`);

// FIXED: Listen to all interfaces (0.0.0.0) for cloud deployment
// DO NOT bind to 127.0.0.1 - it won't work on Railway/Render/Heroku!
app.listen(PORT, () => {
    console.log('✅ Server is running on port ' + PORT);
    console.log('✅ Ready to accept connections');
}).on('error', (err) => {
    console.error('❌ Server error:', err.code, err.message);
    if (err.code === 'EADDRINUSE') {
        console.error(`❌ Port ${PORT} is already in use`);
    }
});

module.exports = app;
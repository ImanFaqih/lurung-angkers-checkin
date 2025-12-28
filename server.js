require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');

// Initialize Express app
const app = express();

// IMPORTANT: Health check MUST be first, before other middleware
app.get('/health', (req, res) => {
    res.status(200).send('OK');
});

app.get('/api/health', (req, res) => {
    res.status(200).json({ 
        status: 'OK', 
        timestamp: new Date().toISOString(),
        uptime: process.uptime()
    });
});

// Connect to MongoDB (async, don't block startup)
const connectDB = require('./config/database');
connectDB().catch(err => console.warn('DB error:', err.message));

// Middleware
app.use(cors());
app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ limit: '50mb', extended: true }));

// Serve static files from public directory
app.use(express.static('public'));

// Root route - serve index.html
app.get('/', (req, res) => {
    res.sendFile(__dirname + '/public/index.html');
});

// API Routes
app.use('/api/members', require('./routes/members'));
app.use('/api/attendance', require('./routes/attendance'));

// API info route
app.get('/api', (req, res) => {
    res.json({ 
        message: '🎯 Lurung Angkers Check-in API',
        version: '2.1.0',
        endpoints: {
            health: '/api/health',
            members: '/api/members',
            attendance: '/api/attendance'
        }
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

// Listen to all interfaces (0.0.0.0) for cloud deployment
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
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

const connectDB = async () => {
    try {
        console.log('🔄 Attempting to connect to MongoDB...');
        let mongoUri = process.env.MONGODB_URI;

        // If MongoDB Atlas is not accessible, use in-memory database
        if (!mongoUri || process.env.NODE_ENV === 'development') {
            console.log('🔄 Starting MongoDB Memory Server...');
            const mongoServer = await MongoMemoryServer.create();
            mongoUri = mongoServer.getUri();
            console.log('✅ MongoDB Memory Server started');
        }

        console.log('🔄 Connecting to:', mongoUri.replace(/\/\/.*@/, '//***:***@'));
        const conn = await mongoose.connect(mongoUri);

        console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
    } catch (error) {
        console.error(`❌ Error: ${error.message}`);

        // If Atlas fails, try to start memory server as fallback
        if (error.message.includes('ETIMEOUT') || error.message.includes('ENOTFOUND')) {
            console.log('🔄 MongoDB Atlas not accessible, starting Memory Server...');
            try {
                const mongoServer = await MongoMemoryServer.create();
                const mongoUri = mongoServer.getUri();

                const conn = await mongoose.connect(mongoUri);
                console.log(`✅ Fallback: MongoDB Memory Server Connected: ${conn.connection.host}`);
                console.log('⚠️ Data will be lost when server restarts. Use MongoDB Atlas for production.');
            } catch (fallbackError) {
                console.error(`❌ Fallback failed: ${fallbackError.message}`);
                process.exit(1);
            }
        } else {
            process.exit(1);
        }
    }
};

module.exports = connectDB;

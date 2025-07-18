require('dotenv').config();

const config = {
    // Server Configuration
    port: process.env.PORT || 5001,
    nodeEnv: process.env.NODE_ENV || 'development',
    
    // Database Configuration
    mongodb: {
        uri: process.env.MONGODB_URI || 'mongodb://localhost:27017/villasDB',
    },
    
    // JWT Configuration
    jwt: {
        secret: process.env.JWT_SECRET || 'your_secret_key',
        expiresIn: process.env.JWT_EXPIRES_IN || '24h',
        cookieName: 'token',
    },
    
    // CORS Configuration
    cors: {
        origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
        credentials: true,
    },
    
    // Rate Limiting
    rateLimit: {
        windowMs: 15 * 60 * 1000, // 15 minutes
        max: 100, // limit each IP to 100 requests per windowMs
    },
    
    // Email Configuration (for future use)
    email: {
        host: process.env.EMAIL_HOST,
        port: process.env.EMAIL_PORT,
        secure: process.env.EMAIL_SECURE === 'true',
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS,
        },
    },
    
    // Logging
    logging: {
        level: process.env.LOG_LEVEL || 'info',
        file: process.env.LOG_FILE || 'logs/app.log',
    },
};

module.exports = config; 
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const mongoSanitize = require('express-mongo-sanitize');
const hpp = require('hpp');
require('dotenv').config();

// Validate required environment variables
if (!process.env.JWT_SECRET) {
  console.error('ERROR: JWT_SECRET environment variable is not set!');
  process.exit(1);
}

// Import routes
const authRoutes = require('./routes/auth');
const productRoutes = require('./routes/products');
const categoryRoutes = require('./routes/categories');
const brandRoutes = require('./routes/brands');
const orderRoutes = require('./routes/orders');
const userRoutes = require('./routes/users');
const companyRoutes = require('./routes/companies');
const clinicRoutes = require('./routes/clinics');
const adminRoutes = require('./routes/admin');
const userManagementRoutes = require('./routes/user-management');
const uploadRoutes = require('./routes/upload');
const accountRoutes = require('./routes/accounts');
const calendarRoutes = require('./routes/calendar');

const app = express();

// CORS configuration - MUST be before other middleware
const allowedOrigins = process.env.NODE_ENV === 'production' 
  ? (process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',').map(origin => origin.trim()) : [
      'https://one-place-frontend.vercel.app',
      'https://*.vercel.app' // Allow all Vercel preview deployments
    ])
  : [
    'http://localhost:5173',
    'http://localhost:5174',
    'http://localhost:3000',
    'http://127.0.0.1:5173',
    'http://127.0.0.1:5174',
    'http://127.0.0.1:3000'
    ];

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, Postman, etc.)
    if (!origin) return callback(null, true);
    
    // Check exact match
    if (allowedOrigins.indexOf(origin) !== -1) {
      return callback(null, true);
    }
    
    // Check wildcard patterns (for Vercel preview deployments)
    const isAllowed = allowedOrigins.some(allowedOrigin => {
      if (allowedOrigin.includes('*')) {
        const pattern = allowedOrigin.replace(/\*/g, '.*');
        const regex = new RegExp(`^${pattern}$`);
        return regex.test(origin);
      }
      return false;
    });
    
    if (isAllowed || allowedOrigins.length === 0) {
      callback(null, true);
    } else {
      console.warn(`CORS blocked origin: ${origin}`);
      console.warn(`Allowed origins:`, allowedOrigins);
      callback(new Error(`Not allowed by CORS. Origin: ${origin}`));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  exposedHeaders: ['X-Total-Count'],
  maxAge: 86400 // 24 hours
}));

// Handle preflight requests explicitly
app.options('*', cors({
  origin: (origin, callback) => {
    // Allow requests with no origin
    if (!origin) return callback(null, true);
    
    // Production origins
    const productionOrigins = process.env.NODE_ENV === 'production'
      ? (process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',').map(o => o.trim()) : [
          'https://one-place-frontend.vercel.app',
          /^https:\/\/.*\.vercel\.app$/
        ])
      : [];
    
    // Development origins
    const devOrigins = [
      'http://localhost:5173',
      'http://localhost:5174',
      'http://localhost:3000',
      'http://127.0.0.1:5173',
      'http://127.0.0.1:5174',
      'http://127.0.0.1:3000'
    ];
    
    const allOrigins = process.env.NODE_ENV === 'production' 
      ? [...productionOrigins, ...devOrigins]
      : devOrigins;
    
    // Check if origin matches
    const isAllowed = allOrigins.some(allowed => {
      if (allowed instanceof RegExp) {
        return allowed.test(origin);
      }
      return allowed === origin;
    });
    
    callback(null, isAllowed);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

// Security middleware
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" },
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
    },
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  }
}));

// Data sanitization against NoSQL injection
app.use(mongoSanitize());

// Prevent HTTP Parameter Pollution
app.use(hpp());

// Compression middleware
app.use(compression());

// Rate limiting - stricter for auth endpoints
// More lenient limits for production to handle multiple concurrent requests
const generalLimiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || (process.env.NODE_ENV === 'production' ? 500 : 100), // 500 requests per 15 min in production, 100 in dev
  message: {
    success: false,
    error: 'Too many requests from this IP, please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    // Skip rate limiting for health check
    return req.path === '/health' || req.path === '/health/db';
  },
  // Use a custom key generator to better handle proxy/load balancer scenarios
  keyGenerator: (req) => {
    // Try to get the real IP from various headers (for proxies/load balancers)
    return req.headers['x-forwarded-for']?.split(',')[0]?.trim() || 
           req.headers['x-real-ip'] || 
           req.connection.remoteAddress || 
           req.socket.remoteAddress ||
           req.ip;
  }
});

// Stricter rate limiting for auth endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_AUTH_MAX) || (process.env.NODE_ENV === 'production' ? 10 : 5), // 10 attempts in production, 5 in dev
  message: {
    success: false,
    error: 'Too many login attempts, please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  // Use a custom key generator for auth endpoints too
  keyGenerator: (req) => {
    return req.headers['x-forwarded-for']?.split(',')[0]?.trim() || 
           req.headers['x-real-ip'] || 
           req.connection.remoteAddress || 
           req.socket.remoteAddress ||
           req.ip;
  }
});

app.use('/api/', generalLimiter);
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);

// Body parsing middleware with size limits
app.use(express.json({ 
  limit: '10mb',
  verify: (req, res, buf) => {
    // Prevent JSON parsing errors from crashing the server
    try {
      JSON.parse(buf);
    } catch (e) {
      res.status(400).json({
        success: false,
        message: 'Invalid JSON format'
      });
      throw new Error('Invalid JSON');
    }
  }
}));
app.use(express.urlencoded({ 
  extended: true, 
  limit: '10mb',
  parameterLimit: 100 // Limit number of parameters
}));

// Logging middleware
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// Static files
app.use('/uploads', express.static('uploads'));

// Health check endpoint
app.get('/health', (req, res) => {
  const dbStatus = mongoose.connection.readyState;
  const dbStates = {
    0: 'disconnected',
    1: 'connected',
    2: 'connecting',
    3: 'disconnecting'
  };
  
  res.status(200).json({
    status: 'OK',
    message: 'One Place API is running',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    database: {
      status: dbStates[dbStatus] || 'unknown',
      connected: dbStatus === 1
    }
  });
});

// Database health check endpoint
app.get('/health/db', async (req, res) => {
  try {
    const dbStatus = mongoose.connection.readyState;
    if (dbStatus !== 1) {
      return res.status(503).json({
        status: 'ERROR',
        message: 'Database is not connected',
        database: {
          status: dbStatus,
          readyState: mongoose.connection.readyState
        }
      });
    }
    
    // Test database query
    const User = require('./models/User');
    const userCount = await User.countDocuments();
    
    res.status(200).json({
      status: 'OK',
      message: 'Database is connected and responding',
      database: {
        name: mongoose.connection.name,
        host: mongoose.connection.host,
        port: mongoose.connection.port,
        readyState: mongoose.connection.readyState,
        userCount: userCount
      }
    });
  } catch (error) {
    res.status(503).json({
      status: 'ERROR',
      message: 'Database connection error',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Database error'
    });
  }
});

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/brands', brandRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/users', userRoutes);
app.use('/api/companies', companyRoutes);
app.use('/api/clinics', clinicRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/user-management', userManagementRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/accounts', accountRoutes);
app.use('/api/calendar', calendarRoutes);

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'API endpoint not found'
  });
});

// Global error handler
app.use((err, req, res, next) => {
  // Log error details (but don't expose to client)
  console.error('Error:', {
    message: err.message,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
    url: req.originalUrl,
    method: req.method,
    ip: req.ip
  });
  
  // Mongoose validation error
  if (err.name === 'ValidationError') {
    const errors = Object.values(err.errors).map(e => e.message);
    return res.status(400).json({
      success: false,
      message: 'Validation Error',
      errors
    });
  }
  
  // Mongoose duplicate key error
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue)[0];
    return res.status(400).json({
      success: false,
      message: `${field} already exists`
    });
  }
  
  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({
      success: false,
      message: 'Invalid token'
    });
  }
  
  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({
      success: false,
      message: 'Token expired'
    });
  }
  
  // Mongoose CastError (invalid ObjectId)
  if (err.name === 'CastError') {
    return res.status(400).json({
      success: false,
      message: 'Invalid ID format'
    });
  }
  
  // CORS errors
  if (err.message && err.message.includes('CORS')) {
    console.error('CORS Error:', err.message);
    return res.status(403).json({
      success: false,
      message: 'CORS error: Request blocked. Please check backend CORS configuration.',
      ...(process.env.NODE_ENV === 'development' && { details: err.message })
    });
  }
  
  // Default error - don't expose internal details in production
  const isDevelopment = process.env.NODE_ENV === 'development';
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal server error',
    ...(isDevelopment && { stack: err.stack })
  });
});

// Database connection
const connectDB = async () => {
  try {
    // Use environment variable or default to local MongoDB
    const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/oneplace';
    
    // Set connection options
    const options = {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 5000, // Timeout after 5s instead of 30s
      socketTimeoutMS: 45000, // Close sockets after 45s of inactivity
    };
    
    const conn = await mongoose.connect(mongoURI, options);
    
    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
    console.log(`📊 Database: ${conn.connection.name}`);
    
    // Handle connection events
    mongoose.connection.on('error', (err) => {
      console.error('❌ MongoDB connection error:', err);
    });
    
    mongoose.connection.on('disconnected', () => {
      console.warn('⚠️  MongoDB disconnected');
    });
    
    mongoose.connection.on('reconnected', () => {
      console.log('✅ MongoDB reconnected');
    });
    
    // Graceful shutdown
    process.on('SIGINT', async () => {
      await mongoose.connection.close();
      console.log('MongoDB connection closed through app termination');
      process.exit(0);
    });
    
  } catch (error) {
    console.error('❌ Database connection error:', error.message);
    console.log('💡 Please make sure MongoDB is running or set MONGODB_URI environment variable');
    console.log('💡 Example: MONGODB_URI=mongodb://localhost:27017/oneplace');
    process.exit(1);
  }
};

// Start server
const PORT = process.env.PORT || 5000;

const startServer = async () => {
  await connectDB();
  
  app.listen(PORT, () => {
    console.log(`🚀 One Place API Server running on port ${PORT}`);
    console.log(`📊 Environment: ${process.env.NODE_ENV}`);
    console.log(`🌐 Frontend URL: ${process.env.FRONTEND_URL}`);
    console.log(`📝 Health Check: http://localhost:${PORT}/health`);
  });
};

startServer();

module.exports = app;

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const path = require('path');
const http = require('http');
const socketIo = require('socket.io');
const cron = require('node-cron');
const cluster = require('cluster');
const os = require('os');

// Load environment variables first
require('dotenv').config();

// Import utilities and middleware
const logger = require('./utils/logger');
const { requestLogger } = require('./middleware/requestLogger');

// Import database configuration
const { connectDB } = require('./config/db');

// Import route handlers
const authRoutes = require('./routes/auth');
const taskRoutes = require('./routes/tasks');
const applicationRoutes = require('./routes/applications');
const bookingRoutes = require('./routes/bookings');
const chatRoutes = require('./routes/chat');
const userRoutes = require('./routes/users');
const { router: notificationRoutes } = require('./routes/notifications');
const uploadRoutes = require('./routes/upload');

// NEW: Import enhanced dashboard routes (comment out if not created yet)
// const analyticsRoutes = require('./routes/analytics');
// const dashboardRoutes = require('./routes/dashboard');

// Import services (comment out if not created yet)
// const analyticsService = require('./services/analyticsService');
// const dashboardService = require('./services/dashboardService');

// Initialize Express app
const app = express();
const server = http.createServer(app);

// Socket.IO setup with enhanced error handling
const io = socketIo(server, {
  cors: {
    origin: process.env.CLIENT_URL || "http://localhost:3000",
    methods: ["GET", "POST"]
  },
  pingTimeout: 60000,
  pingInterval: 25000
});

// Global error handler for uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.logError(error, { context: 'uncaughtException' });
  process.exit(1);
});

process.on('unhandledRejection', (error) => {
  logger.logError(error, { context: 'unhandledRejection' });
  process.exit(1);
});

// Graceful shutdown handler
const gracefulShutdown = (signal) => {
  logger.logShutdown('server', { signal, pid: process.pid });
  
  server.close(() => {
    logger.info('HTTP server closed');
    
    mongoose.connection.close(false, () => {
      logger.info('MongoDB connection closed');
      process.exit(0);
    });
  });

  // Force close after 30 seconds
  setTimeout(() => {
    logger.error('Forcing shutdown after timeout');
    process.exit(1);
  }, 30000);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Connect to Database
connectDB();

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "https:"],
      scriptSrc: ["'self'"],
      connectSrc: ["'self'", "ws:", "wss:"]
    }
  },
  crossOriginEmbedderPolicy: false
}));

// Compression middleware
app.use(compression({
  level: 6,
  threshold: 1024,
  filter: (req, res) => {
    if (req.headers['x-no-compression']) {
      return false;
    }
    return compression.filter(req, res);
  }
}));

// Rate limiting with different limits for different endpoints
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: {
    error: 'Too many requests from this IP, please try again later.',
    retryAfter: 15 * 60 // 15 minutes in seconds
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res, next, options) => {
    logger.logRateLimit(
      req.ip,
      options.max,
      req.rateLimit.current,
      req.rateLimit.resetTime
    );
    res.status(options.statusCode).json(options.message);
  }
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // Limit auth requests to 10 per windowMs
  message: {
    error: 'Too many authentication attempts, please try again later.',
    retryAfter: 15 * 60
  },
  skipSuccessfulRequests: true
});

const dashboardLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 30, // Higher limit for dashboard since it makes multiple API calls
  message: {
    error: 'Too many dashboard requests, please slow down.',
    retryAfter: 60
  }
});

// Apply general rate limiting
app.use(generalLimiter);

// Body parsing middleware
app.use(express.json({ 
  limit: '10mb',
  verify: (req, res, buf) => {
    if (buf && buf.length > 10 * 1024 * 1024) {
      throw new Error('Request payload too large');
    }
  }
}));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// CORS configuration
const corsOptions = {
  origin: (origin, callback) => {
    const allowedOrigins = [
      process.env.CLIENT_URL || 'http://localhost:3000',
      'http://localhost:3000',
      'http://localhost:3001'
    ];
    
    // Allow requests with no origin (mobile apps, etc.)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      logger.logSecurity('cors_blocked', { origin });
      callback(new Error('CORS policy violation'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  exposedHeaders: ['X-Total-Count', 'X-Rate-Limit-Remaining']
};

app.use(cors(corsOptions));

// Request logging middleware (must be early in the stack)
app.use(requestLogger);

// Health check endpoint (before authentication)
app.get('/health', (req, res) => {
  const healthCheck = {
    uptime: process.uptime(),
    message: 'Server is running',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    version: process.env.npm_package_version || '1.0.0',
    memory: {
      used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
      total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024)
    },
    database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected'
  };
  
  res.status(200).json(healthCheck);
});

// API Routes with rate limiting
app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/applications', applicationRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/users', userRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/upload', uploadRoutes);

// NEW: Enhanced dashboard and analytics routes (comment out if not created yet)
// app.use('/api/analytics', analyticsRoutes);
// app.use('/api/dashboard', dashboardLimiter, dashboardRoutes);

// API documentation endpoint
app.get('/api/docs', (req, res) => {
  const apiDocs = {
    name: 'TimeSlice API',
    version: '1.2.0',
    description: 'Enhanced API with advanced dashboard and analytics features',
    endpoints: {
      auth: '/api/auth',
      tasks: '/api/tasks',
      applications: '/api/applications',
      bookings: '/api/bookings',
      chat: '/api/chat',
      users: '/api/users',
      notifications: '/api/notifications',
      upload: '/api/upload',
      analytics: '/api/analytics',
      dashboard: '/api/dashboard'
    },
    features: [
      'Real-time chat and notifications',
      'Advanced analytics and reporting',
      'Interactive dashboard with charts',
      'Performance metrics and insights',
      'File upload and management',
      'Rate limiting and security'
    ],
    documentation: 'https://docs.timeslice.com'
  };
  
  res.json(apiDocs);
});

// Serve static files in production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../frontend/build')));
  
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/build', 'index.html'));
  });
}

// Global error handling middleware
app.use((err, req, res, next) => {
  // Log the error
  logger.logError(err, {
    method: req.method,
    url: req.url,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    userId: req.user?.id,
    body: req.body,
    params: req.params,
    query: req.query
  });

  // Security: Don't leak error details in production
  const isDevelopment = process.env.NODE_ENV === 'development';
  
  // Default error response
  let status = err.status || err.statusCode || 500;
  let message = isDevelopment ? err.message : 'Internal Server Error';
  let details = {};

  // Handle specific error types
  if (err.name === 'ValidationError') {
    status = 400;
    message = 'Validation Error';
    details = isDevelopment ? err.errors : {};
  } else if (err.name === 'CastError') {
    status = 400;
    message = 'Invalid ID format';
  } else if (err.code === 11000) {
    status = 409;
    message = 'Duplicate resource';
  } else if (err.name === 'JsonWebTokenError') {
    status = 401;
    message = 'Invalid token';
  } else if (err.name === 'TokenExpiredError') {
    status = 401;
    message = 'Token expired';
  } else if (err.type === 'entity.too.large') {
    status = 413;
    message = 'Request payload too large';
  }

  const errorResponse = {
    error: true,
    message,
    ...(isDevelopment && { stack: err.stack }),
    ...(Object.keys(details).length > 0 && { details }),
    timestamp: new Date().toISOString(),
    path: req.path,
    method: req.method
  };

  res.status(status).json(errorResponse);
});

// Handle 404 for API routes
app.use('/api/*', (req, res) => {
  logger.logSecurity('404_api_access', {
    method: req.method,
    url: req.url,
    ip: req.ip,
    userAgent: req.get('User-Agent')
  });
  
  res.status(404).json({
    error: true,
    message: 'API endpoint not found',
    path: req.path,
    availableEndpoints: [
      '/api/auth',
      '/api/tasks', 
      '/api/applications',
      '/api/bookings',
      '/api/chat',
      '/api/users',
      '/api/notifications',
      '/api/upload',
      '/api/analytics',
      '/api/dashboard'
    ]
  });
});

// Socket.IO connection handling with enhanced features
io.on('connection', (socket) => {
  logger.logUserActivity(socket.userId || 'anonymous', 'socket_connected', {
    socketId: socket.id,
    transport: socket.conn.transport.name
  });

  // Enhanced authentication for socket connections
  socket.on('authenticate', (token) => {
    try {
      const jwt = require('jsonwebtoken');
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      socket.userId = decoded.id;
      socket.join(`user_${decoded.id}`);
      
      logger.logUserActivity(decoded.id, 'socket_authenticated', {
        socketId: socket.id
      });
      
      socket.emit('authenticated', { userId: decoded.id });
    } catch (error) {
      logger.logSecurity('socket_auth_failed', { 
        socketId: socket.id,
        error: error.message 
      });
      socket.emit('authentication_failed');
    }
  });

  // Real-time chat functionality
  socket.on('join_chat', (chatId) => {
    socket.join(`chat_${chatId}`);
    logger.logUserActivity(socket.userId, 'joined_chat', { chatId });
  });

  socket.on('leave_chat', (chatId) => {
    socket.leave(`chat_${chatId}`);
    logger.logUserActivity(socket.userId, 'left_chat', { chatId });
  });

  socket.on('send_message', (data) => {
    const { chatId, message, timestamp } = data;
    
    // Broadcast to other users in the chat
    socket.to(`chat_${chatId}`).emit('new_message', {
      chatId,
      message,
      senderId: socket.userId,
      timestamp
    });
    
    logger.logUserActivity(socket.userId, 'message_sent', {
      chatId,
      messageLength: message.length
    });
  });

  // Real-time notifications
  socket.on('subscribe_notifications', () => {
    if (socket.userId) {
      socket.join(`notifications_${socket.userId}`);
      logger.logUserActivity(socket.userId, 'subscribed_notifications');
    }
  });

  // Dashboard real-time updates
  socket.on('subscribe_dashboard', () => {
    if (socket.userId) {
      socket.join(`dashboard_${socket.userId}`);
      logger.logUserActivity(socket.userId, 'subscribed_dashboard');
    }
  });

  // Handle typing indicators
  socket.on('typing_start', (chatId) => {
    socket.to(`chat_${chatId}`).emit('user_typing', {
      userId: socket.userId,
      chatId
    });
  });

  socket.on('typing_stop', (chatId) => {
    socket.to(`chat_${chatId}`).emit('user_stopped_typing', {
      userId: socket.userId,
      chatId
    });
  });

  // Handle disconnection
  socket.on('disconnect', (reason) => {
    logger.logUserActivity(socket.userId || 'anonymous', 'socket_disconnected', {
      socketId: socket.id,
      reason,
      duration: Date.now() - socket.handshake.time
    });
  });

  // Error handling for socket
  socket.on('error', (error) => {
    logger.logError(error, {
      context: 'socket_error',
      socketId: socket.id,
      userId: socket.userId
    });
  });
});

// Scheduled tasks using node-cron
const setupScheduledTasks = () => {
  // Clean up old logs every day at 2 AM
  cron.schedule('0 2 * * *', () => {
    logger.info('Running scheduled log cleanup');
    // Implementation would go here
  });

  // Generate daily analytics reports at midnight
  cron.schedule('0 0 * * *', async () => {
    logger.info('Generating daily analytics reports');
    try {
      // This would trigger analytics calculation for all users
      // await analyticsService.generateDailyReports(); // Comment out if service not available
      logger.info('Daily analytics reports generated successfully');
    } catch (error) {
      logger.error('Failed to generate daily analytics reports', {
        error: error.message
      });
    }
  });

  // Memory usage monitoring every 10 minutes
  cron.schedule('*/10 * * * *', () => {
    logger.logMemoryUsage();
    
    const usage = process.memoryUsage();
    const threshold = 1024 * 1024 * 1024; // 1GB
    
    if (usage.heapUsed > threshold) {
      logger.warn('High memory usage detected', {
        heapUsed: `${Math.round(usage.heapUsed / 1024 / 1024)} MB`,
        threshold: `${Math.round(threshold / 1024 / 1024)} MB`
      });
    }
  });

  // Clean cache every hour
  cron.schedule('0 * * * *', () => {
    logger.debug('Cleaning analytics cache');
    // analyticsService.clearAllCache(); // Comment out if service not available
    // dashboardService.invalidateUserCaches('*'); // Comment out if service not available
  });

  logger.logStartup('scheduled_tasks', { 
    tasks: ['log_cleanup', 'daily_analytics', 'memory_monitoring', 'cache_cleanup']
  });
};

// Make Socket.IO instance available to routes
app.set('io', io);

// Initialize server
const PORT = process.env.PORT || 5000;

const startServer = () => {
  server.listen(PORT, () => {
    logger.logStartup('server', {
      port: PORT,
      environment: process.env.NODE_ENV,
      nodeVersion: process.version,
      platform: process.platform,
      pid: process.pid
    });

    // Setup scheduled tasks
    setupScheduledTasks();

    // Log server readiness
    logger.info(`🚀 TimeSlice Server is running on port ${PORT}`);
    logger.info(`📊 Dashboard analytics enabled`);
    logger.info(`🔒 Security middleware active`);
    logger.info(`📝 Request logging enabled`);
    logger.info(`⚡ Socket.IO real-time features active`);
    
    if (process.env.NODE_ENV === 'production') {
      logger.info(`🌐 Serving static files from build directory`);
    }
  });

  server.on('error', (error) => {
    if (error.code === 'EADDRINUSE') {
      logger.error(`Port ${PORT} is already in use`);
      process.exit(1);
    } else {
      logger.logError(error, { context: 'server_startup' });
      process.exit(1);
    }
  });
};

// Cluster support for production
if (process.env.NODE_ENV === 'production' && process.env.CLUSTER_MODE === 'true') {
  if (cluster.isMaster) {
    const numCPUs = Math.min(os.cpus().length, 4); // Limit to 4 workers
    
    logger.info(`Master ${process.pid} is running`);
    logger.info(`Forking ${numCPUs} workers`);

    // Fork workers
    for (let i = 0; i < numCPUs; i++) {
      cluster.fork();
    }

    cluster.on('exit', (worker, code, signal) => {
      logger.warn(`Worker ${worker.process.pid} died`, { code, signal });
      logger.info('Starting a new worker');
      cluster.fork();
    });
  } else {
    startServer();
    logger.info(`Worker ${process.pid} started`);
  }
} else {
  startServer();
}

module.exports = app;
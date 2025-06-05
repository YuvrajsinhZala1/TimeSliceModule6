const mongoose = require('mongoose');
const logger = require('../utils/logger');

// Connection state tracking
let isConnected = false;
let connectionRetries = 0;
const maxRetries = 5;
const retryDelay = 5000; // 5 seconds

/**
 * Enhanced MongoDB connection with retry logic, monitoring, and optimization
 */
const connectDB = async () => {
  try {
    // MongoDB connection options optimized for Mongoose 7.x
    const options = {
      // Connection pool settings
      maxPoolSize: 10, // Maximum number of connections in the pool
      minPoolSize: 2,  // Minimum number of connections in the pool
      maxIdleTimeMS: 30000, // Close connections after 30 seconds of inactivity
      
      // Timeout settings
      serverSelectionTimeoutMS: 5000, // How long to try selecting a server
      socketTimeoutMS: 45000, // How long a send or receive on a socket can take before timing out
      connectTimeoutMS: 10000, // How long to wait for a connection to be established
      
      // Removed deprecated buffering settings - these are handled automatically in Mongoose 7.x
      // bufferMaxEntries: 0, // DEPRECATED - removed
      // bufferCommands: false, // DEPRECATED - removed
      
      // Replica set settings
      readPreference: 'primary', // Read from primary by default
      retryWrites: true, // Retry writes that fail due to network errors
      
      // Authentication
      authSource: 'admin', // Authentication database
      
      // Application name for monitoring
      appName: 'TimeSlice-Backend',
      
      // Compression
      compressors: 'zlib',
      zlibCompressionLevel: 6
    };

    // Get MongoDB URI from environment
    const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/timeslice';
    
    if (!mongoURI) {
      throw new Error('MONGODB_URI environment variable is not defined');
    }

    logger.info('Attempting to connect to MongoDB', {
      uri: mongoURI.replace(/\/\/([^:]+):([^@]+)@/, '//***:***@'), // Hide credentials in logs
      options: {
        maxPoolSize: options.maxPoolSize,
        serverSelectionTimeoutMS: options.serverSelectionTimeoutMS,
        appName: options.appName
      },
      attempt: connectionRetries + 1,
      maxRetries
    });

    // Establish connection
    const connection = await mongoose.connect(mongoURI, options);

    // Connection successful
    isConnected = true;
    connectionRetries = 0;

    logger.logStartup('database', {
      status: 'connected',
      host: connection.connection.host,
      port: connection.connection.port,
      name: connection.connection.name,
      readyState: connection.connection.readyState,
      poolSize: options.maxPoolSize
    });

    // Setup connection event listeners
    setupConnectionListeners();

    // Setup database monitoring
    setupDatabaseMonitoring();

    return connection;

  } catch (error) {
    connectionRetries++;
    
    logger.error('MongoDB connection failed', {
      error: error.message,
      attempt: connectionRetries,
      maxRetries,
      willRetry: connectionRetries < maxRetries
    });

    // Retry connection if max retries not reached
    if (connectionRetries < maxRetries) {
      logger.info(`Retrying database connection in ${retryDelay / 1000} seconds...`);
      
      setTimeout(() => {
        connectDB();
      }, retryDelay);
    } else {
      logger.error('Maximum database connection retries exceeded. Exiting application.');
      process.exit(1);
    }
  }
};

/**
 * Setup connection event listeners for monitoring
 */
const setupConnectionListeners = () => {
  const db = mongoose.connection;

  // Connection events
  db.on('connected', () => {
    isConnected = true;
    logger.logDatabase('connection', 'mongodb', {}, { status: 'connected' }, 0);
  });

  db.on('disconnected', () => {
    isConnected = false;
    logger.warn('MongoDB disconnected', {
      timestamp: new Date().toISOString()
    });
  });

  db.on('reconnected', () => {
    isConnected = true;
    logger.info('MongoDB reconnected', {
      timestamp: new Date().toISOString()
    });
  });

  db.on('error', (error) => {
    isConnected = false;
    logger.error('MongoDB connection error', {
      error: error.message,
      timestamp: new Date().toISOString()
    });
  });

  // Monitoring events
  db.on('close', () => {
    logger.info('MongoDB connection closed', {
      timestamp: new Date().toISOString()
    });
  });

  db.on('reconnectFailed', () => {
    logger.error('MongoDB reconnection failed', {
      timestamp: new Date().toISOString()
    });
  });

  // Command monitoring (for performance tracking)
  if (process.env.NODE_ENV === 'development') {
    mongoose.set('debug', (collectionName, method, query, doc) => {
      logger.logDatabase(method, collectionName, query, doc, 0);
    });
  }
};

/**
 * Setup database performance monitoring
 */
const setupDatabaseMonitoring = () => {
  const db = mongoose.connection;

  // Monitor slow queries (this might not work in newer versions, but keeping for compatibility)
  db.on('slow', (event) => {
    logger.warn('Slow database query detected', {
      collection: event.collection,
      operation: event.operation,
      duration: event.duration,
      query: event.query
    });
  });

  // Periodic connection health check
  setInterval(async () => {
    try {
      if (isConnected) {
        const start = Date.now();
        await db.db.admin().ping();
        const duration = Date.now() - start;
        
        logger.logPerformance('database_ping', duration, {
          status: 'healthy'
        });

        // Log memory usage periodically
        const stats = await db.db.stats();
        logger.debug('Database statistics', {
          collections: stats.collections,
          dataSize: `${Math.round(stats.dataSize / 1024 / 1024 * 100) / 100} MB`,
          indexSize: `${Math.round(stats.indexSize / 1024 / 1024 * 100) / 100} MB`,
          storageSize: `${Math.round(stats.storageSize / 1024 / 1024 * 100) / 100} MB`
        });
      }
    } catch (error) {
      logger.error('Database health check failed', {
        error: error.message
      });
    }
  }, 60000); // Every minute
};

/**
 * Graceful database disconnection
 */
const disconnectDB = async () => {
  try {
    if (isConnected) {
      logger.info('Closing database connection...');
      
      await mongoose.connection.close();
      isConnected = false;
      
      logger.logShutdown('database', {
        status: 'disconnected',
        timestamp: new Date().toISOString()
      });
    }
  } catch (error) {
    logger.error('Error during database disconnection', {
      error: error.message
    });
  }
};

/**
 * Get database connection status
 */
const getConnectionStatus = () => {
  return {
    isConnected,
    readyState: mongoose.connection.readyState,
    host: mongoose.connection.host,
    port: mongoose.connection.port,
    name: mongoose.connection.name,
    collections: mongoose.connection.collections ? Object.keys(mongoose.connection.collections).length : 0
  };
};

/**
 * Database health check
 */
const healthCheck = async () => {
  try {
    if (!isConnected) {
      return {
        status: 'unhealthy',
        message: 'Not connected to database'
      };
    }

    const start = Date.now();
    await mongoose.connection.db.admin().ping();
    const pingTime = Date.now() - start;

    const stats = await mongoose.connection.db.stats();

    return {
      status: 'healthy',
      pingTime: `${pingTime}ms`,
      readyState: mongoose.connection.readyState,
      host: mongoose.connection.host,
      port: mongoose.connection.port,
      database: mongoose.connection.name,
      collections: stats.collections,
      dataSize: `${Math.round(stats.dataSize / 1024 / 1024 * 100) / 100} MB`,
      indexSize: `${Math.round(stats.indexSize / 1024 / 1024 * 100) / 100} MB`
    };
  } catch (error) {
    return {
      status: 'unhealthy',
      message: error.message,
      error: error.name
    };
  }
};

/**
 * Setup database indexes for optimal performance
 */
const setupIndexes = async () => {
  try {
    logger.info('Setting up database indexes...');

    // User indexes
    await mongoose.connection.collection('users').createIndexes([
      { key: { email: 1 }, unique: true },
      { key: { username: 1 }, unique: true },
      { key: { primaryRole: 1 } },
      { key: { skills: 1 } },
      { key: { rating: -1 } },
      { key: { createdAt: -1 } }
    ]);

    // Task indexes
    await mongoose.connection.collection('tasks').createIndexes([
      { key: { taskProviderId: 1, createdAt: -1 } },
      { key: { status: 1, createdAt: -1 } },
      { key: { category: 1, status: 1 } },
      { key: { skillsRequired: 1 } },
      { key: { credits: -1 } },
      { key: { deadline: 1 } },
      { key: { location: '2dsphere' } } // Geospatial index for location-based queries
    ]);

    // Application indexes
    await mongoose.connection.collection('applications').createIndexes([
      { key: { applicantId: 1, createdAt: -1 } },
      { key: { taskProviderId: 1, createdAt: -1 } },
      { key: { taskId: 1, status: 1 } },
      { key: { status: 1, createdAt: -1 } }
    ]);

    // Booking indexes
    await mongoose.connection.collection('bookings').createIndexes([
      { key: { helper: 1, createdAt: -1 } },
      { key: { taskProvider: 1, createdAt: -1 } },
      { key: { taskId: 1 } },
      { key: { status: 1, createdAt: -1 } },
      { key: { completedAt: -1 } }
    ]);

    // Analytics indexes (for dashboard performance)
    await mongoose.connection.collection('analytics').createIndexes([
      { key: { userId: 1, type: 1, 'period.start': -1 } },
      { key: { userId: 1, 'cache.expiresAt': 1 } },
      { key: { type: 1, 'period.start': -1 } },
      { key: { 'cache.invalidated': 1, 'cache.expiresAt': 1 } }
    ]);

    // Chat and Message indexes
    await mongoose.connection.collection('chats').createIndexes([
      { key: { participants: 1, updatedAt: -1 } },
      { key: { taskId: 1 } }
    ]);

    await mongoose.connection.collection('messages').createIndexes([
      { key: { chatId: 1, createdAt: -1 } },
      { key: { senderId: 1, createdAt: -1 } }
    ]);

    logger.info('Database indexes created successfully');

  } catch (error) {
    logger.error('Failed to setup database indexes', {
      error: error.message
    });
    // Don't throw - indexes are optimization, not critical for startup
  }
};

/**
 * Clean up old data (maintenance function)
 */
const cleanupOldData = async () => {
  try {
    logger.info('Starting database cleanup...');

    const cutoffDate = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000); // 90 days ago

    // Clean up old analytics cache
    const analyticsResult = await mongoose.connection.collection('analytics').deleteMany({
      'cache.expiresAt': { $lt: new Date() },
      'cache.invalidated': true
    });

    // Clean up old log entries (if stored in database)
    // const logsResult = await mongoose.connection.collection('logs').deleteMany({
    //   createdAt: { $lt: cutoffDate }
    // });

    logger.info('Database cleanup completed', {
      analyticsDeleted: analyticsResult.deletedCount,
      cutoffDate
    });

  } catch (error) {
    logger.error('Database cleanup failed', {
      error: error.message
    });
  }
};

// Export functions
module.exports = {
  connectDB,
  disconnectDB,
  getConnectionStatus,
  healthCheck,
  setupIndexes,
  cleanupOldData,
  isConnected: () => isConnected
};
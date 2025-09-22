import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';
import logger from './utils/logger.js';

import theaterRoutes from './routes_files/theaterRoutes.js';
import movieRoutes from './routes_files/movieRoutes.js';
import userRoutes from './routes_files/userRoutes.js';
import bookingRoutes from './routes_files/bookingRoutes.js';
import paymentRoutes from './routes_files/paymentRoutes.js';
import adminRoutes from './routes_files/adminRoutes.js';

dotenv.config();

try { 
  const app = express();
  const PORT = process.env.PORT || 5000;
  const MONGO_URI = process.env.MONGO_URI;

  // =======================
  // 🔧 Middleware
  // =======================
  app.use(cors({ origin: true, credentials: true }));
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // =======================
  // 📦 Routes
  // =======================
  app.use('/api/theaters', theaterRoutes);
  app.use('/api/movies', movieRoutes);
  app.use('/api/users', userRoutes);
  app.use('/api/bookings', bookingRoutes);
  app.use('/api/payments', paymentRoutes);
  app.use('/api/admin', adminRoutes);
  app.use('/uploads', express.static('uploads'));

  // =======================
  // 404 Handler
  // =======================
  app.use((req, res) => {
    logger.warn(`⚠️ 404 - Not Found - ${req.originalUrl}`);
    res.status(404).json({ error: 'Route not found' });
  });

  // =======================
  // Global Error Handler
  // =======================
  app.use((err, req, res, next) => {
    logger.error(`❌ ${err.message}`);
    res.status(err.status || 500).json({ error: err.message || 'Server Error' });
  });

  // =======================
  // MongoDB Connection
  // =======================
  if (!MONGO_URI) {
    logger.error('❌ MONGO_URI is missing in environment variables');
    process.exit(1);
  }

  mongoose.connect(MONGO_URI)
    .then(() => {
      logger.info('✅ Connected to MongoDB');
      app.listen(PORT, () => logger.info(`🚀 Server running on port ${PORT}`));
    })
    .catch(err => {
      logger.error('❌ MongoDB connection error: ' + err.message);
      process.exit(1);
    });

  // =======================
  // Graceful Shutdown
  // =======================
  process.on('SIGINT', async () => {
    try {
      await mongoose.connection.close();
      logger.info('🛑 MongoDB connection closed due to app termination');
      process.exit(0);
    } catch (err) {
      logger.error('❌ Error closing MongoDB connection: ' + err.message);
      process.exit(1);
    }
  });

} catch (err) {
  console.error('💥 FATAL SERVER ERROR:', err);
  process.exit(1);
}
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

const app = express();
const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI;

// ✅ Startup logs
console.log('🛠 Initializing Express app...');
if (!MONGO_URI) {
  logger.error('❌ MONGO_URI is missing in environment variables');
  process.exit(1);
}

// =======================
// 🔧 Middleware
// =======================
const allowedOrigins = [
  "http://localhost:3000", // for local dev
  "https://showsnap-frontend-0lsc.onrender.com" // your Render frontend
];

app.use(cors({
  origin: function (origin, callback) {
    // allow requests with no origin (like mobile apps, curl, etc.)
    if (!origin) return callback(null, true);
    if (allowedOrigins.indexOf(origin) === -1) {
      const msg = '❌ CORS error: This origin is not allowed: ' + origin;
      return callback(new Error(msg), false);
    }
    return callback(null, true);
  },
  credentials: true
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ✅ Welcome route
app.get('/', (req, res) => {
  res.json({ message: "Welcome to the ShowSnap API! Please use /api/theaters or /api/movies to access data." });
});

// =======================
// 📦 Routes
// =======================
app.use('/api/theaters', theaterRoutes);
app.use('/api', movieRoutes);
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
mongoose.connect(MONGO_URI)
  .then(() => {
    logger.info('✅ Connected to MongoDB');
    app.listen(PORT, () => {
      logger.info(`🚀 Server running on port ${PORT}`);
      console.log(`🚀 Server running on port ${PORT}`);
    });
  })
  .catch(err => {
    logger.error('❌ MongoDB connection error: ' + err.message);
    console.error('❌ MongoDB connection error:', err.message);
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

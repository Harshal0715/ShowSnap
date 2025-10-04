import mongoose from 'mongoose';

const bookingSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    movie: { type: mongoose.Schema.Types.ObjectId, ref: 'Movie', required: true },
    theater: {
      name: { type: String, required: true, trim: true },
      location: { type: String, required: true, trim: true }
    },
    showtimeDate: { type: Date, required: true },
    seats: { type: [String], required: true }, // e.g. ["A1", "B3"]
    amount: { type: Number, required: true, min: 0 },

    status: {
      type: String,
      enum: ['confirmed', 'cancelled', 'pending'],
      default: 'confirmed'
    },

    paymentStatus: {
      type: String,
      enum: ['paid', 'unpaid', 'failed'],
      default: 'paid'
    },

    expiresAt: {
      type: Date,
      default: null // optional: for auto-expiry if unpaid
    },

    cancelledAt: {
      type: Date,
      default: null // optional: track when cancelled
    }
  },
  { timestamps: true }
);

// 🔍 Optimize seat lookup per showtime
bookingSchema.index({ movie: 1, theater: 1, showtimeDate: 1, status: 1 });

export default mongoose.model('Booking', bookingSchema);

import mongoose from 'mongoose';
import Booking from '../models/Booking.js';
import Movie from '../models/Movie.js';
import User from '../models/User.js';
import sendEmail from '../utils/sendEmail.js';
import logger from '../utils/logger.js';

const log = logger || console;

// 🎟️ Create booking (used after payment verification)
const createBooking = async ({
  userId,
  movieId,
  seats,
  theater,
  showtimeDate,
  amount,
  paymentStatus = 'paid'
}) => {
  if (!userId || !movieId || !seats?.length || !theater?.name || !theater?.location || !showtimeDate || !amount) {
    throw new Error('Missing or invalid booking data');
  }

  if (!mongoose.Types.ObjectId.isValid(userId) || !mongoose.Types.ObjectId.isValid(movieId)) {
    throw new Error('Invalid user or movie ID');
  }

  const [user, movie] = await Promise.all([
    User.findById(userId),
    Movie.findById(movieId)
  ]);

  if (!user || !movie) throw new Error('User or movie not found');

  const showtime = new Date(showtimeDate);
  const existingBookings = await Booking.find({
    movie: movieId,
    'theater.name': theater.name,
    showtimeDate: showtime,
    status: { $ne: 'cancelled' },
    seats: { $in: seats }
  });

  if (existingBookings.length > 0) {
    const bookedSeats = existingBookings.flatMap(b => b.seats);
    const conflictSeats = seats.filter(s => bookedSeats.includes(s));
    log.warn(`⚠️ Seat conflict: ${conflictSeats.join(', ')}`);
    throw new Error(`Seats already booked: ${conflictSeats.join(', ')}`);
  }

  const expiresAt = paymentStatus === 'paid' ? null : new Date(Date.now() + 15 * 60 * 1000); // optional expiry

  const booking = new Booking({
    user: userId,
    movie: movieId,
    seats,
    theater,
    showtimeDate: showtime,
    status: 'confirmed',
    amount,
    paymentStatus,
    expiresAt
  });

  await booking.save();
  log.info(`✅ Booking confirmed: ${booking._id}`);

  const emailHTML = `
    <div style="font-family: Arial, sans-serif; padding: 20px;">
      <h2>Booking Confirmed</h2>
      <p>Hi ${user.name},</p>
      <p>Your booking for <strong>${movie.title}</strong> is confirmed!</p>
      <ul>
        <li><strong>Theater:</strong> ${theater.name}</li>
        <li><strong>Location:</strong> ${theater.location}</li>
        <li><strong>Showtime:</strong> ${showtime.toLocaleString()}</li>
        <li><strong>Seats:</strong> ${seats.join(', ')}</li>
      </ul>
      <p>Enjoy your movie experience with <strong>ShowSnap</strong> 🍿</p>
    </div>
  `;

  try {
    await sendEmail({
      to: user.email,
      subject: `Your ShowSnap Booking for ${movie.title}`,
      html: emailHTML
    });
    log.info(`📩 Confirmation email sent to ${user.email}`);
  } catch (emailErr) {
    log.warn(`⚠️ Email failed to ${user.email}: ${emailErr.message}`);
  }

  return booking;
};

// 📄 Get all bookings for logged-in user
const getAllUserBookings = async (req, res) => {
  try {
    const userId = req.user._id;
    const bookings = await Booking.find({ user: userId }).populate('movie');
    res.json({ count: bookings.length, bookings });
  } catch (err) {
    log.error(`❌ Error fetching user bookings: ${err.message}`);
    res.status(500).json({ error: 'Server error while fetching bookings' });
  }
};

// 🪑 Get booked seats
const getBookedSeats = async (req, res) => {
  try {
    const { movieId, theater, showtime } = req.query;
    if (!movieId || !theater || !showtime) {
      return res.status(400).json({ error: 'Missing query parameters' });
    }

    const showtimeDate = new Date(showtime);
    const bookings = await Booking.find({
      movie: movieId,
      'theater.name': theater,
      showtimeDate,
      status: { $ne: 'cancelled' }
    });

    const bookedSeats = bookings.flatMap(b => b.seats);
    res.json(bookedSeats);
  } catch (err) {
    log.error(`❌ Error fetching booked seats: ${err.message}`);
    res.status(500).json({ error: 'Server error while fetching booked seats' });
  }
};

// 🔍 Get booking by ID
const getBookingById = async (req, res) => {
  try {
    const { bookingId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(bookingId)) {
      return res.status(400).json({ error: 'Invalid booking ID' });
    }

    const booking = await Booking.findById(bookingId).populate('movie user');
    if (!booking) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    res.json(booking);
  } catch (err) {
    log.error(`❌ Error fetching booking by ID: ${err.message}`);
    res.status(500).json({ error: 'Server error while fetching booking' });
  }
};

// ❌ Cancel booking
export const cancelBooking = async (req, res) => {
  try {
    const booking = await Booking.findByIdAndUpdate(
      req.params.bookingId,
      { status: 'cancelled', cancelledAt: new Date() },
      { new: true }
    ).populate('user movie');

    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }

    log.info(`🚫 Booking cancelled: ${booking._id}`);

    const emailHTML = `
      <div style="font-family: Arial, sans-serif; padding: 20px;">
        <h2>Booking Cancelled</h2>
        <p>Hi ${booking.user.name},</p>
        <p>Your booking for <strong>${booking.movie.title}</strong> has been cancelled.</p>
        <ul>
          <li><strong>Theater:</strong> ${booking.theater.name}</li>
          <li><strong>Location:</strong> ${booking.theater.location}</li>
          <li><strong>Showtime:</strong> ${new Date(booking.showtimeDate).toLocaleString()}</li>
          <li><strong>Seats:</strong> ${booking.seats.join(', ')}</li>
        </ul>
        <p>We hope to see you again on <strong>ShowSnap</strong> 🎬</p>
      </div>
    `;

    try {
      await sendEmail({
        to: booking.user.email,
        subject: `Your ShowSnap Booking for ${booking.movie.title} was Cancelled`,
        html: emailHTML
      });
      log.info(`📩 Cancellation email sent to ${booking.user.email}`);
    } catch (emailErr) {
      log.warn(`⚠️ Email failed to ${booking.user.email}: ${emailErr.message}`);
    }

    res.status(200).json({ success: true, booking });
  } catch (error) {
    log.error(`❌ Cancel booking error: ${error.message}`);
    res.status(500).json({ message: 'Server error' });
  }
};

export {
  createBooking,
  getBookedSeats,
  getAllUserBookings,
  getBookingById
};

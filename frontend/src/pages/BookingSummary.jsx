import { useParams } from 'react-router-dom';
import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';

function BookingSummary() {
  const { id } = useParams();
  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchBooking = async () => {
      const token = localStorage.getItem('token');
      if (!token) {
        setError('You must be logged in to view this booking.');
        setLoading(false);
        return;
      }

      try {
        const res = await fetch(`https://showsnap-backend-ioiz.onrender.com/api/bookings/${id}`, {
          headers: { Authorization: `Bearer ${token}` }
        });

        if (!res.ok) {
          throw new Error('Failed to fetch booking');
        }

        const data = await res.json();
        setBooking(data);
      } catch (err) {
        console.error('Booking fetch error:', err.message);
        toast.error('Unable to load booking details.');
        setError('Unable to load booking details.');
      } finally {
        setLoading(false);
      }
    };

    fetchBooking();
  }, [id, setBooking, setLoading, setError]);

  if (loading) {
    return (
      <div className="p-6 text-center text-gray-600 animate-pulse">
        Loading booking...
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 text-center text-red-500">
        {error}
      </div>
    );
  }

  if (!booking) {
    return (
      <div className="p-6 text-center text-gray-500">
        No booking found.
      </div>
    );
  }

  const { movie, theater, showtimeDate, seats, amount } = booking;

  const movieTitle = movie?.title || booking.movieId || 'Unknown Movie';
  const theaterName = theater?.name || 'Unknown Theater';
  const theaterLocation = theater?.location || 'N/A';
  const formattedDate = showtimeDate ? new Date(showtimeDate).toLocaleString() : 'N/A';
  const seatList = Array.isArray(seats) ? seats.join(', ') : 'N/A';
  const paidAmount = typeof amount === 'number' ? `₹${(amount / 100).toFixed(2)}` : 'N/A';

  const handleCopy = () => {
    const details = `
Booking Details:
Movie: ${movieTitle}
Theater: ${theaterName} (${theaterLocation})
Showtime: ${formattedDate}
Seats: ${seatList}
Amount Paid: ${paidAmount}
    `.trim();

    navigator.clipboard.writeText(details);
    toast.success('Booking details copied to clipboard!');
  };

  return (
    <div className="p-6 max-w-xl mx-auto bg-white shadow-lg rounded-lg border">
      <h2 className="text-2xl font-bold text-green-600 mb-4">🎉 Booking Confirmed</h2>

      <div className="space-y-2 text-gray-700">
        <p><strong>Movie:</strong> {movieTitle}</p>
        <p><strong>Theater:</strong> {theaterName}</p>
        <p><strong>Location:</strong> {theaterLocation}</p>
        <p><strong>Showtime:</strong> {formattedDate}</p>
        <p><strong>Seats:</strong> {seatList}</p>
        <p><strong>Amount Paid:</strong> {paidAmount}</p>
      </div>

      <button
        onClick={handleCopy}
        aria-label="Copy booking details"
        className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
      >
        📋 Copy Booking Details
      </button>
    </div>
  );
}

export default BookingSummary;

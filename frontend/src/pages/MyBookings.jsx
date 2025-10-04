import React, { useEffect, useState } from 'react';
import toast from 'react-hot-toast';

function MyBookings() {
  const [bookings, setBookings] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [cancellingId, setCancellingId] = useState(null);

  const token = localStorage.getItem('token');

  useEffect(() => {
    if (!token) {
      setError('You must be logged in to view your bookings.');
      setLoading(false);
      return;
    }

    fetch('https://showsnap-backend-ioiz.onrender.com/api/bookings/my-bookings', {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(async res => {
        if (!res.ok) throw new Error('Failed to fetch bookings');
        const data = await res.json();
        setBookings(Array.isArray(data.bookings) ? data.bookings : []);
        setLoading(false);
      })
      .catch(err => {
        console.error('❌ Error fetching bookings:', err);
        setError('Failed to load bookings.');
        setLoading(false);
      });
  }, [token]);

  const cancelBooking = async (bookingId) => {
    if (!window.confirm('Are you sure you want to cancel this booking?')) return;

    setCancellingId(bookingId);

    try {
      const res = await fetch(`https://showsnap-backend-ioiz.onrender.com/api/bookings/${bookingId}/cancel`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Cancellation failed');
      }

      setBookings(prev =>
        prev.map(b => b._id === bookingId ? data.booking : b)
      );
      toast.success('✅ Booking cancelled successfully.');
    } catch (err) {
      console.error('❌ Error cancelling booking:', err);
      toast.error(err.message || 'Failed to cancel booking.');
    } finally {
      setCancellingId(null);
    }
  };

  if (loading) return <div className="p-6 text-center text-gray-600 animate-pulse">Loading your bookings...</div>;
  if (error) return <div className="p-6 text-center text-red-500">{error}</div>;

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h2 className="text-3xl font-bold mb-6 text-red-600 text-center">🎟️ My Bookings</h2>

      {bookings.length === 0 ? (
        <p className="text-gray-500 text-center">You haven’t booked any tickets yet.</p>
      ) : (
        <ul className="space-y-4">
          {bookings.map(booking => {
            const movieTitle = booking.movie?.title || 'Unknown Movie';
            const theaterName = booking.theater?.name || 'Unknown Theater';
            const theaterLocation = booking.theater?.location || 'N/A';
            const showtimeFormatted = booking.showtimeDate
              ? new Date(booking.showtimeDate).toLocaleString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric'
                })
              : 'N/A';
            const seats = Array.isArray(booking.seats) ? booking.seats.join(', ') : 'N/A';

            return (
              <li key={booking._id} className="border p-4 rounded-xl shadow bg-white text-black hover:shadow-lg transition">
                <h3 className="text-xl font-semibold text-red-600">{movieTitle}</h3>
                <p><strong>Theater:</strong> {theaterName}</p>
                <p><strong>Location:</strong> {theaterLocation}</p>
                <p><strong>Showtime:</strong> {showtimeFormatted}</p>
                <p><strong>Seats:</strong> {seats}</p>
                <p>
                  <strong>Status:</strong>{' '}
                  <span className={booking.status === 'confirmed' ? 'text-green-600' : 'text-gray-500'}>
                    {booking.status}
                  </span>
                </p>

                {booking.status === 'confirmed' ? (
                  <button
                    onClick={() => cancelBooking(booking._id)}
                    disabled={cancellingId === booking._id}
                    aria-label="Cancel this booking"
                    className={`mt-3 px-4 py-2 rounded-lg font-semibold transition duration-200 ${
                      cancellingId === booking._id
                        ? 'bg-gray-400 text-white cursor-not-allowed'
                        : 'bg-red-600 text-white hover:bg-red-700'
                    }`}
                  >
                    {cancellingId === booking._id ? 'Cancelling...' : 'Cancel Booking'}
                  </button>
                ) : (
                  <span className="mt-3 inline-block px-4 py-2 bg-gray-200 text-gray-600 rounded-lg">
                    Booking Cancelled
                  </span>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

export default MyBookings;

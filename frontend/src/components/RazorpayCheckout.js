import toast from 'react-hot-toast';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';
const RAZORPAY_KEY = process.env.REACT_APP_RAZORPAY_KEY || 'rzp_test_RIn3HX6YPDL3Nf';

// 🔧 Unified fetch helper with token + error handling
const apiFetch = async (endpoint, options = {}) => {
  const token = localStorage.getItem('token');

  const res = await fetch(`${API_URL}${endpoint}`, {
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...options.headers,
    },
    ...options,
  });

  let data = {};
  try {
    data = await res.json();
  } catch {
    toast.error('Server returned invalid response.');
  }

  if (!res.ok) {
    throw new Error(data.error || `API error: ${res.status}`);
  }

  return data;
};

// 💳 Razorpay payment handler with cancellation support
const handleRazorpayPayment = async (payload, setLoading, navigate, onSuccess, onCancel) => {
  const token = localStorage.getItem('token');
  const user = JSON.parse(localStorage.getItem('user'));

  if (!token || !user) {
    toast.error('User not authenticated. Please log in.');
    return;
  }

  const isValidPayload =
    payload &&
    payload.amount > 0 &&
    payload.movieId &&
    payload.seats?.length &&
    payload.theater?.name &&
    payload.theater?.location &&
    payload.showtimeDate;

  if (!isValidPayload) {
    toast.error('Incomplete booking details. Please select showtime and seats.');
    return;
  }

  const formattedDate = new Date(payload.showtimeDate).toISOString();

  try {
    setLoading?.(true);
    console.log('🔍 Booking Payload:', payload);

    const orderResponse = await apiFetch('/api/payments/create-order', {
      method: 'POST',
      body: JSON.stringify({ amount: payload.amount }),
    });

    const orderId = orderResponse.orderId || orderResponse.id;
    if (!orderId) {
      toast.error('Failed to create payment order.');
      setLoading?.(false);
      return;
    }

    if (!window.Razorpay) {
      toast.error('Razorpay SDK not loaded. Please refresh.');
      setLoading?.(false);
      return;
    }

    const options = {
      key: RAZORPAY_KEY,
      amount: payload.amount,
      currency: 'INR',
      name: 'ShowSnap',
      description: 'Movie Ticket Booking',
      order_id: orderId,
      handler: async (response) => {
        try {
          const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = response;

          if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
            toast.error('Incomplete payment response.');
            return;
          }

          const verifyRes = await apiFetch('/api/payments/verify', {
            method: 'POST',
            body: JSON.stringify({
              razorpay_order_id,
              razorpay_payment_id,
              razorpay_signature,
              movieId: payload.movieId,
              seats: payload.seats,
              theater: {
                name: payload.theater.name,
                location: payload.theater.location,
              },
              showtimeDate: formattedDate,
              amount: payload.amount,
            }),
          });

          console.log('✅ Verification Response:', verifyRes);

          if (!verifyRes.success) {
            toast.error(verifyRes.error || 'Payment verification failed.');
            return;
          }

          toast.success('🎉 Booking successful!');
          if (verifyRes.bookingId) {
            navigate(`/my-bookings/${verifyRes.bookingId}`);
            if (onSuccess) onSuccess();
          } else {
            toast.error('Booking ID missing in response.');
          }
        } catch (err) {
          console.error('Payment handler error:', err);
          toast.error('Something went wrong during booking.');
        } finally {
          setLoading?.(false);
        }
      },
      modal: {
        ondismiss: () => {
          console.log('❌ Payment cancelled by user');
          toast.error('Payment was cancelled. Booking not completed.');
          setLoading?.(false);
          if (onCancel) onCancel();
        }
      },
      prefill: {
        name: user.name || 'Guest',
        email: user.email || 'guest@example.com',
        contact: /^\d{10}$/.test(user.contact) ? user.contact : '9999999999',
      },
      theme: { color: '#F37254' },
    };

    new window.Razorpay(options).open();
  } catch (err) {
    console.error('Error initiating Razorpay:', err);
    toast.error(err.message || 'Unable to initiate payment. Please try again.');
    setLoading?.(false);
  }
};

export default handleRazorpayPayment;

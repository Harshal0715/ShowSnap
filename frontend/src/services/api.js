import axios from 'axios';

const API = axios.create({
  baseURL: process.env.REACT_APP_API_BASE_URL || 'https://showsnap-backend-ioiz.onrender.com/api',
  timeout: 10000,
});

API.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const fetchPublicMovies = (params = {}) => API.get('/movies', { params });
export const fetchAdminMovies = () => API.get('/admin/movies');
export const fetchMovieById = (id) => API.get(`/admin/movies/${id}`);
export const createMovie = (movieData) => API.post('/admin/movies', movieData);
export const updateMovie = (id, data) => API.put(`/admin/movies/${id}`, data);
export const deleteMovie = (movieId) => API.delete(`/admin/movies/${movieId}`);

export const loginUser = (data) => API.post('/users/login', data);
export const signupUser = (userData) => API.post('/users/register', userData);

export const getAllUserBookings = () => API.get('/bookings');
export const cancelBooking = (bookingId) => API.patch(`/bookings/${bookingId}/cancel`);

export const getAllBookings = () => API.get('/admin/bookings');
export const getAdminStats = () => API.get('/admin/dashboard');
export const getAllUsers = () => API.get('/admin/users');
export const pingAdmin = () => API.get('/admin/ping');

export const fetchTheaters = () => API.get('/theaters');

export const fetchUserProfile = () => API.get('/users/profile');
export const updateUserProfile = (payload) => API.put('/users/profile', payload);

// ✅ Corrected `sendResetLink` function to use the correct endpoint
export const sendResetLink = (email) => {
  return API.post('/users/forgot-password', { email });
};

export default API;

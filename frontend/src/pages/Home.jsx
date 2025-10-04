import React, { useState, useEffect, useMemo, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchPublicMovies } from '../services/api';
import { AuthContext } from '../context/AuthContext';
import { LocationContext } from '../context/LocationContext';
import { FaGooglePlay, FaApple, FaEnvelope } from 'react-icons/fa';

function Home() {
  const [featuredIndex, setFeaturedIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedGenre, setSelectedGenre] = useState('');
  const [minRating, setMinRating] = useState(0);
  const [error, setError] = useState('');
  const [trailerModal, setTrailerModal] = useState({ open: false, url: '' });
  const [nowShowingMovies, setNowShowingMovies] = useState([]);
  const [upcomingMovies, setUpcomingMovies] = useState([]);

  const navigate = useNavigate();
  const { user } = useContext(AuthContext);
  const { location } = useContext(LocationContext);

  // 🔄 Load movies based on location
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);

        const [nowShowingRes, upcomingRes] = await Promise.all([
          fetchPublicMovies({ isUpcoming: false }),
          fetchPublicMovies({ isUpcoming: true }),
        ]);

        const nowShowingList = Array.isArray(nowShowingRes.data.movies) ? nowShowingRes.data.movies : [];
        const upcomingList = Array.isArray(upcomingRes.data.movies) ? upcomingRes.data.movies : [];

        const filteredNowShowing = location
          ? nowShowingList.filter(movie =>
              movie.embeddedTheaters?.some(
                theater => theater.location?.toLowerCase() === location.toLowerCase()
              )
            )
          : nowShowingList;

        const filteredUpcoming = location
          ? upcomingList.filter(movie =>
              movie.embeddedTheaters?.some(
                theater => theater.location?.toLowerCase() === location.toLowerCase()
              )
            )
          : upcomingList;

        setNowShowingMovies(filteredNowShowing);
        setUpcomingMovies(filteredUpcoming);
        setFeaturedIndex(0);
        setLoading(false);
      } catch (err) {
        console.error('❌ Error loading data:', err.response?.data || err.message);
        setError('Failed to load movies or theaters.');
        setLoading(false);
      }
    };

    loadData();
  }, [location]);

  // ✅ Filtered Now Showing
  const visibleMovies = useMemo(() => {
    return nowShowingMovies.filter(
      (movie) =>
        movie.title?.toLowerCase().includes(searchTerm.toLowerCase()) &&
        (selectedGenre
          ? movie.genre?.toLowerCase().includes(selectedGenre.toLowerCase())
          : true) &&
        movie.rating >= minRating
    );
  }, [nowShowingMovies, searchTerm, selectedGenre, minRating]);

  // ✅ Genres dropdown
  const genres = useMemo(
    () => [...new Set(nowShowingMovies.map((m) => m.genre).filter(Boolean))].sort(),
    [nowShowingMovies]
  );

  // 🎞️ Featured carousel auto-slide
  useEffect(() => {
    if (visibleMovies.length > 0) {
      const interval = setInterval(() => {
        setFeaturedIndex((prev) => (prev + 1) % visibleMovies.length);
      }, 5000);
      return () => clearInterval(interval);
    }
  }, [visibleMovies]);

  const featuredMovie = visibleMovies[featuredIndex] || null;

  if (loading)
    return (
      <div className="p-6 text-center text-lg text-gray-600">
        Loading movies...
      </div>
    );
  if (error)
    return <div className="p-6 text-center text-red-500">{error}</div>;

  return (
    <div className="max-w-7xl mx-auto p-4 text-white">
      <header className="mb-6">
        <p className="text-gray-400">
          Welcome, <strong>{user?.name || 'Guest'}</strong>
        </p>
      </header>

      {/* Featured Movie Carousel */}
      <section className="relative h-96 rounded-xl overflow-hidden shadow-lg mb-8">
        {featuredMovie?.posterUrl ? (
          <img
            src={featuredMovie.posterUrl}
            alt={featuredMovie.title}
            className="w-full h-full object-cover brightness-75 cursor-pointer"
            onClick={() => featuredMovie?._id && navigate(`/book/${featuredMovie._id}`)}
          />
        ) : (
          <div className="w-full h-full bg-gray-800 flex items-center justify-center text-white text-xl">
            No Featured Poster
          </div>
        )}
        <div className="absolute bottom-0 left-0 p-6 bg-gradient-to-t from-black/80 to-transparent w-full">
          <h2
            className="text-3xl font-bold cursor-pointer"
            onClick={() => featuredMovie?._id && navigate(`/book/${featuredMovie._id}`)}
          >
            {featuredMovie?.title || 'Untitled'}
          </h2>
          <p className="text-sm text-gray-400 mb-1">
            {featuredMovie?.genre && (
              <span className="bg-red-600 px-2 py-1 rounded text-white text-xs mr-2">
                {featuredMovie.genre}
              </span>
            )}
            {featuredMovie?.releaseDate && (
              <span>
                {new Date(featuredMovie.releaseDate).toLocaleDateString()}
              </span>
            )}
          </p>
          <p className="text-gray-300 mt-2 max-w-lg">
            {featuredMovie?.description || 'No description available.'}
          </p>
          <div className="mt-4 flex gap-3">
            {featuredMovie?.trailerUrl && (
              <button
                onClick={() =>
                  setTrailerModal({ open: true, url: featuredMovie.trailerUrl })
                }
                className="px-5 py-2 bg-gray-700 hover:bg-gray-600 rounded text-white font-semibold"
              >
                Watch Trailer
              </button>
            )}
          </div>
        </div>
      </section>

      {/* Filters */}
      <div className="mb-6">
        <input
          type="text"
          placeholder="Search movies..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full p-3 mb-4 rounded-lg bg-gray-900 text-white placeholder-gray-400"
        />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <select
            value={selectedGenre}
            onChange={(e) => setSelectedGenre(e.target.value)}
            className="p-3 rounded-lg bg-gray-900 text-white w-full"
          >
            <option value="">All Genres</option>
            {genres.map((g) => (
              <option key={g} value={g}>
                {g}
              </option>
            ))}
          </select>
          <div className="flex flex-col">
            <label className="text-sm text-gray-400 mb-1">
              Minimum Rating:{' '}
              <span className="text-yellow-400 font-semibold">{minRating}</span>
            </label>
            <input
              type="range"
              min="0"
              max="10"
              step="0.1"
              value={minRating}
              onChange={(e) => setMinRating(parseFloat(e.target.value))}
              className="w-full accent-red-500"
            />
          </div>
          <button
            onClick={() => {
              setSelectedGenre('');
              setMinRating(0);
              setSearchTerm('');
            }}
            className="p-3 bg-gray-700 text-white rounded-lg hover:bg-gray-600"
          >
            Reset Filters
          </button>
        </div>
      </div>

      {/* Now Showing */}
      <section>
        <h3 className="text-2xl font-semibold mb-4">Now Showing</h3>
        {visibleMovies.length === 0 ? (
          <p className="text-center text-gray-400">No movies match your filters.</p>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-6">
            {visibleMovies.map((movie) => (
              <div
                key={movie._id}
                onClick={() => navigate(`/book/${movie._id}`)}
                className="cursor-pointer rounded-lg overflow-hidden shadow-md hover:shadow-xl transform hover:scale-105 transition duration-300 bg-white text-black"
              >
                <div className="relative">
                  {movie.posterUrl ? (
                    <img
                      src={movie.posterUrl}
                      alt={movie.title}
                      className="w-full h-60 object-cover"
                    />
                  ) : (
                    <div className="w-full h-60 bg-gray-800 flex items-center justify-center text-white text-sm">
                      No Poster
                    </div>
                  )}
                  {movie.trailerUrl && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setTrailerModal({ open: true, url: movie.trailerUrl });
                      }}
                      className="absolute top-2 right-2 bg-red-600 p-1 rounded text-white text-xs hover:bg-red-700"
                    >
                      ▶ Trailer
                    </button>
                  )}
                </div>
                <div className="p-3">
                  <h4 className="font-semibold text-lg">{movie.title}</h4>
                  <p className="text-sm text-gray-600">
                    {movie.genre || 'Unknown Genre'}
                  </p>
                  <p className="text-sm text-yellow-500 font-semibold mt-1">
                    ⭐ {typeof movie.rating === 'number' ? movie.rating : 'N/A'}
                  </p>
                  {/* Book Now button removed */}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Coming Soon */}
      <section className="mt-12">
        <h3 className="text-2xl font-semibold mb-4">Coming Soon</h3>
        {upcomingMovies.length === 0 ? (
          <p className="text-center text-gray-400">No upcoming movies listed.</p>
        ) : (
          <div className="flex gap-6 overflow-x-auto pb-4">
            {upcomingMovies.map((movie) => {
  const isUpcoming = new Date(movie.releaseDate) > new Date();

  return (
    <div
      key={movie._id}
      onClick={() => navigate(`/movie/${movie._id}`)} // ✅ Navigate to detail page
      className="min-w-[180px] cursor-pointer rounded-lg overflow-hidden shadow-md bg-white text-black hover:shadow-xl transition duration-300"
    >
      {movie.posterUrl ? (
        <img
          src={movie.posterUrl}
          alt={movie.title}
          className="w-full h-60 object-cover"
        />
      ) : (
        <div className="w-full h-60 bg-gray-800 flex items-center justify-center text-white text-sm">
          No Poster
        </div>
      )}
      <div className="p-2">
        <h4 className="font-semibold text-md">{movie.title}</h4>
        {movie.releaseDate && (
          <p className="text-xs text-gray-500">
            {new Date(movie.releaseDate).toLocaleDateString()}
          </p>
        )}

        {/* 🎬 Trailer Button */}
        {movie.trailerUrl && (
          <button
            onClick={(e) => {
              e.stopPropagation(); // prevent card click
              window.open(movie.trailerUrl, '_blank');
            }}
            className="mt-2 w-full bg-gray-800 hover:bg-gray-700 text-white text-sm py-1 rounded transition"
          >
            Watch Trailer
          </button>
        )}

        {/* 🎟️ Booking Button */}
        {isUpcoming ? (
          <button
            disabled
            className="mt-2 w-full bg-gray-300 text-gray-600 text-sm py-1 rounded cursor-not-allowed"
            title="Booking will open closer to release"
          >
            Coming Soon
          </button>
        ) : (
          <button
            onClick={() => navigate(`/book/${movie._id}`)}
            className="mt-2 w-full bg-red-600 hover:bg-red-700 text-white text-sm py-1 rounded transition"
          >
            Book Now
          </button>
        )}
      </div>
    </div>
  );
})}
          </div>
        )}
      </section>

      {/* Trailer Modal */}
      {trailerModal.open && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
          <div className="relative w-full max-w-3xl bg-black rounded-lg overflow-hidden">
            <button
              onClick={() => setTrailerModal({ open: false, url: '' })}
              className="absolute top-2 right-2 text-white text-xl font-bold px-2 py-1 hover:text-red-500"
            >
              ✕
            </button>
            <iframe
              className="w-full h-[480px]"
              src={trailerModal.url.replace('watch?v=', 'embed/')}
              title="Trailer"
              frameBorder="0"
              allowFullScreen
            ></iframe>
          </div>
        </div>
      )}

      {/* Footer */}
       <footer className="bg-[#121212] text-gray-400 py-10 mt-16 border-t border-gray-800">
            <div className="max-w-7xl mx-auto px-4 grid grid-cols-1 md:grid-cols-3 gap-8">
              {/* 🪩 Brand & Tagline */}
              <div>
                <h2 className="text-red-500 text-2xl font-bold mb-2">ShowSnap</h2>
                <p>Your gateway to cinematic experiences.</p>
                <p className="mt-1 text-sm">Book smarter, watch better.</p>
              </div>
      
              {/* 📱 App Links */}
              <div>
                <h3 className="text-white text-lg font-semibold mb-2">Get the App</h3>
                <div className="flex gap-4 items-center">
                  <a
                    href="https://play.google.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 hover:text-white"
                  >
                    <FaGooglePlay /> Google Play
                  </a>
                  <a
                    href="https://www.apple.com/app-store/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 hover:text-white"
                  >
                    <FaApple /> App Store
                  </a>
                </div>
              </div>
      
              {/* 📬 Contact Info */}
              <div>
                <h3 className="text-white text-lg font-semibold mb-2">Contact Us</h3>
                <p className="flex items-center gap-2">
                  <FaEnvelope className="text-red-500" />
                  <a
                    href="mailto:support@showsnap.in"
                    className="text-blue-400 hover:underline"
                  >
                    support@showsnap.in
                  </a>
                </p>
                <p className="mt-2 text-sm">© 2025 ShowSnap. All rights reserved.</p>
              </div>
            </div>
      
            {/* 🌐 Bottom Bar */}
            <div className="mt-10 text-center text-xs text-gray-500">
              <p>Made with ❤️ in Mumbai</p>
            </div>
          </footer>
          </div>
        );
      }

export default Home;

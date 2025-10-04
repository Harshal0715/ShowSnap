import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';

function MovieDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [movie, setMovie] = useState(null);
  const [loading, setLoading] = useState(true);

 useEffect(() => {
  const fetchMovie = async () => {
    try {
      const res = await axios.get(`https://showsnap-backend-ioiz.onrender.com/api/movies/${id}`);
      const movieData = res.data;

      // ✅ Normalize theaters: use embedded if available
      const normalizedTheaters = Array.isArray(movieData.theaters) && typeof movieData.theaters[0] === 'object'
        ? movieData.theaters
        : Array.isArray(movieData.embeddedTheaters)
          ? movieData.embeddedTheaters
          : [];

      setMovie({ ...movieData, theaters: normalizedTheaters });
    } catch (err) {
      console.error('❌ Error fetching movie:', err.message);
    } finally {
      setLoading(false);
    }
  };
  fetchMovie();
}, [id]);

  const formatShowtime = (time) => {
    const date = new Date(time);
    return isNaN(date.getTime())
      ? 'Invalid Date'
      : date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
  };

  if (loading) {
    return <div className="p-6 text-center text-lg animate-pulse text-gray-400">Loading movie details...</div>;
  }

  if (!movie) {
    return <div className="p-6 text-center text-red-500 font-semibold">Movie not found.</div>;
  }

  return (
    <div className="max-w-6xl mx-auto p-6 text-white">
      {/* 🎬 Poster & Info */}
      <div className="flex flex-col md:flex-row gap-6 mb-10">
        {movie.posterUrl ? (
          <img
            src={movie.posterUrl}
            alt={movie.title || 'Movie poster'}
            loading="lazy"
            className="w-full md:w-1/3 rounded-lg shadow-lg object-cover"
          />
        ) : (
          <div className="w-full md:w-1/3 h-64 bg-gray-800 rounded-lg flex items-center justify-center text-gray-400">
            No Poster Available
          </div>
        )}

        <div className="flex-1 flex flex-col justify-between">
          <div>
            <h1 className="text-4xl font-bold text-red-500 mb-2">{movie.title}</h1>
            <p className="text-gray-300 mb-4">{movie.description || 'No description available.'}</p>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm text-gray-400">
              <p><strong>Genre:</strong> {movie.genre || 'N/A'}</p>
              <p><strong>Rating:</strong> ⭐ {typeof movie.rating === 'number' ? movie.rating : 'N/A'}/10</p>
              <p><strong>Duration:</strong> {movie.duration || 'N/A'}</p>
              <p><strong>Language:</strong> {movie.language || 'N/A'}</p>
              <p><strong>Release:</strong> {movie.releaseDate ? new Date(movie.releaseDate).toLocaleDateString() : 'N/A'}</p>
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-wrap gap-4 mt-6">
            {movie.trailerUrl && (
              <a
                href={movie.trailerUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition"
              >
                ▶ Watch Trailer
              </a>
            )}
          </div>
        </div>
      </div>

      {/* 🏢 Theaters & Showtimes */}
      {movie.theaters?.length > 0 ? (
        <div className="mb-10">
          <h2 className="text-2xl font-semibold mb-4 text-red-400">Available Theaters & Showtimes</h2>
          <div className="space-y-4">
            {movie.theaters.map((theater, tIdx) => (
              <div
                key={theater._id || tIdx}
                className="bg-gray-800 p-4 rounded-lg shadow hover:shadow-lg transition cursor-pointer"
                onClick={() => navigate(`/book/${movie._id}?theater=${tIdx}`)}
              >
                <h3 className="text-lg font-semibold text-white">
                  {theater.name} <span className="text-sm text-gray-400">({theater.location})</span>
                </h3>

                <div className="flex flex-wrap gap-3 mt-2 overflow-x-auto">
                  {Array.isArray(theater.showtimes) && theater.showtimes.length > 0 ? (
                    theater.showtimes
                      .sort((a, b) => new Date(a.startTime || a) - new Date(b.startTime || b))
                      .map((st, idx) => (
                        <div
                          key={idx}
                          className="px-3 py-1 bg-gray-700 text-sm rounded text-white hover:bg-gray-600 min-w-max whitespace-nowrap"
                        >
                          {formatShowtime(st.startTime || st)}
                        </div>
                      ))
                  ) : (
                    <p className="text-gray-400 text-sm">No showtimes available.</p>
                  )}
                </div>

                {/* Seat type info badges */}
                <div className="flex gap-2 mt-3 text-sm">
                  <span className="px-2 py-1 rounded bg-yellow-500 text-black font-semibold">VIP</span>
                  <span className="px-2 py-1 rounded bg-blue-500 text-white font-semibold">Premium</span>
                  <span className="px-2 py-1 rounded bg-gray-700 text-white font-semibold">Normal</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="mb-10 text-center text-gray-400">No theaters currently showing this movie.</div>
      )}

      {/* 🎭 Cast */}
      {movie.cast?.length > 0 && (
        <div>
          <h2 className="text-2xl font-semibold mb-4 text-red-400">Cast & Crew</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {movie.cast.map((actor, index) => (
              <div key={index} className="text-center bg-gray-900 p-3 rounded-lg shadow hover:shadow-md transition">
                {actor.photoUrl ? (
                  <img
                    src={actor.photoUrl}
                    alt={actor.name || 'Actor photo'}
                    loading="lazy"
                    className="w-24 h-24 object-cover rounded-full mx-auto mb-2 border border-gray-700"
                  />
                ) : (
                  <div className="w-24 h-24 bg-gray-700 rounded-full mx-auto mb-2 flex items-center justify-center text-sm text-gray-400">
                    No Photo
                  </div>
                )}
                <p className="font-medium text-white">{actor.name}</p>
                <p className="text-sm text-gray-400">{actor.role || ''}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default MovieDetails;

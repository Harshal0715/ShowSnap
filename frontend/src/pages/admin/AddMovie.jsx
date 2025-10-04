import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import toast from 'react-hot-toast';

const API_URL = process.env.REACT_APP_API_URL || 'https://showsnap-backend-ioiz.onrender.com';

const supportedLanguages = [
  { code: 'en', label: 'English' },
  { code: 'hi', label: 'Hindi' },
  { code: 'ta', label: 'Tamil' },
  { code: 'te', label: 'Telugu' },
  { code: 'ml', label: 'Malayalam' },
  { code: 'mr', label: 'Marathi' },
  { code: 'kn', label: 'Kannada' },
  { code: 'bn', label: 'Bengali' },
  { code: 'gu', label: 'Gujarati' },
  { code: 'pa', label: 'Punjabi' },
  { code: 'ur', label: 'Urdu' }
];

function AddMovie() {
  const navigate = useNavigate();
  const [token] = useState(localStorage.getItem('token'));

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [genre, setGenre] = useState('');
  const [rating, setRating] = useState('');
  const [duration, setDuration] = useState('');
  const [posterUrl, setPosterUrl] = useState('');
  const [trailerUrl, setTrailerUrl] = useState('');
  const [releaseDate, setReleaseDate] = useState('');
  const [language, setLanguage] = useState('en');

  const [cast, setCast] = useState([]);
  const [castName, setCastName] = useState('');
  const [castRole, setCastRole] = useState('');
  const [castPhotoUrl, setCastPhotoUrl] = useState('');

  const [availableTheaters, setAvailableTheaters] = useState([]);
  const [embeddedTheaters, setEmbeddedTheaters] = useState([]);

  const [tmdbQuery, setTmdbQuery] = useState('');
  const [fetching, setFetching] = useState(false);

  useEffect(() => {
    if (!token) {
      toast.error('Session expired. Please log in again.');
      navigate('/login');
      return;
    }

    const fetchTheaters = async () => {
      try {
        const res = await axios.get(`${API_URL}/api/theaters`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setAvailableTheaters(res.data.theaters || []);
      } catch (err) {
        console.error('Error fetching theaters:', err);
        toast.error('Failed to load theaters');
      }
    };
    fetchTheaters();
  }, [navigate, token]);

  const addCastMember = () => {
    if (!castName.trim() || !castRole.trim()) {
      toast.error('Cast name and role are required');
      return;
    }
    if (cast.some(c => c.name.toLowerCase() === castName.toLowerCase())) {
      toast.error('Cast member already added');
      return;
    }
    setCast(prev => [
      ...prev,
      { name: castName.trim(), role: castRole.trim(), photoUrl: castPhotoUrl.trim() }
    ]);
    setCastName('');
    setCastRole('');
    setCastPhotoUrl('');
    toast.success('🎭 Cast added!');
  };

  const handleTheaterChange = (e) => {
    const selectedIds = Array.from(e.target.selectedOptions, option => option.value);
    const selected = availableTheaters.filter(t => selectedIds.includes(t._id));

    const embedded = selected.map(t => ({
      name: t.name,
      location: t.location,
      showtimes: [] // You can add showtime input later
    }));

    setEmbeddedTheaters(embedded);
  };

  const handleTmdbSearch = async () => {
    if (!tmdbQuery.trim()) return toast.error('Enter a movie name to search');
    if (!token) {
      toast.error('Session expired. Please log in again.');
      navigate('/login');
      return;
    }

    setFetching(true);
    try {
      const searchRes = await axios.get(`${API_URL}/api/admin/tmdb/search`, {
        params: { query: tmdbQuery.trim() },
        headers: { Authorization: `Bearer ${token}` }
      });

      if (!searchRes.data.results?.length) {
        toast.error('No results found');
        return;
      }

      const movie = searchRes.data.results[0];
      const detailsRes = await axios.get(`${API_URL}/api/admin/tmdb/movie/${movie.id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      const movieData = detailsRes.data || {};

      setTitle(movieData.title || '');
      setDescription(movieData.description || '');
      setGenre(movieData.genre || '');
      setRating(movieData.rating || '');
      setDuration(movieData.duration || '');
      setPosterUrl(movieData.posterUrl || '');
      setTrailerUrl(movieData.trailerUrl || '');
      setReleaseDate(movieData.releaseDate || '');
      setLanguage(movieData.language || 'en');

      setCast(Array.isArray(movieData.cast)
        ? movieData.cast.map(c => ({
            name: c.name || '',
            role: c.role || '',
            photoUrl: c.photoUrl || ''
          }))
        : []);

      toast.success(`🎬 Loaded ${movieData.title} from TMDB`);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      console.error('TMDB fetch error:', err.response?.data || err.message);
      toast.error('Failed to fetch from TMDB');
    } finally {
      setFetching(false);
    }
  };

  const handleSubmit = async () => {
    if (!title.trim() || !genre.trim() || !posterUrl.trim() || !releaseDate || !language.trim()) {
      toast.error('Please fill all required movie fields');
      return;
    }

    const parsedDate = new Date(releaseDate);
    if (isNaN(parsedDate)) {
      toast.error('Invalid release date format');
      return;
    }

    const newMovie = {
      title: title.trim(),
      description: description.trim(),
      genre: genre.trim(),
      rating: parseFloat(rating) || 0,
      duration: duration.trim(),
      posterUrl: posterUrl.trim(),
      trailerUrl: trailerUrl.trim(),
      releaseDate: parsedDate.toISOString(),
      language: language.trim(),
      cast,
      embeddedTheaters: embeddedTheaters.map(t => ({
    ...t,
    showtimes: [
      {
        startTime: new Date(Date.now() + 3600000).toISOString(),
        screen: 'Screen 1',
        availableSeats: 100,
        blockedSeats: []
      }
    ]
  }))
    };

    try {
      await axios.post(`${API_URL}/api/movies`, newMovie, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('🎉 Movie added successfully!');
      navigate('/admin');
    } catch (err) {
      console.error('Error adding movie:', err.response?.data || err.message);
      toast.error('Failed to add movie');
    }
  };

  const inputClass =
    'bg-gray-800 text-white placeholder-gray-400 rounded px-3 py-2 w-full mb-2 focus:outline-none focus:ring-2 focus:ring-red-500';

  return (
    <div className="p-6 max-w-4xl mx-auto bg-gray-900 text-white rounded-lg shadow-lg">
      <h2 className="text-3xl font-bold mb-6 text-red-500">🎬 Add New Movie</h2>

      {/* TMDB Search */}
      <section className="mb-6 flex gap-2">
        <input
          type="text"
          placeholder="Search TMDB..."
          value={tmdbQuery}
          onChange={e => setTmdbQuery(e.target.value)}
          className={`${inputClass} flex-1`}
        />
        <button
          onClick={handleTmdbSearch}
          disabled={fetching}
          className={`px-4 py-2 rounded text-white font-semibold transition ${
            fetching ? 'bg-gray-500 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'
          }`}
        >
          {fetching ? 'Fetching...' : '🔍 Fetch'}
        </button>
      </section>

      {/* Movie Info */}
      <section className="mb-6 grid gap-2">
        <input type="text" placeholder="Title*" value={title} onChange={e => setTitle(e.target.value)} className={inputClass} />
        <textarea placeholder="Description" value={description} onChange={e => setDescription(e.target.value)} className={inputClass} />
        <input type="text" placeholder="Genre*" value={genre} onChange={e => setGenre(e.target.value)} className={inputClass} />
        <input type="number" placeholder="Rating (0–10)" value={rating} onChange={e => setRating(e.target.value)} className={inputClass} />
        <input type="text" placeholder="Duration" value={duration} onChange={e => setDuration(e.target.value)} className={inputClass} />
        <input type="text" placeholder="Poster URL*" value={posterUrl} onChange={e => setPosterUrl(e.target.value)} className={inputClass} />
        <input type="text" placeholder="Trailer URL" value={trailerUrl} onChange={e => setTrailerUrl(e.target.value)} className={inputClass} />
        <input type="date" value={releaseDate} onChange={e => setReleaseDate(e.target.value)} className={inputClass} />
        <select value={language} onChange={e => setLanguage(e.target.value)} className={inputClass}>
          <option value="">Select Language*</option>
          {supportedLanguages.map(lang => (
            <option key={lang.code} value={lang.code}>{lang.label}</option>
          ))}
        </select>
      </section>

      {/* Cast */}
      <section className="mb-6">
        <h3 className="text-lg font-semibold mb-2">🎭 Cast</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
          <input type="text" placeholder="Name" value={castName} onChange={e => setCastName(e.target.value)} className={inputClass} />
          <input type="text" placeholder="Role" value={castRole} onChange={e => setCastRole(e.target.value)} className={inputClass} />
          <input type="text" placeholder="Photo URL" value={castPhotoUrl} onChange={e => setCastPhotoUrl(e.target.value)} className={inputClass} />
        </div>
        <button onClick={addCastMember} className="mt-2 mb-4 bg-red-600 hover:bg-red-700 px-4 py-2 rounded text-white font-semibold">Add Cast</button>
        {cast.length > 0 ? (
          <ul className="list-disc pl-5 text-sm space-y-3">
            {cast.map((c, i) => (
              <li key={i} className="flex items-center gap-3">
                <div>
                  <p className="font-semibold text-white">{c.name} <span className="text-gray-400">as {c.role}</span></p>
                  {c.photoUrl && <img src={c.photoUrl} alt={c.name} className="mt-1 w-16 h-16 object-cover rounded-full border border-gray-700" />}
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-gray-400">No cast members added yet.</p>
        )}
      </section>

      {/* Theaters */}
      <section className="mb-6">
        <h3 className="text-lg font-semibold mb-2"> Theaters</h3>
        <select multiple onChange={handleTheaterChange} className={`${inputClass} h-40`}>
          {availableTheaters.length > 0 ? (
            availableTheaters.map(t => (
              <option key={t._id} value={t._id}>
                {t.name} ({t.location})
              </option>
            ))
          ) : (
            <option disabled>No theaters available</option>
          )}
        </select>
        {embeddedTheaters.length > 0 && (
          <p className="text-sm mt-2">
            Selected: {embeddedTheaters.length} theater{embeddedTheaters.length > 1 ? 's' : ''}
          </p>
        )}
      </section>

      {/* Submit */}
      <div className="text-center mt-6">
        <button
          onClick={handleSubmit}
          className="bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded font-semibold text-lg transition"
        >
          🚀 Submit Movie
        </button>
      </div>
    </div>
  );
}

export default AddMovie;

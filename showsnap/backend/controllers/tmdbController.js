import axios from 'axios';
import axiosRetry from 'axios-retry';

const supportedLanguages = ['en', 'hi', 'ta', 'te', 'ml', 'mr', 'kn', 'bn', 'gu', 'pa', 'ur'];

// 🔁 Retry setup for transient errors
axiosRetry(axios, {
  retries: 3,
  retryDelay: axiosRetry.exponentialDelay,
  retryCondition: (error) =>
    error.code === 'ECONNRESET' ||
    axiosRetry.isNetworkError(error) ||
    axiosRetry.isRetryableError(error)
});

// 🔍 Search TMDB movies with language fallback
export const searchTmdbMovie = async (req, res) => {
  try {
    const rawQuery = req.query.query;
    const query = rawQuery?.split(':')[0].trim();
    if (!query) return res.status(400).json({ error: 'Missing query parameter' });

    const apiKey = process.env.TMDB_API_KEY;
    if (!apiKey) return res.status(500).json({ error: 'TMDB API key not configured' });

    let results = [];
    let matchedLang = '';

    for (const lang of supportedLanguages) {
      try {
        const tmdbRes = await axios.get('https://api.themoviedb.org/3/search/movie', {
          params: { api_key: apiKey, query, language: lang },
          timeout: 10000
        });

        if (tmdbRes.status === 200 && tmdbRes.data.results?.length > 0) {
          results = tmdbRes.data.results;
          matchedLang = lang;
          break;
        }
      } catch (langErr) {
        console.warn(`TMDB search failed for ${lang}:`, langErr?.code || langErr.message);
      }
    }

    if (!results.length) {
      return res.status(404).json({ error: 'Movie not found in TMDB' });
    }

    console.log(`✅ TMDB match found in language: ${matchedLang}`);
    res.status(200).json({ results });
  } catch (err) {
    console.error('❌ TMDB search error:', {
      message: err.message,
      code: err.code,
      response: err.response?.data
    });
    res.status(500).json({ error: 'Failed to fetch from TMDB' });
  }
};

// 🎬 Fetch TMDB movie details + cast + trailer
export const getTmdbMovieDetails = async (req, res) => {
  try {
    const { id } = req.params;
    const apiKey = process.env.TMDB_API_KEY;
    if (!apiKey) return res.status(500).json({ error: 'TMDB API key not configured' });

    const detailsUrl = `https://api.themoviedb.org/3/movie/${id}`;
    const creditsUrl = `https://api.themoviedb.org/3/movie/${id}/credits`;
    const videosUrl = `https://api.themoviedb.org/3/movie/${id}/videos`;

    const [detailsRes, creditsRes, videosRes] = await Promise.all([
      axios.get(detailsUrl, { params: { api_key: apiKey, language: 'en' }, timeout: 10000 }),
      axios.get(creditsUrl, { params: { api_key: apiKey }, timeout: 10000 }),
      axios.get(videosUrl, { params: { api_key: apiKey, language: 'en' }, timeout: 10000 })
    ]);

    if (!detailsRes?.data || detailsRes.status !== 200) {
      return res.status(404).json({ error: 'Movie not found in TMDB' });
    }

    const details = detailsRes.data;

    const genres = Array.isArray(details.genres)
      ? details.genres.map(g => g.name).filter(Boolean)
      : [];

    const cast = Array.isArray(creditsRes?.data?.cast)
      ? creditsRes.data.cast.slice(0, 10).map(c => ({
          name: c.name || '',
          role: c.character || '',
          photoUrl: c.profile_path ? `https://image.tmdb.org/t/p/w185${c.profile_path}` : ''
        }))
      : [];

    const videos = videosRes?.data?.results || [];
    const trailer =
      videos.find(v => v.type === 'Trailer' && v.site === 'YouTube' && v.official) ||
      videos.find(v => v.type === 'Trailer' && v.site === 'YouTube') ||
      videos.find(v => ['Teaser', 'Clip'].includes(v.type) && v.site === 'YouTube');
    const trailerUrl = trailer?.key
      ? `https://www.youtube.com/watch?v=${trailer.key}`
      : '';

    const releaseDate = /^\d{4}-\d{2}-\d{2}$/.test(details.release_date)
      ? details.release_date
      : '';

    res.status(200).json({
      title: details.title || '',
      description: details.overview || '',
      genre: genres.join(', '),
      rating: details.vote_average || 0,
      duration: `${details.runtime || 0} min`,
      posterUrl: details.poster_path ? `https://image.tmdb.org/t/p/w500${details.poster_path}` : '',
      trailerUrl,
      releaseDate,
      language: supportedLanguages.includes(details.original_language)
        ? details.original_language
        : 'en',
      cast
    });
  } catch (err) {
    console.error('❌ TMDB details fetch error:', {
      message: err.message,
      code: err.code,
      response: err.response?.data
    });
    res.status(500).json({ error: 'Failed to fetch movie details' });
  }
};

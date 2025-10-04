import mongoose from 'mongoose';
import Movie from '../models/Movie.js';
import Theater from '../models/Theater.js';
import logger from '../utils/logger.js';

/**
 * GET /api/movies
 * Fetch all movies with optional filters and pagination
 */
export const getMovies = async (req, res) => {
  try {
    const {
      isUpcoming,
      genre,
      minRating,
      language,
      releasedAfter,
      sortBy,
      title,
      page = 1,
      limit = 20,
    } = req.query;

    const location = req.query.location?.trim();
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const filters = [];

    // 🎯 Release date filters
    if (isUpcoming === 'true') {
      filters.push({ releaseDate: { $gt: today } });
    }
    if (isUpcoming === 'false') {
      filters.push({ releaseDate: { $lte: today } });
    }
    if (releasedAfter && !isNaN(Date.parse(releasedAfter))) {
      filters.push({ releaseDate: { $gte: new Date(releasedAfter) } });
    }

    // 📍 Location filter
    if (location) {
      filters.push({
        'embeddedTheaters.location': {
          $regex: location,
          $options: 'i'
        }
      });
    }

    // 🎬 Genre filter
    if (genre?.trim()) {
      filters.push({
        genre: { $regex: genre.trim(), $options: 'i' }
      });
    }

    // ⭐ Rating filter
    if (minRating && !isNaN(minRating)) {
      filters.push({
        rating: { $gte: parseFloat(minRating) }
      });
    }

    // 🗣️ Language filter
    if (language?.trim()) {
      filters.push({
        language: { $regex: language.trim(), $options: 'i' }
      });
    }

    // 🔃 Sorting
    const sortOptions = {};
    if (sortBy === 'rating') sortOptions.rating = -1;
    if (sortBy === 'releaseDate') sortOptions.releaseDate = -1;

    // 📄 Pagination
    const safeLimit = Math.min(Number(limit), 100);
    const safePage = Math.max(Number(page), 1);

    // 🔍 Use Atlas Search if title is provided
    const pipeline = [];

    if (title?.trim()) {
      pipeline.push({
        $search: {
          index: 'movieSearch',
          text: {
            query: title.trim(),
            path: ['titleEnglish', 'title', 'description'],
            fuzzy: {}
          }
        }
      });
    }

    // 🧩 Apply filters
    if (filters.length > 0) {
      pipeline.push({ $match: { $and: filters } });
    }

    // 🔃 Sorting
    if (Object.keys(sortOptions).length > 0) {
      pipeline.push({ $sort: sortOptions });
    }

    // 📄 Pagination
    pipeline.push({ $skip: (safePage - 1) * safeLimit });
    pipeline.push({ $limit: safeLimit });

    // 🧮 Count total (optional: estimate only)
    const movies = await Movie.aggregate(pipeline);
    const total = title?.trim()
      ? movies.length // fallback if using $search
      : await Movie.countDocuments(filters.length ? { $and: filters } : {});

    res.status(200).json({
      count: movies.length,
      total,
      page: safePage,
      totalPages: Math.ceil(total / safeLimit),
      movies,
    });
  } catch (err) {
    logger.error(`❌ Error fetching movies: ${err.message}`);
    res.status(500).json({ error: 'Server error while fetching movies' });
  }
};

/**
 * GET /api/movies/:id
 * Fetch a single movie by ID with embedded theater data
 */
export const getMovieById = async (req, res) => {
  const { id } = req.params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ error: 'Invalid movie ID' });
  }

  try {
    const movie = await Movie.findById(id).lean();
    if (!movie) {
      return res.status(404).json({ error: 'Movie not found' });
    }

    const embedded = Array.isArray(movie.embeddedTheaters) ? movie.embeddedTheaters : [];

    embedded.forEach((t) => {
      if (Array.isArray(t.showtimes)) {
        t.showtimes = t.showtimes.map((s) => ({
          ...s,
          startTime: new Date(s.startTime).toISOString()
        }));
      }
    });

    movie.releaseDate = movie.releaseDate
      ? new Date(movie.releaseDate).toISOString()
      : null;

    res.status(200).json({
      ...movie,
      theaters: embedded
    });
  } catch (err) {
    logger.error(`❌ Error fetching movie by ID: ${err.message}`);
    res.status(500).json({ error: 'Server error while fetching movie' });
  }
};

/**
 * GET /api/movies/genres
 * Get all unique genres for filtering UI
 */
export const getAllGenres = async (req, res) => {
  try {
    const genres = (await Movie.distinct('genre')).filter(g => g?.trim());
    res.status(200).json({ genres });
  } catch (err) {
    logger.error(`❌ Error fetching genres: ${err.message}`);
    res.status(500).json({ error: 'Server error while fetching genres' });
  }
};

/**
 * POST /api/movies
 * Create a new movie with embedded theaters
 */
export const createMovie = async (req, res) => {
  try {
    const newMovie = new Movie(req.body); // includes embeddedTheaters
    const savedMovie = await newMovie.save();
    res.status(201).json(savedMovie);
  } catch (err) {
    logger.error(`❌ Error creating movie: ${err.message}`);
    res.status(400).json({ error: 'Failed to create movie', details: err.message });
  }
};

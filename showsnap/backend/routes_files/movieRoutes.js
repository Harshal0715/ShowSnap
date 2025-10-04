import express from 'express';
import {
  getMovies,
  getMovieById,
  getAllGenres,
  createMovie
} from '../controllers/movieController.js';

const router = express.Router();

// 🎬 Fetch all movies with filters, pagination, and sorting
router.get('/movies', getMovies);

// 🎥 Fetch a single movie by ID with populated theaters
router.get('/movies/:id', getMovieById);

// 🎭 Get all unique genres for filtering UI
router.get('/movies/genres', getAllGenres);

router.post('/movies', createMovie);

export default router;

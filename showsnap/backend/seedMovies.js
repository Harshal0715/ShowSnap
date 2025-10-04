import mongoose from 'mongoose';
import dotenv from 'dotenv';
import axios from 'axios';
import Movie from './models/Movie.js';
import Theater from './models/Theater.js';

dotenv.config();
const { TMDB_API_KEY, MONGO_URI } = process.env;

const movieTitlesToSeed = [
  'Oppenheimer', 'Barbie', 'Jawan', 'Guardians of the Galaxy Vol. 3',
  'Spider-Man: Across the Spider-Verse', 'Avatar: Fire and Ash',
  'The Conjuring: Last Rites', 'Demon Slayer: Kimetsu no Yaiba Infinity Castle',
  'F1', 'Final Destination Bloodlines', 'Harry Potter and the Prisoner of Azkaban',
  'Harry Potter and the Goblet of Fire', 'Avengers: Doomsday', 'The Batman Beyond',
  'Dashavatar'
];

const supportedTmdbLanguages = ['en-US', 'hi-IN', 'mr-IN', 'ta-IN', 'te-IN', 'ml-IN', 'kn-IN', 'bn-IN', 'gu-IN', 'pa-IN', 'ur-PK'];
const backendSupportedLanguages = ['en', 'hi', 'ta', 'te', 'ml', 'kn', 'bn', 'mr', 'gu', 'pa', 'ur'];

const seatRows = ['A', 'B', 'C', 'D'];
const seatCols = [1, 2, 3, 4, 5, 6];
const allSeats = seatRows.flatMap(row => seatCols.map(col => `${row}${col}`));

function generateBlockedSeats() {
  const total = Math.floor(Math.random() * 10);
  const shuffled = [...allSeats].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, total);
}

const fetchWithRetry = async (url, retries = 5, delay = 2000) => {
  for (let i = 0; i < retries; i++) {
    try {
      const { data } = await axios.get(url, { timeout: 7000 });
      return data;
    } catch (err) {
      console.error(`❌ TMDB fetch failed [${url}]:`, err.message);
      if (err.response?.status === 404) return null;
      if (i === retries - 1) return null;
      await new Promise(res => setTimeout(res, delay * (i + 1)));
    }
  }
};

async function fetchGenres() {
  const url = `https://api.themoviedb.org/3/genre/movie/list?api_key=${TMDB_API_KEY}&language=en-US`;
  const data = await fetchWithRetry(url);
  return data?.genres || [];
}

async function ensureTheater(name, location) {
  const update = {
    $set: {
      location,
      showtimes: [],
      movieTitles: [],
      status: 'Active'
    }
  };
  const options = { upsert: true, new: true };
  const theater = await Theater.findOneAndUpdate({ name }, update, options);
  return theater;
}

async function searchMovieInLanguages(title) {
  for (const lang of supportedTmdbLanguages) {
    const url = `https://api.themoviedb.org/3/search/movie?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(title)}&language=${lang}`;
    const data = await fetchWithRetry(url);
    const result = data?.results?.[0];
    if (result) {
      const languageCode = lang.split('-')[0];
      if (backendSupportedLanguages.includes(languageCode)) {
        return { result, language: languageCode };
      }
    }
  }
  return null;
}

async function fetchMovieData(title, genreList) {
  const searchResult = await searchMovieInLanguages(title);
  if (!searchResult) {
    console.warn(`⚠️ TMDB search failed for: ${title}`);
    return null;
  }

  const { result, language } = searchResult;
  const movieId = result.id;

  const videoData = await fetchWithRetry(`https://api.themoviedb.org/3/movie/${movieId}/videos?api_key=${TMDB_API_KEY}`);
  const trailer = videoData?.results?.find(v => (v.type === 'Trailer' || v.type === 'Teaser') && v.site === 'YouTube');
  const trailerUrl = trailer ? `https://www.youtube.com/watch?v=${trailer.key}` : '';

  const creditsData = await fetchWithRetry(`https://api.themoviedb.org/3/movie/${movieId}/credits?api_key=${TMDB_API_KEY}`);
  const cast = creditsData?.cast?.slice(0, 10).map(actor => ({
    name: actor.name,
    role: actor.character,
    photoUrl: actor.profile_path ? `https://image.tmdb.org/t/p/w185${actor.profile_path}` : ''
  })) || [];

  const detailsData = await fetchWithRetry(`https://api.themoviedb.org/3/movie/${movieId}?api_key=${TMDB_API_KEY}`);
  const duration = detailsData?.runtime ? `${detailsData.runtime} min` : 'N/A';
  const releaseDate = detailsData?.release_date ? new Date(detailsData.release_date) : new Date();
  const genreNames = result.genre_ids?.map(id => genreList.find(g => g.id === id)?.name).filter(Boolean).join(', ') || 'N/A';
  const status = releaseDate > new Date() ? 'Coming Soon' : 'Now Showing';

  return {
    title: result.title,
    description: result.overview || 'No description available.',
    genre: genreNames,
    rating: result.vote_average || 0,
    duration,
    posterUrl: result.poster_path ? `https://image.tmdb.org/t/p/w500${result.poster_path}` : '',
    trailerUrl,
    releaseDate,
    language,
    tags: [],
    isFeatured: false,
    status,
    cast,
    theaters: [],
    embeddedTheaters: []
  };
}

async function seedMovies() {
  try {
    await mongoose.connect(MONGO_URI, { dbName: 'showsnap' });
    console.log('✅ Connected to MongoDB');

    await Movie.deleteMany();
    await Theater.updateMany({}, { $set: { movieTitles: [], showtimes: [] } });
    console.log('🧹 Cleared existing movies and reset theater movie titles/showtimes');

    const genreList = await fetchGenres();
    const moviesToInsert = [];

    for (const title of movieTitlesToSeed) {
      try {
        const movieData = await fetchMovieData(title, genreList);
        if (!movieData) {
          console.warn(`⚠️ Skipped: ${title} — no data`);
          continue;
        }
        moviesToInsert.push(movieData);
      } catch (err) {
        console.error(`❌ Failed to fetch ${title}:`, err.message);
      }
    }

    // Optional manual fallback for Dashavatar
    if (!moviesToInsert.find(m => m.title === 'Dashavatar')) {
      moviesToInsert.push({
        title: 'Dashavatar',
        description: 'A Marathi mythological epic.',
        genre: 'Mythology',
        rating: 8.2,
        duration: '150 min',
        posterUrl: 'https://yourcdn.com/dashavatar.jpg',
        trailerUrl: 'https://www.youtube.com/watch?v=yourTrailerId',
        releaseDate: new Date('2025-09-25'),
        language: 'mr',
        tags: ['Marathi', 'Epic'],
        isFeatured: true,
        status: 'Now Showing',
        cast: [],
        theaters: [],
        embeddedTheaters: []
      });
    }

    console.log(`✅ Movies prepared for insertion: ${moviesToInsert.length}`);
    const insertedMovies = await Movie.insertMany(moviesToInsert);
    console.log(`🎉 Seeded ${insertedMovies.length} movies successfully`);

    const theaterList = [
       // Mumbai
  { name: 'PVR Phoenix Kurla', location: 'Mumbai' },
  { name: 'INOX R City', location: 'Ghatkopar, Mumbai' },
  { name: 'NY Cinemas Mulund', location: 'Mulund, Mumbai' },
  { name: 'R Mall Mulund', location: 'Mulund, Mumbai' },

  // Thane
  { name: 'Cinépolis - Korum Mall', location: 'Thane' },
  { name: 'INOX - Viviana Mall', location: 'Thane' },
  { name: 'PVR - Lake City Mall', location: 'Thane' },

  // Navi Mumbai
  { name: 'INOX - Raghuleela Mall', location: 'Navi Mumbai' },
  { name: 'Cinépolis - Nexus Seawoods Mall', location: 'Navi Mumbai' },
  { name: 'Miraj Cinemas - Panvel', location: 'Navi Mumbai' },
  { name: 'PVR - Orion Mall', location: 'Navi Mumbai' }
];
    const times = ['10:00', '13:30', '17:00', '21:30'];
    const today = new Date();
    const dateStr = today.toISOString().split('T')[0];

    for (const movie of insertedMovies) {
      const updatedTheaters = [];
      const embedded = [];

      for (const { name, location } of theaterList) {
        const theater = await ensureTheater(name, location);

        const showtimes = times.map(time => ({
          startTime: new Date(`${dateStr}T${time}:00`),
          screen: 'Screen 1',
          availableSeats: 100,
          blockedSeats: generateBlockedSeats(),
          movie: movie._id
        }));

                await Theater.updateOne(
          { _id: theater._id },
          {
            $push: { showtimes: { $each: showtimes } },
            $addToSet: { movieTitles: movie.title }
          }
        );

        updatedTheaters.push(theater._id);
        embedded.push({
          name: theater.name,
          location: theater.location,
          showtimes
        });
      }

      await Movie.findByIdAndUpdate(movie._id, {
        $set: {
          theaters: updatedTheaters,
          embeddedTheaters: embedded
        }
      });
    }

    console.log('✅ Finished linking movies & theaters with showtimes');
  } catch (err) {
    console.error('❌ Movie seeding failed:', err.message);
  } finally {
    await mongoose.connection.close();
    console.log('🔌 MongoDB connection closed');
  }
}

seedMovies();

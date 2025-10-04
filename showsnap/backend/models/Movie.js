import mongoose from 'mongoose';

// 🎭 Cast member schema
const castSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Cast member name is required'],
      trim: true
    },
    role: {
      type: String,
      trim: true,
      default: 'Actor'
    },
    photoUrl: {
      type: String,
      trim: true,
      match: [/^https?:\/\/.+\.(jpg|jpeg|png|webp)$/, 'Invalid photo URL'],
      default: ''
    }
  },
  { _id: false }
);

// 🕒 Showtime schema (embedded inside each theater)
const showtimeSchema = new mongoose.Schema(
  {
    startTime: {
      type: Date,
      required: true
    },
    screen: {
      type: String,
      trim: true,
      default: 'Screen 1'
    },
    availableSeats: {
      type: Number,
      default: 100,
      min: 0
    },
    blockedSeats: {
      type: [String],
      default: []
    },
    movie: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Movie'
    }
  },
  { _id: false }
);

// 🎟️ Embedded theater schema (for frontend rendering)
const embeddedTheaterSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Theater name is required'],
      trim: true
    },
    location: {
      type: String,
      required: [true, 'Theater location is required'],
      trim: true
    },
    showtimes: {
      type: [showtimeSchema],
      default: []
    }
  },
  { _id: false }
);

// 🎬 Movie schema
const movieSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Movie title is required'],
      trim: true
    },
    description: {
      type: String,
      trim: true,
      default: 'No description available.'
    },
    genre: {
      type: String,
      required: [true, 'Genre is required'],
      trim: true
    },
    rating: {
      type: Number,
      min: 0,
      max: 10,
      default: 0
    },
    duration: {
      type: String,
      trim: true,
      default: 'N/A'
    },
    posterUrl: {
      type: String,
      trim: true,
      match: [/^https?:\/\/.+\.(jpg|jpeg|png|webp)$/, 'Invalid poster URL']
    },
    trailerUrl: {
      type: String,
      trim: true,
      match: [/^https?:\/\/.+/, 'Invalid trailer URL'],
      default: ''
    },
    releaseDate: {
      type: Date,
      required: [true, 'Release date is required'],
      validate: {
        validator: date => date instanceof Date && !isNaN(date),
        message: 'Release date must be a valid date'
      }
    },
    language: {
      type: String,
      required: [true, 'Language is required'],
      trim: true,
      enum: ['en', 'hi', 'ta', 'te', 'ml', 'mr', 'kn', 'bn', 'gu', 'pa', 'ur'],
      message: 'Language code "{VALUE}" is not supported.'
    },
    tags: {
      type: [String],
      default: []
    },
    isFeatured: {
      type: Boolean,
      default: false
    },
    status: {
      type: String,
      enum: ['Now Showing', 'Coming Soon'],
      default: 'Now Showing'
    },
    cast: {
      type: [castSchema],
      default: []
    },
    // ❌ Removed referenced theaters to avoid CastError
    // theaters: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Theater' }],
    embeddedTheaters: {
      type: [embeddedTheaterSchema],
      default: []
    }
  },
  {
    timestamps: true,
    versionKey: false
  }
);

// 🔍 Indexes for performance and multilingual search
movieSchema.index({ genre: 1 });
movieSchema.index({ language: 1 });
movieSchema.index({ releaseDate: -1 });
movieSchema.index({ isFeatured: 1 });
movieSchema.index({ status: 1 });
//movieSchema.index(
  //{ title: 'text', description: 'text', genre: 'text', tags: 'text' },
  //{
    //default_language: 'none',
    //language_override: 'langOverride'
  //}
//);

// 🧼 Normalize title before saving
movieSchema.pre('save', function (next) {
  if (this.title) this.title = this.title.trim();
  next();
});

export default mongoose.model('Movie', movieSchema, 'movies');

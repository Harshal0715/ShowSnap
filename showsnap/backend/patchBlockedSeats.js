import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();
await mongoose.connect(process.env.MONGO_URI, { dbName: 'showsnap' });

const seatRows = ['A', 'B', 'C', 'D'];
const seatCols = [1, 2, 3, 4, 5, 6];
const allSeats = seatRows.flatMap(row => seatCols.map(col => `${row}${col}`));

function generateBlockedSeats() {
  const total = Math.floor(Math.random() * 10); // block 0–10 seats
  const shuffled = [...allSeats].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, total);
}

const Movie = mongoose.connection.collection('movies');

const movies = await Movie.find({}).toArray();

for (const movie of movies) {
  const updatedEmbedded = (movie.embeddedTheaters || []).map(theater => ({
    ...theater,
    showtimes: (theater.showtimes || []).map(showtime => ({
      ...showtime,
      blockedSeats: generateBlockedSeats()
    }))
  }));

  await Movie.updateOne(
    { _id: movie._id },
    { $set: { embeddedTheaters: updatedEmbedded } }
  );

  console.log(`✅ Patched: ${movie.title}`);
}

await mongoose.connection.close();
console.log('🔌 MongoDB connection closed');

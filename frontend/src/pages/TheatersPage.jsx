import React, { useEffect, useState } from 'react';

function TheatersPage() {
  const [theaters, setTheaters] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTheaters = async () => {
      try {
        const res = await fetch('https://showsnap-backend-ioiz.onrender.com/api/theaters');
        const data = await res.json();

        // Ensure we have a valid array
        const validData = Array.isArray(data) ? data : data.theaters || [];
        setTheaters(validData);
      } catch (err) {
        console.error('❌ Error fetching theaters:', err);
        setError('Failed to load theaters.');
      } finally {
        setLoading(false);
      }
    };

    fetchTheaters();
  }, []);

  if (loading) {
    return (
      <div className="p-6 text-center text-gray-600 animate-pulse text-lg">
        Loading theaters...
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 text-center text-red-500 font-medium" role="alert">
        {error}
      </div>
    );
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <h2 className="text-3xl font-bold mb-6 text-center text-indigo-600">🎭 Browse Theaters</h2>

      {theaters.length === 0 ? (
        <p className="text-center text-gray-500 text-lg">No theaters available at the moment.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {theaters.map((theater, idx) => (
            <div key={idx} className="bg-gray-100 p-5 rounded-xl shadow hover:shadow-lg transition duration-300 text-black">
              <h3 className="text-xl font-semibold text-indigo-700 mb-1">{theater.name}</h3>
              <p className="text-gray-700 mb-2">{theater.location}</p>
              <p className="text-sm text-gray-500">
                🎬 Showing: {Array.isArray(theater.movieTitles) && theater.movieTitles.length > 0
                  ? theater.movieTitles.join(', ')
                  : 'No movies listed'}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default TheatersPage;

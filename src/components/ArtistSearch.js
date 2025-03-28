import React, { useState, useEffect } from 'react';
import spotifyApi from '../services/spotify';
import '../styles/ArtistSearch.css';

function ArtistSearch({ onArtistSelect, setIsLoading }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [recentArtists, setRecentArtists] = useState([]);

  // Load recent artists from localStorage on component mount
  useEffect(() => {
    const storedArtists = localStorage.getItem('recentArtists');
    if (storedArtists) {
      try {
        setRecentArtists(JSON.parse(storedArtists));
      } catch (error) {
        console.error('Error parsing recent artists from localStorage:', error);
        // If there's an error, clear the localStorage item
        localStorage.removeItem('recentArtists');
      }
    }
  }, []);

  // Save an artist to recent artists
  const saveToRecentArtists = (artist) => {
    // Create a simplified version of the artist object to store
    const artistToSave = {
      id: artist.id,
      name: artist.name,
      imageUrl: artist.images && artist.images[0] ? artist.images[0].url : null
    };

    // Add to recent artists, avoiding duplicates and keeping only the most recent 8
    setRecentArtists(prevArtists => {
      // Remove the artist if it already exists
      const filteredArtists = prevArtists.filter(a => a.id !== artistToSave.id);
      
      // Add the new artist to the beginning
      const updatedArtists = [artistToSave, ...filteredArtists].slice(0, 8);
      
      // Save to localStorage
      localStorage.setItem('recentArtists', JSON.stringify(updatedArtists));
      
      return updatedArtists;
    });
  };

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!searchTerm) return;

    setIsSearching(true);
    setHasSearched(true);

    try {
      const data = await spotifyApi.searchArtists(searchTerm);
      setSearchResults(data.artists.items);
    } catch (error) {
      console.error('Error searching artists:', error);
      alert('Error searching for artists. Please try again.');
    } finally {
      setIsSearching(false);
    }
  };

  const fetchArtistSongs = async (artist) => {
    setIsLoading(true);
    console.log("Loading songs for artist:", artist.name);
    
    try {
      // First try to get top tracks
      const topTracksResponse = await spotifyApi.getArtistTopTracks(artist.id, 'US');
      console.log("Raw top tracks response:", topTracksResponse);
      
      let allTracks = [];
      
      // If we have top tracks, use them
      if (topTracksResponse.tracks && topTracksResponse.tracks.length > 0) {
        const firstTrack = topTracksResponse.tracks[0];
        console.log("First track sample:", firstTrack);
        
        // Add top tracks to our collection
        allTracks = [...topTracksResponse.tracks];
      }
      
      // Regardless of whether we got top tracks, fetch albums to get more songs
      console.log("Fetching albums to get more tracks...");
      const albumsResponse = await spotifyApi.getArtistAlbums(artist.id, { 
        limit: 50,
        include_groups: 'album,single' // Include both albums and singles
      });
      console.log("Found", albumsResponse.items.length, "albums");
      
      // Get tracks from albums (up to 10 albums to avoid rate limiting)
      const albumsToFetch = albumsResponse.items.slice(0, 10);
      
      // Create a map of album data for quick lookup
      const albumDataMap = {};
      
      // Process each album
      for (const album of albumsToFetch) {
        // Store album data for later use
        albumDataMap[album.id] = {
          name: album.name,
          images: album.images,
          release_date: album.release_date
        };
        
        const tracksResponse = await spotifyApi.getAlbumTracks(album.id, { limit: 50 });
        
        // Ensure each track has complete album data
        const tracksWithAlbumData = tracksResponse.items.map(track => ({
          ...track,
          album: {
            id: album.id,
            name: album.name,
            images: album.images,
            release_date: album.release_date
          }
        }));
        
        allTracks = [...allTracks, ...tracksWithAlbumData];
      }
      
      console.log("Found", allTracks.length, "total tracks from all sources");
      
      // Filter out duplicates by name (keep the first occurrence)
      const uniqueTracks = [];
      const trackNames = new Set();
      
      for (const track of allTracks) {
        if (!trackNames.has(track.name.toLowerCase())) {
          // Ensure the track has album data with images
          if (!track.album || !track.album.images || track.album.images.length === 0) {
            // If album data is missing, try to find it in our map
            if (track.album && track.album.id && albumDataMap[track.album.id]) {
              track.album = {
                ...track.album,
                ...albumDataMap[track.album.id]
              };
            } else {
              // If we still don't have album data, use a placeholder
              track.album = {
                id: track.album?.id || 'unknown',
                name: track.album?.name || 'Unknown Album',
                images: [{ url: '/placeholder.png' }],
                release_date: track.album?.release_date || 'Unknown'
              };
            }
          }
          
          trackNames.add(track.name.toLowerCase());
          uniqueTracks.push(track);
        }
      }
      
      console.log("After filtering:", uniqueTracks.length, "unique tracks");
      
      // Randomize the tracks
      const randomizedTracks = [...uniqueTracks].sort(() => Math.random() - 0.5);
      
      // If we have enough tracks, proceed with the quiz
      if (randomizedTracks.length >= 5) {
        // Save this artist to recent artists
        saveToRecentArtists(artist);
        
        console.log("Artist selected in Dashboard:", artist.name);
        onArtistSelect(artist, randomizedTracks);
      } else {
        // Not enough tracks for a meaningful quiz
        alert(`Not enough songs found for ${artist.name}. Please select another artist.`);
      }
    } catch (error) {
      console.error("Error fetching artist songs:", error);
      alert(`Error loading songs for ${artist.name}. Please try again or select another artist.`);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle recent artist selection
  const handleRecentArtistClick = async (artist) => {
    // For recent artists, we need to fetch the full artist data first
    setIsLoading(true);
    
    try {
      const fullArtist = await spotifyApi.getArtist(artist.id);
      await fetchArtistSongs(fullArtist);
    } catch (error) {
      console.error("Error fetching recent artist:", error);
      alert(`Error loading artist data. Please try searching for the artist instead.`);
      setIsLoading(false);
    }
  };

  // Add a function to clear recent artists
  const clearRecentArtists = () => {
    // Show a confirmation dialog
    if (window.confirm('Are you sure you want to clear your recent artists history?')) {
      // Clear the state
      setRecentArtists([]);
      
      // Clear localStorage
      localStorage.removeItem('recentArtists');
    }
  };

  return (
    <div className="artist-search">
      <h2>Search for an Artist</h2>
      
      {!hasSearched && (
        <div className="welcome-message">
          <h3>Welcome to Spotify Song Quiz!</h3>
          <p>
            Test your knowledge of your favorite artists' songs. 
            Search for an artist or select from your recent quizzes below.
          </p>
        </div>
      )}
      
      <form onSubmit={handleSearch}>
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Enter artist name..."
        />
        <button type="submit">Search</button>
      </form>

      {isSearching ? (
        <div className="search-results">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <div key={i} className="artist-card-skeleton"></div>
          ))}
        </div>
      ) : searchResults.length > 0 ? (
        <div className="search-results">
          {searchResults.map(artist => (
            <div 
              key={artist.id} 
              className="artist-card"
              onClick={() => fetchArtistSongs(artist)}
            >
              <img 
                src={artist.images[0]?.url || '/placeholder.png'} 
                alt={artist.name} 
              />
              <h3>{artist.name}</h3>
              <p>{artist.followers.total.toLocaleString()} followers</p>
            </div>
          ))}
        </div>
      ) : hasSearched ? (
        <div className="no-results">
          <p>No artists found matching "{searchTerm}"</p>
          <div className="search-tips">
            <h3>Search Tips</h3>
            <ul>
              <li>Check the spelling of the artist's name</li>
              <li>Try using fewer words</li>
              <li>Try searching for a related artist</li>
            </ul>
          </div>
        </div>
      ) : recentArtists.length > 0 ? (
        <div className="recent-artists">
          <div className="recent-artists-header">
            <h3>Your Recent Artists</h3>
            <button 
              className="clear-history-button"
              onClick={clearRecentArtists}
              title="Clear history"
            >
              Clear History
            </button>
          </div>
          <div className="recent-artists-grid">
            {recentArtists.map(artist => (
              <div 
                key={artist.id} 
                className="recent-artist-item"
                onClick={() => handleRecentArtistClick(artist)}
              >
                <img 
                  src={artist.imageUrl || '/placeholder.png'} 
                  alt={artist.name}
                />
                <p>{artist.name}</p>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="no-recent-artists">
          <p>You haven't taken any quizzes yet. Search for an artist to get started!</p>
        </div>
      )}
    </div>
  );
}

export default ArtistSearch; 
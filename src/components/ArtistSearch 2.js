import React, { useState } from 'react';
import spotifyApi from '../services/spotify';
import '../styles/ArtistSearch.css';

function ArtistSearch({ onArtistSelect, setIsLoading }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState([]);

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!searchTerm) return;

    try {
      const data = await spotifyApi.searchArtists(searchTerm);
      setSearchResults(data.artists.items);
    } catch (error) {
      console.error('Error searching artists:', error);
    }
  };

  const loadArtistSongs = async (artist) => {
    setIsLoading(true);
    try {
      // Get all albums by the artist
      const albums = await getAllArtistAlbums(artist.id);
      
      // Get all tracks from those albums
      const allTracks = await getAllTracksFromAlbums(albums);
      
      // Filter out duplicates by name (keeping only unique songs)
      const uniqueTracks = filterUniqueTracks(allTracks);
      
      onArtistSelect(artist, uniqueTracks);
    } catch (error) {
      console.error('Error loading artist songs:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getAllArtistAlbums = async (artistId) => {
    let albums = [];
    let offset = 0;
    const limit = 50;
    let hasMore = true;

    while (hasMore) {
      const response = await spotifyApi.getArtistAlbums(artistId, { 
        limit: limit, 
        offset: offset,
        include_groups: 'album,single'
      });
      
      albums = [...albums, ...response.items];
      offset += limit;
      hasMore = response.items.length === limit;
    }

    return albums;
  };

  const getAllTracksFromAlbums = async (albums) => {
    const allTracks = [];
    
    for (const album of albums) {
      const tracks = await spotifyApi.getAlbumTracks(album.id);
      
      // Add album info to each track
      const tracksWithAlbumInfo = tracks.items.map(track => ({
        ...track,
        album: {
          id: album.id,
          name: album.name,
          images: album.images
        }
      }));
      
      allTracks.push(...tracksWithAlbumInfo);
    }
    
    return allTracks;
  };

  const filterUniqueTracks = (tracks) => {
    const uniqueTracks = [];
    const trackNames = new Set();
    
    for (const track of tracks) {
      // Normalize track name for comparison
      const normalizedName = track.name.toLowerCase().trim();
      
      if (!trackNames.has(normalizedName)) {
        trackNames.add(normalizedName);
        uniqueTracks.push(track);
      }
    }
    
    return uniqueTracks;
  };

  return (
    <div className="artist-search">
      <h2>Search for an Artist</h2>
      <form onSubmit={handleSearch}>
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Enter artist name..."
        />
        <button type="submit">Search</button>
      </form>

      <div className="search-results">
        {searchResults.map(artist => (
          <div 
            key={artist.id} 
            className="artist-card"
            onClick={() => loadArtistSongs(artist)}
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
    </div>
  );
}

export default ArtistSearch; 
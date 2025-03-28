import React, { useState } from 'react';
import '../styles/Dashboard.css';
import ArtistSearch from './ArtistSearch';
import Quiz from './Quiz';

function Dashboard({ user }) {
  const [selectedArtist, setSelectedArtist] = useState(null);
  const [artistSongs, setArtistSongs] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  const handleArtistSelect = (artist, songs) => {
    setSelectedArtist(artist);
    setArtistSongs(songs);
  };

  const handleBackToSearch = () => {
    setSelectedArtist(null);
    setArtistSongs([]);
  };

  return (
    <div className="dashboard">
      <header className="dashboard-header">
        <h1>Spotify Artist Song Quiz</h1>
        <div className="user-info">
          <img src={user?.images[0]?.url} alt={user?.display_name} />
          <span>{user?.display_name}</span>
        </div>
      </header>

      <main className="dashboard-content">
        {!selectedArtist ? (
          <ArtistSearch 
            onArtistSelect={handleArtistSelect} 
            setIsLoading={setIsLoading} 
          />
        ) : (
          <Quiz 
            artist={selectedArtist} 
            songs={artistSongs} 
            onBackToSearch={handleBackToSearch} 
          />
        )}
      </main>

      {isLoading && (
        <div className="loading-overlay">
          <div className="loading-spinner"></div>
          <p>Loading artist songs...</p>
        </div>
      )}
    </div>
  );
}

export default Dashboard; 
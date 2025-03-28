import React, { useState, useEffect } from 'react';
import '../styles/Dashboard.css';
import ArtistSearch from './ArtistSearch';
import Quiz from './Quiz';

function Dashboard({ user, token }) {
  const [selectedArtist, setSelectedArtist] = useState(null);
  const [artistSongs, setArtistSongs] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [quizReady, setQuizReady] = useState(false);

  // Only start the quiz when both artist and songs are ready
  useEffect(() => {
    if (selectedArtist && artistSongs.length > 0) {
      // Add a small delay to ensure everything is properly set up
      const timer = setTimeout(() => {
        setQuizReady(true);
      }, 500);
      
      return () => clearTimeout(timer);
    }
  }, [selectedArtist, artistSongs]);

  const handleArtistSelect = (artist, songs) => {
    setSelectedArtist(artist);
    setArtistSongs(songs);
    setIsLoading(false);
    setQuizReady(true);
    console.log("Songs received in Dashboard:", songs.length);
    console.log("First few songs:", songs.slice(0, 3));
  };

  const handleBackToSearch = () => {
    setSelectedArtist(null);
    setArtistSongs([]);
    setQuizReady(false);
  };

  const HowToPlay = () => {
    return (
      <div className="how-to-play-container">
        <div className="how-to-play-trigger">
          <span className="how-to-play-icon">ⓘ</span>
          <span className="how-to-play-text">How to Play</span>
        </div>
        
        <div className="how-to-play-content">
          <h3>Getting Started</h3>
          <div className="setup-steps">
            <div className="setup-step">
              <div className="step-number">1</div>
              <div className="step-content">
                <h4>Open Spotify</h4>
                <p>Open the Spotify app on your computer or another device. This is how the quiz will play music.</p>
                <div className="step-tip">
                  <span className="tip-icon">💡</span>
                  <span>For the best experience, open Spotify in a separate window on your desktop.</span>
                </div>
              </div>
            </div>
            
            <div className="setup-step">
              <div className="step-number">2</div>
              <div className="step-content">
                <h4>Search for an Artist</h4>
                <p>Use the search bar to find your favorite artist.</p>
              </div>
            </div>
            
            <div className="setup-step">
              <div className="step-number">3</div>
              <div className="step-content">
                <h4>Start the Quiz</h4>
                <p>Select an artist and customize your quiz settings before starting.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
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
        <HowToPlay />
        {!selectedArtist || !quizReady ? (
          <ArtistSearch 
            onArtistSelect={handleArtistSelect} 
            setIsLoading={setIsLoading} 
          />
        ) : (
          <Quiz 
            artist={selectedArtist} 
            songs={artistSongs} 
            onBackToSearch={handleBackToSearch}
            token={token}
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
import React, { useState, useEffect, useRef } from 'react';
import '../styles/Quiz.css';
import SpotifyPlayer from './SpotifyPlayer';

function Quiz({ artist, songs, onBackToSearch, token }) {
  // Basic state
  const [quizStarted, setQuizStarted] = useState(false);
  const [currentSongIndex, setCurrentSongIndex] = useState(0);
  const [shuffledSongs, setShuffledSongs] = useState([]);
  const [options, setOptions] = useState([]);
  const [score, setScore] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  
  // Game state
  const [userGuess, setUserGuess] = useState('');
  const [guessResult, setGuessResult] = useState(null);
  const [showHint, setShowHint] = useState(false);
  const [gameMode, setGameMode] = useState('multiple-choice');
  const [isPlaying, setIsPlaying] = useState(false);
  const [playerReady, setPlayerReady] = useState(false);
  const [playerError, setPlayerError] = useState(null);
  
  // Add a state for tracking playback issues
  const [playbackIssue, setPlaybackIssue] = useState(false);
  
  // Add a loading state for the play button
  const [isLoadingPlayback, setIsLoadingPlayback] = useState(false);
  
  // Add a state for tracking when songs are loading
  const [isSongLoading, setIsSongLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('');
  
  // Add a state for fallback mode
  const [fallbackMode, setFallbackMode] = useState(false);
  
  // Add this state variable at the top of the Quiz component
  const [quizLength, setQuizLength] = useState(10); // Default to 10 songs
  const [showSettings, setShowSettings] = useState(false);
  
  // Add these state variables to the Quiz component
  const [quizTime, setQuizTime] = useState(0);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [bestTime, setBestTime] = useState(null);
  const timerRef = useRef(null);
  
  // Initialize the quiz with songs
  useEffect(() => {
    const initializeQuiz = () => {
      // Shuffle the songs
      const shuffled = [...songs].sort(() => Math.random() - 0.5);
      // Only use the number of songs specified by quizLength
      setShuffledSongs(shuffled.slice(0, quizLength));
      setIsLoading(false);
    };
    
    initializeQuiz();
  }, [songs, quizLength]); // Add quizLength as a dependency

  // Modify the useEffect that loads the best time to clear it when quizLength changes
  useEffect(() => {
    // Load best times from localStorage
    const storedBestTimes = localStorage.getItem('artistBestTimes');
    if (storedBestTimes) {
      try {
        const bestTimes = JSON.parse(storedBestTimes);
        // Only set the best time if it exists for this artist and quiz length
        if (bestTimes[artist.id] && bestTimes[artist.id][quizLength]) {
          setBestTime(bestTimes[artist.id][quizLength]);
        } else {
          // Clear the best time if there's no record for this quiz length
          setBestTime(null);
        }
      } catch (error) {
        console.error('Error parsing best times from localStorage:', error);
        setBestTime(null);
      }
    } else {
      setBestTime(null);
    }
  }, [artist.id, quizLength]);

  // Add this effect to handle the timer
  useEffect(() => {
    if (isTimerRunning) {
      timerRef.current = setInterval(() => {
        setQuizTime(prevTime => prevTime + 1);
      }, 1000);
    } else if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [isTimerRunning]);

  // Start the quiz
  const startQuiz = () => {
    setQuizStarted(true);
    setCurrentSongIndex(0);
    setScore(0);
    setQuizTime(0);
    
    // Generate options for the first song
    const options = generateOptions(shuffledSongs[0]);
    setOptions(options);
    
    // Timer will start when the first song starts playing
  };

  // Generate multiple choice options for the current song
  const generateOptions = (currentSong) => {
    if (!currentSong || shuffledSongs.length === 0) return [];
    
    let allOptions = [];
    
    if (shuffledSongs.length < 4) {
      // If we have fewer than 4 songs, use all available songs
      allOptions = [...shuffledSongs];
    } else {
      // Get 3 random wrong options
      const wrongOptions = [];
      const availableSongs = shuffledSongs.filter(song => song.id !== currentSong.id);
      
      while (wrongOptions.length < 3 && availableSongs.length > 0) {
        const randomIndex = Math.floor(Math.random() * availableSongs.length);
        wrongOptions.push(availableSongs[randomIndex]);
        availableSongs.splice(randomIndex, 1);
      }
      
      // Combine correct and wrong options
      allOptions = [currentSong, ...wrongOptions];
    }
    
    // Shuffle the options
    return [...allOptions].sort(() => Math.random() - 0.5);
  };

  // Handle user guess
  const handleGuess = (guess) => {
    if (currentSongIndex >= shuffledSongs.length) return;
    
    // Pause the timer when the user makes a guess
    setIsTimerRunning(false);
    
    const currentSong = shuffledSongs[currentSongIndex];
    
    // For multiple choice, just check the ID
    if (gameMode === 'multiple-choice') {
      const isCorrect = guess.id === currentSong.id;
      setGuessResult(isCorrect);
      
      if (isCorrect) {
        setScore(prevScore => prevScore + 1);
      }
    } else {
      // For text input, be more forgiving with the song name
      const userGuessLower = guess.toLowerCase().trim();
      const songNameLower = currentSong.name.toLowerCase().trim();
      
      // Remove featured artists text and other common patterns
      const cleanSongName = songNameLower
        .replace(/\(feat\..*?\)/g, '')  // (feat. Artist)
        .replace(/\(ft\..*?\)/g, '')    // (ft. Artist)
        .replace(/\(with.*?\)/g, '')    // (with Artist)
        .replace(/\(featuring.*?\)/g, '') // (featuring Artist)
        .replace(/feat\..*$/g, '')      // feat. Artist at the end
        .replace(/ft\..*$/g, '')        // ft. Artist at the end
        .replace(/\s+-\s+.*$/g, '')     // - Artist at the end
        .replace(/\s*\(.*?\)/g, '')     // Remove anything in parentheses
        .trim();
      
      // For songs that might have important information in parentheses
      // (like "Bohemian Rhapsody" vs "Bohemian Rhapsody (Live)")
      // we'll also create a version with just the first parenthetical expression removed
      const firstParenRemoved = songNameLower
        .replace(/\s*\(.*?\)/, '')  // Remove just the first parenthetical expression
        .trim();
      
      // Check if the user's guess matches any of the possible versions
      const isCorrect = 
        userGuessLower === songNameLower || 
        userGuessLower === cleanSongName ||
        userGuessLower === firstParenRemoved ||
        // Also check if the user's guess is contained in the song name and is at least 80% of its length
        (cleanSongName.includes(userGuessLower) && userGuessLower.length >= cleanSongName.length * 0.8);
      
      setGuessResult(isCorrect);
      
      if (isCorrect) {
        setScore(prevScore => prevScore + 1);
      }
    }
    
    // Pause the Spotify player
    setIsPlaying(false);
  };

  // Move to next song
  const handleNextSong = () => {
    const nextIndex = currentSongIndex + 1;
    
    if (nextIndex < shuffledSongs.length) {
      // Show loading state
      setIsSongLoading(true);
      setLoadingMessage('Loading next song...');
      
      console.log('🎵 QUIZ: Loading next song', nextIndex);
      
      // Reset the state for the next question
      setGuessResult(null);
      setUserGuess('');
      setShowHint(false);
      
      // Update the current song index
      setCurrentSongIndex(nextIndex);
      
      // Generate new options for the next song
      const newOptions = generateOptions(shuffledSongs[nextIndex]);
      setOptions(newOptions);
      
      // Prepare to play the next song
      setTimeout(() => {
        console.log('🎵 QUIZ: Prepared next song, about to hide loading overlay');
        setIsSongLoading(false);
        
        // Wait a moment before starting playback
        setTimeout(() => {
          console.log('🎵 QUIZ: Starting playback soon');
          
          // Start playback of the next song
          setTimeout(() => {
            console.log('🎵 QUIZ: Starting playback of next song');
            if (!fallbackMode) {
              setIsLoadingPlayback(true);
              setIsPlaying(true);
              // Resume the timer when the next song starts playing
              setIsTimerRunning(true);
            }
          }, 300);
        }, 500);
      }, 1000);
    } else {
      // Quiz is complete
      setQuizStarted(false);
      // Save the best time when the quiz is complete
      saveBestTime();
    }
  };

  const handleMultipleChoiceGuess = (song) => {
    handleGuess(song);
  };

  const handleTextInputGuess = (e) => {
    e.preventDefault();
    handleGuess(userGuess);
  };

  const toggleGameMode = () => {
    setGameMode(prevMode => prevMode === 'multiple-choice' ? 'text-input' : 'multiple-choice');
  };

  const togglePlayPause = () => {
    if (fallbackMode) {
      alert("Audio playback is not available in fallback mode. Please use the hints to answer questions.");
      return;
    }
    
    if (!playerReady) {
      alert("Spotify is not ready yet. Please make sure you have Spotify open on any device.");
      return;
    }
    
    if (playerError && !playbackIssue) {
      alert("There was an error connecting to Spotify: " + playerError);
      return;
    }
    
    // Show loading state
    setIsLoadingPlayback(true);
    
    // Set appropriate loading message
    setLoadingMessage(isPlaying ? 'Pausing...' : 'Starting playback...');
    
    // Toggle the playing state
    setIsPlaying(!isPlaying);
    
    // Hide loading state after a reasonable timeout
    setTimeout(() => {
      setIsLoadingPlayback(false);
    }, 2000);
  };

  const handlePlayerReady = (deviceId) => {
    console.log("Spotify player ready with device ID:", deviceId);
    setPlayerReady(true);
    setPlayerError(null);
  };

  const handlePlayerStateChanged = (state) => {
    // Hide loading state when we get a state update
    setIsLoadingPlayback(false);
    
    // If we're in a loading state and playback has started, hide the loading overlay
    if (isSongLoading && state && !state.paused) {
      setIsSongLoading(false);
      console.log('🎵 QUIZ: Player state changed while loading, hiding overlay');
    }
    
    // Update playback issue state
    if (state === null) {
      // No active player
      setPlaybackIssue(true);
      setIsPlaying(false);
      console.log('🎵 QUIZ: No active player detected');
    } else {
      // Player is active
      setPlaybackIssue(false);
      setIsPlaying(!state.paused);
      console.log(`🎵 QUIZ: Player state updated - ${state.paused ? 'Paused' : 'Playing'}`);
    }
  };

  const handlePlayerError = (error) => {
    console.error("🎵 QUIZ ERROR:", error);
    setPlayerError(error);
    
    // Handle rate limiting specially
    if (error.includes("Rate limited")) {
      setPlaybackIssue(true);
      // Don't show an alert, just update the UI
      console.log("🎵 QUIZ: Rate limited by Spotify API, will retry automatically");
      
      // Don't enable fallback mode immediately for rate limiting
      // Instead, show a message that we're waiting
      return;
    }
    
    // Enable fallback mode automatically for other errors
    if (error.includes("Spotify playback error")) {
      enableFallbackMode();
    } else if (error.includes("premium")) {
      alert("Spotify Premium account required to play songs. The quiz will continue without audio.");
      enableFallbackMode();
    } else {
      setPlaybackIssue(true);
    }
  };

  // Add a function to enable fallback mode
  const enableFallbackMode = () => {
    if (fallbackMode) return; // Already in fallback mode
    
    setFallbackMode(true);
    setPlaybackIssue(true);
    setIsPlaying(false);
    setPlayerError("Fallback mode enabled - no audio available");
    
    console.log("🎵 QUIZ: Enabling fallback mode (no audio)");
    
    // Show a toast or notification
    alert("Continuing quiz without audio. You can still answer questions based on the hints.");
  };

  // Add this function to handle quiz length changes
  const handleQuizLengthChange = (e) => {
    const value = parseInt(e.target.value, 10);
    // Make sure we don't exceed the total number of songs available
    const maxSongs = songs.length;
    setQuizLength(Math.min(value, maxSongs));
  };

  // Add this function to save the best time
  const saveBestTime = () => {
    if (quizTime === 0) return;
    
    // Only save if all questions were answered
    if (currentSongIndex < shuffledSongs.length - 1) return;
    
    // Calculate completion percentage
    const completionPercentage = (score / shuffledSongs.length) * 100;
    
    // Only save if the user got at least 50% correct
    if (completionPercentage < 50) return;
    
    // Load existing best times
    const storedBestTimes = localStorage.getItem('artistBestTimes');
    let bestTimes = {};
    
    if (storedBestTimes) {
      try {
        bestTimes = JSON.parse(storedBestTimes);
      } catch (error) {
        console.error('Error parsing best times:', error);
      }
    }
    
    // Initialize artist entry if it doesn't exist
    if (!bestTimes[artist.id]) {
      bestTimes[artist.id] = {};
    }
    
    // Only update if this time is better than the previous best
    if (!bestTimes[artist.id][quizLength] || quizTime < bestTimes[artist.id][quizLength].time) {
      bestTimes[artist.id][quizLength] = {
        time: quizTime,
        date: new Date().toISOString(),
        score: score,
        total: shuffledSongs.length,
        percentage: completionPercentage
      };
      
      // Save to localStorage
      localStorage.setItem('artistBestTimes', JSON.stringify(bestTimes));
      
      // Update state
      setBestTime(bestTimes[artist.id][quizLength]);
      
      // Show a message
      alert(`New best time: ${formatTime(quizTime)}!`);
    }
  };

  // Add this function to format the time
  const formatTime = (seconds) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds < 10 ? '0' : ''}${remainingSeconds}`;
  };

  // Add this effect to start the timer when a song starts playing
  useEffect(() => {
    if (isPlaying && !isLoadingPlayback && quizStarted && !guessResult) {
      setIsTimerRunning(true);
    }
  }, [isPlaying, isLoadingPlayback, quizStarted, guessResult]);

  // Update the handleBackToSearch function to directly call the Spotify API
  const handleBackToSearch = () => {
    // Pause any playing music before going back to search
    if (isPlaying) {
      setIsPlaying(false);
      
      // Directly call the Spotify API to pause playback
      fetch('https://api.spotify.com/v1/me/player/pause', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      }).catch(err => {
        console.error("Error pausing Spotify playback via API:", err);
      });
      
      // Also try the SDK method if available
      if (window.spotifyPlayer) {
        window.spotifyPlayer.pause().catch(err => {
          console.error("Error pausing Spotify playback via SDK:", err);
        });
      }
    }
    
    // Then call the onBackToSearch function from props
    onBackToSearch();
  };

  // Loading screen
  if (isLoading) {
    return (
      <div className="loading">
        <h3>Loading songs...</h3>
        <div className="loading-spinner"></div>
      </div>
    );
  }

  // Quiz intro screen
  if (!quizStarted) {
    return (
      <div className="quiz-intro">
        <div className="artist-info">
          <img 
            src={artist.images[0]?.url || '/placeholder.png'} 
            alt={artist.name}
            className="artist-image"
          />
          <h2>{artist.name} Song Quiz</h2>
          
          {/* Add best time display */}
          {bestTime && (
            <div className="best-time-display">
              <div className="best-time-badge">
                <div className="best-time-left">
                  <div className="best-time-clock">
                    <span className="best-time-label">Best Time</span>
                    <div className="best-time-value">{formatTime(bestTime.time)}</div>
                  </div>
                </div>
                <div className="best-time-right">
                  <span className="best-time-details">
                    {bestTime.score}/{bestTime.total} correct ({Math.round(bestTime.percentage)}%)
                  </span>
                  <span className="best-time-date">
                    {new Date(bestTime.date).toLocaleDateString()}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
        
        <p>Ready to test your knowledge of {artist.name}'s songs?</p>
        
        <div className="quiz-details">
          <h3>Quiz Details</h3>
          <ul>
            <li>This quiz contains {shuffledSongs.length} songs</li>
            <li>Songs will play from your Spotify account</li>
            <li>You can choose between multiple choice or typing the answer</li>
            <li>Hints are available if you get stuck</li>
          </ul>
        </div>
        
        <p>For the best experience, make sure Spotify is open on one of your devices.</p>
        
        <div className="quiz-settings">
          <button 
            className="settings-toggle" 
            onClick={() => setShowSettings(!showSettings)}
          >
            {showSettings ? 'Hide Settings' : 'Quiz Settings'}
          </button>
          
          {showSettings && (
            <div className="settings-panel">
              <div className="setting-item">
                <label htmlFor="quiz-length">Number of Songs:</label>
                <input 
                  type="number" 
                  id="quiz-length"
                  min="5"
                  max={songs.length}
                  value={quizLength}
                  onChange={handleQuizLengthChange}
                />
                <span className="setting-hint">
                  (Max: {songs.length} songs available)
                </span>
              </div>
              
              <div className="setting-item">
                <label htmlFor="game-mode">Game Mode:</label>
                <select 
                  id="game-mode" 
                  value={gameMode}
                  onChange={(e) => setGameMode(e.target.value)}
                >
                  <option value="multiple-choice">Multiple Choice</option>
                  <option value="text-input">Text Input</option>
                </select>
              </div>
            </div>
          )}
        </div>
        
        <div className="button-container">
          <button onClick={startQuiz} className="start-button">Start Quiz</button>
          <button onClick={handleBackToSearch} className="back-button">Choose Different Artist</button>
        </div>
      </div>
    );
  }

  // Active quiz
  const currentSong = shuffledSongs[currentSongIndex];
  
  return (
    <div className="quiz-container">
      <div className="quiz-content">
        <div className="quiz-header">
          <button onClick={handleBackToSearch} className="back-button">
            ← Back to Search
          </button>
          <h2 className="quiz-title">{artist.name} Song Quiz</h2>
          <div className="quiz-info">
            <div className="score">
              Score: {score}/{currentSongIndex + (guessResult !== null ? 1 : 0)}
              <span style={{fontSize: '10px', display: 'block'}}>
                Question {currentSongIndex + 1} of {shuffledSongs.length}
              </span>
            </div>
            <div className="timer">
              Time: {formatTime(quizTime)}
              {bestTime && (
                <span style={{fontSize: '10px', display: 'block'}}>
                  Best: {formatTime(bestTime.time)}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="quiz-content">
          <div className="player-section">
            {/* Hidden Spotify Player */}
            <div style={{ display: 'none' }}>
              <SpotifyPlayer
                token={token}
                trackUri={currentSong ? `spotify:track:${currentSong.id}` : null}
                isPlaying={isPlaying}
                onPlayerReady={handlePlayerReady}
                onPlayerStateChanged={handlePlayerStateChanged}
                onError={handlePlayerError}
                onPlaybackStarted={() => {
                  setIsLoadingPlayback(false);
                  setIsSongLoading(false);
                  setPlaybackIssue(false);
                }}
                onPlaybackFailed={(reason) => {
                  setIsLoadingPlayback(false);
                  setIsSongLoading(false);
                  
                  if (reason === 'premium_required') {
                    alert("Spotify Premium account required to play songs. The quiz will continue without audio.");
                    enableFallbackMode();
                  } else if (reason === 'no_device') {
                    setPlaybackIssue(true);
                  } else {
                    setPlaybackIssue(true);
                  }
                }}
              />
            </div>
            
            <button 
              onClick={togglePlayPause} 
              className={`play-button ${isLoadingPlayback ? 'loading' : ''} ${fallbackMode ? 'fallback' : ''}`}
              disabled={!playerReady || playerError || isLoadingPlayback || fallbackMode}
            >
              {fallbackMode ? 'Audio Unavailable' : 
               playerError ? 'Audio Unavailable' : 
               isLoadingPlayback ? 'Loading...' :
               playbackIssue ? (isPlaying ? 'Playing in Spotify' : 'Play in Spotify') :
               (isPlaying ? 'Pause' : 'Play')}
            </button>
            
            {(showHint || fallbackMode) && (
              <div className="hint">
                <img 
                  src={currentSong.album.images[0]?.url} 
                  alt={currentSong.album.name} 
                  className={`album-cover ${isLoadingPlayback ? 'loading' : ''}`}
                />
                <p>Album: {currentSong.album.name}</p>
                {fallbackMode && (
                  <div className="fallback-hint">
                    <p>Playing song: <strong>{currentSong.name}</strong></p>
                    <p>Release date: {currentSong.album.release_date}</p>
                  </div>
                )}
              </div>
            )}
            
            {!showHint && !fallbackMode && (
              <button onClick={() => setShowHint(true)} className="hint-button">
                Show Hint
              </button>
            )}
          </div>

          <div className="guess-section">
            <div className="game-mode-toggle">
              <button onClick={toggleGameMode} className="mode-button">
                Switch to {gameMode === 'multiple-choice' ? 'Text Input' : 'Multiple Choice'}
              </button>
            </div>

            {guessResult === null ? (
              <>
                {gameMode === 'multiple-choice' ? (
                  <div className="multiple-choice">
                    {options.map(song => (
                      <button
                        key={song.id}
                        onClick={() => handleMultipleChoiceGuess(song)}
                        className="option-button"
                      >
                        {song.name}
                      </button>
                    ))}
                  </div>
                ) : (
                  <form onSubmit={handleTextInputGuess} className="text-input">
                    <input
                      type="text"
                      value={userGuess}
                      onChange={(e) => setUserGuess(e.target.value)}
                      placeholder="Enter song name..."
                    />
                    <button type="submit">
                      Submit
                    </button>
                  </form>
                )}
              </>
            ) : (
              <div className={`answer-feedback ${guessResult ? 'correct' : 'incorrect'}`}>
                <img 
                  src={currentSong.album.images[0]?.url || '/placeholder.png'} 
                  alt={currentSong.album.name}
                  className="answer-feedback-album"
                />
                <div className="answer-feedback-content">
                  <h3>{guessResult ? 'Correct!' : 'Incorrect!'}</h3>
                  <div className="answer-feedback-song">{currentSong.name}</div>
                  <div className="answer-feedback-album-name">Album: {currentSong.album.name}</div>
                  <button onClick={handleNextSong} className="next-song-button">
                    Next Song →
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Add a message when there are playback issues */}
          {playbackIssue && (
            <div className="playback-issue-message">
              <p>
                Having trouble controlling Spotify? 
                <br />
                Open Spotify on your device and the quiz will sync with it.
              </p>
              {!fallbackMode && (
                <button 
                  onClick={enableFallbackMode} 
                  className="fallback-button"
                >
                  Continue Without Audio
                </button>
              )}
            </div>
          )}

          {/* Add a loading overlay to the quiz content */}
          {isSongLoading && (
            <div className="quiz-loading-overlay">
              <div className="quiz-loading-spinner"></div>
              <div className="quiz-loading-text">{loadingMessage}</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default Quiz; 
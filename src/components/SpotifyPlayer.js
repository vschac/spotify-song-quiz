import React, { useState, useEffect, useRef, useCallback } from 'react';

function SpotifyPlayer({ token, trackUri, isPlaying, onPlayerReady, onPlayerStateChanged, onError, onPlaybackStarted, onPlaybackFailed }) {
  const [isReady, setIsReady] = useState(false);
  const [activeDeviceId, setActiveDeviceId] = useState(null);
  const [isAttemptingPlayback, setIsAttemptingPlayback] = useState(false);
  const [isRateLimited, setIsRateLimited] = useState(false);
  const retryTimeoutRef = useRef(null);
  const maxRetries = 3;
  const retryCount = useRef(0);
  const lastApiCallTime = useRef(Date.now());
  const minTimeBetweenCalls = 1000; // 1 second minimum between API calls
  const rateLimitBackoffTime = useRef(2000); // Start with 2 seconds
  const maxRateLimitBackoff = 30000; // Max 30 seconds
  const rateLimitTimeoutRef = useRef(null);
  const [playerState, setPlayerState] = useState({
    isCurrentlyPlaying: false,
    currentTrackUri: null
  });
  const [isPendingPlaybackChange, setIsPendingPlaybackChange] = useState(false);
  
  // Simple error handler with rate limit detection
  const handleError = useCallback((message) => {
    console.error(`🎧 PLAYER ERROR: ${message}`);
    
    // Check if this is a rate limit error
    if (message.includes('429') || message.includes('rate limit') || message.includes('Rate limit')) {
      setIsRateLimited(true);
      
      // Extract retry-after if available
      let retryAfter = 5; // Default 5 seconds
      const match = message.match(/retry after (\d+)/i);
      if (match && match[1]) {
        retryAfter = parseInt(match[1], 10);
      }
      
      // Exponential backoff
      rateLimitBackoffTime.current = Math.min(
        rateLimitBackoffTime.current * 2, 
        maxRateLimitBackoff
      );
      
      const backoffMs = Math.max(retryAfter * 1000, rateLimitBackoffTime.current);
      
      console.log(`🎧 PLAYER: Rate limited, backing off for ${backoffMs/1000}s`);
      
      // Clear any existing timeout
      if (rateLimitTimeoutRef.current) {
        clearTimeout(rateLimitTimeoutRef.current);
      }
      
      // Set a timeout to clear the rate limit flag
      rateLimitTimeoutRef.current = setTimeout(() => {
        console.log('🎧 PLAYER: Rate limit backoff complete');
        setIsRateLimited(false);
        rateLimitTimeoutRef.current = null;
      }, backoffMs);
      
      // Special error message for rate limiting
      if (onError) {
        onError(`Rate limited by Spotify API. Waiting ${Math.round(backoffMs/1000)}s before retrying.`);
      }
      
      return;
    }
    
    // For non-rate-limit errors
    if (onError) {
      onError(message);
    }
  }, [onError]);

  // Safe API call wrapper with rate limiting
  const safeApiCall = useCallback(async (apiCallFn) => {
    // If we're currently rate limited, don't make the call
    if (isRateLimited) {
      console.log('🎧 PLAYER: Skipping API call due to active rate limit');
      return null;
    }
    
    // Check if we need to throttle
    const now = Date.now();
    const timeSinceLastCall = now - lastApiCallTime.current;
    
    if (timeSinceLastCall < minTimeBetweenCalls) {
      console.log(`🎧 PLAYER: Throttling API call, waiting ${minTimeBetweenCalls - timeSinceLastCall}ms`);
      await new Promise(resolve => setTimeout(resolve, minTimeBetweenCalls - timeSinceLastCall));
    }
    
    // Update the last call time
    lastApiCallTime.current = Date.now();
    
    try {
      const response = await apiCallFn();
      
      // Check for rate limiting
      if (response.status === 429) {
        const retryAfter = response.headers.get('Retry-After') || 5;
        handleError(`Rate limited (429), retry after ${retryAfter}s`);
        return null;
      }
      
      // Reset backoff on successful requests
      rateLimitBackoffTime.current = 2000;
      
      return response;
    } catch (error) {
      if (error.message.includes('429')) {
        handleError(`Rate limited: ${error.message}`);
        return null;
      }
      throw error;
    }
  }, [handleError, isRateLimited]);

  // Get available devices
  const getDevices = useCallback(async () => {
    if (!token || isRateLimited) return null;
    
    try {
      const response = await safeApiCall(() => 
        fetch('https://api.spotify.com/v1/me/player/devices', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        })
      );
      
      // If we skipped the call due to rate limiting
      if (response === null) return null;
      
      if (!response.ok) {
        throw new Error(`Failed to get devices (${response.status})`);
      }
      
      const data = await response.json();
      console.log('🎧 PLAYER: Available devices:', data.devices);
      
      if (data.devices && data.devices.length > 0) {
        // Prefer active devices, otherwise take the first one
        const activeDevice = data.devices.find(d => d.is_active) || data.devices[0];
        setActiveDeviceId(activeDevice.id);
        console.log(`🎧 PLAYER: Using device: ${activeDevice.name} ${activeDevice.id}`);
        
        if (onPlayerReady) {
          onPlayerReady(activeDevice.id);
        }
        
        setIsReady(true);
        return activeDevice.id;
      } else {
        throw new Error('No available devices found');
      }
    } catch (error) {
      handleError(`Error getting devices: ${error.message}`);
      return null;
    }
  }, [token, handleError, onPlayerReady, safeApiCall, isRateLimited]);

  // Play a track with retries
  const playTrack = useCallback(async (uri, deviceId = activeDeviceId) => {
    if (!token || !deviceId || isRateLimited) {
      console.log('🎧 PLAYER: Cannot play - no token, device ID, or rate limited');
      return false;
    }
    
    setIsAttemptingPlayback(true);
    
    try {
      console.log(`🎧 PLAYER: Attempting to play track: ${uri} on device: ${deviceId}`);
      
      // First, make sure our device is the active one
      const transferResponse = await safeApiCall(() => 
        fetch('https://api.spotify.com/v1/me/player', {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            device_ids: [deviceId],
            play: false // Don't start playing yet
          })
        })
      );
      
      // If we skipped the call due to rate limiting
      if (transferResponse === null) {
        setIsAttemptingPlayback(false);
        return false;
      }
      
      if (!transferResponse.ok && transferResponse.status !== 204) {
        console.warn(`🎧 PLAYER: Device transfer failed: ${transferResponse.status}`);
      }
      
      // Wait a moment for the transfer to take effect
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Then, play the specific track
      const response = await safeApiCall(() => 
        fetch(`https://api.spotify.com/v1/me/player/play?device_id=${deviceId}`, {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            uris: [uri],
            position_ms: 0
          })
        })
      );
      
      // If we skipped the call due to rate limiting
      if (response === null) {
        setIsAttemptingPlayback(false);
        return false;
      }
      
      if (response.status === 204 || response.status === 202) {
        console.log('🎧 PLAYER: Play command successful');
        retryCount.current = 0;
        setIsAttemptingPlayback(false);
        
        if (onPlaybackStarted) {
          onPlaybackStarted();
        }
        
        return true;
      }
      
      // For 403, the user doesn't have premium
      if (response.status === 403) {
        handleError('Premium account required to control playback');
        setIsAttemptingPlayback(false);
        if (onPlaybackFailed) {
          onPlaybackFailed('premium_required');
        }
        return false;
      }
      
      // For 404, the device might not be available
      if (response.status === 404) {
        // Try to get a new device
        const newDeviceId = await getDevices();
        if (newDeviceId && newDeviceId !== deviceId) {
          // Retry with the new device
          return playTrack(uri, newDeviceId);
        } else {
          handleError('Device not found. Try opening Spotify on your device');
          setIsAttemptingPlayback(false);
          if (onPlaybackFailed) {
            onPlaybackFailed('no_device');
          }
          return false;
        }
      }
      
      // For other errors
      const errorData = await response.text();
      throw new Error(`Play command failed with status: ${response.status}, ${errorData}`);
    } catch (error) {
      if (retryCount.current < maxRetries && !isRateLimited) {
        retryCount.current++;
        console.log(`🎧 PLAYER: Error playing track, retrying (${retryCount.current}/${maxRetries}): ${error.message}`);
        
        // Clear any existing timeout
        if (retryTimeoutRef.current) {
          clearTimeout(retryTimeoutRef.current);
        }
        
        // Retry after a short delay
        retryTimeoutRef.current = setTimeout(() => {
          playTrack(uri, activeDeviceId);
        }, 2000);
        
        return false;
      } else {
        handleError(`Error playing track after ${maxRetries} attempts: ${error.message}`);
        setIsAttemptingPlayback(false);
        if (onPlaybackFailed) {
          onPlaybackFailed('general_error');
        }
        return false;
      }
    }
  }, [token, activeDeviceId, handleError, getDevices, onPlaybackStarted, onPlaybackFailed, safeApiCall, isRateLimited]);

  // Pause playback
  const pausePlayback = useCallback(async () => {
    if (!token || !activeDeviceId || isRateLimited) {
      console.log('🎧 PLAYER: Cannot pause - no token, device ID, or rate limited');
      return false;
    }
    
    // Skip if we're already not playing
    if (!playerState.isCurrentlyPlaying) {
      console.log('🎧 PLAYER: Already paused, skipping API call');
      return true;
    }
    
    console.log('🎧 PLAYER: Pausing playback');
    
    try {
      const response = await safeApiCall(() => 
        fetch(`https://api.spotify.com/v1/me/player/pause?device_id=${activeDeviceId}`, {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        })
      );
      
      if (!response) return false;
      
      // Consider any 2xx status code as success for pause
      if (response.status >= 200 && response.status < 300) {
        console.log('🎧 PLAYER: Pause command successful');
        setPlayerState({
          isCurrentlyPlaying: false,
          currentTrackUri: playerState.currentTrackUri
        });
        return true;
      }
      
      // For 404, the device might not be active
      if (response.status === 404) {
        return true; // Consider it a success if already not playing
      }
      
      const errorData = await response.text();
      throw new Error(`Pause command failed with status: ${response.status}, ${errorData}`);
    } catch (error) {
      handleError(`Error pausing playback: ${error.message}`);
      return false;
    }
  }, [token, activeDeviceId, handleError, safeApiCall, isRateLimited, playerState]);

  // Initialize by getting available devices
  useEffect(() => {
    if (!token) return;
    getDevices();
  }, [token, getDevices]);

  // Handle play/pause state changes
  useEffect(() => {
    if (!isReady || !token || isRateLimited) return;
    
    // Skip API calls if we're already in the desired state
    const shouldPlay = isPlaying && trackUri;
    const alreadyInCorrectState = 
      (shouldPlay && playerState.isCurrentlyPlaying && playerState.currentTrackUri === trackUri) ||
      (!shouldPlay && !playerState.isCurrentlyPlaying);
    
    // Don't make API calls if we're already in the correct state or have a pending change
    if (alreadyInCorrectState || isPendingPlaybackChange) {
      return;
    }
    
    setIsPendingPlaybackChange(true);
    
    if (shouldPlay) {
      playTrack(trackUri).finally(() => {
        setIsPendingPlaybackChange(false);
        setPlayerState({
          isCurrentlyPlaying: true,
          currentTrackUri: trackUri
        });
      });
    } else if (playerState.isCurrentlyPlaying) {
      pausePlayback().finally(() => {
        setIsPendingPlaybackChange(false);
        setPlayerState({
          isCurrentlyPlaying: false,
          currentTrackUri: playerState.currentTrackUri
        });
      });
    } else {
      setIsPendingPlaybackChange(false);
    }
  }, [isPlaying, trackUri, isReady, token, playTrack, pausePlayback, isRateLimited, playerState, isPendingPlaybackChange]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
        retryTimeoutRef.current = null;
      }
      
      if (rateLimitTimeoutRef.current) {
        clearTimeout(rateLimitTimeoutRef.current);
        rateLimitTimeoutRef.current = null;
      }
    };
  }, []);

  return (
    <div className="spotify-player">
      {!isReady && <p>Connecting to your Spotify account...</p>}
      {isAttemptingPlayback && (
        <div className="playback-attempt">
          <p>Starting playback...</p>
        </div>
      )}
      {isRateLimited && (
        <div className="rate-limited">
          <p>Spotify API rate limit reached. Waiting before retrying...</p>
        </div>
      )}
    </div>
  );
}

export default SpotifyPlayer; 
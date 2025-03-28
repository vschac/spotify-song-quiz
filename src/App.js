import React, { useEffect, useState } from 'react';
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import spotifyApi, { setAccessToken } from './services/spotify';
import './App.css';

function App() {
  const [token, setToken] = useState(null);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check for token in URL hash
    const hash = window.location.hash;
    let urlToken = null;
    
    if (hash) {
      console.log("Found hash:", hash);
      const tokenMatch = hash.match(/access_token=([^&]*)/);
      if (tokenMatch) {
        urlToken = tokenMatch[1];
        console.log("Extracted token:", urlToken.substring(0, 5) + "...");
        
        // Clear hash from URL
        window.history.pushState("", document.title, window.location.pathname);
        
        // Save token
        localStorage.setItem('spotify_token', urlToken);
        setToken(urlToken);
        setAccessToken(urlToken);
      }
    }
    
    // If no token in URL, check localStorage
    if (!urlToken) {
      const storedToken = localStorage.getItem('spotify_token');
      if (storedToken) {
        console.log("Using stored token");
        setToken(storedToken);
        setAccessToken(storedToken);
      }
    }
    
    // If we have a token, fetch user data
    if (token) {
      spotifyApi.getMe()
        .then(userData => {
          console.log("User data fetched successfully");
          setUser(userData);
        })
        .catch(error => {
          console.error('Error fetching user data:', error);
          // If we get an error, the token might be expired
          if (error.status === 401) {
            console.log("Token expired, clearing");
            localStorage.removeItem('spotify_token');
            setToken(null);
          }
        });
    }
    
    setLoading(false);
  }, [token]);

  if (loading) {
    return <div className="loading">Loading...</div>;
  }

  return (
    <div className="app">
      {token ? (
        <Dashboard user={user} token={token} />
      ) : (
        <Login />
      )}
    </div>
  );
}

export default App; 
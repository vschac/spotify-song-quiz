import React, { useEffect, useState } from 'react';
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import spotifyApi, { setAccessToken } from './services/spotify';
import './App.css';

function App() {
  const [token, setToken] = useState(null);
  const [user, setUser] = useState(null);

  useEffect(() => {
    // Extract token from URL if present
    const hash = window.location.hash;
    if (hash) {
      const token = hash.substring(1).split('&').find(elem => elem.startsWith('access_token')).split('=')[1];
      
      window.location.hash = ''; // Clear the URL
      setToken(token);
      setAccessToken(token); // Set the token in the Spotify API
      
      // Fetch user data
      const fetchUser = async () => {
        try {
          const userData = await spotifyApi.getMe();
          setUser(userData);
        } catch (error) {
          console.error('Error fetching user data:', error);
        }
      };
      
      fetchUser();
    }
  }, []);

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
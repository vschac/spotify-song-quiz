import React, { useEffect, useState } from 'react';
import './App.css';
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import spotifyApi, { getTokenFromUrl, setAccessToken } from './services/spotify';

function App() {
  const [token, setToken] = useState(null);
  const [user, setUser] = useState(null);

  useEffect(() => {
    const hash = getTokenFromUrl();
    window.location.hash = '';
    const _token = hash.access_token;

    if (_token) {
      setToken(_token);
      setAccessToken(_token);

      spotifyApi.getMe().then(user => {
        setUser(user);
      });
    }
  }, []);

  return (
    <div className="app">
      {token ? <Dashboard user={user} /> : <Login />}
    </div>
  );
}

export default App; 
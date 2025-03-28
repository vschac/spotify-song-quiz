import React from 'react';
import { loginUrl } from '../services/spotify';
import '../styles/Login.css';

function Login() {
  return (
    <div className="login">
      <div className="login-content">
        <img 
          src="https://storage.googleapis.com/pr-newsroom-wp/1/2018/11/Spotify_Logo_RGB_Green.png" 
          alt="Spotify Logo" 
          className="logo"
        />
        <h1>Song Quiz</h1>
        <p>
          Test your knowledge of your favorite artists' songs.
          Connect with Spotify to start playing!
        </p>
        <a href={loginUrl} className="login-button">
          Login with Spotify
        </a>
      </div>
      <div className="login-footer">
        Powered by the Spotify API. Not affiliated with Spotify AB.
      </div>
    </div>
  );
}

export default Login; 
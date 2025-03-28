import React from 'react';
import { loginUrl } from '../services/spotify';
import '../styles/Login.css';

function Login() {
  // Log the login URL for debugging
  console.log("Login URL:", loginUrl);
  
  return (
    <div className="login">
      <div className="login-content">
        <h1>Spotify Artist Song Quiz</h1>
        <p>Test your knowledge of your favorite artists' songs</p>
        <a href={loginUrl} className="login-button">
          Login with Spotify
        </a>
      </div>
    </div>
  );
}

export default Login; 
import SpotifyWebApi from 'spotify-web-api-js';

const spotifyApi = new SpotifyWebApi();

// Authentication constants
const clientId = process.env.SPOTIFY_CLIENT_ID;
const redirectUri = process.env.SPOTIFY_REDIRECT_URI
const scopes = [
  'user-read-private',
  'user-read-email',
  'user-top-read',
  'streaming',
  'user-read-playback-state',
  'user-modify-playback-state',
  'user-read-currently-playing'
];

// Generate the login URL
export const loginUrl = `https://accounts.spotify.com/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${encodeURIComponent(scopes.join(' '))}&response_type=token&show_dialog=true`;

// This function should be called after authentication
export const setAccessToken = (token) => {
  spotifyApi.setAccessToken(token);
};

// Wrapper for the Spotify API
export default spotifyApi; 
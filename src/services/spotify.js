import SpotifyWebApi from 'spotify-web-api-js';

const spotifyApi = new SpotifyWebApi();

// Hardcode values for GitHub Pages deployment
const clientId = 'f4575024ea9045309a9b8790c2934230'; // Your client ID
const redirectUri = 'https://vschac.github.io/spotify-song-quiz/callback';

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
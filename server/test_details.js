const axios = require('axios');
require('dotenv').config({ path: '../.env' });
axios.get(`https://api.themoviedb.org/3/movie/550`, {
  params: { api_key: process.env.TMDB_API_KEY, language: 'fr-FR', append_to_response: 'watch/providers,videos', include_video_language: 'fr,fr-FR,en,en-US,null' }
}).then(res => {
  const item = res.data;
  const wp = item['watch/providers']?.results?.FR?.flatrate || item['watch/providers']?.results?.FR?.rent || item['watch/providers']?.results?.FR?.buy || [];
  console.log("Providers length:", wp.length);
  console.log("Providers:", wp);
}).catch(console.error);

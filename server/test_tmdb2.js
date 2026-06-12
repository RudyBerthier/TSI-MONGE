const axios = require('axios');
require('dotenv').config({ path: '../.env' });
const type = 'movie';
const id = 129; // Spirited Away (often lacks FR trailer)
axios.get(`https://api.themoviedb.org/3/${type}/${id}`, {
  params: { api_key: process.env.TMDB_API_KEY, language: 'fr-FR', append_to_response: 'watch/providers,videos', include_video_language: 'fr,en' }
}).then(res => {
  const item = res.data;
  console.log("Videos:", item.videos ? item.videos.results.length : null);
  const tk = item.videos?.results?.find(v => v.site === 'YouTube' && v.type === 'Trailer')?.key;
  console.log("Trailer Key:", tk);
}).catch(console.error);

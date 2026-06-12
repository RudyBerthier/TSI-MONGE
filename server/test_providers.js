const axios = require('axios');
require('dotenv').config({ path: '../.env' });
axios.get(`https://api.themoviedb.org/3/movie/550`, {
  params: { api_key: process.env.TMDB_API_KEY, append_to_response: 'watch/providers' }
}).then(res => {
  console.log(res.data['watch/providers'].results.FR);
}).catch(console.error);

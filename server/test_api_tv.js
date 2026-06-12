const axios = require('axios');
const jwt = require('jsonwebtoken');
require('dotenv').config({ path: '../.env' });

const token = jwt.sign({ id: '123' }, process.env.JWT_SECRET || 'secret');

axios.get('http://localhost:3001/api/media/details/tv/1399', { // Game of Thrones
  headers: { Authorization: `Bearer ${token}` }
}).then(res => {
  console.log(JSON.stringify(res.data, null, 2));
}).catch(err => {
  console.error("API ERROR:", err.response ? err.response.data : err.message);
});

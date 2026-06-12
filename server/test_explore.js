const axios = require('axios');
const jwt = require('jsonwebtoken');
require('dotenv').config({ path: '../.env' });
const token = jwt.sign({ id: '123' }, process.env.JWT_SECRET || 'secret');
axios.get('http://localhost:3001/api/media/explore?type=movie&genre=28', { headers: { Authorization: `Bearer ${token}` } })
.then(res => console.log(res.data.length))
.catch(console.error);

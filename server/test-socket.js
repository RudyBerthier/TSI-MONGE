require('dotenv').config();
const { io } = require("socket.io-client");
const jwt = require("jsonwebtoken");
const JWT_SECRET = process.env.JWT_SECRET || 'tsi1-secret-key-2025';

const token = jwt.sign({ id: 'test-user-1', username: 'TestUser', role: 'user', email: 'test@tsi-monge.fr' }, JWT_SECRET);

const socket = io("http://localhost:3001", {
  auth: { token }
});

socket.on("connect", () => {
  console.log("Connected! socket.id:", socket.id);
  socket.emit("game:find_match", { gameType: "chess" });
  setTimeout(() => {
    socket.disconnect();
    console.log("Disconnected. Test completed.");
  }, 2000);
});

socket.on("connect_error", (err) => {
  console.error("Connection error:", err.message);
});

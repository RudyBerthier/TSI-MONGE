require('dotenv').config();
const { io } = require("socket.io-client");
const jwt = require("jsonwebtoken");
const JWT_SECRET = process.env.JWT_SECRET || 'tsi1-secret-key-2025';

const token1 = jwt.sign({ id: 'test-user-1', username: 'TestUser1', role: 'user' }, JWT_SECRET);
const token2 = jwt.sign({ id: 'test-user-2', username: 'TestUser2', role: 'user' }, JWT_SECRET);

const socket1 = io("http://localhost:3001", { auth: { token: token1 } });
const socket2 = io("http://localhost:3001", { auth: { token: token2 } });

socket1.on("connect", () => {
  console.log("Socket 1 Connected! Waiting 1s before emitting...");
  setTimeout(() => {
    socket1.emit("game:find_match", { gameType: "chess" });
  }, 1000);
});

socket2.on("connect", () => {
  console.log("Socket 2 Connected! Waiting 1s before emitting...");
  setTimeout(() => {
    socket2.emit("game:find_match", { gameType: "chess" });
  }, 1000);
});

socket1.on("game:match_found", (data) => {
  console.log("SOCKET 1 received match_found!", data);
  process.exit(0);
});

socket2.on("game:match_found", (data) => {
  console.log("SOCKET 2 received match_found!", data);
});

setTimeout(() => {
  console.log("Timeout reached. No match found.");
  process.exit(1);
}, 3000);

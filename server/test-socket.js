const io = require("socket.io-client");
const socket = io("http://localhost:3001", {
  auth: { token: "invalid-token" },
  transports: ["polling"]
});
socket.on("connect_error", (err) => {
  console.log("Connect error:", err.message);
  process.exit(1);
});
socket.on("connect", () => {
  console.log("Connected!");
  process.exit(0);
});

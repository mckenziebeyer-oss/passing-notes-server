const http = require("http");
const WebSocket = require("ws");

const PORT = process.env.PORT || 10000;

const server = http.createServer((req, res) => {
  res.writeHead(200, { "Content-Type": "text/plain" });
  res.end("Passing Notes is running.");
});

const wss = new WebSocket.Server({ server });

const rooms = new Map();

function getRoom(code) {
  if (!rooms.has(code)) {
    rooms.set(code, new Set());
  }
  return rooms.get(code);
}

wss.on("connection", (ws) => {
  let roomCode = null;

  ws.on("message", (raw) => {
    let message;

    try {
      message = JSON.parse(raw.toString());
    } catch {
      return;
    }

    if (message.type === "join") {
      roomCode = String(message.room || "").trim().toUpperCase();

      if (!roomCode) return;

      getRoom(roomCode).add(ws);
      return;
    }

    if (!roomCode || !rooms.has(roomCode)) return;

    for (const other of rooms.get(roomCode)) {
      if (other !== ws && other.readyState === WebSocket.OPEN) {
        other.send(JSON.stringify(message));
      }
    }
  });

  ws.on("close", () => {
    if (!roomCode || !rooms.has(roomCode)) return;

    const room = rooms.get(roomCode);
    room.delete(ws);

    if (room.size === 0) {
      rooms.delete(roomCode);
    }
  });
});

server.listen(PORT, "0.0.0.0", () => {
  console.log(`Passing Notes server running on port ${PORT}`);
});

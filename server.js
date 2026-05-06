// server.js (Node.js, ~20 Zeilen)
const { WebSocketServer } = require("ws");
const wss = new WebSocketServer({ port: 8080 });
const rooms = new Map();

wss.on("connection", (ws) => {
  ws.on("message", (msg) => {
    const { room, data } = JSON.parse(msg);
    if (!rooms.has(room)) rooms.set(room, new Set());
    rooms.get(room).add(ws);
    // Weiterleiten an alle anderen im gleichen Room
    rooms.get(room).forEach((client) => {
      if (client !== ws && client.readyState === 1)
        client.send(JSON.stringify(data));
    });
  });
  ws.on("close", () => {
    /* Room aufräumen */
  });
});

const { WebSocketServer } = require("ws");
const wss = new WebSocketServer({ port: 8080 });
const rooms = new Map();

// NEU: Server-Start bestätigen
console.log("Server läuft auf Port 8080 ✅");

wss.on("connection", (ws) => {
  console.log("Neue Verbindung! Clients:", wss.clients.size);

  ws.on("message", (msg) => {
    const { room, data } = JSON.parse(msg);
    if (!rooms.has(room)) rooms.set(room, new Set());
    rooms.get(room).add(ws);

    console.log("Nachricht in Room", room, ":", data);

    rooms.get(room).forEach((client) => {
      if (client !== ws && client.readyState === 1)
        client.send(JSON.stringify(data));
    });
  });

  ws.on("close", () => {
    console.log("Verbindung getrennt. Clients:", wss.clients.size);
  });
});

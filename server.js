const { WebSocketServer } = require("ws");
const wss = new WebSocketServer({ port: 8080 });
const rooms = new Map();

// Zufälligen 6-stelligen Code generieren
function generateToken() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

wss.on("connection", (ws) => {
  ws.on("message", (msg) => {
    const { action, room, data } = JSON.parse(msg);

    if (action === "create") {
      const token = generateToken();
      rooms.set(token, new Set([ws]));
      ws.roomId = token;
      ws.send(JSON.stringify({ action: "created", token: token }));
      console.log("Neuer Raum erstellt:", token);
    } else if (action === "join") {
      if (rooms.has(room)) {
        rooms.get(room).add(ws);
        ws.roomId = room;
        ws.send(JSON.stringify({ action: "joined", token: room }));
        // Host benachrichtigen
        rooms.get(room).forEach((client) => {
          if (client !== ws)
            client.send(JSON.stringify({ action: "partner_joined" }));
        });
        console.log("Jemand ist beigetreten:", room);
      } else {
        ws.send(
          JSON.stringify({ action: "error", message: "Room nicht gefunden" }),
        );
      }
    } else if (action === "update") {
      // Daten weiterleiten
      if (ws.roomId && rooms.has(ws.roomId)) {
        rooms.get(ws.roomId).forEach((client) => {
          if (client !== ws && client.readyState === 1)
            client.send(JSON.stringify({ action: "update", data: data }));
        });
      }
    }
  });

  ws.on("close", () => {
    console.log("Verbindung getrennt. Clients:", wss.clients.size);
  });
});

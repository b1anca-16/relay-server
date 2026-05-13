const { WebSocketServer } = require("ws");
const wss = new WebSocketServer({ port: 8080 });
const rooms = new Map();

// Zufälligen 6-stelligen Code generieren
function generateToken() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

wss.on("connection", (ws) => {
  ws.on("message", (msg) => {
    let parsed;
    try {
      parsed = JSON.parse(msg);
    } catch {
      return;
    }

    const { action, room, data } = parsed;
    if (!action) return;

    if (action === "create") {
      const token = generateToken();
      rooms.set(token, {
        clients: new Set([ws]),
        names: new Map([[ws, parsed.name || "Host"]]),
        host: ws,
      });
      ws.roomId = token;
      ws.name = parsed.name || "Host";
      ws.role = "HOST";
      ws.send(JSON.stringify({ action: "created", token: token }));
      broadcastParticipants(token);
      console.log("Neuer Raum erstellt:", token);
    } else if (action === "join") {
      const roomObj = rooms.get(room);

      if (!roomObj) {
        ws.send(
          JSON.stringify({ action: "error", message: "Room nicht gefunden" }),
        );
        return;
      }

      roomObj.clients.add(ws);
      roomObj.names.set(ws, parsed.name || "Player");

      ws.roomId = room;
      ws.name = parsed.name || "Player";
      ws.role = "JOIN";

      ws.send(
        JSON.stringify({
          action: "joined",
          token: room,
        }),
      );

      // Host benachrichtigen
      roomObj.clients.forEach((client) => {
        if (client !== ws && client.readyState === 1) {
          client.send(JSON.stringify({ action: "partner_joined" }));
        }
      });

      broadcastParticipants(room);
    } else if (action === "update") {
      // Daten weiterleiten
      if (ws.roomId && rooms.has(ws.roomId)) {
        const room = rooms.get(ws.roomId);

        room.clients.forEach((client) => {
          if (client !== ws && client.readyState === 1) {
            client.send(
              JSON.stringify({
                action: "update",
                data,
              }),
            );
          }
        });
      }
    }
  });
  ws.on("close", () => {
    const room = rooms.get(ws.roomId);
    if (!room) return;

    room.clients.delete(ws);
    room.names.delete(ws);

    if (ws === room.host) {
      // neuer Host
      const next = room.clients.values().next().value;
      room.host = next || null;

      if (next) next.role = "HOST";
    }

    if (room.clients.size === 0) {
      rooms.delete(ws.roomId);
    } else {
      broadcastParticipants(ws.roomId);
    }
  });
});

function broadcastParticipants(roomId) {
  const room = rooms.get(roomId);
  if (!room) return;

  const list = Array.from(room.clients).map((client) => ({
    name: room.names.get(client),
    role: client === room.host ? "HOST" : "JOIN",
  }));

  room.clients.forEach((client) => {
    client.send(
      JSON.stringify({
        action: "participants",
        list,
      }),
    );
  });
}

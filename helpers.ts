import type {
  ExtendedWebSocket,
  Room,
  Participant,
  Command
} from "./types";

export function generateToken(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}
 
export function buildParticipantList(room: Room): Participant[] {
  return Array.from(room.clients).map((client) => ({
    name: room.names.get(client) ?? "Unknown",
    role: client === room.host ? "HOST" : "JOIN",
  }));
}
 
export function broadcastParticipants(roomId: string, rooms: Map<string, Room>): void {
  const room = rooms.get(roomId);
  if (!room) return;
 
  const list = buildParticipantList(room);
  const payload = JSON.stringify({ action: "participants", list });
 
  room.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(payload);
    }
  });
}
 
export function sendParticipantsTo(
  ws: ExtendedWebSocket,
  roomId: string,
  rooms: Map<string, Room>
): void {
  const room = rooms.get(roomId);
  if (!room) return;
 
  const list = buildParticipantList(room);
  ws.send(JSON.stringify({ action: "participants", list }));
  console.log(`[refresh] → ${ws.name}:`, list);
}
 
export function sendError(ws: ExtendedWebSocket, message: string): void {
  ws.send(JSON.stringify({ action: "error", message }));
}

export function broadcastLeaderboard(roomId: string, rooms: Map<string, Room>): void {
  const room = rooms.get(roomId);
  if (!room) return;

const leaderboard = Array.from(room.names.entries())
    .map(([client, name]) => ({
        name,
        km: room.progress.get(client) ?? 0,
        finished: (room.progress.get(client) ?? 0) >= room.distance,
        finishedAt: client.finishedAt ?? Infinity
    }))
    .sort((a, b) => {
        if (a.finished && b.finished) return a.finishedAt - b.finishedAt;
        if (a.finished) return -1;
        if (b.finished) return 1;
        return b.km - a.km;
    })
    .map((entry, index) => ({ ...entry, place: index + 1 }));

  const payload = JSON.stringify({ action: "leaderboard", list: leaderboard });

  room.clients.forEach(c => {
    if (c.readyState === WebSocket.OPEN) c.send(payload);
  });
}
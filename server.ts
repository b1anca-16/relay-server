import type {
  ExtendedWebSocket,
  Room,
  Message,
  Command
} from "./types";
import {
  sendError,
  broadcastParticipants,
  broadcastLeaderboard
} from "./helpers";
import { CommandRegistry, CreateCommand, JoinCommand, UpdateCommand, RefreshCommand, GetRoomsCommand, StartCommand, ProgressCommand, LeaveCommand } from "./commands.ts";
import {
  CommandRegistry,
  CreateCommand,
  JoinCommand,
  UpdateCommand,
  RefreshCommand,
  GetRoomsCommand,
  StartCommand
} from "./commands.ts";
import { WebSocketServer, WebSocket } from "ws";

const rooms = new Map<string, Room>();
const registry = new CommandRegistry();
 
registry.register("create", new CreateCommand());
registry.register("join", new JoinCommand());
registry.register("update", new UpdateCommand());
registry.register("refresh", new RefreshCommand());
registry.register("getRooms", new GetRoomsCommand());
registry.register("start", new StartCommand());
registry.register("progress", new ProgressCommand());
registry.register("leave", new LeaveCommand());
registry.register("start", new StartCommand());

const wss = new WebSocketServer({ port: 8080 });
console.log("WebSocket-Server läuft auf ws://localhost:8080");
 
wss.on("connection", (ws: ExtendedWebSocket) => {
  console.log("[connect] Neuer Client verbunden");
 
  ws.on("message", (raw) => {
    let msg: Message;
    try {
      msg = JSON.parse(raw.toString());
    } catch {
      sendError(ws, "Ungültiges JSON");
      return;
    }
 
    if (!msg.action) {
      sendError(ws, "Aktion fehlt");
      return;
    }
 
    registry.execute(msg.action, ws, msg, rooms);
  });
 
  ws.on("close", () => {
    console.log("Closed socket!!");
    if (!ws.roomId) return;
 
    const room = rooms.get(ws.roomId);
    if (!room) return;

    // Wenn nicht mehr in clients → sauberes Leave bereits verarbeitet
    if (!room.clients.has(ws)) return;

    room.clients.delete(ws);
    room.names.delete(ws);
    room.progress.delete(ws);
    console.log(`[disconnect] "${ws.name}" hat Raum ${ws.roomId} verlassen`);
 
    if (ws === room.host) {
      const next = room.clients.values().next().value as ExtendedWebSocket | undefined;
      room.host = next ?? null;
      if (next) next.role = "HOST";
      console.log(`[host] Neuer Host: "${next?.name ?? "keiner"}"`);
    }
 
    if (room.clients.size === 0) {
      rooms.delete(ws.roomId);
      console.log(`[room] Raum ${ws.roomId} gelöscht`);
    } else {
      broadcastParticipants(ws.roomId, rooms);
      broadcastLeaderboard(ws.roomId, rooms);
    }
  });
});
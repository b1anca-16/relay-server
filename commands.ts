import type {
  ExtendedWebSocket,
  Room,
  Message,
  Command
} from "./types";
import { WebSocket } from "ws";
import {
  sendError,
  generateToken,
  broadcastParticipants,
  sendParticipantsTo,
  buildParticipantList,
  broadcastLeaderboard
} from "./helpers";
 
export class CommandRegistry {
  private commands = new Map<string, Command>();
 
  register(action: string, command: Command): void {
    this.commands.set(action, command);
  }
 
  execute(
    action: string,
    ws: ExtendedWebSocket,
    msg: Message,
    rooms: Map<string, Room>
  ): void {
    const command = this.commands.get(action);
    if (!command) {
      console.warn(`[warn] Unbekannte Aktion: "${action}"`);
      sendError(ws, `Unbekannte Aktion: ${action}`);
      return;
    }
    command.execute(ws, msg, rooms);
  }
}
 
export class CreateCommand implements Command {
  execute(ws: ExtendedWebSocket, msg: Message, rooms: Map<string, Room>): void {
    const token = generateToken();
    const name = msg.name ?? "Host";
    const distance = typeof msg.distance === "number" ? msg.distance : 5;

    const room: Room = {
      clients: new Set([ws]),
      names: new Map([[ws, name]]),
      progress: new Map([[ws, 0]]),
      distance: distance,
      host: ws,
      started: false,
      runName: msg.runName ?? "",
    };

    rooms.set(token, room);

    ws.roomId = token;
    ws.name = name;
    ws.role = "HOST";

    ws.send(JSON.stringify({
      action: "created",
      token,
      runName: room.runName,
      distance: room.distance,
      participants: buildParticipantList(room)
    }));

    broadcastParticipants(token, rooms);

    console.log(`[create] Room ${token} by "${name}" (distance=${distance}km)`);
  }
}
 
export class JoinCommand implements Command {
  execute(ws: ExtendedWebSocket, msg: Message, rooms: Map<string, Room>): void {
    const roomId = msg.room;
    if (!roomId) return sendError(ws, "Room-ID fehlt");
 
    const room = rooms.get(roomId);
    if (!room) return sendError(ws, "Room nicht gefunden");
 
    const name = msg.name ?? "Player";
 
    room.clients.add(ws);
    room.names.set(ws, name);
    ws.roomId = roomId;
    ws.name = name;
    ws.role = "JOIN";
    room.progress.set(ws, 0);
 
    ws.send(JSON.stringify({
      action: "joined",
      token: roomId,
      runName: room.runName,
      distance: room.distance,
      participants: buildParticipantList(room)
    }));
 
    // Alle anderen über neuen Teilnehmer informieren
    room.clients.forEach((client) => {
      if (client !== ws && client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify({ action: "partner_joined" }));
      }
    });
 
    broadcastParticipants(roomId, rooms);
    console.log(`[join] "${name}" → Room ${roomId} (${room.clients.size} Teilnehmer)`);
  }
}
 
export class UpdateCommand implements Command {
  execute(ws: ExtendedWebSocket, msg: Message, rooms: Map<string, Room>): void {
    if (!ws.roomId) return;
 
    const room = rooms.get(ws.roomId);
    if (!room) return;
 
    const payload = JSON.stringify({ action: "update", data: msg.data });
 
    room.clients.forEach((client) => {
      if (client !== ws && client.readyState === WebSocket.OPEN) {
        client.send(payload);
      }
    });
  }
}
 
export class RefreshCommand implements Command {
  execute(ws: ExtendedWebSocket, _msg: Message, rooms: Map<string, Room>): void {
    if (!ws.roomId) return sendError(ws, "Nicht in einem Raum");
    sendParticipantsTo(ws, ws.roomId, rooms);
  }
}
 
export class GetRoomsCommand implements Command {
  execute(ws: ExtendedWebSocket, _msg: Message, rooms: Map<string, Room>): void {
    const roomList = Array.from(rooms.entries()).map(([id, room]) => ({
      id,
      participants: room.clients.size,
      host: room.host?.name ?? null,
    }));
    ws.send(JSON.stringify({ action: "rooms", list: roomList }));
    console.log(`[getRooms] ${roomList.length} Räume`);
  }
}
 
export class StartCommand implements Command {
  execute(ws: ExtendedWebSocket, _msg: Message, rooms: Map<string, Room>): void {
 
    if (!ws.roomId) return;
      console.log("Started Room " + ws.roomId);
 
    const room = rooms.get(ws.roomId);
    if (!room) return;
 
    if (room.host !== ws) {
      return sendError(ws, "Nur der Host darf den Lauf starten");
    }
 
    room.started = true;
    const payload = JSON.stringify({
      action: "started",
      startedAt: Date.now()
    });
 
    room.clients.forEach(client => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(payload);
      }
    });
 
    console.log(`[start] Raum ${ws.roomId} gestartet`);
  }
}
 
export class ProgressCommand implements Command {
  execute(ws: ExtendedWebSocket, msg: Message, rooms: Map<string, Room>): void {
    if (!ws.roomId) return;
 
    const room = rooms.get(ws.roomId);
    if (!room) return;
 
    const km = typeof msg.distance === "number" ? msg.distance : 0;
    room.progress.set(ws, km);

    if (km >= room.distance && !ws.finishedAt) {
      ws.finishedAt = Date.now();
  }
 
    broadcastLeaderboard(ws.roomId, rooms);
  }
}
 
export class LeaveCommand implements Command {
  execute(ws: ExtendedWebSocket, _msg: Message, rooms: Map<string, Room>): void {
    if (!ws.roomId) return;
 
    const room = rooms.get(ws.roomId);
    if (!room) return;
 
    room.clients.delete(ws);
 
    console.log(`[leave] "${ws.name}" hat Raum ${ws.roomId} verlassen (bleibt im Board)`);
 
    if (room.clients.size === 0) {
      rooms.delete(ws.roomId);
      console.log(`[room] Raum ${ws.roomId} gelöscht`);
    } else {
      broadcastLeaderboard(ws.roomId, rooms);
    }
  }
}
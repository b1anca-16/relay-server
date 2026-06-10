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
  buildParticipantList
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
 
    rooms.set(token, {
      clients: new Set([ws]),
      names: new Map([[ws, name]]),
      host: ws,
    });
 
    ws.roomId = token;
    ws.name = name;
    ws.role = "HOST";
 
    ws.send(JSON.stringify({ action: "created", token }));
    broadcastParticipants(token, rooms);
    console.log(`[create] Room ${token} by "${name}"`);
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
 
    ws.send(JSON.stringify({ 
    action: "joined", 
    token: roomId,
    participants: buildParticipantList(room)  // ← direkt mitsenden
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
  execute(ws: ExtendedWebSocket, msg: Message, rooms: Map<string, Room>): void {
    if (!ws.roomId) return sendError(ws, "Nicht in einem Raum");

    const room = rooms.get(ws.roomId);
    if (!room) return sendError(ws, "Room nicht gefunden");

    if (ws !== room.host) return sendError(ws, "Nur der Host kann starten");

    room.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify({ action: "started" }));
      }
    });

    console.log(`[start] Raum ${ws.roomId} gestartet`);
  }
}
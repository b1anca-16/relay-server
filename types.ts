import { WebSocket } from "ws";

export type ExtendedWebSocket = WebSocket & {
  roomId?: string;
  name?: string;
  role?: "HOST" | "JOIN";
};

export interface Room {
  clients: Set<ExtendedWebSocket>;
  names: Map<ExtendedWebSocket, string>;
  host: ExtendedWebSocket | null;
  distance: number;
}

export interface Message {
  action: string;
  room?: string;
  name?: string;
  distance?: number;
  data?: unknown;
}

export interface Participant {
  name: string;
  role: "HOST" | "JOIN";
}

export interface Command {
  execute(
    ws: ExtendedWebSocket,
    msg: Message,
    rooms: Map<string, Room>
  ): void;
}
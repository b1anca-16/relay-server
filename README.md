# Runnerup Relay Server

This relay server is part of the **Runner** project and is required to enable local community features.

Without this server, the multiplayer and real-time features in Runnerup will not work.

---

## Purpose

The server provides a WebSocket relay instance and manages:

- Rooms (create, join, leave)
- Participant synchronization
- Host management
- Live leaderboards
- Real-time updates (progress, refresh, etc.)
- Command handling via a registry system

---

## Requirements

- Node.js (recommended: LTS version)
- npm or npx
- TypeScript runtime via `tsx`

---

## Starting the Server

In the project directory:

```bash
npx tsx server.ts

# Runnerup Relay Server

Dieser Relay-Server gehört zum Projekt **Runner** und wird benötigt, um die Community-Features lokal bereitzustellen.

Ohne diesen Server funktionieren die Multiplayer- bzw. Echtzeit-Funktionen in Runnerup nicht.

---

## 🚀 Zweck

Der Server stellt eine WebSocket-Relay-Instanz bereit und verwaltet:

- Rooms (Erstellen, Beitreten, Verlassen)
- Teilnehmer-Synchronisation
- Host-Management
- Live-Leaderboards
- Echtzeit-Updates (Progress, Refresh etc.)
- Command-Handling über ein Registry-System

---

## Voraussetzungen

- Node.js (empfohlen: LTS Version)
- npm oder npx
- TypeScript Runtime über `tsx`

---

## ▶️ Starten des Servers

Im Projektverzeichnis:

```bash
npx tsx server.ts

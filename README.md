# WorldSync Lite 🎮

A real-time multiplayer game prototype built with Node.js, TypeScript, Express, and Socket.IO. Players can create or join rooms, move around a shared 2D arena, see other players in real time, and recover their sessions after a temporary disconnection.

## Features

- **Real-time multiplayer:** Synchronizes player positions using Socket.IO.
- **Room management:** Create rooms and join existing rooms using a room ID.
- **Room isolation:** Players receive game-state updates for their own room.
- **Room capacity:** Supports up to three players per room.
- **Authoritative movement:** The server validates movement inputs and calculates player positions.
- **Fixed-rate game loop:** Updates game state approximately 20 times per second.
- **2D game arena:** Renders players on an HTML canvas.
- **Keyboard controls:** Supports WASD and arrow keys.
- **Session recovery:** Allows a player to recover their session within a 30-second grace period.
- **Room lifecycle management:** Removes expired players and empty rooms.
- **Health endpoint:** Provides an endpoint for checking server availability.

## Tech Stack

- Node.js
- TypeScript
- Express
- Socket.IO
- HTML, CSS, and JavaScript
- HTML Canvas

## Project Structure

```text
worldSync/
├── backend/
│   ├── src/
│   │   ├── config/
│   │   │   └── game.config.ts
│   │   ├── types/
│   │   │   └── game.types.ts
│   │   ├── routes/
│   │   │   └── health.routes.ts
│   │   ├── rooms/
│   │   │   └── room.manager.ts
│   │   ├── game/
│   │   │   └── game.engine.ts
│   │   ├── sockets/
│   │   │   └── socket.handlers.ts
│   │   └── server.ts
│   ├── package.json
│   ├── package-lock.json
│   ├── tsconfig.json
│   └── .gitignore
└── frontend/
    └── index.html
```

## How to Play

1. Open the game in a browser.
2. Click **Create Room** to create a room.
3. Share the generated room ID with other players.
4. Open additional browser tabs or windows.
5. Join the same room using its room ID.
6. Use WASD or the arrow keys to move.
7. Observe other players moving in real time.
8. Refresh a player tab and test session recovery within 30 seconds.

A room supports up to three players.

## Architecture

### 1. Frontend

The browser provides the room controls, keyboard input, player status, and canvas renderer. It sends movement directions to the backend and renders the latest game-state snapshots.

### 2. Socket.IO communication

Socket.IO provides bidirectional communication between clients and the server. It carries room-management events, movement inputs, player lifecycle events, and game-state snapshots.

### 3. Game engine

The game engine manages player records and calculates their positions. It validates movement directions and constrains players to the configured arena boundaries.

### 4. Room manager

The room manager creates rooms, tracks their members, enforces capacity, and removes rooms when they become empty.

### 5. Game loop

The server runs an update loop at approximately 20 ticks per second. It updates player positions and broadcasts snapshots to each room.

### 6. Session recovery

The server issues session tokens and temporarily retains disconnected player records. A returning client can reclaim its previous session during the configured grace period.

## Socket.IO Events

### Client-to-server events

| Event | Purpose |
|---|---|
| `room:create` | Create a room |
| `room:join` | Join a room using its ID |
| `player:move` | Submit movement directions |
| `player:stop` | Stop movement |

### Server-to-client events

| Event | Purpose |
|---|---|
| `player:welcome` | Send player identity and session information |
| `room:joined` | Confirm room membership and provide room state |
| `room:player-joined` | Notify room members of a joining player |
| `room:player-left` | Notify room members of a departing player |
| `room:error` | Report room-related errors |
| `game:error` | Report game-related errors |
| `game:state` | Broadcast the latest room game state |

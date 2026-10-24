
import express from "express";
import { createServer } from "node:http";
import { Server } from "socket.io";
import healthRoutes from "./routes/health.routes.js";
import { registerSocketHandlers } from "./sockets/socket.handlers.js";
import { updatePlayerPositions, players, } from "./game/game.engine.js";
import { getAllRooms, getRoomPlayers, } from "./rooms/room.manager.js";
import { GAME_CONFIG } from "./config/game.config.js";

const app = express();

app.use(express.static("../frontend"));
app.use(healthRoutes);

const httpServer = createServer(app);
const io = new Server(httpServer);

registerSocketHandlers(io);

const TICK_INTERVAL = 1000 / GAME_CONFIG.tickRate;
let previousTick = Date.now();

setInterval(() => {
  const now = Date.now();
  const deltaMs = now - previousTick;
  previousTick = now;

  updatePlayerPositions(deltaMs);

  for (const room of getAllRooms()) {
    io.to(room.id).emit("game:state", {
      roomId: room.id,
      players: getRoomPlayers(room, players),
      timestamp: now,
    });
  }
}, TICK_INTERVAL);

const PORT = 3000;

httpServer.listen(PORT, () => {
  console.log(`WorldSync Lite running at http://localhost:${PORT}`);
});


import express from "express";
import { createServer } from "node:http";
import { Server } from "socket.io";
import healthRoutes from "./routes/health.routes.js";
import { registerSocketHandlers } from "./sockets/socket.handlers.js";

const app = express();

app.use(express.static("../frontend"));
app.use(healthRoutes);

const httpServer = createServer(app);
const io = new Server(httpServer);

registerSocketHandlers(io);

const PORT = 3000;

httpServer.listen(PORT, () => {
  console.log(`WorldSync Lite running at http://localhost:${PORT}`);
});

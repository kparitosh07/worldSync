import type { Server, Socket } from "socket.io";
import {createPlayer,getPlayer,players,removePlayer,} from "../game/game.engine.js";
import {addPlayerToRoom,createRoom,getRoom,getRoomPlayers,removePlayerFromRoom,} from "../rooms/room.manager.js";

interface JoinRoomPayload {
    roomId?: unknown;
}

export function registerSocketHandlers(io: Server): void {
    io.on("connection", (socket: Socket) => {
        const player = createPlayer(socket.id);

        socket.data.playerId = player.id;

        socket.emit("player:welcome", {
            playerId: player.id,
            x: player.x,
            y: player.y,
        });

        console.log(`Player connected: ${player.id}`);

        socket.on("room:create", () => {
            const currentPlayer = getPlayer(socket.data.playerId as string);

            if (!currentPlayer) {
                socket.emit("room:error", { message: "Player not found." });
                return;
            }

            if (currentPlayer.roomId) {
                socket.emit("room:error", {
                    message: "You are already in a room.",
                });
                return;
            }

            const room = createRoom(currentPlayer);
            socket.join(room.id);

            socket.emit("room:joined", {
                roomId: room.id,
                players: getRoomPlayers(room, players),
                maxPlayers: room.maxPlayers,
            });

            console.log(`Room created: ${room.id}`);
        });

        socket.on("room:join", (payload: JoinRoomPayload) => {
            const currentPlayer = getPlayer(socket.data.playerId as string);

            if (!currentPlayer) {
                socket.emit("room:error", { message: "Player not found." });
                return;
            }

            if (currentPlayer.roomId) {
                socket.emit("room:error", {
                    message: "You are already in a room.",
                });
                return;
            }

            if (
                typeof payload?.roomId !== "string" ||
                !/^[A-Z0-9-]{1,64}$/i.test(payload.roomId)
            ) {
                socket.emit("room:error", { message: "Invalid room ID." });
                return;
            }

            const room = getRoom(payload.roomId.toUpperCase());

            if (!room) {
                socket.emit("room:error", { message: "Room does not exist." });
                return;
            }

            if (!addPlayerToRoom(room, currentPlayer)) {
                socket.emit("room:error", { message: "Room is full." });
                return;
            }

            socket.join(room.id);

            socket.emit("room:joined", {
                roomId: room.id,
                players: getRoomPlayers(room, players),
                maxPlayers: room.maxPlayers,
            });

            socket.to(room.id).emit("room:player-joined", {
                playerId: currentPlayer.id,
                x: currentPlayer.x,
                y: currentPlayer.y,
            });

            console.log(`Player ${currentPlayer.id} joined room ${room.id}`);
        });

        socket.on("disconnect", () => {
            const playerId = socket.data.playerId as string | undefined;

            if (!playerId) return;

            const disconnectedPlayer = getPlayer(playerId);

            if (!disconnectedPlayer) return;

            if (disconnectedPlayer.roomId) {
                const roomId = disconnectedPlayer.roomId;

                removePlayerFromRoom(roomId, disconnectedPlayer.id);

                io.to(roomId).emit("room:player-left", {
                    playerId: disconnectedPlayer.id,
                });
            }

            removePlayer(playerId);

            console.log(`Player disconnected: ${playerId}`);
        });
    });
}
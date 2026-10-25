import type { Server, Socket } from "socket.io";
import { createPlayer, getPlayer, players, removePlayer, setMovementInput, getPlayerBySessionToken } from "../game/game.engine.js";
import { addPlayerToRoom, createRoom, getRoom, getRoomPlayers, removePlayerFromRoom, } from "../rooms/room.manager.js";
import { GAME_CONFIG } from "../config/game.config.js";

interface JoinRoomPayload {
    roomId?: unknown;
}

export function registerSocketHandlers(io: Server): void {

    io.on("connection", (socket: Socket) => {
        const suppliedToken: unknown = socket.handshake.auth?.sessionToken;

        let player =
            typeof suppliedToken === "string"
                ? getPlayerBySessionToken(suppliedToken)
                : undefined;

        const matchedPlayer =
            typeof suppliedToken === "string"
                ? getPlayerBySessionToken(suppliedToken)
                : undefined;

        let recovered = false;

        if (player && !player.connected) {
            const timer = pendingRemovals.get(player.id);

            if (timer) {
                clearTimeout(timer);
                pendingRemovals.delete(player.id);
            }

            player.connected = true;
            player.socketId = socket.id;
            player.moveX = 0;
            player.moveY = 0;
            recovered = true;
        } else {
            player = createPlayer(socket.id);
        }

        socket.data.playerId = player.id;

        if (player.roomId) {
            socket.join(player.roomId);
        }

        socket.emit("player:welcome", {
            playerId: player.id,
            x: player.x,
            y: player.y,
            roomId: player.roomId ?? null,
            sessionToken: player.sessionToken,
            recovered,
        });

        if (recovered && player.roomId) {
            const room = getRoom(player.roomId);

            if (room) {
                socket.emit("room:joined", {
                    roomId: room.id,
                    players: getRoomPlayers(room, players),
                    maxPlayers: room.maxPlayers,
                });
            }
        }

        console.log(
            recovered
                ? `Player session recovered: ${player.id}`
                : `Player connected: ${player.id}`
        );

        socket.on("player:move", (payload: { dx?: unknown; dy?: unknown }) => {
            const playerId = socket.data.playerId as string | undefined;
            if (!playerId) {
                return;
            }
            const player = getPlayer(playerId);
            if (!player?.roomId) {
                socket.emit("game:error", {
                    message: "Join a room before moving.",
                });
                return;
            }

            const success = setMovementInput(
                playerId,
                payload?.dx,
                payload?.dy
            );

            if (!success) {
                socket.emit("game:error", {
                    message: "Invalid movement input.",
                });
            }
        }
        );

        socket.on("player:stop", () => {
            const playerId = socket.data.playerId as string | undefined;
            if (!playerId) {
                return;
            }
            setMovementInput(playerId, 0, 0);
        });

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

            io.to(room.id).emit("room:player-joined", {
                playerId: currentPlayer.id,
                x: currentPlayer.x,
                y: currentPlayer.y,
                players: getRoomPlayers(room, players),
                maxPlayers: room.maxPlayers,
            });

            console.log(`Player ${currentPlayer.id} joined room ${room.id}`);
        });

        socket.on("room:leave", () => {
            const playerId = socket.data.playerId as string | undefined;
            if (!playerId) return;

            const player = getPlayer(playerId);

            if (!player || !player.roomId) {
                socket.emit("room:error", {
                    message: "You are not in a room.",
                });
                return;
            }

            const roomId = player.roomId;
            const room = getRoom(roomId);

            player.moveX = 0;
            player.moveY = 0;
            player.roomId = undefined;

            removePlayerFromRoom(roomId, playerId);

            const remainingRoom = getRoom(roomId);

            if (remainingRoom) {
                io.to(roomId).emit("room:player-left", {
                    playerId,
                    players: getRoomPlayers(remainingRoom, players),
                    maxPlayers: remainingRoom.maxPlayers,
                });
            }

            socket.leave(roomId);
            socket.emit("room:left", { roomId });
            console.log(`Player ${playerId} left room ${roomId}`);
        });

        socket.on("disconnect", () => {
            const playerId = socket.data.playerId as string | undefined;
            if (!playerId) return;

            const player = getPlayer(playerId);
            if (!player || player.socketId !== socket.id) return;

            player.connected = false;
            player.moveX = 0;
            player.moveY = 0;

            console.log(`Player disconnected temporarily: ${playerId}`);

            const timer = setTimeout(() => {
                const currentPlayer = getPlayer(playerId);

                if (!currentPlayer || currentPlayer.connected) return;

                if (currentPlayer.roomId) {
                    const roomId = currentPlayer.roomId;
                    removePlayerFromRoom(roomId, playerId);
                    const room = getRoom(roomId);

                    if (room) {
                        io.to(roomId).emit("room:player-left", {
                            playerId,
                            players: getRoomPlayers(room, players),
                            maxPlayers: room.maxPlayers,
                        });
                    }
                }

                removePlayer(playerId);
                pendingRemovals.delete(playerId);
                console.log(`Player session expired: ${playerId}`);
            }, GAME_CONFIG.reconnectGracePeriodMs);
            pendingRemovals.set(playerId, timer);
        });
    });
}

const pendingRemovals = new Map<
    string,
    ReturnType<typeof setTimeout>
>();
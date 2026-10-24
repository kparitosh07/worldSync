import { randomUUID } from "node:crypto";
import type { GameRoom, Player } from "../types/game.types.js";
import { GAME_CONFIG } from "../config/game.config.js";

const rooms = new Map<string, GameRoom>();

export function createRoom(player: Player): GameRoom {
    const roomId = randomUUID().slice(0, 8).toUpperCase();
    const room: GameRoom = {
        id: roomId,
        playerIds: new Set([player.id]),
        maxPlayers: GAME_CONFIG.roomCapacity,
    };

    rooms.set(roomId, room);
    player.roomId = roomId;
    return room;
}

export function getRoom(roomId: string): GameRoom | undefined {
    return rooms.get(roomId);
}

export function addPlayerToRoom(
    room: GameRoom,
    player: Player
): boolean {
    if (room.playerIds.size >= room.maxPlayers) {
        return false;
    }

    room.playerIds.add(player.id);
    player.roomId = room.id;
    return true;
}

export function removePlayerFromRoom(
    roomId: string,
    playerId: string
): boolean {
    const room = rooms.get(roomId);
    if (!room) {
        return false;
    }
    room.playerIds.delete(playerId);
    if (room.playerIds.size === 0) {
        rooms.delete(roomId);
    }
    return true;
}

export function getRoomPlayers(
    room: GameRoom,
    players: Map<string, Player>
) {
    return Array.from(room.playerIds)
        .map((id) => players.get(id))
        .filter((player) => player !== undefined)
        .map((player) => ({
            playerId: player.id,
            x: player.x,
            y: player.y,
        }));
}

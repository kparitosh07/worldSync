import { randomUUID } from "node:crypto";
import type { Player } from "../types/game.types.js";

export const players = new Map<string, Player>();

export function createPlayer(socketId: string): Player {
    const player: Player = {
        id: randomUUID(),
        socketId,
        x: 100,
        y: 100,
        connectedAt: Date.now(),
    };

    players.set(player.id, player);
    return player;
}

export function getPlayer(playerId: string): Player | undefined {
    return players.get(playerId);
}

export function removePlayer(playerId: string): boolean {
    return players.delete(playerId);
}

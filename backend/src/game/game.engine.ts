
import { randomUUID } from "node:crypto";
import type { Player } from "../types/game.types.js";
import { GAME_CONFIG } from "../config/game.config.js";

export const players = new Map<string, Player>();

export function createPlayer(socketId: string): Player {
    const player: Player = {
        id: randomUUID(),
        socketId,
        x: 100,
        y: 100,
        connectedAt: Date.now(),
        moveX: 0,
        moveY: 0,
        sessionToken: randomUUID(),
        connected: true,
    };

    players.set(player.id, player);
    return player;
}

export function getPlayer(
    playerId: string
): Player | undefined {
    return players.get(playerId);
}

export function removePlayer(playerId: string): boolean {
    return players.delete(playerId);
}

export function setMovementInput(
    playerId: string,
    dx: unknown,
    dy: unknown
): boolean {
    const player = players.get(playerId);

    if (!player) {
        return false;
    }

    const validDirection = (value: unknown): value is number =>
        typeof value === "number" &&
        Number.isInteger(value) &&
        value >= -1 &&
        value <= 1;

    if (!validDirection(dx) || !validDirection(dy)) {
        return false;
    }

    player.moveX = dx;
    player.moveY = dy;

    return true;
}

export function updatePlayerPositions(deltaMs: number): void {
    if (!Number.isFinite(deltaMs) || deltaMs <= 0) {
        return;
    }

    const elapsedSeconds = Math.min(deltaMs, 100) / 1000;

    for (const player of players.values()) {
        if (!player.roomId) {
            continue;
        }

        let dx = player.moveX;
        let dy = player.moveY;

        const length = Math.hypot(dx, dy);

        if (length > 0) {
            dx /= length;
            dy /= length;
        }

        const distance = GAME_CONFIG.playerSpeed * elapsedSeconds;

        player.x = Math.max(
            0,
            Math.min(GAME_CONFIG.arenaWidth, player.x + dx * distance)
        );

        player.y = Math.max(
            0,
            Math.min(GAME_CONFIG.arenaHeight, player.y + dy * distance)
        );
    }
}

export function getPlayerBySessionToken(
  sessionToken: string
): Player | undefined {
  return Array.from(players.values()).find(
    (player) => player.sessionToken === sessionToken
  );
}
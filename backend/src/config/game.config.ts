export const GAME_CONFIG = {
  port: 3000,
  roomCapacity: 3,
  arenaWidth: 800,
  arenaHeight: 600,
  tickRate: 20,
  playerSpeed: 180,
  reconnectGracePeriodMs: 30_000,
} as const;

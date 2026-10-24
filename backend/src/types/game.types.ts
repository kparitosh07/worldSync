export interface Player {
  id: string;
  socketId: string;
  x: number;
  y: number;
  connectedAt: number;
  roomId?: string;
  moveX: number;
  moveY: number;
  sessionToken: string;
  connected: boolean;
}

export interface GameRoom {
  id: string;
  playerIds: Set<string>;
  maxPlayers: number;
}

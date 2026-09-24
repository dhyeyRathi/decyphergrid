import { WebSocket } from "ws";
import { getRoom, saveRoom } from "./roomStore";
import { serializeRoomForPlayer } from "./gameEngine";
import { Room } from "@/types/game";

export interface ConnectedClient {
  socket: WebSocket;
  playerId: string;
  roomCode: string;
}

// In-memory socket mapping per Vercel server instance / function runtime
const activeClients = new Map<string, ConnectedClient>();

/**
 * REGISTER A NATIVE WEBSOCKET CLIENT CONNECTION
 */
export function registerClient(socket: WebSocket, playerId: string, roomCode: string) {
  activeClients.set(playerId, { socket, playerId, roomCode });

  socket.on("close", () => {
    activeClients.delete(playerId);
  });
}

/**
 * UNREGISTER CLIENT CONNECTION
 */
export function unregisterClient(playerId: string) {
  activeClients.delete(playerId);
}

/**
 * BROADCAST VERCEL NATIVE WEBSOCKET STATE TO ALL ROOM PLAYERS
 */
export async function broadcastRoomState(roomCode: string, targetRoom?: Room | null): Promise<void> {
  const room = targetRoom || (await getRoom(roomCode));
  if (!room) return;

  // Save room state to shared ephemeral store (Upstash Redis / Memory)
  await saveRoom(room);

  // Send player-specific secret state over native WebSockets
  for (const player of room.players) {
    const client = activeClients.get(player.id);
    if (client && client.socket.readyState === WebSocket.OPEN) {
      const publicState = serializeRoomForPlayer(room, player.id);
      try {
        client.socket.send(
          JSON.stringify({
            type: "room_state",
            roomCode: room.code,
            state: publicState,
          })
        );
      } catch (err) {
        console.error(`[NativeWS] Error sending message to player ${player.id}:`, err);
      }
    }
  }
}

/**
 * SEND STATE TO A SINGLE PLAYER
 */
export async function sendPlayerState(playerId: string, roomCode: string): Promise<void> {
  const room = await getRoom(roomCode);
  if (!room) return;

  const client = activeClients.get(playerId);
  if (client && client.socket.readyState === WebSocket.OPEN) {
    const publicState = serializeRoomForPlayer(room, playerId);
    client.socket.send(
      JSON.stringify({
        type: "room_state",
        roomCode: room.code,
        state: publicState,
      })
    );
  }
}

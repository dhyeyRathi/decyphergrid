import { Room } from "@/types/game";

// In-memory fallback (only 1 server instance supported)
const globalInMemoryRooms = new Map<string, Room>();

/**
 * GET ROOM FROM STORE
 */
export async function getRoom(roomCode: string): Promise<Room | null> {
  const code = roomCode.toUpperCase().trim();
  return globalInMemoryRooms.get(code) || null;
}

/**
 * SAVE ROOM TO STORE
 */
export async function saveRoom(room: Room): Promise<void> {
  const code = room.code.toUpperCase().trim();
  globalInMemoryRooms.set(code, room);
}

/**
 * DELETE ROOM FROM STORE
 */
export async function deleteRoom(roomCode: string): Promise<void> {
  const code = roomCode.toUpperCase().trim();
  globalInMemoryRooms.delete(code);
}

// Rooms persist in memory until the server restarts or all players leave.

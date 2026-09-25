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

/**
 * Cleanup stale rooms (older than 12 hours)
 * Call this periodically if running a persistent server
 */
export async function cleanupStaleRooms(): Promise<void> {
  const now = Date.now();
  const maxAge = 12 * 60 * 60 * 1000; // 12 hours
  for (const [code, room] of globalInMemoryRooms.entries()) {
    if (now - room.createdAt > maxAge) {
      globalInMemoryRooms.delete(code);
    }
  }
}

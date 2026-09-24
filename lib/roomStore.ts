import { Redis } from "@upstash/redis";
import { Room } from "@/types/game";

// In-memory fallback for local dev when Upstash Redis env vars are not set
const globalInMemoryRooms = new Map<string, Room>();

function getRedisClient(): Redis | null {
  let url = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
  let token = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;

  if (url && token) {
    url = url.trim().replace(/^["']|["']$/g, "").trim();
    token = token.trim().replace(/^["']|["']$/g, "").trim();
    return new Redis({ url, token });
  }
  return null;
}

const redis = getRedisClient();

/**
 * GET ROOM FROM STORE
 */
export async function getRoom(roomCode: string): Promise<Room | null> {
  const code = roomCode.toUpperCase().trim();
  if (redis) {
    try {
      const data = await redis.get<Room>(`room:${code}`);
      return data || null;
    } catch (err) {
      console.error("[RoomStore] Redis getRoom error, falling back to memory:", err);
      return globalInMemoryRooms.get(code) || null;
    }
  }
  return globalInMemoryRooms.get(code) || null;
}

/**
 * SAVE ROOM TO STORE (TTL 24 HOURS)
 */
export async function saveRoom(room: Room): Promise<void> {
  const code = room.code.toUpperCase().trim();
  if (redis) {
    try {
      // 86400 seconds = 24 hours TTL for temporary rooms
      await redis.set(`room:${code}`, room, { ex: 86400 });
    } catch (err) {
      console.error("[RoomStore] Redis saveRoom error, saving to memory fallback:", err);
      globalInMemoryRooms.set(code, room);
    }
  } else {
    globalInMemoryRooms.set(code, room);
  }
}

/**
 * DELETE ROOM FROM STORE
 */
export async function deleteRoom(roomCode: string): Promise<void> {
  const code = roomCode.toUpperCase().trim();
  if (redis) {
    try {
      await redis.del(`room:${code}`);
    } catch (err) {
      console.error("[RoomStore] Redis deleteRoom error:", err);
    }
  }
  globalInMemoryRooms.delete(code);
}

import http from "http";
import { WebSocketServer, WebSocket } from "ws";
import {
  createRoomLogic,
  joinRoomLogic,
  setTeamAndRoleLogic,
  randomizeTeamsLogic,
  kickPlayerLogic,
  startGameLogic,
  submitClueLogic,
  selectCardLogic,
  endTurnLogic,
  resetGameLogic,
  leaveGameLogic,
  serializeRoomForPlayer,
} from "../lib/gameEngine";
import { getRoom, saveRoom } from "../lib/roomStore";

const PORT = process.env.PORT || 8080;

interface SocketClient {
  ws: WebSocket;
  playerId: string;
  roomCode: string;
  lastSeen: number; // timestamp of last activity
}

// Map of playerId -> SocketClient
const clients = new Map<string, SocketClient>();

// Create HTTP server for Health Checks & WS Upgrade
const server = http.createServer((req, res) => {
  if (req.url === "/health" || req.url === "/") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ status: "ok", service: "decyphergrid-ws", clients: clients.size }));
    return;
  }
  res.writeHead(404);
  res.end();
});

const wss = new WebSocketServer({ server });

/**
 * Broadcast updated room state to ALL connected players in the room
 */
async function broadcastRoomState(roomCode: string, roomObj?: any) {
  const room = roomObj || await getRoom(roomCode);
  if (!room) return;

  const code = room.code.toUpperCase().trim();
  console.log(`[BROADCAST] Room ${code}: ${room.players.length} players in room, ${clients.size} total clients`);

  for (const player of room.players) {
    const client = clients.get(player.id);
    if (client && client.ws.readyState === WebSocket.OPEN) {
      const publicState = serializeRoomForPlayer(room, player.id);
      try {
        client.ws.send(
          JSON.stringify({
            type: "room_state",
            roomCode: room.code,
            state: publicState,
          })
        );
        console.log(`[BROADCAST] ✅ Sent room_state to player ${player.id.substring(0, 6)}...`);
      } catch (err) {
        console.error(`[BROADCAST] ❌ Failed to send to player ${player.id.substring(0, 6)}:`, err);
      }
    } else {
      console.warn(`[BROADCAST] ⚠️ Player ${player.id.substring(0, 6)}... NOT found in clients or socket not open. InClients: ${clients.has(player.id)}, ReadyState: ${client?.ws?.readyState}`);
    }
  }
}

wss.on("connection", (ws: WebSocket) => {
  let clientPlayerId: string | null = null;
  let clientRoomCode: string | null = null;

  console.log(`[WS] New connection established. Total connections: ${wss.clients.size}`);

  ws.on("message", async (data: Buffer | string) => {
    try {
      const msg = JSON.parse(data.toString());

      // Register connection binding (roomCode + playerId)
      if (msg.type === "register" || msg.type === "init") {
        const { playerId, roomCode } = msg;
        if (playerId && roomCode) {
          const formattedCode = String(roomCode).toUpperCase().trim();
          const pid = String(playerId);

          // If this player already has a DIFFERENT socket registered, close the old one
          const existingClient = clients.get(pid);
          if (existingClient && existingClient.ws !== ws && existingClient.ws.readyState === WebSocket.OPEN) {
            console.log(`[REGISTER] Player ${pid.substring(0, 6)}... has stale socket, replacing.`);
          }

          clientPlayerId = pid;
          clientRoomCode = formattedCode;
          clients.set(pid, {
            ws,
            playerId: pid,
            roomCode: formattedCode,
            lastSeen: Date.now(),
          });

          console.log(`[REGISTER] Player ${pid.substring(0, 6)}... registered for room ${formattedCode}. Total clients: ${clients.size}`);

          // Send immediate state update to the registering client
          const room = await getRoom(formattedCode);
          if (room) {
            const publicState = serializeRoomForPlayer(room, pid);
            ws.send(
              JSON.stringify({
                type: "room_state",
                roomCode: room.code,
                state: publicState,
              })
            );
          }
        }
        return;
      }

      // Handle Application-level Pings (this is the heartbeat)
      if (msg.type === "ping") {
        const pid = String(msg.playerId);
        const client = clients.get(pid);
        if (client) {
          // Update the ws reference in case it changed
          client.lastSeen = Date.now();
          client.ws = ws;
          if (client.roomCode) {
            getRoom(client.roomCode).then((room) => {
              if (room) {
                const publicState = serializeRoomForPlayer(room, pid);
                ws.send(JSON.stringify({ type: "room_state", roomCode: room.code, state: publicState }));
              } else {
                ws.send(JSON.stringify({ type: "pong" }));
              }
            }).catch(() => {
              ws.send(JSON.stringify({ type: "pong" }));
            });
            return;
          }
        } else {
          // Client not registered yet — register them from the ping
          if (clientPlayerId && clientRoomCode) {
            clients.set(clientPlayerId, {
              ws,
              playerId: clientPlayerId,
              roomCode: clientRoomCode,
              lastSeen: Date.now(),
            });
          }
        }
        ws.send(JSON.stringify({ type: "pong" }));
        return;
      }

      // Process Game Actions
      if (msg.type === "action") {
        const {
          action,
          roomCode,
          playerName,
          playerId,
          team,
          role,
          adminId,
          targetPlayerId,
          word,
          number,
          cardId,
        } = msg;

        if (playerId) clientPlayerId = String(playerId);
        if (roomCode) clientRoomCode = String(roomCode).toUpperCase().trim();

        // ALWAYS ensure socket mapping is current
        if (clientPlayerId && clientRoomCode) {
          clients.set(clientPlayerId, {
            ws,
            playerId: clientPlayerId,
            roomCode: clientRoomCode,
            lastSeen: Date.now(),
          });
        }

        const code = (clientRoomCode || String(roomCode) || "").toUpperCase().trim();

        // --- CREATE ROOM ---
        if (action === "create_room") {
          const { room, player } = createRoomLogic(playerName, playerId, code);
          await saveRoom(room);

          clientPlayerId = player.id;
          clientRoomCode = room.code;
          clients.set(player.id, { ws, playerId: player.id, roomCode: room.code, lastSeen: Date.now() });

          console.log(`[ACTION] Room ${room.code} created by ${player.id.substring(0, 6)}...`);

          const state = serializeRoomForPlayer(room, player.id);
          ws.send(
            JSON.stringify({
              type: "action_response",
              action,
              success: true,
              roomCode: room.code,
              state,
            })
          );
          return;
        }

        if (!clientRoomCode && !roomCode) {
          ws.send(JSON.stringify({ type: "action_response", action, success: false, error: "Room code required" }));
          return;
        }

        let room = await getRoom(code);

        // --- JOIN ROOM ---
        if (action === "join_room") {
          if (!room) {
            ws.send(JSON.stringify({ type: "action_response", action, success: false, error: "Room not found" }));
            return;
          }
          const { room: updatedRoom, player } = joinRoomLogic(room, playerName, playerId);
          await saveRoom(updatedRoom);

          clientPlayerId = player.id;
          clientRoomCode = code;
          clients.set(player.id, { ws, playerId: player.id, roomCode: code, lastSeen: Date.now() });

          console.log(`[ACTION] Player ${player.id.substring(0, 6)}... joined room ${code}. Players: ${updatedRoom.players.map(p => p.id.substring(0, 6)).join(", ")}`);

          const state = serializeRoomForPlayer(updatedRoom, player.id);
          ws.send(
            JSON.stringify({
              type: "action_response",
              action,
              success: true,
              roomCode: code,
              state,
            })
          );
          // Broadcast AFTER sending action_response so the joiner is definitely in clients
          await broadcastRoomState(code, updatedRoom);
          return;
        }

        // --- LEAVE GAME ---
        if (action === "leave_game") {
          if (!room) return;
          const updatedRoom = leaveGameLogic(room, playerId || "");
          await saveRoom(updatedRoom);

          if (clientPlayerId) {
            clients.delete(clientPlayerId);
          }

          ws.send(JSON.stringify({ type: "action_response", action, success: true }));
          await broadcastRoomState(code, updatedRoom);
          return;
        }

        if (!room) {
          ws.send(JSON.stringify({ type: "action_response", action, success: false, error: "Room not found" }));
          return;
        }

        // --- GET STATE ---
        if (action === "get_state") {
          const state = serializeRoomForPlayer(room, playerId || "");
          ws.send(JSON.stringify({ type: "action_response", action, success: true, roomCode: code, state }));
          return;
        }

        // --- GAME ACTIONS ---
        if (action === "set_team_role") {
          room = setTeamAndRoleLogic(room, playerId, team, role);
        } else if (action === "randomize_teams") {
          room = randomizeTeamsLogic(room);
        } else if (action === "kick_player") {
          room = kickPlayerLogic(room, adminId, targetPlayerId);
        } else if (action === "start_game") {
          room = startGameLogic(room, adminId);
        } else if (action === "submit_clue") {
          room = submitClueLogic(room, playerId, word, number);
        } else if (action === "select_card") {
          room = selectCardLogic(room, playerId, cardId);
        } else if (action === "end_turn") {
          room = endTurnLogic(room, playerId);
        } else if (action === "play_again") {
          room = resetGameLogic(room);
        } else {
          ws.send(JSON.stringify({ type: "action_response", action, success: false, error: "Invalid action" }));
          return;
        }

        // Save & Broadcast to ALL players in the room
        await saveRoom(room);

        console.log(`[ACTION] ${action} in room ${code} by ${(playerId || "unknown").substring(0, 6)}...`);

        // Send action_response to the acting player FIRST
        const state = serializeRoomForPlayer(room, playerId || "");
        ws.send(
          JSON.stringify({
            type: "action_response",
            action,
            success: true,
            roomCode: code,
            state,
          })
        );

        // Then broadcast to ALL players (including the acting player, so everyone is in sync)
        await broadcastRoomState(code, room);
      }
    } catch (err: any) {
      console.error("[WebSocket Server Error]", err);
      ws.send(
        JSON.stringify({
          type: "error",
          error: err.message || "Server error processing action",
        })
      );
    }
  });

  ws.on("close", () => {
    console.log(`[WS] Connection closed for player ${clientPlayerId?.substring(0, 6) || "unknown"}`);
    if (clientPlayerId) {
      const currentClient = clients.get(clientPlayerId);
      // Only delete if this exact ws is the one registered (prevents race with reconnect)
      if (currentClient && currentClient.ws === ws) {
        clients.delete(clientPlayerId);
        console.log(`[WS] Removed player ${clientPlayerId.substring(0, 6)}... from clients. Remaining: ${clients.size}`);
      }
    }
  });
});

// Cleanup: remove clients that haven't been seen in 60 seconds
// (No more protocol-level ping/pong — we rely on the 10s app-level ping from the client)
const cleanupInterval = setInterval(() => {
  const now = Date.now();
  const timeout = 60000; // 60 seconds
  for (const [playerId, client] of clients.entries()) {
    if (now - client.lastSeen > timeout) {
      console.log(`[CLEANUP] Player ${playerId.substring(0, 6)}... timed out (${Math.round((now - client.lastSeen) / 1000)}s). Removing.`);
      try { client.ws.terminate(); } catch {}
      clients.delete(playerId);
    }
  }
}, 30000);

wss.on("close", () => {
  clearInterval(cleanupInterval);
});

server.listen(PORT, () => {
  console.log(`🚀 Decyphergrid WebSocket Server running on port ${PORT}`);
});

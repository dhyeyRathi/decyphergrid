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
  isAlive: boolean;
}

// Map of playerId -> SocketClient
const clients = new Map<string, SocketClient>();

// Create HTTP server for Koyeb Health Checks & WS Upgrade
const server = http.createServer((req, res) => {
  if (req.url === "/health" || req.url === "/") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ status: "ok", service: "decyphergrid-ws" }));
    return;
  }
  res.writeHead(404);
  res.end();
});

const wss = new WebSocketServer({ server });

/**
 * Broadcast updated room state to all connected players in the room
 */
async function broadcastRoomState(roomCode: string, roomObj?: any) {
  const room = roomObj || await getRoom(roomCode);
  if (!room) return;

  for (const player of room.players) {
    const client = clients.get(player.id);
    if (client && client.ws.readyState === WebSocket.OPEN) {
      const publicState = serializeRoomForPlayer(room, player.id);
      client.ws.send(
        JSON.stringify({
          type: "room_state",
          roomCode: room.code,
          state: publicState,
        })
      );
    }
  }
}

wss.on("connection", (ws: WebSocket) => {
  let clientPlayerId: string | null = null;
  let clientRoomCode: string | null = null;

  ws.on("message", async (data: Buffer | string) => {
    try {
      const msg = JSON.parse(data.toString());

      // Ping / Pong heartbeat
      if (msg.type === "ping") {
        if (clientPlayerId && clients.has(clientPlayerId)) {
          const c = clients.get(clientPlayerId)!;
          c.isAlive = true;
        }
        ws.send(JSON.stringify({ type: "pong" }));
        return;
      }

      // Register connection binding (roomCode + playerId)
      if (msg.type === "register" || msg.type === "init") {
        const { playerId, roomCode } = msg;
        if (playerId && roomCode) {
          const formattedCode = String(roomCode).toUpperCase().trim();
          const pid = String(playerId);
          clientPlayerId = pid;
          clientRoomCode = formattedCode;
          clients.set(pid, {
            ws,
            playerId: pid,
            roomCode: formattedCode,
            isAlive: true,
          });

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

      // Handle Application-level Pings
      if (msg.type === "ping") {
        const client = clients.get(msg.playerId);
        if (client) {
          client.isAlive = true;
          if (client.roomCode) {
            getRoom(client.roomCode).then((room) => {
              if (room) {
                const publicState = serializeRoomForPlayer(room, msg.playerId);
                ws.send(JSON.stringify({ type: "room_state", roomCode: room.code, state: publicState }));
              } else {
                ws.send(JSON.stringify({ type: "pong" }));
              }
            }).catch(() => {
              ws.send(JSON.stringify({ type: "pong" }));
            });
            return;
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

        // Ensure socket mapping is set
        if (clientPlayerId && clientRoomCode) {
          clients.set(clientPlayerId, {
            ws,
            playerId: clientPlayerId,
            roomCode: clientRoomCode,
            isAlive: true,
          });
        }

        const code = (clientRoomCode || String(roomCode) || "").toUpperCase().trim();

        // --- CREATE ROOM ---
        if (action === "create_room") {
          const { room, player } = createRoomLogic(playerName, playerId, code);
          saveRoom(room).catch(console.error);

          clientPlayerId = player.id;
          clientRoomCode = room.code;
          clients.set(player.id, { ws, playerId: player.id, roomCode: room.code, isAlive: true });

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
          broadcastRoomState(room.code, room);
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
          saveRoom(updatedRoom).catch(console.error);

          clientPlayerId = player.id;
          clientRoomCode = code;
          clients.set(player.id, { ws, playerId: player.id, roomCode: code, isAlive: true });

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
          broadcastRoomState(code, updatedRoom);
          return;
        }

        // --- LEAVE GAME ---
        if (action === "leave_game") {
          if (!room) return;
          const updatedRoom = leaveGameLogic(room, playerId || "");
          saveRoom(updatedRoom).catch(console.error);

          // Disconnect client from clients map manually since they are leaving
          if (clientPlayerId) {
            clients.delete(clientPlayerId);
          }

          ws.send(JSON.stringify({ type: "action_response", action, success: true }));
          broadcastRoomState(code, updatedRoom);
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

        // Save & Broadcast
        saveRoom(room).catch(console.error);
        broadcastRoomState(code, room);

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

  ws.on("pong", () => {
    if (clientPlayerId) {
      const client = clients.get(clientPlayerId);
      if (client) client.isAlive = true;
    }
  });

  ws.on("close", () => {
    if (clientPlayerId) {
      const currentClient = clients.get(clientPlayerId);
      if (currentClient && currentClient.ws === ws) {
        clients.delete(clientPlayerId);
      }
    }
  });
});

// Periodic ping/pong cleanup every 30s to keep Koyeb connection healthy
const interval = setInterval(() => {
  for (const [playerId, client] of clients.entries()) {
    if (!client.isAlive) {
      client.ws.terminate();
      clients.delete(playerId);
    } else {
      client.isAlive = false;
      client.ws.ping();
    }
  }
}, 30000);

wss.on("close", () => {
  clearInterval(interval);
});

server.listen(PORT, () => {
  console.log(`🚀 Decyphergrid Koyeb WebSocket Server running on port ${PORT}`);
});

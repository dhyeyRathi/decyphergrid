import type * as Party from "partykit/server";
import {
  Room,
  PublicRoomState,
} from "../types/game";
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
  serializeRoomForPlayer,
} from "../lib/gameEngine";

export default class DecypherParty implements Party.Server {
  constructor(readonly party: Party.Party) {}

  /**
   * Helper to load room state from Party Storage (persistent per room)
   */
  async getRoom(): Promise<Room | null> {
    return (await this.party.storage.get<Room>("room")) || null;
  }

  /**
   * Helper to save room state
   */
  async saveRoom(room: Room): Promise<void> {
    await this.party.storage.put("room", room);
  }

  /**
   * Broadcast state tailored for each player in the room
   */
  async broadcastState(room: Room): Promise<void> {
    for (const conn of this.party.getConnections()) {
      const connState = (conn.state as { playerId?: string }) || {};
      const playerId = connState.playerId || "";
      const publicState = serializeRoomForPlayer(room, playerId);

      conn.send(
        JSON.stringify({
          type: "room_state",
          roomCode: room.code,
          state: publicState,
        })
      );
    }
  }

  /**
   * Send state to a single connection
   */
  sendStateToConnection(conn: Party.Connection, room: Room, playerId: string) {
    const publicState = serializeRoomForPlayer(room, playerId);
    conn.send(
      JSON.stringify({
        type: "room_state",
        roomCode: room.code,
        state: publicState,
      })
    );
  }

  async onConnect(conn: Party.Connection, ctx: Party.ConnectionContext) {
    // Extract query parameters if present
    const url = new URL(ctx.request.url);
    const playerId = url.searchParams.get("playerId") || "";

    if (playerId) {
      conn.setState({ playerId });
    }

    // If room already exists, send initial state to the joining connection
    const room = await this.getRoom();
    if (room) {
      this.sendStateToConnection(conn, room, playerId);
    }
  }

  async onMessage(message: string, sender: Party.Connection) {
    try {
      const data = JSON.parse(message);
      const {
        type,
        action,
        playerName,
        playerId,
        team,
        role,
        adminId,
        targetPlayerId,
        word,
        number,
        cardId,
      } = data;

      // Bind connection state
      if (playerId) {
        sender.setState({ playerId });
      }

      const activePlayerId = playerId || (sender.state as { playerId?: string })?.playerId || "";

      // Initialize connection / bind
      if (type === "register" || type === "init") {
        const room = await this.getRoom();
        if (room) {
          this.sendStateToConnection(sender, room, activePlayerId);
        }
        return;
      }

      // Handle Game Actions
      if (type === "action" || action) {
        const targetAction = action || type;
        let room = await this.getRoom();

        // --- CREATE ROOM ---
        if (targetAction === "create_room") {
          const { room: newRoom, player } = createRoomLogic(playerName, activePlayerId);
          await this.saveRoom(newRoom);
          sender.setState({ playerId: player.id });

          sender.send(
            JSON.stringify({
              type: "action_response",
              action: targetAction,
              success: true,
              roomCode: newRoom.code,
              state: serializeRoomForPlayer(newRoom, player.id),
            })
          );
          await this.broadcastState(newRoom);
          return;
        }

        // --- JOIN ROOM ---
        if (targetAction === "join_room") {
          if (!room) {
            // If room doesn't exist in Party storage yet, create it on the fly
            const { room: newRoom, player } = createRoomLogic(playerName, activePlayerId);
            newRoom.code = this.party.id.toUpperCase();
            await this.saveRoom(newRoom);
            sender.setState({ playerId: player.id });

            sender.send(
              JSON.stringify({
                type: "action_response",
                action: targetAction,
                success: true,
                roomCode: newRoom.code,
                state: serializeRoomForPlayer(newRoom, player.id),
              })
            );
            await this.broadcastState(newRoom);
            return;
          }

          const { room: updatedRoom, player } = joinRoomLogic(room, playerName, activePlayerId);
          await this.saveRoom(updatedRoom);
          sender.setState({ playerId: player.id });

          sender.send(
            JSON.stringify({
              type: "action_response",
              action: targetAction,
              success: true,
              roomCode: updatedRoom.code,
              state: serializeRoomForPlayer(updatedRoom, player.id),
            })
          );
          await this.broadcastState(updatedRoom);
          return;
        }

        if (!room) {
          sender.send(
            JSON.stringify({
              type: "action_response",
              action: targetAction,
              success: false,
              error: "Room not found",
            })
          );
          return;
        }

        // --- GAME ACTIONS ---
        if (targetAction === "set_team_role") {
          room = setTeamAndRoleLogic(room, activePlayerId, team, role);
        } else if (targetAction === "randomize_teams") {
          room = randomizeTeamsLogic(room);
        } else if (targetAction === "kick_player") {
          room = kickPlayerLogic(room, adminId, targetPlayerId);
        } else if (targetAction === "start_game") {
          room = startGameLogic(room, adminId);
        } else if (targetAction === "submit_clue") {
          room = submitClueLogic(room, activePlayerId, word, number);
        } else if (targetAction === "select_card") {
          room = selectCardLogic(room, activePlayerId, cardId);
        } else if (targetAction === "end_turn") {
          room = endTurnLogic(room, activePlayerId);
        } else if (targetAction === "play_again") {
          room = resetGameLogic(room);
        } else if (targetAction === "get_state") {
          this.sendStateToConnection(sender, room, activePlayerId);
          return;
        } else {
          sender.send(
            JSON.stringify({
              type: "action_response",
              action: targetAction,
              success: false,
              error: "Invalid action",
            })
          );
          return;
        }

        // Save updated room & broadcast to all room connections
        await this.saveRoom(room);
        await this.broadcastState(room);
      }
    } catch (err: any) {
      console.error("[PartyKit Server Error]", err);
      sender.send(
        JSON.stringify({
          type: "error",
          error: err.message || "Failed to process PartyKit action",
        })
      );
    }
  }
}

DecypherParty satisfies Party.Worker;

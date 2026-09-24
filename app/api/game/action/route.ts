import { NextResponse } from "next/server";
import { getRoom, saveRoom } from "@/lib/roomStore";
import {
  createRoomLogic,
  joinRoomLogic,
  setTeamAndRoleLogic,
  randomizeTeamsLogic,
  addTestBotsLogic,
  kickPlayerLogic,
  startGameLogic,
  submitClueLogic,
  selectCardLogic,
  endTurnLogic,
  resetGameLogic,
  serializeRoomForPlayer,
} from "@/lib/gameEngine";
import { broadcastRoomState } from "@/lib/realtimeServer";

export async function POST(req: Request) {
  try {
    const body = await req.json();
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
    } = body;

    // --- CREATE ROOM ---
    if (action === "create_room") {
      const { room, player } = createRoomLogic(playerName, playerId);
      await saveRoom(room);
      await broadcastRoomState(room.code, room);
      return NextResponse.json({
        success: true,
        roomCode: room.code,
        player,
        state: serializeRoomForPlayer(room, player.id),
      });
    }

    if (!roomCode) {
      return NextResponse.json({ success: false, error: "Room code required" }, { status: 400 });
    }

    const code = roomCode.toUpperCase().trim();
    let room = await getRoom(code);

    // --- JOIN ROOM ---
    if (action === "join_room") {
      if (!room) {
        return NextResponse.json({ success: false, error: "Room not found. Please check room code." }, { status: 404 });
      }
      const { room: updatedRoom, player } = joinRoomLogic(room, playerName, playerId);
      await saveRoom(updatedRoom);
      await broadcastRoomState(code, updatedRoom);
      return NextResponse.json({
        success: true,
        roomCode: code,
        player,
        state: serializeRoomForPlayer(updatedRoom, player.id),
      });
    }

    if (!room) {
      return NextResponse.json({ success: false, error: "Room not found" }, { status: 404 });
    }

    // --- GET STATE / RECONNECT ---
    if (action === "get_state") {
      const state = serializeRoomForPlayer(room, playerId || "");
      return NextResponse.json({ success: true, roomCode: code, state });
    }

    // --- GAME ACTIONS ---
    if (action === "set_team_role") {
      room = setTeamAndRoleLogic(room, playerId, team, role);
    } else if (action === "randomize_teams") {
      room = randomizeTeamsLogic(room);
    } else if (action === "add_test_bots") {
      room = addTestBotsLogic(room);
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
      return NextResponse.json({ success: false, error: "Invalid action" }, { status: 400 });
    }

    // Save and broadcast updated state
    await saveRoom(room);
    await broadcastRoomState(code, room);

    const state = serializeRoomForPlayer(room, playerId || "");
    return NextResponse.json({ success: true, roomCode: code, state });
  } catch (err: any) {
    console.error("[Vercel Action Error]", err);
    return NextResponse.json({ success: false, error: err.message || "Action failed" }, { status: 400 });
  }
}

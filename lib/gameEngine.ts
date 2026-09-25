import {
  Room,
  Player,
  GameState,
  Card,
  CardType,
  Team,
  Role,
  PublicRoomState,
  PublicCard,
  PublicGameState,
  GameLog,
} from "@/types/game";
import { WORD_POOL } from "@/lib/words";

// Generate unique 6-character room code
export function generateRoomCode(): string {
  const chars = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

// Generate random player ID
export function generateId(): string {
  return Math.random().toString(36).substring(2, 9) + Date.now().toString(36);
}

// Helper to shuffle array in place (Fisher-Yates)
function shuffle<T>(array: T[]): T[] {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// Helper to sanitize player display name
function sanitizeName(name: string): string {
  const trimmed = name.trim();
  if (!trimmed) return "Player";
  return trimmed.substring(0, 20);
}

// Helper to add log to game
function addLog(
  game: GameState,
  type: GameLog["type"],
  message: string,
  team?: Team
): void {
  const log: GameLog = {
    id: generateId(),
    timestamp: Date.now(),
    type,
    message,
    team,
  };
  game.logs.push(log);
  if (game.logs.length > 100) {
    game.logs.shift();
  }
}

/**
 * CREATE ROOM LOGIC
 */
export function createRoomLogic(adminName: string, customPlayerId?: string, customRoomCode?: string): { room: Room; player: Player } {
  const code = customRoomCode || generateRoomCode();
  const playerId = customPlayerId || generateId();
  const cleanName = sanitizeName(adminName);

  const adminPlayer: Player = {
    id: playerId,
    socketId: "",
    name: cleanName,
    team: null,
    role: null,
    connected: true,
    isAdmin: true,
  };

  const newRoom: Room = {
    code,
    adminId: playerId,
    players: [adminPlayer],
    game: null,
    createdAt: Date.now(),
  };

  return { room: newRoom, player: adminPlayer };
}

/**
 * JOIN ROOM LOGIC
 */
export function joinRoomLogic(
  room: Room,
  playerName: string,
  customPlayerId?: string
): { room: Room; player: Player } {
  const cleanName = sanitizeName(playerName);
  const playerId = customPlayerId || generateId();

  let player = room.players.find((p) => p.id === playerId);

  if (player) {
    player.connected = true;
    player.name = cleanName;
  } else {
    let finalName = cleanName;
    let count = 1;
    while (room.players.some((p) => p.name.toLowerCase() === finalName.toLowerCase())) {
      count++;
      finalName = `${cleanName} (${count})`;
    }

    player = {
      id: playerId,
      socketId: "",
      name: finalName,
      team: null,
      role: null,
      connected: true,
      isAdmin: room.players.length === 0,
    };

    room.players.push(player);
  }

  // Update room admin if admin is disconnected
  if (!room.players.some((p) => p.id === room.adminId && p.connected)) {
    const firstConnected = room.players.find((p) => p.connected);
    if (firstConnected) {
      room.adminId = firstConnected.id;
      firstConnected.isAdmin = true;
    }
  }

  return { room, player };
}

/**
 * SET TEAM AND ROLE LOGIC
 */
export function setTeamAndRoleLogic(
  room: Room,
  playerId: string,
  team: Team | null,
  role: Role | null
): Room {
  const player = room.players.find((p) => p.id === playerId);
  if (!player) throw new Error("Player not found in room");

  if (team && role === "SPYMASTER") {
    const existingSpymaster = room.players.find(
      (p) => p.id !== playerId && p.team === team && p.role === "SPYMASTER"
    );
    if (existingSpymaster) {
      throw new Error(`${team} team already has a Spymaster (${existingSpymaster.name}).`);
    }
  }

  player.team = team;
  player.role = role;
  return room;
}

/**
 * RANDOMIZE TEAMS & ROLES LOGIC
 */
export function randomizeTeamsLogic(room: Room): Room {
  const activePlayers = shuffle(room.players.filter((p) => p.connected));
  if (activePlayers.length < 4) {
    throw new Error("Need at least 4 connected players to randomize teams.");
  }

  const half = Math.ceil(activePlayers.length / 2);
  const redPlayers = activePlayers.slice(0, half);
  const bluePlayers = activePlayers.slice(half);

  redPlayers.forEach((p, idx) => {
    p.team = "RED";
    p.role = idx === 0 ? "SPYMASTER" : "OPERATIVE";
  });

  bluePlayers.forEach((p, idx) => {
    p.team = "BLUE";
    p.role = idx === 0 ? "SPYMASTER" : "OPERATIVE";
  });

  return room;
}

/**
 * KICK PLAYER LOGIC
 */
export function kickPlayerLogic(room: Room, adminId: string, targetPlayerId: string): Room {
  if (room.adminId !== adminId) {
    throw new Error("Only the Room Admin can kick players.");
  }
  if (adminId === targetPlayerId) {
    throw new Error("Admin cannot kick themselves.");
  }

  const index = room.players.findIndex((p) => p.id === targetPlayerId);
  if (index !== -1) {
    room.players.splice(index, 1);
  }
  return room;
}

/**
 * START GAME LOGIC
 */
export function startGameLogic(room: Room, adminId: string): Room {
  if (room.adminId !== adminId) {
    throw new Error("Only the Room Admin can start the game.");
  }

  const redSpymaster = room.players.find((p) => p.team === "RED" && p.role === "SPYMASTER");
  const redOperatives = room.players.filter((p) => p.team === "RED" && p.role === "OPERATIVE");
  const blueSpymaster = room.players.find((p) => p.team === "BLUE" && p.role === "SPYMASTER");
  const blueOperatives = room.players.filter((p) => p.team === "BLUE" && p.role === "OPERATIVE");

  if (!redSpymaster) throw new Error("RED team needs a Spymaster!");
  if (redOperatives.length === 0) throw new Error("RED team needs at least 1 Operative!");
  if (!blueSpymaster) throw new Error("BLUE team needs a Spymaster!");
  if (blueOperatives.length === 0) throw new Error("BLUE team needs at least 1 Operative!");

  const selectedWords = shuffle(WORD_POOL).slice(0, 25);

  const cardTypes: CardType[] = [
    ...Array(9).fill("RED"),
    ...Array(8).fill("BLUE"),
    ...Array(7).fill("NEUTRAL"),
    "ASSASSIN",
  ];

  const shuffledTypes = shuffle(cardTypes);

  const cards: Card[] = selectedWords.map((word, index) => ({
    id: `card-${index + 1}`,
    word,
    type: shuffledTypes[index],
    revealed: false,
  }));

  const game: GameState = {
    phase: "CLUE",
    cards,
    currentTeam: "RED",
    currentClue: null,
    guessesRemaining: 0,
    guessesMadeThisTurn: 0,
    redCardsLeft: 9,
    blueCardsLeft: 8,
    winner: null,
    winReason: null,
    logs: [],
  };

  addLog(game, "SYSTEM", `Game started! RED team goes first. RED Spymaster (${redSpymaster.name}) is thinking of a clue.`);

  room.game = game;
  return room;
}

/**
 * SUBMIT CLUE LOGIC
 */
export function submitClueLogic(
  room: Room,
  playerId: string,
  rawClue: string,
  number: number
): Room {
  if (!room.game) throw new Error("Game not active");

  const game = room.game;
  if (game.phase !== "CLUE") {
    throw new Error("Game is not currently in CLUE phase.");
  }

  const player = room.players.find((p) => p.id === playerId);
  if (!player || player.team !== game.currentTeam || player.role !== "SPYMASTER") {
    throw new Error("Only the active team's Spymaster can submit a clue.");
  }

  const trimmed = rawClue.trim();
  if (!trimmed) {
    throw new Error("Clue cannot be empty.");
  }
  if (/\s/.test(trimmed)) {
    throw new Error("Clue must be exactly ONE word. No spaces allowed!");
  }

  const num = Math.floor(number);
  if (isNaN(num) || num < 0 || num > 9) {
    throw new Error("Number must be between 0 and 9.");
  }

  const clueWord = trimmed.toUpperCase();

  game.currentClue = {
    word: clueWord,
    number: num,
    givenBy: player.name,
    team: game.currentTeam,
  };

  game.guessesRemaining = num === 0 ? 1 : num + 1;
  game.guessesMadeThisTurn = 0;
  game.phase = "GUESSING";

  addLog(
    game,
    "CLUE",
    `${player.team} Spymaster (${player.name}) gave clue: ${clueWord} for ${num} card(s).`,
    player.team
  );

  return room;
}

/**
 * SELECT CARD LOGIC
 */
export function selectCardLogic(
  room: Room,
  playerId: string,
  cardId: string
): Room {
  if (!room.game) throw new Error("Game not active");

  const game = room.game;
  if (game.phase !== "GUESSING") {
    throw new Error("Game is not in GUESSING phase.");
  }

  const player = room.players.find((p) => p.id === playerId);
  if (!player || player.team !== game.currentTeam) {
    throw new Error(`Only ${game.currentTeam} team players can guess cards right now.`);
  }

  const card = game.cards.find((c) => c.id === cardId);
  if (!card) throw new Error("Card not found");
  if (card.revealed) throw new Error("Card has already been revealed!");

  card.revealed = true;
  game.guessesMadeThisTurn++;

  const currentTeam = game.currentTeam;
  const opponentTeam: Team = currentTeam === "RED" ? "BLUE" : "RED";

  if (card.type === currentTeam) {
    if (currentTeam === "RED") {
      game.redCardsLeft--;
    } else {
      game.blueCardsLeft--;
    }

    addLog(
      game,
      "GUESS",
      `${player.name} revealed ${currentTeam} card: "${card.word}"! Correct!`,
      currentTeam
    );

    if (game.redCardsLeft === 0) {
      game.winner = "RED";
      game.winReason = "ALL_CARDS_REVEALED";
      game.phase = "FINISHED";
      addLog(game, "SYSTEM", "RED TEAM HAS FOUND ALL THEIR WORDS AND WON THE GAME!", "RED");
      return room;
    } else if (game.blueCardsLeft === 0) {
      game.winner = "BLUE";
      game.winReason = "ALL_CARDS_REVEALED";
      game.phase = "FINISHED";
      addLog(game, "SYSTEM", "BLUE TEAM HAS FOUND ALL THEIR WORDS AND WON THE GAME!", "BLUE");
      return room;
    }

    game.guessesRemaining--;
    if (game.guessesRemaining <= 0) {
      game.currentTeam = opponentTeam;
      game.currentClue = null;
      game.phase = "CLUE";
      addLog(game, "TURN_CHANGE", `${currentTeam} team reached guess limit. Turn passes to ${opponentTeam}.`);
    }

  } else if (card.type === opponentTeam) {
    if (opponentTeam === "RED") {
      game.redCardsLeft--;
    } else {
      game.blueCardsLeft--;
    }

    addLog(
      game,
      "GUESS",
      `${player.name} revealed ${opponentTeam} card: "${card.word}"! Turn ends.`,
      currentTeam
    );

    if (game.redCardsLeft === 0) {
      game.winner = "RED";
      game.winReason = "ALL_CARDS_REVEALED";
      game.phase = "FINISHED";
      addLog(game, "SYSTEM", "RED TEAM WINS AS ALL THEIR CARDS WERE REVEALED!", "RED");
      return room;
    } else if (game.blueCardsLeft === 0) {
      game.winner = "BLUE";
      game.winReason = "ALL_CARDS_REVEALED";
      game.phase = "FINISHED";
      addLog(game, "SYSTEM", "BLUE TEAM WINS AS ALL THEIR CARDS WERE REVEALED!", "BLUE");
      return room;
    }

    game.currentTeam = opponentTeam;
    game.currentClue = null;
    game.phase = "CLUE";
    addLog(game, "TURN_CHANGE", `Turn switched to ${opponentTeam}.`);

  } else if (card.type === "NEUTRAL") {
    addLog(
      game,
      "GUESS",
      `${player.name} revealed NEUTRAL card: "${card.word}". Turn ends.`,
      currentTeam
    );

    game.currentTeam = opponentTeam;
    game.currentClue = null;
    game.phase = "CLUE";
    addLog(game, "TURN_CHANGE", `Turn switched to ${opponentTeam}.`);

  } else if (card.type === "ASSASSIN") {
    game.winner = opponentTeam;
    game.winReason = "ASSASSIN_REVEALED";
    game.phase = "FINISHED";

    addLog(
      game,
      "SYSTEM",
      `${player.name} REVEALED THE ASSASSIN CARD: "${card.word}"! ${currentTeam} LOSES IMMEDIATELY! ${opponentTeam} WINS!`,
      opponentTeam
    );
  }

  return room;
}

/**
 * END TURN LOGIC
 */
export function endTurnLogic(room: Room, playerId: string): Room {
  if (!room.game) throw new Error("Game not active");

  const game = room.game;
  if (game.phase !== "GUESSING") {
    throw new Error("Cannot end turn outside of GUESSING phase.");
  }

  const player = room.players.find((p) => p.id === playerId);
  if (!player || player.team !== game.currentTeam) {
    throw new Error(`Only ${game.currentTeam} team players can end turn.`);
  }

  const currentTeam = game.currentTeam;
  const opponentTeam: Team = currentTeam === "RED" ? "BLUE" : "RED";

  game.currentTeam = opponentTeam;
  game.currentClue = null;
  game.phase = "CLUE";

  addLog(game, "TURN_CHANGE", `${player.name} ended ${currentTeam}'s turn. Turn passes to ${opponentTeam}.`);

  return room;
}

/**
 * LEAVE GAME LOGIC
 */
export function leaveGameLogic(room: Room, playerId: string): Room {
  const index = room.players.findIndex((p) => p.id === playerId);
  if (index === -1) return room;

  const player = room.players[index];
  room.players.splice(index, 1);

  // Update room admin if admin is disconnected or left
  if (!room.players.some((p) => p.id === room.adminId)) {
    const firstConnected = room.players.find((p) => p.connected);
    if (firstConnected) {
      room.adminId = firstConnected.id;
      firstConnected.isAdmin = true;
    }
  }

  // If game is active, check if we still have the required roles
  if (room.game && room.game.phase !== "FINISHED") {
    const game = room.game;
    const redSpymaster = room.players.find((p) => p.team === "RED" && p.role === "SPYMASTER");
    const redOperatives = room.players.filter((p) => p.team === "RED" && p.role === "OPERATIVE");
    const blueSpymaster = room.players.find((p) => p.team === "BLUE" && p.role === "SPYMASTER");
    const blueOperatives = room.players.filter((p) => p.team === "BLUE" && p.role === "OPERATIVE");

    let terminate = false;
    let reason = "";

    if (!redSpymaster) { terminate = true; reason = "RED Spymaster left the game."; }
    else if (redOperatives.length === 0) { terminate = true; reason = "All RED Operatives left the game."; }
    else if (!blueSpymaster) { terminate = true; reason = "BLUE Spymaster left the game."; }
    else if (blueOperatives.length === 0) { terminate = true; reason = "All BLUE Operatives left the game."; }

    if (terminate) {
      game.phase = "FINISHED";
      if (game.redCardsLeft === 9 && game.blueCardsLeft === 8) {
        game.winner = null;
        game.winReason = `${reason} No cards were guessed yet. It's a draw!`;
      } else if (game.redCardsLeft < game.blueCardsLeft) {
        game.winner = "RED";
        game.winReason = `${reason} RED wins by having fewer cards left.`;
      } else if (game.blueCardsLeft < game.redCardsLeft) {
        game.winner = "BLUE";
        game.winReason = `${reason} BLUE wins by having fewer cards left.`;
      } else {
        game.winner = null;
        game.winReason = `${reason} It's a draw!`;
      }

      addLog(game, "GAME_OVER", game.winReason);
    }
  }

  return room;
}

/**
 * RESET GAME LOGIC
 */
export function resetGameLogic(room: Room): Room {
  room.game = null;
  return room;
}

/**
 * SERIALIZE ROOM FOR PLAYER (SECURITY MANDATE)
 * Operatives MUST NOT see unrevealed secret card identities!
 */
export function serializeRoomForPlayer(room: Room, playerId: string): PublicRoomState {
  const player = room.players.find((p) => p.id === playerId);

  if (!room.game) {
    return {
      code: room.code,
      adminId: room.adminId,
      players: room.players,
      game: null,
    };
  }

  const game = room.game;
  const isSpymaster = player?.role === "SPYMASTER";
  const isGameFinished = game.phase === "FINISHED";
  const canSeeSecretTypes = isSpymaster || isGameFinished;

  const publicCards: PublicCard[] = game.cards.map((card) => {
    if (card.revealed || canSeeSecretTypes) {
      return {
        id: card.id,
        word: card.word,
        type: card.type,
        revealed: card.revealed,
      };
    } else {
      return {
        id: card.id,
        word: card.word,
        revealed: card.revealed,
      };
    }
  });

  const publicGame: PublicGameState = {
    phase: game.phase,
    cards: publicCards,
    currentTeam: game.currentTeam,
    currentClue: game.currentClue,
    guessesRemaining: game.guessesRemaining,
    guessesMadeThisTurn: game.guessesMadeThisTurn,
    redCardsLeft: game.redCardsLeft,
    blueCardsLeft: game.blueCardsLeft,
    winner: game.winner,
    winReason: game.winReason,
    logs: game.logs,
  };

  return {
    code: room.code,
    adminId: room.adminId,
    players: room.players,
    game: publicGame,
  };
}

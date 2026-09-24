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

// In-memory server room store
const rooms = new Map<string, Room>();
const socketToPlayerMap = new Map<string, { roomCode: string; playerId: string }>();

// Generate unique 6-character room code (uppercase alphanumeric, no confusing chars 0, O, 1, I)
function generateRoomCode(): string {
  const chars = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  if (rooms.has(code)) {
    return generateRoomCode();
  }
  return code;
}

// Generate random player ID
function generateId(): string {
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
  // Keep last 100 logs
  if (game.logs.length > 100) {
    game.logs.shift();
  }
}

/**
 * CREATE ROOM
 */
export function createRoom(adminName: string, socketId: string, customPlayerId?: string): { room: Room; player: Player } {
  const code = generateRoomCode();
  const playerId = customPlayerId || generateId();
  const cleanName = sanitizeName(adminName);

  const adminPlayer: Player = {
    id: playerId,
    socketId,
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

  rooms.set(code, newRoom);
  socketToPlayerMap.set(socketId, { roomCode: code, playerId });

  return { room: newRoom, player: adminPlayer };
}

/**
 * JOIN ROOM
 */
export function joinRoom(
  roomCode: string,
  playerName: string,
  socketId: string,
  customPlayerId?: string
): { room: Room; player: Player } {
  const code = roomCode.toUpperCase().trim();
  const room = rooms.get(code);

  if (!room) {
    throw new Error("Room not found. Please check the room code.");
  }

  const cleanName = sanitizeName(playerName);
  const playerId = customPlayerId || generateId();

  // Check if player with same ID already exists in room (e.g. reconnect)
  let player = room.players.find((p) => p.id === playerId);

  if (player) {
    player.socketId = socketId;
    player.connected = true;
    player.name = cleanName;
  } else {
    // Avoid duplicate display names in room
    let finalName = cleanName;
    let count = 1;
    while (room.players.some((p) => p.name.toLowerCase() === finalName.toLowerCase())) {
      count++;
      finalName = `${cleanName} (${count})`;
    }

    player = {
      id: playerId,
      socketId,
      name: finalName,
      team: null,
      role: null,
      connected: true,
      isAdmin: room.players.length === 0, // if room was empty, make admin
    };

    room.players.push(player);
  }

  // Update room admin if admin disconnected
  if (!room.players.some((p) => p.id === room.adminId && p.connected)) {
    const firstConnected = room.players.find((p) => p.connected);
    if (firstConnected) {
      room.adminId = firstConnected.id;
      firstConnected.isAdmin = true;
    }
  }

  socketToPlayerMap.set(socketId, { roomCode: code, playerId: player.id });

  return { room, player };
}

/**
 * GET ROOM
 */
export function getRoom(roomCode: string): Room | undefined {
  return rooms.get(roomCode.toUpperCase().trim());
}

/**
 * FIND ROOM BY SOCKET ID
 */
export function findRoomBySocketId(socketId: string): { roomCode: string; playerId: string } | undefined {
  return socketToPlayerMap.get(socketId);
}

/**
 * HANDLE DISCONNECT
 */
export function handleDisconnect(socketId: string): { roomCode?: string; player?: Player; roomIsEmpty?: boolean } {
  const entry = socketToPlayerMap.get(socketId);
  socketToPlayerMap.delete(socketId);

  if (!entry) return {};

  const room = rooms.get(entry.roomCode);
  if (!room) return {};

  const player = room.players.find((p) => p.id === entry.playerId);
  if (player) {
    player.connected = false;

    // Check if room is completely empty (no connected players)
    const hasConnectedPlayers = room.players.some((p) => p.connected);
    if (!hasConnectedPlayers) {
      // Keep room in memory for 10 minutes in case of quick reconnects, or delete if desired
      // Delete after 30 minutes inactivity
      setTimeout(() => {
        const r = rooms.get(entry.roomCode);
        if (r && !r.players.some((p) => p.connected)) {
          rooms.delete(entry.roomCode);
        }
      }, 10 * 60 * 1000);
    } else if (player.isAdmin) {
      // Reassign admin to another connected player
      const nextAdmin = room.players.find((p) => p.connected);
      if (nextAdmin) {
        player.isAdmin = false;
        nextAdmin.isAdmin = true;
        room.adminId = nextAdmin.id;
      }
    }
  }

  return { roomCode: entry.roomCode, player };
}

/**
 * SET TEAM AND ROLE
 */
export function setTeamAndRole(
  roomCode: string,
  playerId: string,
  team: Team | null,
  role: Role | null
): Room {
  const room = rooms.get(roomCode.toUpperCase());
  if (!room) throw new Error("Room not found");

  const player = room.players.find((p) => p.id === playerId);
  if (!player) throw new Error("Player not found in room");

  // If selecting SPYMASTER role, check if that team already has a Spymaster
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
 * RANDOMIZE TEAMS & ROLES
 */
export function randomizeTeams(roomCode: string): Room {
  const room = rooms.get(roomCode.toUpperCase());
  if (!room) throw new Error("Room not found");

  const activePlayers = shuffle(room.players.filter((p) => p.connected));
  if (activePlayers.length < 4) {
    throw new Error("Need at least 4 connected players to randomize teams.");
  }

  // Split evenly between RED and BLUE
  const half = Math.ceil(activePlayers.length / 2);
  const redPlayers = activePlayers.slice(0, half);
  const bluePlayers = activePlayers.slice(half);

  // Assign RED Spymaster & Operatives
  redPlayers.forEach((p, idx) => {
    p.team = "RED";
    p.role = idx === 0 ? "SPYMASTER" : "OPERATIVE";
  });

  // Assign BLUE Spymaster & Operatives
  bluePlayers.forEach((p, idx) => {
    p.team = "BLUE";
    p.role = idx === 0 ? "SPYMASTER" : "OPERATIVE";
  });

  return room;
}

/**
 * KICK PLAYER
 */
export function kickPlayer(roomCode: string, adminId: string, targetPlayerId: string): Room {
  const room = rooms.get(roomCode.toUpperCase());
  if (!room) throw new Error("Room not found");

  if (room.adminId !== adminId) {
    throw new Error("Only the Room Admin can kick players.");
  }

  if (adminId === targetPlayerId) {
    throw new Error("Admin cannot kick themselves.");
  }

  const index = room.players.findIndex((p) => p.id === targetPlayerId);
  if (index !== -1) {
    const removed = room.players.splice(index, 1)[0];
    if (removed && removed.socketId) {
      socketToPlayerMap.delete(removed.socketId);
    }
  }

  return room;
}

/**
 * START GAME
 */
export function startGame(roomCode: string, adminId: string): Room {
  const room = rooms.get(roomCode.toUpperCase());
  if (!room) throw new Error("Room not found");

  if (room.adminId !== adminId) {
    throw new Error("Only the Room Admin can start the game.");
  }

  // Validation: min 4 players, each team must have 1 Spymaster and 1+ Operatives
  const redSpymaster = room.players.find((p) => p.team === "RED" && p.role === "SPYMASTER");
  const redOperatives = room.players.filter((p) => p.team === "RED" && p.role === "OPERATIVE");
  const blueSpymaster = room.players.find((p) => p.team === "BLUE" && p.role === "SPYMASTER");
  const blueOperatives = room.players.filter((p) => p.team === "BLUE" && p.role === "OPERATIVE");

  if (!redSpymaster) throw new Error("RED team needs a Spymaster!");
  if (redOperatives.length === 0) throw new Error("RED team needs at least 1 Operative!");
  if (!blueSpymaster) throw new Error("BLUE team needs a Spymaster!");
  if (blueOperatives.length === 0) throw new Error("BLUE team needs at least 1 Operative!");

  // Generate 25 unique words from pool
  const selectedWords = shuffle(WORD_POOL).slice(0, 25);

  // Assign card types: 9 RED, 8 BLUE, 7 NEUTRAL, 1 ASSASSIN
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
    currentTeam: "RED", // RED always starts
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
 * SUBMIT CLUE
 */
export function submitClue(
  roomCode: string,
  playerId: string,
  rawClue: string,
  number: number
): Room {
  const room = rooms.get(roomCode.toUpperCase());
  if (!room || !room.game) throw new Error("Game not active");

  const game = room.game;
  if (game.phase !== "CLUE") {
    throw new Error("Game is not currently in CLUE phase.");
  }

  const player = room.players.find((p) => p.id === playerId);
  if (!player || player.team !== game.currentTeam || player.role !== "SPYMASTER") {
    throw new Error("Only the active team's Spymaster can submit a clue.");
  }

  // Validate clue word: single word only
  const trimmed = rawClue.trim();
  if (!trimmed) {
    throw new Error("Clue cannot be empty.");
  }

  // Check for spaces or multi-word clues
  if (/\s/.test(trimmed)) {
    throw new Error("Clue must be exactly ONE word. No spaces allowed!");
  }

  // Check valid number
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

  // Standard game rule: Team gets clue number + 1 extra guess
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
 * SELECT CARD (GUESSING)
 */
export function selectCard(
  roomCode: string,
  playerId: string,
  cardId: string
): Room {
  const room = rooms.get(roomCode.toUpperCase());
  if (!room || !room.game) throw new Error("Game not active");

  const game = room.game;
  if (game.phase !== "GUESSING") {
    throw new Error("Game is not in GUESSING phase.");
  }

  const player = room.players.find((p) => p.id === playerId);
  if (!player || player.team !== game.currentTeam || player.role !== "OPERATIVE") {
    throw new Error(`Only ${game.currentTeam} Operatives can guess cards right now.`);
  }

  const card = game.cards.find((c) => c.id === cardId);
  if (!card) throw new Error("Card not found");
  if (card.revealed) throw new Error("Card has already been revealed!");

  // Reveal card
  card.revealed = true;
  game.guessesMadeThisTurn++;

  const currentTeam = game.currentTeam;
  const opponentTeam: Team = currentTeam === "RED" ? "BLUE" : "RED";

  // Check revealed card type
  if (card.type === currentTeam) {
    // OWN CARD REVEALED
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

    // Check victory
    if (game.redCardsLeft === 0) {
      game.winner = "RED";
      game.winReason = "ALL_CARDS_REVEALED";
      game.phase = "FINISHED";
      addLog(game, "SYSTEM", "🎉 RED TEAM HAS FOUND ALL THEIR WORDS AND WON THE GAME!", "RED");
      return room;
    } else if (game.blueCardsLeft === 0) {
      game.winner = "BLUE";
      game.winReason = "ALL_CARDS_REVEALED";
      game.phase = "FINISHED";
      addLog(game, "SYSTEM", "🎉 BLUE TEAM HAS FOUND ALL THEIR WORDS AND WON THE GAME!", "BLUE");
      return room;
    }

    // Decrement guesses remaining
    game.guessesRemaining--;
    if (game.guessesRemaining <= 0) {
      // Turn limit reached, switch turn
      game.currentTeam = opponentTeam;
      game.currentClue = null;
      game.phase = "CLUE";
      addLog(game, "TURN_CHANGE", `${currentTeam} team reached guess limit. Turn passes to ${opponentTeam}.`);
    }

  } else if (card.type === opponentTeam) {
    // OPPONENT CARD REVEALED
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

    // Check if opponent accidentally won
    if (game.redCardsLeft === 0) {
      game.winner = "RED";
      game.winReason = "ALL_CARDS_REVEALED";
      game.phase = "FINISHED";
      addLog(game, "SYSTEM", "🎉 RED TEAM WINS AS ALL THEIR CARDS WERE REVEALED!", "RED");
      return room;
    } else if (game.blueCardsLeft === 0) {
      game.winner = "BLUE";
      game.winReason = "ALL_CARDS_REVEALED";
      game.phase = "FINISHED";
      addLog(game, "SYSTEM", "🎉 BLUE TEAM WINS AS ALL THEIR CARDS WERE REVEALED!", "BLUE");
      return room;
    }

    // Turn ends immediately
    game.currentTeam = opponentTeam;
    game.currentClue = null;
    game.phase = "CLUE";
    addLog(game, "TURN_CHANGE", `Turn switched to ${opponentTeam}.`);

  } else if (card.type === "NEUTRAL") {
    // NEUTRAL CARD REVEALED
    addLog(
      game,
      "GUESS",
      `${player.name} revealed NEUTRAL card: "${card.word}". Turn ends.`,
      currentTeam
    );

    // Turn ends immediately
    game.currentTeam = opponentTeam;
    game.currentClue = null;
    game.phase = "CLUE";
    addLog(game, "TURN_CHANGE", `Turn switched to ${opponentTeam}.`);

  } else if (card.type === "ASSASSIN") {
    // ASSASSIN CARD REVEALED — GAME OVER IMMEDIATELY!
    game.winner = opponentTeam;
    game.winReason = "ASSASSIN_REVEALED";
    game.phase = "FINISHED";

    addLog(
      game,
      "SYSTEM",
      `☠️ ${player.name} REVEALED THE ASSASSIN CARD: "${card.word}"! ${currentTeam} LOSES IMMEDIATELY! ${opponentTeam} WINS!`,
      opponentTeam
    );
  }

  return room;
}

/**
 * END TURN VOLUNTARILY
 */
export function endTurn(roomCode: string, playerId: string): Room {
  const room = rooms.get(roomCode.toUpperCase());
  if (!room || !room.game) throw new Error("Game not active");

  const game = room.game;
  if (game.phase !== "GUESSING") {
    throw new Error("Cannot end turn outside of GUESSING phase.");
  }

  const player = room.players.find((p) => p.id === playerId);
  if (!player || player.team !== game.currentTeam || player.role !== "OPERATIVE") {
    throw new Error(`Only ${game.currentTeam} Operatives can end turn.`);
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
 * PLAY AGAIN / RESET GAME
 */
export function resetGame(roomCode: string): Room {
  const room = rooms.get(roomCode.toUpperCase());
  if (!room) throw new Error("Room not found");

  room.game = null;
  return startGame(roomCode, room.adminId);
}

/**
 * SERIALIZE ROOM FOR PLAYER (SECURITY REQUIREMENT)
 * Prevents Operatives from inspecting secret card identities!
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
  // Is player a Spymaster OR is the game finished?
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
      // Omit type for unrevealed cards when player is Operative/Spectator
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

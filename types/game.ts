export type Team = "RED" | "BLUE";

export type Role = "SPYMASTER" | "OPERATIVE";

export type CardType = "RED" | "BLUE" | "NEUTRAL" | "ASSASSIN";

export type GamePhase = "LOBBY" | "CLUE" | "GUESSING" | "FINISHED";

export interface Player {
  id: string;
  socketId: string;
  name: string;
  team: Team | null;
  role: Role | null;
  connected: boolean;
  isAdmin: boolean;
}

export interface Card {
  id: string;
  word: string;
  type: CardType;
  revealed: boolean;
}

export interface PublicCard {
  id: string;
  word: string;
  type?: CardType; // Undefined for unrevealed cards if player is an Operative
  revealed: boolean;
}

export interface Clue {
  word: string;
  number: number;
  givenBy: string; // Player name
  team: Team;
}

export interface GameLog {
  id: string;
  timestamp: number;
  type: "CLUE" | "GUESS" | "TURN_CHANGE" | "SYSTEM" | "CHAT";
  message: string;
  team?: Team;
}

export interface GameState {
  phase: GamePhase;
  cards: Card[];
  currentTeam: Team;
  currentClue: Clue | null;
  guessesRemaining: number;
  guessesMadeThisTurn: number;
  redCardsLeft: number;
  blueCardsLeft: number;
  winner: Team | null;
  winReason: string | null;
  logs: GameLog[];
}

export interface PublicGameState {
  phase: GamePhase;
  cards: PublicCard[];
  currentTeam: Team;
  currentClue: Clue | null;
  guessesRemaining: number;
  guessesMadeThisTurn: number;
  redCardsLeft: number;
  blueCardsLeft: number;
  winner: Team | null;
  winReason: string | null;
  logs: GameLog[];
}

export interface Room {
  code: string;
  adminId: string;
  players: Player[];
  game: GameState | null;
  createdAt: number;
}

export interface PublicRoomState {
  code: string;
  adminId: string;
  players: Player[];
  game: PublicGameState | null;
}

"use client";

import { useState, useEffect, useRef } from "react";
import { Share2, Check, HelpCircle, User, X } from "lucide-react";
import { PublicRoomState, PublicCard, CardType, GameLog as GameLogType } from "@/types/game";
import { sounds } from "@/lib/soundEffects";
import { copyToClipboard } from "@/lib/clipboard";

// Deterministic artwork image assignment per card ID & team type
export function getCardImage(cardId: string, type?: CardType): string {
  if (!type) return "";
  let hash = 0;
  for (let i = 0; i < cardId.length; i++) {
    hash = (hash << 5) - hash + cardId.charCodeAt(i);
    hash |= 0;
  }
  const absHash = Math.abs(hash);

  if (type === "RED") return `/cards/card_red_${(absHash % 4) + 1}.jpg`;
  if (type === "BLUE") return `/cards/card_blue_${(absHash % 4) + 1}.jpg`;
  if (type === "NEUTRAL") return `/cards/card_neutral_${(absHash % 4) + 1}.jpg`;
  if (type === "ASSASSIN") return `/cards/card_assassin_${(absHash % 2) + 1}.jpg`;
  return "";
}

interface GameBoardProps {
  roomState: PublicRoomState;
  currentPlayerId: string;
  playerName?: string;
  onSubmitClue: (word: string, number: number) => void;
  onSelectCard: (cardId: string) => void;
  onEndTurn: () => void;
  onOpenRules?: () => void;
  onEditName?: () => void;
}

export default function GameBoard({
  roomState,
  currentPlayerId,
  playerName,
  onSubmitClue,
  onSelectCard,
  onEndTurn,
  onOpenRules,
  onEditName,
}: GameBoardProps) {
  const [clueWord, setClueWord] = useState("");
  const [clueNumber, setClueNumber] = useState<number>(1);
  const [clueError, setClueError] = useState("");
  const [copied, setCopied] = useState(false);
  const [inspectingCard, setInspectingCard] = useState<PublicCard | null>(null);
  const logScrollRef = useRef<HTMLDivElement>(null);

  const game = roomState.game;

  // Auto scroll game logs
  useEffect(() => {
    if (logScrollRef.current) {
      logScrollRef.current.scrollTop = logScrollRef.current.scrollHeight;
    }
  }, [game?.logs]);

  if (!game) return null;

  const players = roomState.players || [];
  const player = players.find((p) => p.id === currentPlayerId);

  const isSpymaster = player?.role === "SPYMASTER";
  const isOperative = player?.role === "OPERATIVE";
  const isMyTeamTurn = player?.team === game.currentTeam;

  const isCluePhase = game.phase === "CLUE";
  const isGuessingPhase = game.phase === "GUESSING";

  const canSubmitClue = isCluePhase && isSpymaster && isMyTeamTurn;
  const canGuessCard = isGuessingPhase && isMyTeamTurn;
  const canEndTurn = isGuessingPhase && isMyTeamTurn;

  const handleClueSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = clueWord.trim();
    if (!trimmed) {
      setClueError("Please enter a clue word.");
      return;
    }
    if (/\s/.test(trimmed)) {
      setClueError("Clue must be ONE single word (no spaces).");
      return;
    }

    setClueError("");
    onSubmitClue(trimmed, clueNumber);
    sounds.playClueSubmit();
    setClueWord("");
  };

  const handleCardClick = (card: PublicCard) => {
    if (!canGuessCard || card.revealed) return;
    sounds.playCardClick();
    onSelectCard(card.id);
  };

  const copyShareLink = async () => {
    await copyToClipboard(roomState.code);
    setCopied(true);
    sounds.playCardClick();
    setTimeout(() => setCopied(false), 2000);
  };

  const currentTeamColor =
    game.currentTeam === "RED" ? "text-[#B85C5C]" : "text-[#52759B]";

  return (
    <div className="h-screen max-h-screen w-full flex flex-col lg:flex-row bg-[#111318] text-[#F1F0EC] overflow-hidden relative">
      {/* ================= TOP PANEL (MOBILE < lg) / LEFT SIDEBAR (DESKTOP ≥ lg) ================= */}
      <div className="w-full lg:w-80 xl:w-96 bg-[#171A20] border-b lg:border-b-0 lg:border-r border-[#303642] p-3 sm:p-4 flex flex-col justify-start shrink-0 gap-2 sm:gap-3 max-h-[30vh] lg:max-h-full overflow-y-auto no-scrollbar">
        {/* Brand & Room Header */}
        <div className="flex items-center justify-between pb-2 border-b border-[#303642]">
          <div className="flex items-center space-x-2">
            <h1 className="text-base sm:text-lg font-black tracking-widest text-[#F1F0EC] uppercase font-mono">
              DECYPHER<span className="text-[#A7A9AD]">GRID</span>
            </h1>

            <div className="flex items-center space-x-1.5 px-2 py-0.5 bg-[#111318] border border-[#303642] rounded-lg text-xs font-mono">
              <span className="font-bold text-[#F1F0EC]">{roomState.code}</span>
              <button
                onClick={copyShareLink}
                title="Copy Room Link"
                className="text-[#A7A9AD] hover:text-[#F1F0EC] transition-colors p-0.5"
              >
                {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Share2 className="w-3 h-3" />}
              </button>
            </div>
          </div>

          <div className="flex items-center space-x-3 text-xs font-mono">
            {playerName && (
              <span className="text-[11px] text-[#A7A9AD] hidden sm:inline truncate max-w-[120px]">
                {playerName}
              </span>
            )}

            {onOpenRules && (
              <button
                onClick={onOpenRules}
                className="flex items-center space-x-1 text-xs font-mono text-[#A7A9AD] hover:text-[#F1F0EC] transition-colors"
              >
                <HelpCircle className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Rules</span>
              </button>
            )}
          </div>
        </div>

        {/* Turn Status & Score Bar */}
        <div className="bg-[#111318] border border-[#303642] p-2.5 rounded-xl flex items-center justify-between font-mono text-xs">
          <div className="flex items-center space-x-2">
            <span
              className={`w-2.5 h-2.5 rounded-full ${
                game.currentTeam === "RED" ? "bg-[#B85C5C]" : "bg-[#52759B]"
              }`}
            />
            <span className={`font-bold uppercase tracking-wider ${currentTeamColor}`}>
              {game.currentTeam} TURN
            </span>
          </div>

          <div className="flex items-center space-x-3 font-bold text-xs">
            <span className="text-[#B85C5C]">RED <strong className="text-[#F1F0EC]">{game.redCardsLeft}</strong>/9</span>
            <span className="text-[#303642]">|</span>
            <span className="text-[#52759B]">BLUE <strong className="text-[#F1F0EC]">{game.blueCardsLeft}</strong>/8</span>
          </div>
        </div>

        {/* Player Role Indicator */}
        {player && (
          <div
            className={`px-3 py-2 rounded-lg text-center font-bold text-xs uppercase tracking-widest border ${
              player.team === "RED"
                ? "bg-[#B85C5C]/10 border-[#B85C5C]/30 text-[#B85C5C]"
                : "bg-[#52759B]/10 border-[#52759B]/30 text-[#52759B]"
            }`}
          >
            YOU ARE {player.team} {player.role === "SPYMASTER" ? "SPY MASTER" : "OPERATIVE"}
          </div>
        )}

        {/* Clue Control Box */}
        <div className="bg-[#111318] border border-[#303642] p-2.5 rounded-xl font-mono text-xs">
          {canSubmitClue ? (
            <form onSubmit={handleClueSubmit} className="flex flex-wrap sm:flex-nowrap items-center gap-2">
              <input
                type="text"
                value={clueWord}
                onChange={(e) => {
                  setClueWord(e.target.value.toUpperCase().trim());
                  if (clueError) setClueError("");
                }}
                placeholder="ENTER CLUE WORD"
                maxLength={20}
                className="flex-1 min-w-[120px] px-3 py-1.5 bg-[#171A20] border border-[#303642] rounded-lg text-[#F1F0EC] font-bold placeholder-[#6F737B] focus:outline-none uppercase text-xs"
              />

              <div className="flex items-center space-x-1.5">
                <select
                  value={clueNumber}
                  onChange={(e) => setClueNumber(Number(e.target.value))}
                  className="px-2 py-1.5 bg-[#171A20] border border-[#303642] rounded-lg text-[#F1F0EC] font-bold text-xs focus:outline-none"
                >
                  {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => (
                    <option key={n} value={n}>
                      {n}
                    </option>
                  ))}
                </select>

                <button
                  type="submit"
                  className="px-3.5 py-1.5 bg-[#232832] border border-[#303642] text-[#F1F0EC] font-bold text-xs uppercase tracking-wider rounded-lg hover:bg-[#303642] transition-colors shrink-0 cursor-pointer"
                >
                  GIVE CLUE
                </button>
              </div>

              {clueError && <p className="w-full text-xs text-[#B85C5C] mt-1">{clueError}</p>}
            </form>
          ) : isGuessingPhase && game.currentClue ? (
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center space-x-2 truncate">
                <span className="text-[10px] text-[#6F737B] uppercase font-bold">CLUE:</span>
                <span className="text-sm font-black text-[#F1F0EC] uppercase tracking-wider truncate">
                  {game.currentClue.word}
                </span>
                <span className="text-xs font-bold text-[#A7A9AD]">
                  ({game.currentClue.number})
                </span>
              </div>

              <div className="flex items-center space-x-3 shrink-0">
                <span className="text-[11px] text-[#6F737B]">Left: <strong className="text-[#F1F0EC]">{game.guessesRemaining}</strong></span>

                {canEndTurn && (
                  <button
                    onClick={() => {
                      onEndTurn();
                      sounds.playCardClick();
                    }}
                    className="px-2.5 py-1 rounded-lg bg-[#232832] border border-[#303642] text-[#F1F0EC] hover:bg-[#303642] text-xs font-bold transition-colors cursor-pointer"
                  >
                    END TURN
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div className="text-[11px] text-[#A7A9AD] text-center py-0.5">
              {isCluePhase
                ? `Waiting for ${game.currentTeam} Spymaster clue...`
                : `${game.currentTeam} Operatives choosing cards...`}
            </div>
          )}
        </div>
      </div>

      {/* ================= CENTER PANEL: 5x5 CARDS GRID ================= */}
      <div className="flex-1 min-h-0 w-full lg:h-full flex items-center justify-center p-2 sm:p-4 lg:p-6 overflow-hidden mx-auto @container">
        <div className="grid grid-cols-5 aspect-square w-full max-w-[100cqmin] gap-1.5 sm:gap-2.5 lg:gap-3.5 mx-auto">
          {game.cards.map((card) => (
            <GridCardItem
              key={card.id}
              card={card}
              isSpymaster={isSpymaster}
              isGameOver={game.phase === "FINISHED"}
              canGuessCard={canGuessCard}
              onCardClick={handleCardClick}
            />
          ))}
        </div>
      </div>

      {/* ================= BOTTOM PANEL (MOBILE < lg) / RIGHT SIDEBAR (DESKTOP ≥ lg): MATCH LOG ================= */}
      <div className="w-full lg:w-80 xl:w-96 flex-1 min-h-[140px] lg:flex-none lg:h-full bg-[#171A20] border-t lg:border-t-0 lg:border-l border-[#303642] p-2.5 sm:p-4 flex flex-col overflow-hidden">
        <div className="text-[11px] sm:text-xs font-mono font-bold uppercase tracking-wider text-[#A7A9AD] mb-1.5 pb-1 border-b border-[#303642] flex items-center justify-between shrink-0">
          <span>Match Activity Log</span>
          <span className="text-[10px] text-[#6F737B]">{game.logs.length} Events</span>
        </div>

        <div ref={logScrollRef} className="flex-1 overflow-y-auto space-y-1.5 pr-1 font-mono text-[11px] sm:text-xs no-scrollbar">
          {game.logs.map((log) => {
            let teamBadge = null;
            if (log.team === "RED") {
              teamBadge = <span className="text-[#B85C5C] font-bold">[RED]</span>;
            } else if (log.team === "BLUE") {
              teamBadge = <span className="text-[#52759B] font-bold">[BLUE]</span>;
            }

            return (
              <div
                key={log.id}
                className="flex items-start space-x-2 py-1 border-b border-[#232832]/60 text-[#A7A9AD]"
              >
                {teamBadge}
                <span className="leading-normal text-[#F1F0EC] flex-1 break-words">{log.message}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// Sub-component for individual Grid Cards handling grayed background & on-card 3s box opening animation
function GridCardItem({
  card,
  isSpymaster,
  isGameOver,
  canGuessCard,
  onCardClick,
}: {
  card: PublicCard;
  isSpymaster: boolean;
  isGameOver: boolean;
  canGuessCard: boolean;
  onCardClick: (card: PublicCard) => void;
}) {
  const [isPeeking, setIsPeeking] = useState(false);
  const peekTimerRef = useRef<NodeJS.Timeout | null>(null);

  const isRevealed = card.revealed || isGameOver;
  const cardType = card.type;
  const cardImg = getCardImage(card.id, cardType);

  let frontCardClasses = "";
  let revealedBorderClass = "border-[#303642]";

  if (isRevealed) {
    if (cardType === "RED") {
      revealedBorderClass = "border-[#B85C5C]/60";
    } else if (cardType === "BLUE") {
      revealedBorderClass = "border-[#52759B]/60";
    } else if (cardType === "NEUTRAL") {
      revealedBorderClass = "border-[#807667]/60";
    } else if (cardType === "ASSASSIN") {
      revealedBorderClass = "border-[#64748B]/60";
    }
  } else if (isSpymaster) {
    if (cardType === "RED") {
      frontCardClasses = "game-card-unrevealed spymaster-hint-red";
    } else if (cardType === "BLUE") {
      frontCardClasses = "game-card-unrevealed spymaster-hint-blue";
    } else if (cardType === "NEUTRAL") {
      frontCardClasses = "game-card-unrevealed spymaster-hint-neutral";
    } else if (cardType === "ASSASSIN") {
      frontCardClasses = "game-card-unrevealed spymaster-hint-assassin";
    }
  } else {
    frontCardClasses = "game-card-unrevealed";
  }

  const handleRevealedClick = () => {
    sounds.playCardClick();
    setIsPeeking(true);

    if (peekTimerRef.current) clearTimeout(peekTimerRef.current);
    peekTimerRef.current = setTimeout(() => {
      setIsPeeking(false);
    }, 3000);
  };

  useEffect(() => {
    return () => {
      if (peekTimerRef.current) clearTimeout(peekTimerRef.current);
    };
  }, []);

  return (
    <div className={`aspect-square w-full card-perspective ${isRevealed ? "card-flipped" : ""}`}>
      <div className="card-flip-inner">
        {/* FRONT FACE: Unrevealed Card / Spymaster Key Hint */}
        <button
          onClick={() => {
            if (!isRevealed && canGuessCard) {
              onCardClick(card);
            }
          }}
          disabled={!isRevealed && !canGuessCard}
          className={`card-face-front w-full h-full p-1 sm:p-2 lg:p-3 flex flex-col items-center justify-center text-center select-none font-sans font-extrabold tracking-wider text-[10px] sm:text-xs md:text-sm lg:text-base xl:text-lg uppercase rounded-xl sm:rounded-2xl transition-all ${frontCardClasses} ${
            !isRevealed && canGuessCard ? "cursor-pointer" : "cursor-default"
          }`}
        >
          <span className="break-words leading-tight text-center">{card.word}</span>
        </button>

        {/* BACK FACE: Revealed Card with Grayed Background & Interactive On-Card Box Opening */}
        <div
          onClick={handleRevealedClick}
          className={`card-face-back w-full h-full relative rounded-xl sm:rounded-2xl border-2 overflow-hidden shadow-lg cursor-pointer bg-[#14171D] ${revealedBorderClass}`}
          title="Click to open box & reveal word for 3 seconds"
        >
          {/* UNDERNEATH BASE LAYER: Grayed card background displaying the original word */}
          <div className="absolute inset-0 bg-[#14171D] p-1 flex flex-col items-center justify-center text-center space-y-1 z-0">
            <span className="text-[8px] sm:text-[9px] font-mono text-[#6F737B] uppercase font-bold tracking-wider">
              {cardType === "NEUTRAL" ? "BYSTANDER" : `${cardType || "CARD"} AGENT`}
            </span>
            <span className="text-[10px] sm:text-xs md:text-sm lg:text-base font-mono font-black text-[#F1F0EC] uppercase tracking-wider break-words leading-tight px-1">
              {card.word}
            </span>
          </div>

          {/* OVERLAY IMAGE BOX LID: Animates sliding UPWARD when clicked for 3 seconds */}
          <div
            className={`absolute inset-0 z-10 w-full h-full relative overflow-hidden bg-[#171A20] transition-transform duration-500 ease-in-out border-b border-[#303642] ${
              isPeeking ? "-translate-y-[88%]" : "translate-y-0"
            }`}
          >
            {/* Full Artwork Image */}
            {cardImg ? (
              <img
                src={cardImg}
                alt={card.word}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full bg-[#171A20]" />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

"use client";

import { useState, useEffect, useRef } from "react";
import { Share2, Check, HelpCircle, User, X } from "lucide-react";
import { PublicRoomState, PublicCard, CardType, GameLog as GameLogType } from "@/types/game";
import { sounds } from "@/lib/soundEffects";

// Deterministic artwork image assignment per card ID & team type
export function getCardImage(cardId: string, type?: CardType): string {
  if (!type) return "";
  let hash = 0;
  for (let i = 0; i < cardId.length; i++) {
    hash = (hash << 5) - hash + cardId.charCodeAt(i);
    hash |= 0;
  }
  const variant = (Math.abs(hash) % 2) + 1;

  if (type === "RED") return `/cards/card_red_${variant}.jpg`;
  if (type === "BLUE") return `/cards/card_blue_${variant}.jpg`;
  if (type === "NEUTRAL") return `/cards/card_neutral_${variant}.jpg`;
  if (type === "ASSASSIN") return `/cards/card_assassin_1.jpg`;
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
  const canGuessCard = isGuessingPhase && isOperative && isMyTeamTurn;
  const canEndTurn = isGuessingPhase && isOperative && isMyTeamTurn;

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

  const copyShareLink = () => {
    const url = window.location.href;
    navigator.clipboard.writeText(url);
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
      <div className="flex-none lg:flex-1 flex flex-col items-center justify-center p-2 sm:p-4 overflow-hidden shrink-0 w-full max-w-[550px] mx-auto">
        <div className="grid grid-cols-5 aspect-square w-full gap-1.5 sm:gap-2.5">
          {game.cards.map((card) => {
            const isRevealed = card.revealed;
            const cardType = card.type;
            const cardImg = getCardImage(card.id, cardType);

            let cardClasses = "";
            let borderClass = "border-[#303642]";

            if (isRevealed) {
              if (cardType === "RED") {
                cardClasses = "game-card-revealed-red";
                borderClass = "border-[#C85A5A]";
              } else if (cardType === "BLUE") {
                cardClasses = "game-card-revealed-blue";
                borderClass = "border-[#5A85B5]";
              } else if (cardType === "NEUTRAL") {
                cardClasses = "game-card-revealed-neutral";
                borderClass = "border-[#807667]";
              } else if (cardType === "ASSASSIN") {
                cardClasses = "game-card-revealed-assassin";
                borderClass = "border-[#64748B]";
              }
            } else if (isSpymaster) {
              if (cardType === "RED") {
                cardClasses = "game-card-unrevealed spymaster-hint-red";
              } else if (cardType === "BLUE") {
                cardClasses = "game-card-unrevealed spymaster-hint-blue";
              } else if (cardType === "NEUTRAL") {
                cardClasses = "game-card-unrevealed spymaster-hint-neutral";
              } else if (cardType === "ASSASSIN") {
                cardClasses = "game-card-unrevealed spymaster-hint-assassin";
              }
            } else {
              cardClasses = "game-card-unrevealed";
            }

            return (
              <div
                key={card.id}
                className={`aspect-square w-full card-perspective ${isRevealed ? "card-flipped" : ""}`}
              >
                <div className="card-flip-inner">
                  {/* Front Face: Unrevealed Card / Spymaster Key Hint */}
                  <button
                    onClick={() => {
                      if (!isRevealed && canGuessCard) {
                        handleCardClick(card);
                      } else if (isRevealed) {
                        setInspectingCard(card);
                        sounds.playCardClick();
                      }
                    }}
                    disabled={!isRevealed && !canGuessCard}
                    className={`card-face-front w-full h-full p-1 sm:p-2 flex flex-col items-center justify-center text-center select-none font-sans font-extrabold tracking-wide text-[10px] sm:text-xs md:text-sm lg:text-base uppercase rounded-xl transition-all ${cardClasses} ${
                      (!isRevealed && canGuessCard) || isRevealed ? "cursor-pointer" : "cursor-default"
                    }`}
                  >
                    <span className="break-words leading-tight text-center">{card.word}</span>
                  </button>

                  {/* Back Face: Animated Character Artwork Image Card (Text Under Image) */}
                  <button
                    onClick={() => {
                      setInspectingCard(card);
                      sounds.playCardClick();
                    }}
                    className={`card-face-back w-full h-full flex flex-col rounded-xl border-2 overflow-hidden shadow-lg group cursor-pointer transition-transform active:scale-95 ${borderClass}`}
                  >
                    {/* Artwork Image Container */}
                    <div className="flex-1 w-full relative overflow-hidden bg-[#171A20]">
                      {cardImg ? (
                        <img
                          src={cardImg}
                          alt={card.word}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      ) : (
                        <div className="w-full h-full bg-[#171A20]" />
                      )}
                    </div>

                    {/* Word Label Underneath Image */}
                    <div className="w-full bg-[#14171D] border-t border-[#303642]/80 py-0.5 sm:py-1 px-1 flex items-center justify-center text-center shrink-0">
                      <span className="text-[#F1F0EC] font-mono font-bold text-[8px] sm:text-[10px] md:text-[11px] uppercase tracking-wider truncate w-full">
                        {card.word}
                      </span>
                    </div>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ================= BOTTOM PANEL (MOBILE < lg) / RIGHT SIDEBAR (DESKTOP ≥ lg): MATCH LOG ================= */}
      <div className="w-full lg:w-80 xl:w-96 flex-1 lg:flex-none lg:h-full bg-[#171A20] border-t lg:border-t-0 lg:border-l border-[#303642] p-2.5 sm:p-4 flex flex-col min-h-[140px] overflow-hidden">
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
                className="flex items-start space-x-2 py-0.5 border-b border-[#232832]/60 text-[#A7A9AD]"
              >
                <span className="text-[#6F737B] text-[10px] shrink-0 pt-0.5">
                  {new Date(log.timestamp).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
                {teamBadge}
                <span className="leading-normal text-[#F1F0EC] flex-1 break-words">{log.message}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* ================= CARD INSPECTION BOX MODAL ================= */}
      {inspectingCard && (
        <CardInspectionModal
          card={inspectingCard}
          onClose={() => setInspectingCard(null)}
        />
      )}
    </div>
  );
}

// Interactive Modal Component that opens as a box to reveal original card contents underneath
function CardInspectionModal({ card, onClose }: { card: PublicCard; onClose: () => void }) {
  const [isOpen, setIsOpen] = useState(false);
  const cardImg = getCardImage(card.id, card.type);

  const toggleBox = () => {
    sounds.playCardClick();
    setIsOpen(!isOpen);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fade-in"
      onClick={onClose}
    >
      <div
        className="bg-[#171A20] border border-[#303642] rounded-3xl p-5 max-w-xs sm:max-w-sm w-full space-y-4 shadow-2xl relative overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-2 border-b border-[#303642] font-mono">
          <div>
            <span className="text-[10px] text-[#6F737B] uppercase block font-bold">CARD INSPECTION BOX</span>
            <h3 className="text-lg font-black text-[#F1F0EC] uppercase tracking-wider">
              {card.word}
            </h3>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-[#232832] text-[#A7A9AD] hover:text-[#F1F0EC] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Box Lid / Card Reveal Container */}
        <div className="relative aspect-square w-full rounded-2xl overflow-hidden border-2 border-[#303642] bg-[#111318] shadow-inner flex flex-col justify-between p-4">
          {/* UNDERNEATH LAYER: What was originally on the card */}
          <div className="absolute inset-0 p-5 flex flex-col items-center justify-center text-center space-y-3 bg-[#111318] z-0">
            <span className="text-[10px] font-mono uppercase tracking-widest text-[#6F737B] font-bold">
              ORIGINAL CARD IDENTITY
            </span>

            <div className="text-2xl font-black font-sans uppercase tracking-wide text-[#F1F0EC] px-3 py-1 bg-[#171A20] border border-[#303642] rounded-xl">
              {card.word}
            </div>

            {card.type && (
              <div className="flex flex-col items-center space-y-1">
                <span className="text-[10px] font-mono text-[#A7A9AD]">ASSIGNED AGENT TEAM:</span>
                <span
                  className={`px-3 py-1 rounded-xl text-xs font-mono font-bold uppercase tracking-wider ${
                    card.type === "RED"
                      ? "bg-[#B85C5C]/20 text-[#B85C5C] border border-[#B85C5C]/50"
                      : card.type === "BLUE"
                      ? "bg-[#52759B]/20 text-[#52759B] border border-[#52759B]/50"
                      : card.type === "NEUTRAL"
                      ? "bg-[#C8BFAE]/20 text-[#C8BFAE] border border-[#C8BFAE]/50"
                      : "bg-slate-800 text-slate-200 border border-slate-600"
                  }`}
                >
                  {card.type === "NEUTRAL" ? "BYSTANDER (NEUTRAL)" : `${card.type} AGENT`}
                </span>
              </div>
            )}
          </div>

          {/* OVERLAY BOX LID (IMAGE + TEXT): Animates sliding/lifting open when clicked */}
          <div
            onClick={toggleBox}
            className={`absolute inset-0 z-10 flex flex-col bg-[#171A20] cursor-pointer transition-transform duration-500 ease-in-out shadow-2xl border-b-2 border-[#303642] ${
              isOpen ? "-translate-y-[85%]" : "translate-y-0"
            }`}
            title="Click image to open box lid"
          >
            {/* Image */}
            <div className="flex-1 w-full relative overflow-hidden bg-[#111318]">
              {cardImg ? (
                <img
                  src={cardImg}
                  alt={card.word}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-[#171A20]" />
              )}

              {/* Click prompt badge on lid */}
              <div className="absolute top-2 right-2 px-2 py-0.5 rounded-full bg-black/70 backdrop-blur-md border border-white/20 text-[9px] font-mono font-bold text-white tracking-wide">
                {isOpen ? "TAP TO CLOSE BOX" : "TAP IMAGE TO OPEN BOX"}
              </div>
            </div>

            {/* Text under image on lid */}
            <div className="w-full bg-[#171A20] border-t border-[#303642] py-2 px-3 text-center shrink-0 flex items-center justify-between">
              <span className="text-[#F1F0EC] font-mono font-bold text-xs uppercase tracking-wider">
                {card.word}
              </span>
              <span className="text-[10px] font-mono text-[#A7A9AD]">
                {isOpen ? "▲ OPEN" : "▼ CLOSED"}
              </span>
            </div>
          </div>
        </div>

        {/* Action Toggle Button */}
        <button
          onClick={toggleBox}
          className="w-full py-2.5 rounded-xl bg-[#232832] border border-[#303642] text-[#F1F0EC] hover:bg-[#303642] font-mono font-bold text-xs uppercase tracking-wider transition-colors cursor-pointer flex items-center justify-center space-x-2"
        >
          <span>{isOpen ? "CLOSE BOX LID" : "OPEN BOX LID & PEEK UNDERNEATH"}</span>
        </button>
      </div>
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import confetti from "canvas-confetti";
import { PublicRoomState } from "@/types/game";
import { sounds } from "@/lib/soundEffects";

interface GameOverModalProps {
  roomState: PublicRoomState;
  onPlayAgain: () => void;
}

export default function GameOverModal({
  roomState,
  onPlayAgain,
}: GameOverModalProps) {
  const [dismissed, setDismissed] = useState(false);

  const game = roomState.game;
  const isFinished = game?.phase === "FINISHED";

  useEffect(() => {
    if (isFinished) {
      setDismissed(false);
      sounds.playVictory();
      confetti({
        particleCount: 80,
        spread: 60,
        origin: { y: 0.6 },
      });
    }
  }, [isFinished, game?.winner]);

  if (!isFinished || !game || dismissed) return null;

  const winner = game.winner;
  const isRedWinner = winner === "RED";
  const winReason = game.winReason;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="w-full max-w-md p-6 sm:p-8 rounded-3xl bg-[#1D2129] border border-[#303642] shadow-2xl text-center space-y-6">
        <div>
          <span className="text-xs font-mono font-bold uppercase text-[#6F737B] tracking-widest">
            Game Match Concluded
          </span>
          <h2
            className={`text-3xl font-black font-mono tracking-wider uppercase mt-2 ${
              isRedWinner ? "text-[#B85C5C]" : "text-[#52759B]"
            }`}
          >
            {winner} TEAM WINS!
          </h2>
          <p className="text-xs text-[#A7A9AD] font-mono mt-2 leading-relaxed">
            {winReason === "ASSASSIN_REVEALED"
              ? "The opposing team revealed the ASSASSIN card!"
              : `${winner} team decyphered all their target words.`}
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-[#171A20] border border-[#303642] text-xs font-mono text-[#A7A9AD] flex justify-around">
          <div>
            <span className="block text-[10px] uppercase text-[#6F737B]">
              Red Words Left
            </span>
            <span className="text-base font-bold text-[#B85C5C]">
              {game.redCardsLeft}
            </span>
          </div>
          <div className="w-px bg-[#303642]" />
          <div>
            <span className="block text-[10px] uppercase text-[#6F737B]">
              Blue Words Left
            </span>
            <span className="text-base font-bold text-[#52759B]">
              {game.blueCardsLeft}
            </span>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-3 pt-2 font-mono text-xs font-bold">
          <button
            onClick={() => setDismissed(true)}
            className="w-full sm:w-1/2 py-3 px-4 rounded-xl border border-[#303642] text-[#A7A9AD] hover:text-[#F1F0EC] hover:bg-[#232832] transition-colors"
          >
            INSPECT BOARD
          </button>

          <button
            onClick={() => {
              onPlayAgain();
              sounds.playClueSubmit();
            }}
            className="w-full sm:w-1/2 py-3 px-4 rounded-xl bg-[#232832] border border-[#303642] text-[#F1F0EC] hover:bg-[#303642] transition-colors uppercase cursor-pointer"
          >
            PLAY AGAIN
          </button>
        </div>
      </div>
    </div>
  );
}

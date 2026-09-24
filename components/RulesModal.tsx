"use client";

import { X, ArrowRight, Trophy, Skull } from "lucide-react";

interface RulesModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function RulesModal({ isOpen, onClose }: RulesModalProps) {
  if (!isOpen) return null;

  // Mini 5x5 board mock pattern (9 RED, 8 BLUE, 7 NEUTRAL, 1 ASSASSIN)
  const miniBoard = [
    "RED", "BLUE", "NEUTRAL", "RED", "BLUE",
    "NEUTRAL", "RED", "ASSASSIN", "NEUTRAL", "RED",
    "BLUE", "RED", "NEUTRAL", "BLUE", "RED",
    "RED", "NEUTRAL", "BLUE", "RED", "BLUE",
    "BLUE", "NEUTRAL", "RED", "BLUE", "NEUTRAL",
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="w-full max-w-xl max-h-[85vh] overflow-y-auto no-scrollbar p-6 sm:p-8 rounded-3xl bg-[#1D2129] border border-[#303642] shadow-2xl space-y-6 font-mono">
        {/* Header */}
        <div className="flex items-start justify-between pb-4 border-b border-[#303642]">
          <div>
            <h2 className="text-2xl font-black text-[#F1F0EC] tracking-wider uppercase">
              HOW TO PLAY
            </h2>
            <p className="text-xs text-[#A7A9AD] mt-1">
              Give clues. Find your team's words. Avoid the Assassin.
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-[#A7A9AD] hover:text-[#F1F0EC] hover:bg-[#232832] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 1. THE BOARD */}
        <div className="p-4 rounded-2xl bg-[#171A20] border border-[#303642] space-y-3">
          <div className="text-xs font-bold text-[#F1F0EC] uppercase tracking-wider">
            1. THE BOARD
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-4">
            {/* Miniature 5x5 Grid Graphic */}
            <div className="grid grid-cols-5 gap-1 p-2 bg-[#111318] rounded-xl border border-[#303642] shrink-0">
              {miniBoard.map((type, idx) => {
                let bg = "bg-[#C8BFAE]";
                if (type === "RED") bg = "bg-[#B85C5C]";
                if (type === "BLUE") bg = "bg-[#52759B]";
                if (type === "ASSASSIN") bg = "bg-[#292B30]";
                return (
                  <div
                    key={idx}
                    className={`w-4 h-4 rounded-sm ${bg} transition-transform hover:scale-110`}
                  />
                );
              })}
            </div>

            <div className="text-xs text-[#A7A9AD] space-y-1">
              <div className="font-bold text-[#F1F0EC]">
                25 words · 2 teams · 1 hidden Assassin
              </div>
              <p className="text-[11px] leading-relaxed">
                RED starts with 9 cards. BLUE has 8 cards. 7 are Neutral.
              </p>
            </div>
          </div>
        </div>

        {/* 2. GIVE A CLUE */}
        <div className="p-4 rounded-2xl bg-[#171A20] border border-[#303642] space-y-3">
          <div className="text-xs font-bold text-[#F1F0EC] uppercase tracking-wider">
            2. GIVE A CLUE
          </div>

          {/* Large Clue Graphic */}
          <div className="px-5 py-3 rounded-xl bg-[#111318] border border-[#303642] text-center">
            <span className="text-xl sm:text-2xl font-black text-[#F1F0EC] tracking-widest">
              ANIMAL · 3
            </span>
          </div>

          <p className="text-xs text-[#A7A9AD] leading-relaxed">
            Spymaster gives <span className="text-[#F1F0EC] font-bold">ONE WORD + NUMBER</span>. The number tells your team how many words to look for.
          </p>
        </div>

        {/* 3. PICK CARDS */}
        <div className="p-4 rounded-2xl bg-[#171A20] border border-[#303642] space-y-3">
          <div className="text-xs font-bold text-[#F1F0EC] uppercase tracking-wider">
            3. PICK CARDS
          </div>

          {/* 4 Outcome Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {/* YOUR TEAM */}
            <div className="p-3 rounded-xl bg-[#B85C5C] text-white space-y-1 shadow-sm">
              <div className="text-xs font-black tracking-wider flex items-center space-x-1.5">
                <span>🔴 YOUR TEAM</span>
              </div>
              <div className="text-[11px] opacity-95">Reveal → Keep guessing</div>
            </div>

            {/* OPPONENT */}
            <div className="p-3 rounded-xl bg-[#52759B] text-white space-y-1 shadow-sm">
              <div className="text-xs font-black tracking-wider flex items-center space-x-1.5">
                <span>🔵 OPPONENT</span>
              </div>
              <div className="text-[11px] opacity-95">Reveal → Turn ends</div>
            </div>

            {/* NEUTRAL */}
            <div className="p-3 rounded-xl bg-[#C8BFAE] text-[#24262A] space-y-1 shadow-sm">
              <div className="text-xs font-black tracking-wider flex items-center space-x-1.5">
                <span>⚪ NEUTRAL</span>
              </div>
              <div className="text-[11px] opacity-90">Reveal → Turn ends</div>
            </div>

            {/* ASSASSIN */}
            <div className="p-3 rounded-xl bg-[#292B30] text-[#F1F0EC] space-y-1 border border-[#303642] shadow-sm">
              <div className="text-xs font-black tracking-wider flex items-center space-x-1.5 text-red-400">
                <span>⚫ ASSASSIN</span>
              </div>
              <div className="text-[11px] text-red-300">Reveal → You lose</div>
            </div>
          </div>
        </div>

        {/* 4. YOUR TURN */}
        <div className="p-4 rounded-2xl bg-[#171A20] border border-[#303642] space-y-3">
          <div className="text-xs font-bold text-[#F1F0EC] uppercase tracking-wider">
            4. YOUR TURN
          </div>

          {/* Flow Diagram */}
          <div className="flex items-center justify-between px-3 py-2.5 rounded-xl bg-[#111318] border border-[#303642] text-[11px] text-[#F1F0EC] font-bold overflow-x-auto no-scrollbar">
            <span>CLUE</span>
            <ArrowRight className="w-3.5 h-3.5 text-[#6F737B] shrink-0" />
            <span>GUESS</span>
            <ArrowRight className="w-3.5 h-3.5 text-[#6F737B] shrink-0" />
            <span>GUESS</span>
            <ArrowRight className="w-3.5 h-3.5 text-[#6F737B] shrink-0" />
            <span className="text-[#A7A9AD]">END TURN</span>
          </div>

          <p className="text-xs text-[#A7A9AD] leading-relaxed">
            You can make up to the clue number + 1 guesses, or end your turn early anytime.
          </p>
        </div>

        {/* 5. WIN / LOSE */}
        <div className="p-4 rounded-2xl bg-[#171A20] border border-[#303642] space-y-3">
          <div className="text-xs font-bold text-[#F1F0EC] uppercase tracking-wider">
            5. WIN / LOSE
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs font-bold">
            {/* WIN */}
            <div className="p-3.5 rounded-xl bg-[#111318] border border-emerald-500/40 text-emerald-400 space-y-1">
              <div className="flex items-center space-x-1.5 text-[#F1F0EC] text-[11px]">
                <Trophy className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>YOUR TEAM'S CARDS</span>
              </div>
              <div className="text-emerald-400 text-xs tracking-wider">
                ALL REVEALED → YOU WIN
              </div>
            </div>

            {/* LOSE */}
            <div className="p-3.5 rounded-xl bg-[#111318] border border-red-500/40 text-red-400 space-y-1">
              <div className="flex items-center space-x-1.5 text-[#F1F0EC] text-[11px]">
                <Skull className="w-4 h-4 text-red-400 shrink-0" />
                <span>ASSASSIN REVEALED</span>
              </div>
              <div className="text-red-400 text-xs tracking-wider">
                GAME OVER → YOU LOSE
              </div>
            </div>
          </div>
        </div>

        {/* Close Action */}
        <div className="flex justify-end pt-2">
          <button
            onClick={onClose}
            className="w-full sm:w-auto px-8 py-3 rounded-xl bg-[#232832] border border-[#303642] text-[#F1F0EC] font-bold text-xs uppercase tracking-wider hover:bg-[#303642] transition-colors cursor-pointer"
          >
            START PLAYING
          </button>
        </div>
      </div>
    </div>
  );
}

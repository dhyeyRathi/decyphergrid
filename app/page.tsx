"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Header from "@/components/Header";
import NameModal from "@/components/NameModal";
import RulesModal from "@/components/RulesModal";
import { useSocket } from "@/hooks/useSocket";
import { getPlayerNameCookie } from "@/lib/cookies";
import { sounds } from "@/lib/soundEffects";

export default function LandingPage() {
  const router = useRouter();
  const { createRoom, isConnected } = useSocket();

  const [playerName, setPlayerName] = useState("");
  const [isNameModalOpen, setIsNameModalOpen] = useState(false);
  const [isRulesModalOpen, setIsRulesModalOpen] = useState(false);
  const [joinCode, setJoinCode] = useState("");
  const [joinError, setJoinError] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    const existing = getPlayerNameCookie();
    if (existing) {
      setPlayerName(existing);
    } else {
      setIsNameModalOpen(true);
    }
  }, []);

  const handleNameSave = (name: string) => {
    setPlayerName(name);
    setIsNameModalOpen(false);
  };

  const handleCreateGame = async () => {
    if (!playerName) {
      setIsNameModalOpen(true);
      return;
    }
    try {
      setIsCreating(true);
      sounds.playCardClick();
      const roomCode = await createRoom(playerName);
      router.push(`/game/${roomCode}`);
    } catch (err: any) {
      setIsCreating(false);
      alert(err.toString());
    }
  };

  const handleJoinGame = (e: React.FormEvent) => {
    e.preventDefault();
    const code = joinCode.trim().toUpperCase();
    if (!code) {
      setJoinError("Please enter a room code.");
      return;
    }
    if (code.length < 4) {
      setJoinError("Invalid room code.");
      return;
    }
    if (!playerName) {
      setIsNameModalOpen(true);
      return;
    }

    sounds.playCardClick();
    router.push(`/game/${code}`);
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#111318] text-[#F1F0EC]">
      <Header
        playerName={playerName}
        onEditName={() => setIsNameModalOpen(true)}
        onOpenRules={() => setIsRulesModalOpen(true)}
      />

      {/* Main Centered Editorial Interface */}
      <main className="flex-1 flex flex-col items-center justify-center max-w-xl w-full mx-auto px-6 py-16 text-center">
        {/* Title & Tagline */}
        <div className="space-y-3 mb-10">
          <h1 className="text-4xl sm:text-5xl font-black tracking-widest text-[#F1F0EC] uppercase font-mono">
            DECYPHER<span className="text-[#A7A9AD]">GRID</span>
          </h1>
          <p className="text-[#A7A9AD] text-sm sm:text-base font-normal max-w-md mx-auto leading-relaxed">
            A tactical word deduction game for teams who think alike.
          </p>
        </div>

        {/* Primary Action Card Container */}
        <div className="w-full bg-[#171A20] border border-[#303642] rounded-3xl p-6 sm:p-8 space-y-6 shadow-2xl">
          {/* Create Game Button */}
          <button
            onClick={handleCreateGame}
            disabled={isCreating}
            className="w-full py-4 px-6 rounded-2xl bg-[#232832] border border-[#303642] text-[#F1F0EC] font-bold text-sm hover:bg-[#303642] hover:border-[#424A5A] transition-colors tracking-wide uppercase font-mono shadow-md disabled:opacity-50 cursor-pointer"
          >
            {isCreating ? "CREATING ROOM..." : "CREATE GAME"}
          </button>

          {/* Divider */}
          <div className="flex items-center space-x-4 my-4 text-xs text-[#6F737B] font-mono uppercase tracking-widest">
            <div className="flex-1 h-px bg-[#303642]" />
            <span>or</span>
            <div className="flex-1 h-px bg-[#303642]" />
          </div>

          {/* Join Game Form */}
          <form onSubmit={handleJoinGame} className="space-y-3">
            <div>
              <input
                type="text"
                value={joinCode}
                onChange={(e) => {
                  setJoinCode(e.target.value.toUpperCase());
                  if (joinError) setJoinError("");
                }}
                placeholder="ENTER ROOM CODE"
                maxLength={8}
                className="w-full py-3.5 px-4 bg-[#111318] border border-[#303642] rounded-2xl text-[#F1F0EC] font-mono font-bold text-center tracking-widest placeholder-[#6F737B] focus:outline-none focus:border-[#52759B] uppercase text-sm"
              />
              {joinError && (
                <p className="text-xs text-[#B85C5C] mt-2 font-mono">{joinError}</p>
              )}
            </div>

            <button
              type="submit"
              className="w-full py-3.5 px-6 rounded-2xl bg-[#1D2129] border border-[#303642] text-[#A7A9AD] hover:text-[#F1F0EC] hover:bg-[#232832] transition-colors font-bold text-xs uppercase font-mono tracking-wider cursor-pointer"
            >
              JOIN GAME
            </button>
          </form>
        </div>
      </main>



      {/* Modals */}
      <NameModal
        isOpen={isNameModalOpen}
        onSave={handleNameSave}
        canClose={!!playerName}
        onClose={() => setIsNameModalOpen(false)}
      />

      <RulesModal
        isOpen={isRulesModalOpen}
        onClose={() => setIsRulesModalOpen(false)}
      />
    </div>
  );
}

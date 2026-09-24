"use client";

import { useState } from "react";
import Link from "next/link";
import { Volume2, VolumeX, Copy, Check } from "lucide-react";
import { sounds } from "@/lib/soundEffects";
import { PublicRoomState } from "@/types/game";

interface HeaderProps {
  playerName: string;
  currentPlayerId?: string;
  onEditName: () => void;
  onOpenRules: () => void;
  roomState?: PublicRoomState | null;
}

export default function Header({
  playerName,
  currentPlayerId,
  onEditName,
  onOpenRules,
  roomState,
}: HeaderProps) {
  const [copied, setCopied] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(sounds.enabled);

  const currentPlayer = roomState?.players?.find(
    (p) => (currentPlayerId && p.id === currentPlayerId) || p.name.toLowerCase() === playerName.toLowerCase()
  );

  const toggleSound = () => {
    sounds.enabled = !soundEnabled;
    setSoundEnabled(sounds.enabled);
    if (sounds.enabled) sounds.playCardClick();
  };

  const copyRoomLink = () => {
    if (!roomState?.code) return;
    const url = `${window.location.origin}/game/${roomState.code}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    sounds.playCardClick();
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <header className="border-b border-[#303642] bg-[#171A20] px-6 py-4">
      <div className="max-w-6xl mx-auto flex items-center justify-between">
        {/* Brand */}
        <Link href="/" className="flex items-center space-x-3 group">
          <span className="text-xl font-black tracking-widest text-[#F1F0EC] uppercase font-mono">
            DECYPHER<span className="text-[#A7A9AD]">GRID</span>
          </span>
        </Link>

        {/* Room Code Badge (if in room) */}
        {roomState && (
          <div className="hidden md:flex items-center space-x-3">
            <button
              onClick={copyRoomLink}
              className="flex items-center space-x-2 px-3 py-1.5 rounded-lg bg-[#1D2129] border border-[#303642] text-[#A7A9AD] hover:text-[#F1F0EC] hover:border-[#424A5A] transition-colors text-xs font-mono"
            >
              <span>ROOM:</span>
              <span className="font-bold text-[#F1F0EC] tracking-wider">
                {roomState.code}
              </span>
              {copied ? (
                <Check className="w-3.5 h-3.5 text-emerald-400" />
              ) : (
                <Copy className="w-3.5 h-3.5 text-[#6F737B]" />
              )}
            </button>
          </div>
        )}

        {/* Right Actions */}
        <div className="flex items-center space-x-4 text-xs font-mono">
          <button
            onClick={onOpenRules}
            className="text-[#A7A9AD] hover:text-[#F1F0EC] transition-colors font-medium"
          >
            Rules
          </button>

          <button
            onClick={toggleSound}
            className="text-[#A7A9AD] hover:text-[#F1F0EC] transition-colors"
            aria-label={soundEnabled ? "Mute audio" : "Unmute audio"}
          >
            {soundEnabled ? (
              <Volume2 className="w-4 h-4 text-[#A7A9AD]" />
            ) : (
              <VolumeX className="w-4 h-4 text-[#6F737B]" />
            )}
          </button>

          <button
            onClick={onEditName}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-[#1D2129] border border-[#303642] text-[#F1F0EC] hover:border-[#424A5A] transition-colors font-medium"
          >
            <span className="truncate max-w-[120px]">{playerName || "Player"}</span>
            {currentPlayer?.team && currentPlayer?.role && (
              <span
                className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                  currentPlayer.team === "RED"
                    ? "bg-[#B85C5C]/20 text-[#B85C5C]"
                    : "bg-[#52759B]/20 text-[#52759B]"
                }`}
              >
                {currentPlayer.team} {currentPlayer.role}
              </span>
            )}
          </button>
        </div>
      </div>
    </header>
  );
}

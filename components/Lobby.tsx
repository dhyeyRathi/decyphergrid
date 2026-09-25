"use client";

import { useState } from "react";
import { Share2, Check, UserX } from "lucide-react";
import { PublicRoomState, Team, Role, Player } from "@/types/game";
import { sounds } from "@/lib/soundEffects";
import { copyToClipboard } from "@/lib/clipboard";

interface LobbyProps {
  roomState: PublicRoomState;
  currentPlayerId: string;
  onSetTeamAndRole: (team: Team | null, role: Role | null) => void;
  onRandomizeTeams: () => void;
  onKickPlayer: (targetPlayerId: string) => void;
  onStartGame: () => void;
}

export default function Lobby({
  roomState,
  currentPlayerId,
  onSetTeamAndRole,
  onRandomizeTeams,
  onKickPlayer,
  onStartGame,
}: LobbyProps) {
  const [copied, setCopied] = useState(false);

  const players = roomState.players || [];
  const isAdmin = roomState.adminId === currentPlayerId;

  // Filter team members
  const redSpymaster = players.find((p) => p.team === "RED" && p.role === "SPYMASTER");
  const redOperatives = players.filter((p) => p.team === "RED" && p.role === "OPERATIVE");

  const blueSpymaster = players.find((p) => p.team === "BLUE" && p.role === "SPYMASTER");
  const blueOperatives = players.filter((p) => p.team === "BLUE" && p.role === "OPERATIVE");

  const unassigned = players.filter((p) => !p.team || !p.role);

  // Validation
  const hasRedSpymaster = !!redSpymaster;
  const hasRedOperative = redOperatives.length > 0;
  const hasBlueSpymaster = !!blueSpymaster;
  const hasBlueOperative = blueOperatives.length > 0;
  const canStartGame =
    hasRedSpymaster && hasRedOperative && hasBlueSpymaster && hasBlueOperative;

  const copyShareLink = async () => {
    await copyToClipboard(roomState.code);
    setCopied(true);
    sounds.playCardClick();
    setTimeout(() => setCopied(false), 2000);
  };

  const renderPlayerRow = (p: Player) => {
    const isSelf = p.id === currentPlayerId;
    return (
      <div
        key={p.id}
        className={`flex items-center justify-between px-3 py-2 rounded-xl text-xs font-mono transition-colors ${
          isSelf
            ? "bg-[#232832] border border-[#303642] text-[#F1F0EC] font-bold"
            : "bg-[#171A20] border border-[#303642] text-[#A7A9AD]"
        }`}
      >
        <div className="flex items-center space-x-2 truncate">
          <span
            className={`w-2 h-2 rounded-full ${
              p.connected ? "bg-emerald-500" : "bg-[#6F737B]"
            }`}
          />
          <span className="truncate">{p.name}</span>
          {p.isAdmin && (
            <span className="text-[10px] text-amber-400 font-bold" title="Room Admin">
              (ADMIN)
            </span>
          )}
          {isSelf && (
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#303642] text-[#F1F0EC]">
              YOU
            </span>
          )}
        </div>

        {isAdmin && !isSelf && (
          <button
            onClick={() => onKickPlayer(p.id)}
            title="Kick player"
            className="text-[#6F737B] hover:text-[#B85C5C] transition-colors p-1"
          >
            <UserX className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto py-6">
      {/* Lobby Header Bar */}
      <div className="bg-[#171A20] border border-[#303642] p-6 rounded-3xl flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-2xl font-bold font-mono text-[#F1F0EC] uppercase tracking-wide">
            Game Room Lobby
          </h1>
          <p className="text-xs text-[#A7A9AD] mt-1">
            Assign team roles. At least 1 Spymaster and 1 Operative are required per team.
          </p>
        </div>

        {/* Room Code & Copy */}
        <div className="flex items-center space-x-3 bg-[#1D2129] border border-[#303642] p-3 rounded-2xl">
          <div className="text-right font-mono">
            <span className="text-[10px] uppercase text-[#6F737B] block">
              Room Code
            </span>
            <span className="text-xl font-bold text-[#F1F0EC] tracking-wider">
              {roomState.code}
            </span>
          </div>
          <button
            onClick={copyShareLink}
            className="flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-[#232832] border border-[#303642] text-[#F1F0EC] hover:bg-[#303642] text-xs font-mono font-medium transition-colors"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span>COPIED</span>
              </>
            ) : (
              <>
                <Share2 className="w-3.5 h-3.5" />
                <span>SHARE</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* 3 Team Columns Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* RED TEAM COLUMN */}
        <div className="bg-[#171A20] border border-[#303642] border-t-4 border-t-[#B85C5C] p-5 rounded-3xl space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-[#303642]">
            <h2 className="font-bold text-[#B85C5C] text-base font-mono tracking-wider uppercase">
              RED TEAM
            </h2>
            <span className="text-xs text-[#A7A9AD] font-mono">
              {(redSpymaster ? 1 : 0) + redOperatives.length} Players
            </span>
          </div>

          {/* Spymaster */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs text-[#A7A9AD] font-mono">
              <span>Spymaster (1)</span>
              {!redSpymaster && (
                <button
                  onClick={() => {
                    onSetTeamAndRole("RED", "SPYMASTER");
                    sounds.playCardClick();
                  }}
                  className="px-2 py-1 rounded bg-[#232832] border border-[#303642] text-[#B85C5C] hover:bg-[#303642] text-[11px] font-bold"
                >
                  Join
                </button>
              )}
            </div>
            {redSpymaster ? (
              renderPlayerRow(redSpymaster)
            ) : (
              <div className="p-3 rounded-xl border border-dashed border-[#303642] text-center text-xs text-[#6F737B] font-mono">
                Empty Slot
              </div>
            )}
          </div>

          {/* Operatives */}
          <div className="space-y-2 pt-2">
            <div className="flex items-center justify-between text-xs text-[#A7A9AD] font-mono">
              <span>Operatives (1+)</span>
              <button
                onClick={() => {
                  onSetTeamAndRole("RED", "OPERATIVE");
                  sounds.playCardClick();
                }}
                className="px-2 py-1 rounded bg-[#232832] border border-[#303642] text-[#B85C5C] hover:bg-[#303642] text-[11px] font-bold"
              >
                Join
              </button>
            </div>
            {redOperatives.length > 0 ? (
              <div className="space-y-2">{redOperatives.map(renderPlayerRow)}</div>
            ) : (
              <div className="p-3 rounded-xl border border-dashed border-[#303642] text-center text-xs text-[#6F737B] font-mono">
                No Operatives
              </div>
            )}
          </div>
        </div>

        {/* BLUE TEAM COLUMN */}
        <div className="bg-[#171A20] border border-[#303642] border-t-4 border-t-[#52759B] p-5 rounded-3xl space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-[#303642]">
            <h2 className="font-bold text-[#52759B] text-base font-mono tracking-wider uppercase">
              BLUE TEAM
            </h2>
            <span className="text-xs text-[#A7A9AD] font-mono">
              {(blueSpymaster ? 1 : 0) + blueOperatives.length} Players
            </span>
          </div>

          {/* Spymaster */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs text-[#A7A9AD] font-mono">
              <span>Spymaster (1)</span>
              {!blueSpymaster && (
                <button
                  onClick={() => {
                    onSetTeamAndRole("BLUE", "SPYMASTER");
                    sounds.playCardClick();
                  }}
                  className="px-2 py-1 rounded bg-[#232832] border border-[#303642] text-[#52759B] hover:bg-[#303642] text-[11px] font-bold"
                >
                  Join
                </button>
              )}
            </div>
            {blueSpymaster ? (
              renderPlayerRow(blueSpymaster)
            ) : (
              <div className="p-3 rounded-xl border border-dashed border-[#303642] text-center text-xs text-[#6F737B] font-mono">
                Empty Slot
              </div>
            )}
          </div>

          {/* Operatives */}
          <div className="space-y-2 pt-2">
            <div className="flex items-center justify-between text-xs text-[#A7A9AD] font-mono">
              <span>Operatives (1+)</span>
              <button
                onClick={() => {
                  onSetTeamAndRole("BLUE", "OPERATIVE");
                  sounds.playCardClick();
                }}
                className="px-2 py-1 rounded bg-[#232832] border border-[#303642] text-[#52759B] hover:bg-[#303642] text-[11px] font-bold"
              >
                Join
              </button>
            </div>
            {blueOperatives.length > 0 ? (
              <div className="space-y-2">{blueOperatives.map(renderPlayerRow)}</div>
            ) : (
              <div className="p-3 rounded-xl border border-dashed border-[#303642] text-center text-xs text-[#6F737B] font-mono">
                No Operatives
              </div>
            )}
          </div>
        </div>

        {/* SPECTATORS COLUMN */}
        <div className="bg-[#171A20] border border-[#303642] p-5 rounded-3xl space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-[#303642]">
            <h2 className="font-bold text-[#A7A9AD] text-base font-mono tracking-wider uppercase">
              UNASSIGNED
            </h2>
            <button
              onClick={() => {
                onSetTeamAndRole(null, null);
                sounds.playCardClick();
              }}
              className="text-xs text-[#A7A9AD] hover:text-[#F1F0EC] font-mono"
            >
              Leave Team
            </button>
          </div>

          {unassigned.length > 0 ? (
            <div className="space-y-2">{unassigned.map(renderPlayerRow)}</div>
          ) : (
            <div className="p-3 rounded-xl border border-dashed border-[#303642] text-center text-xs text-[#6F737B] font-mono">
              All players assigned
            </div>
          )}
        </div>
      </div>

      {/* Admin Action Bar */}
      <div className="bg-[#171A20] border border-[#303642] p-5 rounded-3xl flex flex-col sm:flex-row items-center justify-between gap-4">
        {isAdmin ? (
          <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
            <button
              onClick={() => {
                onRandomizeTeams();
                sounds.playCardClick();
              }}
              className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-[#232832] border border-[#303642] text-[#A7A9AD] hover:text-[#F1F0EC] text-xs font-mono uppercase tracking-wider transition-colors"
            >
              Randomize Teams
            </button>
          </div>
        ) : (
          <div className="text-xs text-[#6F737B] font-mono">
            Waiting for Admin to start the game...
          </div>
        )}

        <div className="flex items-center space-x-4 w-full sm:w-auto">
          {!canStartGame && (
            <span className="text-xs text-[#A7A9AD] font-mono">
              Need 1 Spymaster + 1 Operative per team
            </span>
          )}

          {isAdmin && (
            <button
              onClick={() => {
                if (canStartGame) {
                  onStartGame();
                  sounds.playClueSubmit();
                }
              }}
              disabled={!canStartGame}
              className={`w-full sm:w-auto px-8 py-3 rounded-xl font-mono font-bold text-xs uppercase tracking-wider transition-colors ${
                canStartGame
                  ? "bg-[#232832] border border-[#303642] text-[#F1F0EC] hover:bg-[#303642] cursor-pointer"
                  : "bg-[#1D2129] border border-[#303642] text-[#6F737B] cursor-not-allowed"
              }`}
            >
              START GAME
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

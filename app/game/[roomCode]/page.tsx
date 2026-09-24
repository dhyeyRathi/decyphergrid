"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, Loader2 } from "lucide-react";
import Header from "@/components/Header";
import Lobby from "@/components/Lobby";
import GameBoard from "@/components/GameBoard";
import GameLog from "@/components/GameLog";
import GameOverModal from "@/components/GameOverModal";
import NameModal from "@/components/NameModal";
import RulesModal from "@/components/RulesModal";
import { useSocket } from "@/hooks/useSocket";
import { getPlayerNameCookie } from "@/lib/cookies";

interface PageProps {
  params: Promise<{ roomCode: string }>;
}

export default function GameRoomPage({ params }: PageProps) {
  const unwrappedParams = use(params);
  const roomCode = unwrappedParams.roomCode.toUpperCase();
  const router = useRouter();

  const {
    isConnected,
    playerId,
    roomState,
    errorMsg,
    clearError,
    joinRoom,
    setTeamAndRole,
    randomizeTeams,
    addTestBots,
    kickPlayer,
    startGame,
    submitClue,
    selectCard,
    endTurn,
    playAgain,
  } = useSocket();

  const [playerName, setPlayerName] = useState("");
  const [isNameModalOpen, setIsNameModalOpen] = useState(false);
  const [isRulesModalOpen, setIsRulesModalOpen] = useState(false);
  const [isJoining, setIsJoining] = useState(true);

  // Dynamic tab title update
  useEffect(() => {
    if (roomCode) {
      document.title = `Room ${roomCode} | DECYPHERGRID`;
    }
  }, [roomCode]);

  // Load player name from cookie on mount
  useEffect(() => {
    const existing = getPlayerNameCookie();
    if (existing) {
      setPlayerName(existing);
    } else {
      setIsNameModalOpen(true);
    }
  }, []);

  // Join room once when playerName & roomCode are available
  const joinedRoomRef = useState<{ code: string; name: string } | null>(null);

  useEffect(() => {
    if (!playerName || !roomCode) return;

    let mounted = true;
    setIsJoining(true);

    joinRoom(roomCode, playerName)
      .then(() => {
        if (mounted) {
          setIsJoining(false);
        }
      })
      .catch((err) => {
        console.error("Join room error:", err);
        if (mounted) {
          setIsJoining(false);
        }
      });

    return () => {
      mounted = false;
    };
  }, [playerName, roomCode, joinRoom]);

  const handleNameSave = (name: string) => {
    setPlayerName(name);
    setIsNameModalOpen(false);
  };

  const game = roomState?.game;
  const isLobby = !game || game.phase === "LOBBY";

  return (
    <div className="h-screen w-full flex flex-col bg-[#111318] text-[#F1F0EC] overflow-hidden">
      {/* Toast Error Alert */}
      {errorMsg && (
        <div className="fixed top-4 right-4 z-50 max-w-sm p-4 rounded-2xl glass-panel border border-red-500/40 bg-red-950/80 text-red-200 font-mono text-xs flex items-center justify-between shadow-2xl animate-bounce">
          <div className="flex items-center space-x-2">
            <AlertCircle className="w-5 h-5 text-red-400 shrink-0" />
            <span>{errorMsg}</span>
          </div>
          <button onClick={clearError} className="text-red-400 font-bold ml-2">
            ✕
          </button>
        </div>
      )}

      {/* Main Game Area */}
      {isJoining && !roomState ? (
        <div className="flex-1 flex flex-col items-center justify-center space-y-4 font-mono text-[#A7A9AD]">
          <Loader2 className="w-8 h-8 text-[#A7A9AD] animate-spin" />
          <p className="text-sm">Joining room...</p>
        </div>
      ) : !roomState ? (
        <div className="flex-1 flex flex-col items-center justify-center text-center font-mono space-y-4">
          <h2 className="text-2xl font-bold text-red-400">Room Not Found</h2>
          <p className="text-xs text-slate-400">
            The room code "{roomCode}" does not exist or has expired.
          </p>
          <button
            onClick={() => router.push("/")}
            className="px-6 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs font-bold"
          >
            Return to Main Screen
          </button>
        </div>
      ) : isLobby ? (
        <div className="flex-1 flex flex-col overflow-y-auto">
          <Header
            playerName={playerName}
            currentPlayerId={playerId}
            onEditName={() => setIsNameModalOpen(true)}
            onOpenRules={() => setIsRulesModalOpen(true)}
            roomState={roomState}
          />
          <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6">
            <Lobby
              roomState={roomState}
              currentPlayerId={playerId}
              onSetTeamAndRole={(team, role) => setTeamAndRole(roomCode, team, role)}
              onRandomizeTeams={() => randomizeTeams(roomCode)}
              onKickPlayer={(targetId) => kickPlayer(roomCode, roomState.adminId, targetId)}
              onStartGame={() => startGame(roomCode, roomState.adminId)}
            />
          </main>
        </div>
      ) : (
        <div className="h-screen w-full overflow-hidden">
          <GameBoard
            roomState={roomState}
            currentPlayerId={playerId}
            playerName={playerName}
            onSubmitClue={(word, number) => submitClue(roomCode, word, number)}
            onSelectCard={(cardId) => selectCard(roomCode, cardId)}
            onEndTurn={() => endTurn(roomCode)}
            onOpenRules={() => setIsRulesModalOpen(true)}
            onEditName={() => setIsNameModalOpen(true)}
          />

          <GameOverModal
            roomState={roomState}
            onPlayAgain={() => playAgain(roomCode)}
          />
        </div>
      )}

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

"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import PartySocket from "partysocket";
import { PublicRoomState, Team, Role } from "@/types/game";

export function useSocket() {
  const [roomState, setRoomState] = useState<PublicRoomState | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [playerId, setPlayerId] = useState<string>("");
  const [isConnected, setIsConnected] = useState<boolean>(false);

  const partySocketRef = useRef<PartySocket | WebSocket | null>(null);
  const activeRoomCodeRef = useRef<string | null>(null);
  const pollTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastStateHashRef = useRef<string>("");

  // Helper to ensure valid playerId
  const getOrInitPlayerId = useCallback(() => {
    let pid = playerId;
    if (!pid && typeof window !== "undefined") {
      pid = sessionStorage.getItem("decypher_player_id") || "";
      if (!pid) {
        pid = Math.random().toString(36).substring(2, 9) + Date.now().toString(36);
        sessionStorage.setItem("decypher_player_id", pid);
      }
      setPlayerId(pid);
    }
    return pid;
  }, [playerId]);

  // Initialize persistent player ID
  useEffect(() => {
    getOrInitPlayerId();
  }, [getOrInitPlayerId]);

  // Connect to WS Server / PartyKit / Local fallback
  const connectSocket = useCallback(
    (roomCode: string = "lobby") => {
      const pid = getOrInitPlayerId();
      if (!pid) return;

      if (partySocketRef.current) {
        try {
          partySocketRef.current.close();
        } catch {}
      }

      activeRoomCodeRef.current = roomCode;

      const wsCustomUrl = process.env.NEXT_PUBLIC_WS_URL;
      const partyHost = process.env.NEXT_PUBLIC_PARTYKIT_HOST;
      const isLocal =
        typeof window !== "undefined" &&
        (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1");

      try {
        if (wsCustomUrl || (isLocal && !partyHost)) {
          // Standard WebSocket Mode (Render / Railway / OCI / Local wsServer)
          const targetUrl = wsCustomUrl || "ws://localhost:8080";
          const ws = new WebSocket(targetUrl);
          partySocketRef.current = ws;

          ws.onopen = () => {
            setIsConnected(true);
            ws.send(JSON.stringify({ type: "register", roomCode, playerId: pid }));
          };

          ws.onmessage = (event) => {
            try {
              const data = JSON.parse(event.data);
              if ((data.type === "room_state" || data.type === "action_response") && data.state) {
                setRoomState(data.state);
              } else if (data.error) {
                setErrorMsg(data.error);
                setTimeout(() => setErrorMsg(null), 4000);
              }
            } catch {}
          };

          ws.onclose = () => setIsConnected(false);
          ws.onerror = () => setIsConnected(false);
        } else if (partyHost) {
          // PartyKit Mode
          const socket = new PartySocket({
            host: partyHost,
            room: roomCode.toLowerCase(),
            query: { playerId: pid },
          });

          partySocketRef.current = socket;

          socket.addEventListener("open", () => {
            setIsConnected(true);
            socket.send(JSON.stringify({ type: "register", roomCode, playerId: pid }));
          });

          socket.addEventListener("message", (event) => {
            try {
              const data = JSON.parse(event.data);
              if ((data.type === "room_state" || data.type === "action_response") && data.state) {
                setRoomState(data.state);
              } else if (data.error) {
                setErrorMsg(data.error);
                setTimeout(() => setErrorMsg(null), 4000);
              }
            } catch {}
          });

          socket.addEventListener("close", () => setIsConnected(false));
          socket.addEventListener("error", () => setIsConnected(false));
        } else {
          // Vercel Serverless HTTP Mode
          setIsConnected(true);
        }
      } catch (err) {
        console.error("[useSocket] Connection error:", err);
      }
    },
    [getOrInitPlayerId]
  );

  // Initial connection
  useEffect(() => {
    connectSocket("lobby");

    return () => {
      if (partySocketRef.current) {
        try {
          partySocketRef.current.close();
        } catch {}
      }
    };
  }, [connectSocket]);

  // Fallback Polling (only runs if WS is not active)
  useEffect(() => {
    if (!playerId) return;

    const poll = async () => {
      if (!activeRoomCodeRef.current || activeRoomCodeRef.current === "lobby") return;
      if (isConnected && partySocketRef.current?.readyState === WebSocket.OPEN) return;

      try {
        const res = await fetch("/api/game/action", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "get_state",
            roomCode: activeRoomCodeRef.current,
            playerId,
          }),
        });
        const data = await res.json();
        if (data.success && data.state) {
          const stateHash = JSON.stringify(data.state);
          if (stateHash !== lastStateHashRef.current) {
            lastStateHashRef.current = stateHash;
            setRoomState(data.state);
          }
        }
      } catch {}
    };

    pollTimerRef.current = setInterval(poll, 1500);

    return () => {
      if (pollTimerRef.current) clearInterval(pollTimerRef.current);
    };
  }, [playerId, isConnected]);

  // Execute Action (WS first, fallback to HTTP API)
  const sendAction = useCallback(
    async (actionPayload: any): Promise<any> => {
      const pid = getOrInitPlayerId();
      const payload = { ...actionPayload, playerId: pid };

      if (partySocketRef.current && partySocketRef.current.readyState === WebSocket.OPEN) {
        partySocketRef.current.send(
          JSON.stringify({
            type: "action",
            ...payload,
          })
        );
        return { success: true };
      }

      // HTTP API Fallback
      try {
        const res = await fetch("/api/game/action", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const data = await res.json();
        if (!data.success) {
          throw new Error(data.error || "Action failed");
        }
        if (data.state) {
          setRoomState(data.state);
        }
        return data;
      } catch (err: any) {
        setErrorMsg(err.message || "Action failed");
        setTimeout(() => setErrorMsg(null), 4000);
        throw err;
      }
    },
    [getOrInitPlayerId]
  );

  const createRoom = useCallback(
    async (playerName: string): Promise<string> => {
      const pid = getOrInitPlayerId();
      const data = await sendAction({
        action: "create_room",
        playerName,
        playerId: pid,
      });
      const roomCode = data.roomCode;
      if (roomCode) {
        activeRoomCodeRef.current = roomCode;
        connectSocket(roomCode);
      }
      return roomCode;
    },
    [connectSocket, getOrInitPlayerId, sendAction]
  );

  const joinRoom = useCallback(
    async (roomCode: string, playerName: string): Promise<string> => {
      const pid = getOrInitPlayerId();
      const code = roomCode.toUpperCase().trim();
      activeRoomCodeRef.current = code;
      connectSocket(code);
      const data = await sendAction({
        action: "join_room",
        roomCode: code,
        playerName,
        playerId: pid,
      });
      return data.roomCode || code;
    },
    [connectSocket, getOrInitPlayerId, sendAction]
  );

  const setTeamAndRole = useCallback(
    (roomCode: string, team: Team | null, role: Role | null) => {
      sendAction({ action: "set_team_role", roomCode, team, role });
    },
    [sendAction]
  );

  const randomizeTeams = useCallback(
    (roomCode: string) => {
      sendAction({ action: "randomize_teams", roomCode });
    },
    [sendAction]
  );

  const kickPlayer = useCallback(
    (roomCode: string, adminId: string, targetPlayerId: string) => {
      sendAction({ action: "kick_player", roomCode, adminId, targetPlayerId });
    },
    [sendAction]
  );

  const startGame = useCallback(
    (roomCode: string, adminId: string) => {
      sendAction({ action: "start_game", roomCode, adminId });
    },
    [sendAction]
  );

  const submitClue = useCallback(
    (roomCode: string, word: string, number: number) => {
      sendAction({ action: "submit_clue", roomCode, word, number });
    },
    [sendAction]
  );

  const selectCard = useCallback(
    (roomCode: string, cardId: string) => {
      sendAction({ action: "select_card", roomCode, cardId });
    },
    [sendAction]
  );

  const endTurn = useCallback(
    (roomCode: string) => {
      sendAction({ action: "end_turn", roomCode });
    },
    [sendAction]
  );

  const playAgain = useCallback(
    (roomCode: string) => {
      sendAction({ action: "play_again", roomCode });
    },
    [sendAction]
  );

  const clearError = useCallback(() => setErrorMsg(null), []);

  return {
    isConnected,
    playerId,
    roomState,
    errorMsg,
    clearError,
    createRoom,
    joinRoom,
    setTeamAndRole,
    randomizeTeams,
    kickPlayer,
    startGame,
    submitClue,
    selectCard,
    endTurn,
    playAgain,
  };
}

"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { PublicRoomState, Team, Role } from "@/types/game";

export function useSocket() {
  const [roomState, setRoomState] = useState<PublicRoomState | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [playerId, setPlayerId] = useState<string>("");
  const [isConnected, setIsConnected] = useState<boolean>(false);

  const socketRef = useRef<WebSocket | null>(null);
  const activeRoomCodeRef = useRef<string | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

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

  // Connect STRICTLY to standard WebSocket server (Render/Railway/OCI/Local)
  const connectSocket = useCallback(
    (roomCode: string = "lobby") => {
      const pid = getOrInitPlayerId();
      if (!pid) return;

      if (socketRef.current) {
        try {
          socketRef.current.close();
        } catch {}
      }

      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }

      activeRoomCodeRef.current = roomCode;

      // STRICT WEBSOCKET MODE
      const wsUrl = process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:8080";
      console.log(`🚀 [Decyphergrid WS] Connecting STRICTLY to WebSockets at: ${wsUrl}`);

      try {
        const ws = new WebSocket(wsUrl);
        socketRef.current = ws;

        ws.onopen = () => {
          console.log("✅ [Decyphergrid WS] WebSocket connection established successfully!");
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

        const handleDisconnect = () => {
          // Prevent multiple reconnection loops if socket ref changed
          if (socketRef.current !== ws) return;

          console.warn("⚠️ [Decyphergrid WS] WebSocket connection dropped. Reconnecting in 3s...");
          setIsConnected(false);
          
          reconnectTimeoutRef.current = setTimeout(() => {
            if (activeRoomCodeRef.current) {
              connectSocket(activeRoomCodeRef.current);
            }
          }, 3000);
        };

        ws.onclose = handleDisconnect;
        ws.onerror = (err) => {
          // Use console.warn instead of console.error to prevent Next.js giant red error overlay
          console.warn("⚠️ [Decyphergrid WS] WebSocket connection failed. Is the WS server running?");
          handleDisconnect();
        };
      } catch (err) {
        console.error("[useSocket] Connection initialization error:", err);
      }
    },
    [getOrInitPlayerId]
  );

  // Initial connection
  useEffect(() => {
    connectSocket("lobby");

    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (socketRef.current) {
        try {
          socketRef.current.close();
        } catch {}
      }
    };
  }, [connectSocket]);

  // Execute Action (Strictly via WebSocket frame)
  const sendAction = useCallback(
    async (actionPayload: any): Promise<any> => {
      const pid = getOrInitPlayerId();
      const payload = { ...actionPayload, playerId: pid };

      if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
        socketRef.current.send(
          JSON.stringify({
            type: "action",
            ...payload,
          })
        );
        return { success: true, roomCode: payload.roomCode };
      } else {
        const error = "Not connected to WebSocket server. Please wait or refresh.";
        setErrorMsg(error);
        setTimeout(() => setErrorMsg(null), 4000);
        throw new Error(error);
      }
    },
    [getOrInitPlayerId]
  );

  const waitForConnection = async (): Promise<void> => {
    if (socketRef.current?.readyState === WebSocket.OPEN) return;
    return new Promise((resolve, reject) => {
      let attempts = 0;
      const interval = setInterval(() => {
        attempts++;
        if (socketRef.current?.readyState === WebSocket.OPEN) {
          clearInterval(interval);
          resolve();
        } else if (attempts > 100) { // 5 seconds timeout
          clearInterval(interval);
          reject(new Error("WebSocket connection timeout"));
        }
      }, 50);
    });
  };

  const createRoom = useCallback(
    async (playerName: string): Promise<string> => {
      const pid = getOrInitPlayerId();
      const chars = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";
      let code = "";
      for (let i = 0; i < 6; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
      }

      activeRoomCodeRef.current = code;
      connectSocket(code);

      try {
        await waitForConnection();
        await sendAction({
          action: "create_room",
          playerName,
          playerId: pid,
          roomCode: code,
        });
      } catch (err) {
        console.error("Failed to create room:", err);
        throw err;
      }

      return code;
    },
    [connectSocket, getOrInitPlayerId, sendAction]
  );

  const joinRoom = useCallback(
    async (roomCode: string, playerName: string): Promise<string> => {
      const pid = getOrInitPlayerId();
      const code = roomCode.toUpperCase().trim();
      activeRoomCodeRef.current = code;
      connectSocket(code);
      
      try {
        await waitForConnection();
        await sendAction({
          action: "join_room",
          roomCode: code,
          playerName,
          playerId: pid,
        });
      } catch (err) {
        console.error("Failed to join room:", err);
        throw err;
      }
      
      return code;
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

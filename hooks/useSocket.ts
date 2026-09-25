"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { PublicRoomState, Team, Role } from "@/types/game";

export function useSocket() {
  const [roomState, setRoomState] = useState<PublicRoomState | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [playerId, setPlayerId] = useState<string>("");
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [isRoomNotFound, setIsRoomNotFound] = useState<boolean>(false);

  const socketRef = useRef<WebSocket | null>(null);
  const activeRoomCodeRef = useRef<string | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const pingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const playerIdRef = useRef<string>("");

  // Initialize persistent player ID synchronously on first call
  const getOrInitPlayerId = useCallback(() => {
    if (playerIdRef.current) return playerIdRef.current;
    if (typeof window === "undefined") return "";
    let pid = sessionStorage.getItem("decypher_player_id") || "";
    if (!pid) {
      pid = Math.random().toString(36).substring(2, 9) + Date.now().toString(36);
      sessionStorage.setItem("decypher_player_id", pid);
    }
    playerIdRef.current = pid;
    setPlayerId(pid);
    return pid;
  }, []);

  // Send a raw JSON message on the current socket
  const sendRaw = useCallback((msg: Record<string, any>) => {
    const ws = socketRef.current;
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(msg));
      return true;
    }
    return false;
  }, []);

  // Connect the WebSocket (only called once on mount, and on reconnect)
  const connectSocket = useCallback(
    (roomCode: string) => {
      const pid = getOrInitPlayerId();
      if (!pid) return;

      // Clean up any existing connection
      if (socketRef.current) {
        try { socketRef.current.close(); } catch {}
        socketRef.current = null;
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
      if (pingIntervalRef.current) {
        clearInterval(pingIntervalRef.current);
        pingIntervalRef.current = null;
      }

      const wsUrl = process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:8080";
      console.log(`🚀 [WS] Connecting to: ${wsUrl} for room: ${roomCode}`);

      try {
        const ws = new WebSocket(wsUrl);
        socketRef.current = ws;

        ws.onopen = () => {
          console.log("✅ [WS] Connected!");
          setIsConnected(true);
          // Register with whatever room we currently care about
          const currentRoom = activeRoomCodeRef.current || roomCode;
          ws.send(JSON.stringify({ type: "register", roomCode: currentRoom, playerId: pid }));

          // Start application-level heartbeat
          pingIntervalRef.current = setInterval(() => {
            if (ws.readyState === WebSocket.OPEN) {
              ws.send(JSON.stringify({ type: "ping", playerId: pid }));
            }
          }, 10000);
        };

        ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            if ((data.type === "room_state" || data.type === "action_response") && data.state) {
              setRoomState(data.state);
              setIsRoomNotFound(false);
            } else if (data.error) {
              console.warn(`[WS ERR] ${data.error}`);
              if (data.error === "Room not found") {
                setIsRoomNotFound(true);
              } else {
                setErrorMsg(data.error);
                setTimeout(() => setErrorMsg(null), 4000);
              }
            }
          } catch {}
        };

        const handleDisconnect = (event?: any) => {
          if (socketRef.current !== ws) return;
          console.warn("⚠️ [WS] Disconnected. Reconnecting in 3s...", event?.code);
          setIsConnected(false);
          if (pingIntervalRef.current) {
            clearInterval(pingIntervalRef.current);
            pingIntervalRef.current = null;
          }

          reconnectTimeoutRef.current = setTimeout(() => {
            const currentRoom = activeRoomCodeRef.current || "lobby";
            connectSocket(currentRoom);
          }, 3000);
        };

        ws.onclose = handleDisconnect;
        ws.onerror = () => {
          console.warn("⚠️ [WS] Connection failed.");
          handleDisconnect();
        };
      } catch (err) {
        console.error("[useSocket] Connection error:", err);
      }
    },
    [getOrInitPlayerId]
  );

  // Connect once on mount — this is the ONLY place connectSocket is called automatically
  useEffect(() => {
    const pid = getOrInitPlayerId();
    if (!pid) return;

    connectSocket("lobby");

    return () => {
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
      if (pingIntervalRef.current) clearInterval(pingIntervalRef.current);
      if (socketRef.current) {
        try { socketRef.current.close(); } catch {}
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Wait for the socket to be open
  const waitForConnection = useCallback(async (): Promise<void> => {
    if (socketRef.current?.readyState === WebSocket.OPEN) return;
    return new Promise((resolve, reject) => {
      let attempts = 0;
      const interval = setInterval(() => {
        attempts++;
        if (socketRef.current?.readyState === WebSocket.OPEN) {
          clearInterval(interval);
          resolve();
        } else if (attempts > 100) {
          clearInterval(interval);
          reject(new Error("WebSocket connection timeout"));
        }
      }, 50);
    });
  }, []);

  // Send an action and re-register the socket for the correct room
  const sendAction = useCallback(
    async (actionPayload: any): Promise<any> => {
      const pid = playerIdRef.current || getOrInitPlayerId();
      const payload = { ...actionPayload, playerId: pid };

      if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
        // If the room code changed, re-register on the SAME socket (no reconnect!)
        const actionRoom = payload.roomCode?.toUpperCase?.()?.trim?.();
        if (actionRoom && actionRoom !== activeRoomCodeRef.current) {
          activeRoomCodeRef.current = actionRoom;
          socketRef.current.send(
            JSON.stringify({ type: "register", roomCode: actionRoom, playerId: pid })
          );
        }

        socketRef.current.send(JSON.stringify({ type: "action", ...payload }));
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

  const createRoom = useCallback(
    async (playerName: string): Promise<string> => {
      const pid = playerIdRef.current || getOrInitPlayerId();
      const chars = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";
      let code = "";
      for (let i = 0; i < 6; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
      }

      activeRoomCodeRef.current = code;

      // Re-register the existing socket for the new room code
      await waitForConnection();
      sendRaw({ type: "register", roomCode: code, playerId: pid });

      await sendAction({
        action: "create_room",
        playerName,
        playerId: pid,
        roomCode: code,
      });

      return code;
    },
    [getOrInitPlayerId, sendAction, sendRaw, waitForConnection]
  );

  const joinRoom = useCallback(
    async (roomCode: string, playerName: string): Promise<string> => {
      const pid = playerIdRef.current || getOrInitPlayerId();
      const code = roomCode.toUpperCase().trim();
      activeRoomCodeRef.current = code;

      // Re-register the existing socket for this room code
      await waitForConnection();
      sendRaw({ type: "register", roomCode: code, playerId: pid });

      await sendAction({
        action: "join_room",
        roomCode: code,
        playerName,
        playerId: pid,
      });

      return code;
    },
    [getOrInitPlayerId, sendAction, sendRaw, waitForConnection]
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

  const leaveGame = useCallback(
    (roomCode: string) => {
      sendAction({ action: "leave_game", roomCode });
    },
    [sendAction]
  );

  const clearError = useCallback(() => setErrorMsg(null), []);

  return {
    isConnected,
    playerId,
    roomState,
    errorMsg,
    isRoomNotFound,
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
    leaveGame,
  };
}

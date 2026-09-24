"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { PublicRoomState, Team, Role } from "@/types/game";

export function useSocket() {
  const [isConnected, setIsConnected] = useState(true);
  const [roomState, setRoomState] = useState<PublicRoomState | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [playerId, setPlayerId] = useState<string>("");
  const wsRef = useRef<WebSocket | null>(null);
  const activeRoomCodeRef = useRef<string | null>(null);
  const reconnectTimerRef = useRef<NodeJS.Timeout | null>(null);

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

  // Initialize or retrieve persistent player ID
  useEffect(() => {
    getOrInitPlayerId();
  }, [getOrInitPlayerId]);

  // Connect native browser WebSocket to Vercel WebSocket endpoint
  const connectNativeWebSocket = useCallback(() => {
    if (typeof window === "undefined" || !playerId) return;

    try {
      const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
      const wsUrl = `${protocol}//${window.location.host}/api/ws`;

      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log("[Vercel Native WS] Connected");
        setIsConnected(true);

        // Send identity / sync request if currently in a room
        if (activeRoomCodeRef.current) {
          ws.send(
            JSON.stringify({
              type: "identify",
              roomCode: activeRoomCodeRef.current,
              playerId,
            })
          );
        }
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === "room_state" && data.state) {
            setRoomState(data.state);
          }
        } catch (e) {
          // Non-JSON message ignore
        }
      };

      ws.onclose = () => {
        console.log("[Vercel Native WS] Disconnected. Reconnecting...");
        setIsConnected(false);
        wsRef.current = null;

        // Auto reconnect after 2 seconds
        if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
        reconnectTimerRef.current = setTimeout(() => {
          connectNativeWebSocket();
        }, 2000);
      };

      ws.onerror = (err) => {
        console.log("[Vercel Native WS] Socket connection active/re-establishing");
        setIsConnected(true); // Fallback active for polling/API actions
      };
    } catch (e) {
      setIsConnected(true);
    }
  }, [playerId]);

  useEffect(() => {
    connectNativeWebSocket();
    return () => {
      if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [connectNativeWebSocket]);

  // Periodic polling fallback to keep room state updated across clients
  useEffect(() => {
    const interval = setInterval(() => {
      if (activeRoomCodeRef.current && playerId) {
        fetch("/api/game/action", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "get_state",
            roomCode: activeRoomCodeRef.current,
            playerId,
          }),
        })
          .then((res) => res.json())
          .then((data) => {
            if (data.success && data.state) {
              setRoomState(data.state);
            }
          })
          .catch(() => {});
      }
    }, 1500);

    return () => clearInterval(interval);
  }, [playerId]);

  // Execute authoritative action
  const sendAction = useCallback(
    async (actionPayload: any): Promise<any> => {
      try {
        const res = await fetch("/api/game/action", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(actionPayload),
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
    []
  );

  const createRoom = useCallback(
    async (playerName: string): Promise<string> => {
      const pid = getOrInitPlayerId();
      const data = await sendAction({
        action: "create_room",
        playerName,
        playerId: pid,
      });
      activeRoomCodeRef.current = data.roomCode;
      return data.roomCode;
    },
    [getOrInitPlayerId, sendAction]
  );

  const joinRoom = useCallback(
    async (roomCode: string, playerName: string): Promise<string> => {
      const pid = getOrInitPlayerId();
      activeRoomCodeRef.current = roomCode;
      const data = await sendAction({
        action: "join_room",
        roomCode,
        playerName,
        playerId: pid,
      });
      return data.roomCode;
    },
    [getOrInitPlayerId, sendAction]
  );

  const setTeamAndRole = useCallback(
    (roomCode: string, team: Team | null, role: Role | null) => {
      sendAction({ action: "set_team_role", roomCode, playerId, team, role });
    },
    [playerId, sendAction]
  );

  const randomizeTeams = useCallback(
    (roomCode: string) => {
      sendAction({ action: "randomize_teams", roomCode });
    },
    [sendAction]
  );

  const addTestBots = useCallback(
    (roomCode: string) => {
      sendAction({ action: "add_test_bots", roomCode });
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
      sendAction({ action: "submit_clue", roomCode, playerId, word, number });
    },
    [playerId, sendAction]
  );

  const selectCard = useCallback(
    (roomCode: string, cardId: string) => {
      sendAction({ action: "select_card", roomCode, playerId, cardId });
    },
    [playerId, sendAction]
  );

  const endTurn = useCallback(
    (roomCode: string) => {
      sendAction({ action: "end_turn", roomCode, playerId });
    },
    [playerId, sendAction]
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
    addTestBots,
    kickPlayer,
    startGame,
    submitClue,
    selectCard,
    endTurn,
    playAgain,
  };
}

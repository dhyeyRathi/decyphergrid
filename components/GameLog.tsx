"use client";

import { useEffect, useRef } from "react";
import { GameLog as GameLogType } from "@/types/game";

interface GameLogProps {
  logs: GameLogType[];
}

export default function GameLog({ logs }: GameLogProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs]);

  if (!logs || logs.length === 0) return null;

  return (
    <div className="bg-[#171A20] border border-[#303642] p-4 rounded-3xl max-w-5xl mx-auto my-6 font-mono text-xs">
      <div className="text-[10px] text-[#6F737B] uppercase tracking-wider mb-2 pb-2 border-b border-[#303642]">
        Match Activity Log
      </div>

      <div
        ref={scrollRef}
        className="max-h-36 overflow-y-auto space-y-1.5 pr-2"
      >
        {logs.map((log) => {
          let teamBadge = null;
          if (log.team === "RED") {
            teamBadge = <span className="text-[#B85C5C] font-bold">[RED]</span>;
          } else if (log.team === "BLUE") {
            teamBadge = <span className="text-[#52759B] font-bold">[BLUE]</span>;
          }

          return (
            <div
              key={log.id}
              className="flex items-start space-x-2 py-0.5 text-[#A7A9AD]"
            >
              <span className="text-[#6F737B] text-[10px] shrink-0">
                {new Date(log.timestamp).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                  second: "2-digit",
                })}
              </span>
              {teamBadge}
              <span className="leading-relaxed text-[#F1F0EC]">{log.message}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

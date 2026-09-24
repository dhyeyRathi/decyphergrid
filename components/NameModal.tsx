"use client";

import { useState, useEffect } from "react";
import { setPlayerNameCookie, getPlayerNameCookie } from "@/lib/cookies";

interface NameModalProps {
  isOpen: boolean;
  onSave: (name: string) => void;
  onClose?: () => void;
  canClose?: boolean;
}

export default function NameModal({
  isOpen,
  onSave,
  onClose,
  canClose = false,
}: NameModalProps) {
  const [name, setName] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    const existing = getPlayerNameCookie();
    if (existing) {
      setName(existing);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) {
      setError("Please enter a player name.");
      return;
    }
    if (trimmed.length > 20) {
      setError("Name must be 20 characters or less.");
      return;
    }

    setPlayerNameCookie(trimmed);
    setError("");
    onSave(trimmed);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
      <div className="w-full max-w-md p-6 rounded-2xl bg-[#1D2129] border border-[#303642] shadow-2xl space-y-5">
        <div>
          <h2 className="text-xl font-bold text-[#F1F0EC] tracking-tight">
            Player Identity
          </h2>
          <p className="text-xs text-[#A7A9AD] mt-1">
            Enter your display name to join multiplayer game rooms.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-[#A7A9AD] uppercase tracking-wider mb-1">
              Display Name
            </label>
            <div className="relative">
              <input
                type="text"
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  if (error) setError("");
                }}
                placeholder="e.g. Maverick, Atlas"
                maxLength={20}
                autoFocus
                className="w-full px-4 py-2.5 bg-[#171A20] border border-[#303642] rounded-xl text-[#F1F0EC] placeholder-[#6F737B] focus:outline-none focus:border-[#52759B] text-sm"
              />
              <span className="absolute right-3 top-3 text-xs text-[#6F737B]">
                {name.length}/20
              </span>
            </div>
            {error && <p className="mt-1.5 text-xs text-[#B85C5C]">{error}</p>}
          </div>

          <p className="text-[11px] text-[#6F737B]">
            No account required. Your display name will be remembered for your next visit.
          </p>

          <div className="flex justify-end space-x-3 pt-2">
            {canClose && onClose && (
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl border border-[#303642] text-[#A7A9AD] hover:text-[#F1F0EC] text-xs font-medium transition-colors"
              >
                Cancel
              </button>
            )}
            <button
              type="submit"
              className="px-5 py-2.5 rounded-xl bg-[#232832] border border-[#303642] text-[#F1F0EC] font-semibold text-xs hover:bg-[#303642] transition-colors"
            >
              Save Name
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

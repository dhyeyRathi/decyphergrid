"use client";

import { AlertTriangle, X } from "lucide-react";

interface LeaveModalProps {
  isOpen: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function LeaveModal({ isOpen, onConfirm, onCancel }: LeaveModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-sm p-6 rounded-3xl bg-[#1D2129] border border-[#303642] shadow-2xl space-y-6 font-mono text-center animate-in zoom-in-95 duration-200">
        
        <div className="flex justify-center">
          <div className="p-3 bg-red-500/10 rounded-full border border-red-500/20">
            <AlertTriangle className="w-8 h-8 text-red-500" />
          </div>
        </div>

        <div className="space-y-2">
          <h2 className="text-xl font-black text-[#F1F0EC] tracking-wider uppercase">
            Leave Game?
          </h2>
          <p className="text-xs text-[#A7A9AD]">
            Are you sure you want to leave the game? If you are the only player in your role, the game will end immediately!
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 pt-2">
          <button
            onClick={onCancel}
            className="flex-1 px-4 py-2.5 rounded-xl bg-[#171A20] border border-[#303642] text-[#A7A9AD] hover:text-[#F1F0EC] hover:bg-[#232832] transition-colors text-xs font-bold uppercase tracking-wider"
          >
            Cancel
          </button>
          
          <button
            onClick={onConfirm}
            className="flex-1 px-4 py-2.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 hover:bg-red-500 hover:text-white transition-colors text-xs font-bold uppercase tracking-wider"
          >
            Yes, Leave
          </button>
        </div>
      </div>
    </div>
  );
}

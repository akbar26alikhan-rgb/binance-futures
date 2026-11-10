import React, { useState } from 'react';
import { PhaseGate } from '../types/quant';
import { CheckCircle2, Clock, Lock, ChevronRight, X } from 'lucide-react';

interface PhaseGateBarProps {
  gates: PhaseGate[];
  onApproveGate: (gateId: number) => void;
  onResetGate: (gateId: number) => void;
}

export const PhaseGateBar: React.FC<PhaseGateBarProps> = ({ gates, onApproveGate, onResetGate }) => {
  const [selectedGate, setSelectedGate] = useState<PhaseGate | null>(null);

  return (
    <div className="bg-zinc-950 border-b border-zinc-800/80 px-4 py-2.5">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-start md:items-center justify-between gap-3 font-mono">
        {/* Title */}
        <div className="flex items-center gap-2 text-xs text-zinc-400">
          <span className="font-semibold text-zinc-300">GOVERNANCE GATES</span>
          <span className="text-[11px] text-zinc-500">· Human Approval Required At Every Milestone</span>
        </div>

        {/* Gate Steps */}
        <div className="flex flex-wrap items-center gap-1.5 w-full md:w-auto">
          {gates.map((g, idx) => {
            const isApproved = g.status === 'APPROVED';
            const isInReview = g.status === 'IN_REVIEW';
            const isLocked = g.status === 'LOCKED';

            return (
              <React.Fragment key={g.id}>
                <button
                  onClick={() => setSelectedGate(g)}
                  className={`flex items-center gap-1.5 px-2.5 py-1 text-xs rounded border transition-colors ${
                    isApproved
                      ? 'bg-emerald-950/40 border-emerald-800/60 text-emerald-300 hover:bg-emerald-950/70'
                      : isInReview
                      ? 'bg-amber-950/40 border-amber-800/60 text-amber-300 hover:bg-amber-950/70 animate-pulse'
                      : 'bg-zinc-900/50 border-zinc-800 text-zinc-500 hover:bg-zinc-900 cursor-not-allowed'
                  }`}
                >
                  {isApproved ? (
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  ) : isInReview ? (
                    <Clock className="w-3.5 h-3.5 text-amber-400" />
                  ) : (
                    <Lock className="w-3.5 h-3.5 text-zinc-600" />
                  )}
                  <span>Gate {g.id}: {g.phaseName}</span>
                </button>
                {idx < gates.length - 1 && (
                  <ChevronRight className="w-3 h-3 text-zinc-700 hidden sm:inline" />
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>

      {/* Gate Detail & Approval Modal */}
      {selectedGate && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-700 rounded-xl max-w-lg w-full p-6 text-zinc-100 shadow-2xl font-mono">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
              <div className="flex items-center gap-2">
                <span className="text-xs px-2 py-0.5 rounded bg-zinc-800 text-zinc-400">
                  PHASE GATE {selectedGate.id}
                </span>
                <h3 className="font-semibold text-sm text-zinc-200">{selectedGate.title}</h3>
              </div>
              <button
                onClick={() => setSelectedGate(null)}
                className="text-zinc-500 hover:text-zinc-300 p-1 rounded"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="my-4 space-y-3 text-xs">
              <p className="text-zinc-300 leading-relaxed">{selectedGate.summary}</p>

              <div>
                <span className="text-[11px] uppercase tracking-wider text-zinc-500 font-bold block mb-1">
                  Required Deliverables & Audit Items
                </span>
                <ul className="space-y-1.5 text-zinc-300">
                  {selectedGate.deliverables.map((item, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <span className="text-emerald-400 mt-0.5">✓</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="p-3 rounded bg-zinc-950 border border-zinc-800 text-zinc-400">
                <span className="text-[11px] uppercase tracking-wider text-zinc-500 block mb-0.5">
                  Approval Status
                </span>
                <div className="flex items-center justify-between text-xs">
                  <span>Current State:</span>
                  <span className={`font-semibold ${
                    selectedGate.status === 'APPROVED' ? 'text-emerald-400' : 'text-amber-400'
                  }`}>
                    {selectedGate.status}
                  </span>
                </div>
                {selectedGate.approvedTimestamp && (
                  <div className="text-[11px] text-zinc-500 mt-1">
                    Signed off by {selectedGate.approvedBy} on {selectedGate.approvedTimestamp}
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-zinc-800">
              <button
                onClick={() => setSelectedGate(null)}
                className="px-3 py-1.5 text-xs text-zinc-400 hover:text-zinc-200 border border-zinc-700 rounded hover:bg-zinc-800"
              >
                Close
              </button>

              {selectedGate.status === 'APPROVED' ? (
                <button
                  onClick={() => {
                    onResetGate(selectedGate.id);
                    setSelectedGate(null);
                  }}
                  className="px-3 py-1.5 text-xs text-amber-300 bg-amber-950/60 border border-amber-700 rounded hover:bg-amber-900"
                >
                  Revoke Sign-Off
                </button>
              ) : (
                <button
                  onClick={() => {
                    onApproveGate(selectedGate.id);
                    setSelectedGate(null);
                  }}
                  className="px-3 py-1.5 text-xs font-semibold text-emerald-950 bg-emerald-400 hover:bg-emerald-300 rounded shadow"
                >
                  Approve Phase Gate {selectedGate.id}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

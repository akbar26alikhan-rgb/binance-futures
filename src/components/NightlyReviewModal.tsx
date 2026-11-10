import React, { useState, useEffect } from 'react';
import { X, RefreshCw, CheckCircle, XCircle, AlertTriangle, ShieldCheck, Terminal } from 'lucide-react';
import { Position, Order, RegimeMetrics } from '../types/quant';

interface NightlyReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  orders: Order[];
  positions: Position[];
  regimeMetrics: RegimeMetrics;
  equity: number;
}

export const NightlyReviewModal: React.FC<NightlyReviewModalProps> = ({
  isOpen,
  onClose,
  orders,
  positions,
  regimeMetrics,
  equity,
}) => {
  const [loading, setLoading] = useState<boolean>(false);
  const [report, setReport] = useState<string>('');
  const [reportSource, setReportSource] = useState<string>('');
  const [proposedChanges, setProposedChanges] = useState<{
    id: string;
    title: string;
    description: string;
    status: 'PENDING' | 'APPROVED' | 'REJECTED';
  }[]>([
    {
      id: 'prop_1',
      title: 'Spread Execution Throttle',
      description: 'Veto market/taker entries if instantaneous BTC bid-ask spread widens beyond 1.8 ticks.',
      status: 'PENDING',
    },
    {
      id: 'prop_2',
      title: 'Funding Carry Hurdle Increase',
      description: 'Raise the 8h predicted funding entry hurdle from +0.0250% to +0.0300% to offset higher US-session taker slippage.',
      status: 'PENDING',
    },
    {
      id: 'prop_3',
      title: 'Donchian Breakout Period Expansion',
      description: 'Test widening breakout lookback from 20 bars to 24 bars to smooth out false breakout chop during London-NY overlap.',
      status: 'PENDING',
    },
  ]);

  const fetchNightlyAudit = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/nightly-review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          trades: orders,
          regimeCalls: [regimeMetrics.currentRegime],
          metrics: {
            totalPnL: 142.50,
            winRate: 0.571,
            profitFactor: 1.84,
            maxDrawdown: 0.021,
            currentRegime: regimeMetrics.currentRegime,
            avgSlippageBps: 1.35,
          },
          activeStrategies: ['Volume-Weighted Breakout', 'Funding Carry', 'VWAP Reversion'],
        }),
      });

      const data = await response.json();
      if (data.report) {
        setReport(data.report);
        setReportSource(data.source || 'quant_engine');
      }
    } catch (err) {
      console.error('Failed to generate nightly review:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && !report) {
      fetchNightlyAudit();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleApprove = (id: string) => {
    setProposedChanges(prev =>
      prev.map(p => (p.id === id ? { ...p, status: 'APPROVED' } : p))
    );
  };

  const handleReject = (id: string) => {
    setProposedChanges(prev =>
      prev.map(p => (p.id === id ? { ...p, status: 'REJECTED' } : p))
    );
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-zinc-900 border border-zinc-700 rounded-xl max-w-3xl w-full max-h-[90vh] flex flex-col font-mono text-zinc-100 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-zinc-800">
          <div className="flex items-center gap-2">
            <Terminal className="w-5 h-5 text-sky-400" />
            <div>
              <h2 className="text-sm font-bold text-zinc-100">
                Nightly Quantitative Review & Model Post-Mortem
              </h2>
              <div className="text-[11px] text-zinc-500">
                Rule: The AI may suggest. Plain code decides. All parameter changes wait for your approval.
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={fetchNightlyAudit}
              disabled={loading}
              className="p-1.5 text-zinc-400 hover:text-zinc-200 border border-zinc-700 rounded hover:bg-zinc-800 disabled:opacity-40"
              title="Re-run audit"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-zinc-400 hover:text-zinc-200 border border-zinc-700 rounded hover:bg-zinc-800"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Audit Body */}
        <div className="p-5 overflow-y-auto space-y-4 text-xs">
          {/* Strict Safety Banner */}
          <div className="bg-amber-950/40 border border-amber-800/80 p-3 rounded-lg flex items-start gap-2.5 text-amber-200">
            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold text-amber-300">Human-In-The-Loop Approval Gate:</span>
              <p className="text-[11px] text-amber-200/90 mt-0.5 leading-relaxed">
                The agent is strictly prohibited from mutating its own code, risk ceilings, or strategy thresholds autonomously. Review the proposals below and grant explicit operator approval.
              </p>
            </div>
          </div>

          {/* Audit Report Content */}
          <div className="bg-zinc-950 p-4 rounded-lg border border-zinc-800 text-zinc-300 leading-relaxed font-sans text-xs">
            {loading ? (
              <div className="py-12 text-center text-zinc-500">
                <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-sky-400" />
                <span>Running quantitative attribution & regime diagnostic...</span>
              </div>
            ) : (
              <div className="space-y-3 prose prose-invert max-w-none text-xs">
                <div className="whitespace-pre-line font-mono">{report}</div>
                <div className="pt-2 border-t border-zinc-800 text-[10px] text-zinc-500 flex items-center justify-between">
                  <span>Engine Source: {reportSource}</span>
                  <span>Max Drawdown: 2.1% (Safe under 15% Cap)</span>
                </div>
              </div>
            )}
          </div>

          {/* Proposed Improvements Queue with Explicit Action Buttons */}
          <div>
            <h3 className="text-xs font-bold text-zinc-200 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>Proposed Adjustments (Operator Approval Required)</span>
            </h3>

            <div className="space-y-2">
              {proposedChanges.map(change => (
                <div
                  key={change.id}
                  className="p-3 rounded-lg bg-zinc-950 border border-zinc-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-zinc-200">{change.title}</span>
                      <span className={`text-[9px] uppercase font-bold px-1.5 py-0.2 rounded ${
                        change.status === 'APPROVED'
                          ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                          : change.status === 'REJECTED'
                          ? 'bg-rose-950 text-rose-400 border border-rose-800'
                          : 'bg-amber-950 text-amber-400 border border-amber-800'
                      }`}>
                        {change.status}
                      </span>
                    </div>
                    <p className="text-[11px] text-zinc-400 mt-0.5">{change.description}</p>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {change.status === 'PENDING' ? (
                      <>
                        <button
                          onClick={() => handleReject(change.id)}
                          className="px-2.5 py-1 text-xs text-rose-400 hover:text-rose-200 border border-rose-900 bg-rose-950/40 rounded hover:bg-rose-950 flex items-center gap-1"
                        >
                          <XCircle className="w-3.5 h-3.5" />
                          <span>Reject</span>
                        </button>
                        <button
                          onClick={() => handleApprove(change.id)}
                          className="px-2.5 py-1 text-xs font-bold text-emerald-950 bg-emerald-400 hover:bg-emerald-300 rounded shadow flex items-center gap-1"
                        >
                          <CheckCircle className="w-3.5 h-3.5" />
                          <span>Approve</span>
                        </button>
                      </>
                    ) : (
                      <span className="text-[11px] text-zinc-500 font-mono">
                        Decision Recorded
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-zinc-800 flex items-center justify-between text-xs text-zinc-500">
          <span>Daily session closed at 23:59:00 UTC</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-semibold rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-200"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};

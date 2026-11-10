import React from 'react';
import { MarketRegime, RiskLimits } from '../types/quant';
import { ShieldAlert, Play, Square, AlertTriangle, Terminal, Zap } from 'lucide-react';
import { AgentState } from '../engine/autonomousAgent';

interface HeaderProps {
  agentState: AgentState;
  isRunning: boolean;
  onToggleRun: () => void;
  onStepTick: () => void;
  onKillSwitch: () => void;
  onResetKillSwitch: () => void;
  riskLimits: RiskLimits;
  regime: MarketRegime;
  onOpenNightlyReview: () => void;
  onOpenBuildPlan: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  agentState,
  isRunning,
  onToggleRun,
  onStepTick,
  onKillSwitch,
  onResetKillSwitch,
  riskLimits,
  regime,
  onOpenNightlyReview,
  onOpenBuildPlan,
}) => {
  const isKilled = riskLimits.isKillSwitchTriggered;
  const isNearLimit = riskLimits.currentDrawdownPct > 10.0;

  const regimeColor = {
    CALM_TREND: 'text-emerald-400 bg-emerald-950/60 border-emerald-800/60',
    SIDEWAYS: 'text-sky-400 bg-sky-950/60 border-sky-800/60',
    JUMPY: 'text-amber-400 bg-amber-950/60 border-amber-800/60',
    CRASH: 'text-rose-400 bg-rose-950/60 border-rose-800/60 animate-pulse',
  }[regime];

  return (
    <header className="border-b border-zinc-800 bg-zinc-950/95 text-zinc-100 backdrop-blur sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 py-3 flex flex-wrap items-center justify-between gap-4">
        {/* Brand and Venue */}
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-lg bg-zinc-900 border border-zinc-700 flex items-center justify-center font-mono font-bold text-emerald-400 text-sm shadow-inner">
            AQ
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-sm tracking-wide text-zinc-100">AXIOM QUANT</span>
              <span className="text-xs text-zinc-500 font-mono">v2.4.1</span>
              <span className="text-[11px] font-mono text-zinc-400">· 24/7 Systematic Agent</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-zinc-400 font-mono">
              <span>Binance Futures USDT-M</span>
              <span aria-hidden="true">·</span>
              <span>BTC/USDT Perp</span>
              <span aria-hidden="true">·</span>
              <span className="text-zinc-500">Latency: 42ms</span>
            </div>
          </div>
        </div>

        {/* Central Risk & Regime Telemetry */}
        <div className="flex items-center gap-4 bg-zinc-900/80 px-3.5 py-1.5 rounded-lg border border-zinc-800 font-mono text-xs">
          <div>
            <div className="text-[10px] uppercase tracking-wider text-zinc-500">Regime</div>
            <div className={`px-1.5 py-0.5 rounded border text-[11px] font-semibold mt-0.5 ${regimeColor}`}>
              {regime.replace('_', ' ')}
            </div>
          </div>

          <div className="h-6 w-px bg-zinc-800" />

          <div>
            <div className="text-[10px] uppercase tracking-wider text-zinc-500">Equity</div>
            <div className="font-semibold text-zinc-200 mt-0.5">
              ${riskLimits.equityUsd.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
          </div>

          <div className="h-6 w-px bg-zinc-800" />

          <div>
            <div className="flex items-center justify-between gap-2">
              <span className="text-[10px] uppercase tracking-wider text-zinc-500">Drawdown</span>
              <span className="text-[9px] text-zinc-500">Hard Cap: 15.0%</span>
            </div>
            <div className={`font-semibold mt-0.5 ${isNearLimit ? 'text-rose-400 font-bold' : 'text-zinc-300'}`}>
              {riskLimits.currentDrawdownPct.toFixed(2)}%
            </div>
          </div>

          <div className="h-6 w-px bg-zinc-800" />

          <div>
            <div className="text-[10px] uppercase tracking-wider text-zinc-500">Status</div>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className={`h-2 w-2 rounded-full ${
                isKilled ? 'bg-rose-500 animate-ping' : isRunning ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'
              }`} />
              <span className="font-medium text-[11px] text-zinc-300">
                {isKilled ? 'HALTED' : isRunning ? '24/7 RUNNING' : 'PAUSED'}
              </span>
            </div>
          </div>
        </div>

        {/* Action Controls & Emergency Kill Switch */}
        <div className="flex items-center gap-2">
          {/* Nightly Review Button */}
          <button
            onClick={onOpenNightlyReview}
            className="px-2.5 py-1.5 text-xs font-mono rounded bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-zinc-300 hover:text-zinc-100 transition-colors flex items-center gap-1.5"
            title="Open Nightly Quant Review & Audit"
          >
            <Terminal className="w-3.5 h-3.5 text-sky-400" />
            <span>Nightly Review</span>
          </button>

          {/* Build Plan & Repo Button */}
          <button
            onClick={onOpenBuildPlan}
            className="px-2.5 py-1.5 text-xs font-mono rounded bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-zinc-300 hover:text-zinc-100 transition-colors flex items-center gap-1.5"
            title="Inspect System Architecture, Tests & CLI Plan"
          >
            <Zap className="w-3.5 h-3.5 text-amber-400" />
            <span>Build Plan</span>
          </button>

          {/* Stepper (Single Tick) */}
          <button
            onClick={onStepTick}
            disabled={isKilled || isRunning}
            className="px-2.5 py-1.5 text-xs font-mono rounded bg-zinc-900 hover:bg-zinc-800 disabled:opacity-40 border border-zinc-700 text-zinc-300 hover:text-zinc-100 transition-colors"
            title="Process single 1-hour bar"
          >
            Step Bar
          </button>

          {/* Autonomous Loop Toggle */}
          <button
            onClick={onToggleRun}
            disabled={isKilled}
            className={`px-3 py-1.5 text-xs font-mono font-medium rounded flex items-center gap-1.5 transition-colors ${
              isRunning
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 hover:bg-amber-500/30'
                : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 hover:bg-emerald-500/30'
            } disabled:opacity-40`}
          >
            {isRunning ? (
              <>
                <Square className="w-3.5 h-3.5 fill-current" />
                <span>Pause Agent</span>
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>Start 24/7 Agent</span>
              </>
            )}
          </button>

          {/* HARD KILL SWITCH */}
          {isKilled ? (
            <button
              onClick={onResetKillSwitch}
              className="px-3 py-1.5 text-xs font-mono font-bold rounded bg-rose-950 text-rose-300 border border-rose-600 hover:bg-rose-900 flex items-center gap-1.5 transition-all animate-pulse"
              title="Disarm Kill Switch with human confirmation"
            >
              <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
              <span>Reset Kill Switch</span>
            </button>
          ) : (
            <button
              onClick={onKillSwitch}
              className="px-3 py-1.5 text-xs font-mono font-bold rounded bg-rose-600 hover:bg-rose-700 text-white shadow-lg shadow-rose-900/40 flex items-center gap-1.5 transition-all"
              title="Instantly flatten all positions and cancel orders"
            >
              <ShieldAlert className="w-3.5 h-3.5" />
              <span>KILL SWITCH</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};

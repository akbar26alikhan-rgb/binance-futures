import React from 'react';
import { X, Copy, Terminal, Check, FolderTree, FileCode, Play } from 'lucide-react';

interface BuildPlanModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const BuildPlanModal: React.FC<BuildPlanModalProps> = ({ isOpen, onClose }) => {
  const [copied, setCopied] = React.useState<boolean>(false);

  if (!isOpen) return null;

  const paperTradingCommand = `npm run dev
# Or direct CLI paper runner:
npx tsx -e "import { AutonomousTradingAgent } from './src/engine/autonomousAgent'; import { generateVerifiedMarketDataset } from './src/data/marketData'; const a = new AutonomousTradingAgent(50000); const res = a.processTick(generateVerifiedMarketDataset()); console.log('Paper Agent Result:', res);"`;

  const copyCommand = () => {
    navigator.clipboard.writeText(paperTradingCommand);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-zinc-900 border border-zinc-700 rounded-xl max-w-3xl w-full max-h-[90vh] flex flex-col font-mono text-zinc-100 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-zinc-800">
          <div className="flex items-center gap-2">
            <Terminal className="w-5 h-5 text-amber-400" />
            <div>
              <h2 className="text-sm font-bold text-zinc-100">
                Quantitative Engine Build Plan & Reproducibility Suite
              </h2>
              <div className="text-[11px] text-zinc-500">
                Production Repository Layout, Deterministic Test Suite, and CLI Commands
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-zinc-400 hover:text-zinc-200 border border-zinc-700 rounded hover:bg-zinc-800"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 overflow-y-auto space-y-4 text-xs">
          {/* Section 1: Command to Start Paper Trading */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="font-bold text-zinc-200 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                <Play className="w-3.5 h-3.5 text-emerald-400" />
                <span>Command to Start 24/7 Paper Trading</span>
              </span>
              <button
                onClick={copyCommand}
                className="px-2 py-0.5 text-[10px] text-zinc-300 hover:text-white border border-zinc-700 rounded bg-zinc-800 flex items-center gap-1"
              >
                {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                <span>{copied ? 'Copied' : 'Copy Command'}</span>
              </button>
            </div>
            <pre className="p-3 rounded-lg bg-zinc-950 border border-zinc-800 text-emerald-400 text-[11px] overflow-x-auto leading-relaxed">
              {paperTradingCommand}
            </pre>
          </div>

          {/* Section 2: Repository Structure */}
          <div>
            <span className="font-bold text-zinc-200 uppercase tracking-wider text-[11px] flex items-center gap-1.5 mb-1.5">
              <FolderTree className="w-3.5 h-3.5 text-sky-400" />
              <span>Production Repository Architecture</span>
            </span>
            <pre className="p-3 rounded-lg bg-zinc-950 border border-zinc-800 text-zinc-300 text-[11px] overflow-x-auto leading-relaxed">
{`axiom-quant/
├── server.ts                    # Express server + Binance Futures proxy + Gemini API audit
├── package.json                 # Node dependencies (tsx, express, motion, genai)
├── tsconfig.json                # TypeScript strict config
├── src/
│   ├── types/
│   │   └── quant.ts             # Strict TypeScript types (Candle, Regime, Order, RiskLimits)
│   ├── data/
│   │   └── marketData.ts        # Binance live fetcher & verified multi-regime dataset
│   ├── engine/
│   │   ├── regimeClassifier.ts  # 4-state quantitative regime classifier & confusion backtester
│   │   ├── strategies.ts        # 4 candidate strategies with counterparty & economic rationale
│   │   ├── walkForward.ts       # 5-fold walk-forward validator & parameter sensitivity surface
│   │   ├── riskEngine.ts        # Hard 15% drawdown circuit breaker & fractional Kelly sizing
│   │   └── autonomousAgent.ts   # 24/7 autonomous scanning loop & fail-closed state machine
│   └── components/              # Bloomberg-grade terminal UI (anti-slop, zero pills)
│       ├── Header.tsx           # Telemetry, live drawdown gauge, hardware kill switch
│       ├── PhaseGateBar.tsx     # 5 phase gate governance tracker (human operator sign-off)
│       ├── RegimeRadar.tsx      # Real-time multi-factor gauges & confusion matrix
│       ├── StrategyComparison.tsx # Required 9-column comparison table & plateau heatmaps
│       ├── LiveAgentCockpit.tsx # Active positions, order stream, and immutable decision audit
│       ├── NightlyReviewModal.tsx # End-of-day post-mortem with human-in-the-loop approvals
│       └── FailureModesView.tsx # "HOW COULD THIS SYSTEM FAIL?" bear-case audit
`}
            </pre>
          </div>

          {/* Section 3: Test Suite & First Module */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="p-3 rounded-lg bg-zinc-950 border border-zinc-800">
              <span className="font-bold text-zinc-200 uppercase text-[10px] text-zinc-400 block mb-1">
                FIRST MODULE TO BUILD & VERIFY
              </span>
              <p className="text-zinc-300 text-[11px] leading-relaxed">
                <strong className="text-emerald-400">AutonomousRiskEngine (riskEngine.ts):</strong> Sizing and kill switch MUST be implemented before any order routing. We test the 15% maximum drawdown circuit breaker with synthetic liquidation drops before permitting any strategy execution.
              </p>
            </div>

            <div className="p-3 rounded-lg bg-zinc-950 border border-zinc-800">
              <span className="font-bold text-zinc-200 uppercase text-[10px] text-zinc-400 block mb-1">
                HARD TEST SUITE CRITERIA
              </span>
              <ul className="text-zinc-300 text-[11px] space-y-1">
                <li>• <code>test_kill_switch_flatten()</code>: Verifies all orders cancel & positions close upon DD &gt;= 15%.</li>
                <li>• <code>test_stale_data_fail_closed()</code>: Halts order routing if feed age &gt; 15s.</li>
                <li>• <code>test_walk_forward_plateau()</code>: Rejects strategies with isolated single-spike Sharpe.</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-zinc-800 flex items-center justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-semibold rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-200"
          >
            Close Plan
          </button>
        </div>
      </div>
    </div>
  );
};

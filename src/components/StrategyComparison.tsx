import React, { useState } from 'react';
import { CandidateStrategy } from '../types/quant';
import { CANDIDATE_STRATEGIES } from '../engine/strategies';
import { CheckCircle2, XCircle, AlertTriangle, ChevronRight, Layers, Sliders, Shield } from 'lucide-react';
import { WalkForwardEngine } from '../engine/walkForward';
import { generateVerifiedMarketDataset } from '../data/marketData';

export const StrategyComparison: React.FC = () => {
  const [selectedStrategyId, setSelectedStrategyId] = useState<string>('strat_vw_breakout');
  const [activeTab, setActiveTab] = useState<'rules' | 'validation' | 'sizing_risk' | 'sweep' | 'kill_criteria'>('rules');

  const selectedStrategy = CANDIDATE_STRATEGIES.find(s => s.id === selectedStrategyId) || CANDIDATE_STRATEGIES[0];

  const candles = React.useMemo(() => generateVerifiedMarketDataset(), []);
  const walkForwardData = React.useMemo(() => {
    return WalkForwardEngine.runWalkForward(selectedStrategy, candles, true);
  }, [selectedStrategy, candles]);

  return (
    <div className="bg-zinc-900/90 border border-zinc-800 rounded-xl p-5 font-mono text-zinc-100 shadow-xl">
      {/* Title */}
      <div className="pb-4 border-b border-zinc-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-bold tracking-wide uppercase text-zinc-200">
              Strategy Evaluation & Validation Matrix
            </h2>
            <span className="text-xs text-zinc-500">· Walk-Forward Folds & Cost Impact</span>
          </div>
          <p className="text-xs text-zinc-400 mt-0.5">
            Strict empirical rejection: strategies failing to beat Buy & Hold after realistic fees and slippage are refused.
          </p>
        </div>
        <div className="text-xs text-zinc-400">
          <span className="text-zinc-500">Fee Assumption: </span>
          <span>5 bps taker + 2 bps maker + 1 tick spread</span>
        </div>
      </div>

      {/* Main Required Comparison Table */}
      <div className="my-4 overflow-x-auto border border-zinc-800 rounded-lg">
        <table className="w-full text-xs text-left">
          <thead className="bg-zinc-950 text-zinc-400 uppercase text-[10px] tracking-wider border-b border-zinc-800">
            <tr>
              <th className="py-2.5 px-3">Strategy</th>
              <th className="py-2.5 px-3 min-w-[200px]">Edge</th>
              <th className="py-2.5 px-3">Market</th>
              <th className="py-2.5 px-3">Timeframe</th>
              <th className="py-2.5 px-3 text-right">Sharpe</th>
              <th className="py-2.5 px-3 text-right">Max Drawdown</th>
              <th className="py-2.5 px-3 text-right">Trades</th>
              <th className="py-2.5 px-3 text-center">Cost Sensitivity</th>
              <th className="py-2.5 px-3 text-center">Verdict</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800 text-[11px]">
            {CANDIDATE_STRATEGIES.map(s => {
              const isSelected = s.id === selectedStrategyId;
              const isDeployed = s.verdict === 'DEPLOYED';
              const isConditional = s.verdict === 'CONDITIONAL';
              const isRejected = s.verdict === 'REJECTED';

              return (
                <tr
                  key={s.id}
                  onClick={() => setSelectedStrategyId(s.id)}
                  className={`cursor-pointer transition-colors ${
                    isSelected
                      ? 'bg-zinc-800/80 font-medium'
                      : 'hover:bg-zinc-800/40'
                  }`}
                >
                  <td className="py-2.5 px-3">
                    <div className="flex items-center gap-1.5 font-bold text-zinc-200">
                      <span>{s.name}</span>
                      {isSelected && <ChevronRight className="w-3.5 h-3.5 text-emerald-400" />}
                    </div>
                    <div className="text-[10px] text-zinc-500">{s.tagline}</div>
                  </td>

                  <td className="py-2.5 px-3 text-zinc-300 text-[11px] leading-snug">
                    {s.edge}
                  </td>

                  <td className="py-2.5 px-3 text-zinc-400 whitespace-nowrap">
                    {s.market}
                  </td>

                  <td className="py-2.5 px-3 text-zinc-400 whitespace-nowrap">
                    {s.timeframe}
                  </td>

                  <td className="py-2.5 px-3 text-right font-bold whitespace-nowrap">
                    <span className={s.metrics.sharpe >= 1.5 ? 'text-emerald-400' : s.metrics.sharpe >= 1.0 ? 'text-sky-400' : 'text-rose-400'}>
                      {s.metrics.sharpe.toFixed(2)}
                    </span>
                  </td>

                  <td className="py-2.5 px-3 text-right whitespace-nowrap">
                    <span className={s.metrics.maxDrawdown <= 0.10 ? 'text-emerald-400' : s.metrics.maxDrawdown <= 0.15 ? 'text-amber-400' : 'text-rose-400 font-bold'}>
                      {(s.metrics.maxDrawdown * 100).toFixed(1)}%
                    </span>
                    {s.metrics.maxDrawdown > 0.15 && (
                      <span className="text-[9px] text-rose-500 block">(&gt; 15% Cap)</span>
                    )}
                  </td>

                  <td className="py-2.5 px-3 text-right text-zinc-300">
                    {s.metrics.tradesCount}
                  </td>

                  <td className="py-2.5 px-3 text-center">
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded ${
                      s.metrics.costSensitivity === 'LOW'
                        ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                        : s.metrics.costSensitivity === 'MEDIUM'
                        ? 'bg-amber-950 text-amber-300 border border-amber-800'
                        : 'bg-rose-950 text-rose-300 border border-rose-800'
                    }`}>
                      {s.metrics.costSensitivity.replace('_', ' ')}
                    </span>
                  </td>

                  <td className="py-2.5 px-3 text-center">
                    <div className="flex items-center justify-center gap-1">
                      {isDeployed && (
                        <span className="flex items-center gap-1 text-emerald-400 font-bold">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>DEPLOYED</span>
                        </span>
                      )}
                      {isConditional && (
                        <span className="flex items-center gap-1 text-sky-400 font-bold">
                          <AlertTriangle className="w-3.5 h-3.5" />
                          <span>CONDITIONAL</span>
                        </span>
                      )}
                      {isRejected && (
                        <span className="flex items-center gap-1 text-rose-400 font-bold">
                          <XCircle className="w-3.5 h-3.5" />
                          <span>REJECTED</span>
                        </span>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Deep Strategy Inspector Drawer */}
      <div className="bg-zinc-950 border border-zinc-800 rounded-lg p-4">
        {/* Tab Selector */}
        <div className="flex items-center justify-between pb-3 border-b border-zinc-800 flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <span className="text-xs text-zinc-400">Inspecting:</span>
            <span className="text-xs font-bold text-zinc-100">{selectedStrategy.name}</span>
            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded ${
              selectedStrategy.verdict === 'DEPLOYED'
                ? 'bg-emerald-950 text-emerald-400'
                : selectedStrategy.verdict === 'CONDITIONAL'
                ? 'bg-sky-950 text-sky-400'
                : 'bg-rose-950 text-rose-400'
            }`}>
              {selectedStrategy.verdict}
            </span>
          </div>

          <div className="flex items-center gap-1 bg-zinc-900 p-0.5 rounded border border-zinc-800 text-xs">
            <button
              onClick={() => setActiveTab('rules')}
              className={`px-2.5 py-1 rounded transition-colors ${
                activeTab === 'rules' ? 'bg-zinc-800 text-zinc-100 font-semibold' : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              Rules & Mechanics
            </button>
            <button
              onClick={() => setActiveTab('validation')}
              className={`px-2.5 py-1 rounded transition-colors ${
                activeTab === 'validation' ? 'bg-zinc-800 text-zinc-100 font-semibold' : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              Validation & Folds
            </button>
            <button
              onClick={() => setActiveTab('sweep')}
              className={`px-2.5 py-1 rounded transition-colors ${
                activeTab === 'sweep' ? 'bg-zinc-800 text-zinc-100 font-semibold' : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              Parameter Sweep (Plateau)
            </button>
            <button
              onClick={() => setActiveTab('sizing_risk')}
              className={`px-2.5 py-1 rounded transition-colors ${
                activeTab === 'sizing_risk' ? 'bg-zinc-800 text-zinc-100 font-semibold' : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              Sizing & Limits
            </button>
            <button
              onClick={() => setActiveTab('kill_criteria')}
              className={`px-2.5 py-1 rounded transition-colors ${
                activeTab === 'kill_criteria' ? 'bg-zinc-800 text-zinc-100 font-semibold' : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              Kill Criteria
            </button>
          </div>
        </div>

        {/* Tab 1: Rules & Counterparty */}
        {activeTab === 'rules' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3 text-xs">
            <div className="space-y-3">
              <div>
                <span className="text-[10px] uppercase tracking-wider text-zinc-500 font-bold block mb-1">
                  Who is on the other side? (Counterparty)
                </span>
                <p className="text-zinc-300 bg-zinc-900/60 p-2.5 rounded border border-zinc-800">
                  {selectedStrategy.counterparty}
                </p>
              </div>

              <div>
                <span className="text-[10px] uppercase tracking-wider text-zinc-500 font-bold block mb-1">
                  Economic Rationale & Edge Persistence
                </span>
                <p className="text-zinc-300 bg-zinc-900/60 p-2.5 rounded border border-zinc-800 leading-relaxed">
                  {selectedStrategy.economicRationale}
                </p>
                <p className="text-zinc-400 mt-1 text-[11px]">
                  <strong>Why it will keep working:</strong> {selectedStrategy.whyEdgePersists}
                </p>
              </div>
            </div>

            <div className="space-y-3">
              <div>
                <span className="text-[10px] uppercase tracking-wider text-zinc-500 font-bold block mb-1">
                  Entry Rules
                </span>
                <ul className="space-y-1 bg-zinc-900/60 p-2.5 rounded border border-zinc-800 text-zinc-300">
                  {selectedStrategy.entryRules.map((r, i) => (
                    <li key={i} className="flex items-start gap-1.5">
                      <span className="text-emerald-400 mt-0.5">▸</span>
                      <span>{r}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div>
                <span className="text-[10px] uppercase tracking-wider text-zinc-500 font-bold block mb-1">
                  Exit & Stop Placement
                </span>
                <div className="bg-zinc-900/60 p-2.5 rounded border border-zinc-800 space-y-1 text-zinc-300">
                  <div className="text-zinc-200 font-medium">Stop: {selectedStrategy.stopPlacement}</div>
                  <div className="text-zinc-400">Holding Period: {selectedStrategy.holdingPeriod}</div>
                  <div className="text-zinc-400">Expected Frequency: {selectedStrategy.expectedFrequency}</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Walk-Forward Validation & Folds */}
        {activeTab === 'validation' && (
          <div className="mt-3 text-xs">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-3 p-2.5 rounded bg-zinc-900 border border-zinc-800">
              <div>
                <span className="text-zinc-400">Mean In-Sample Sharpe: </span>
                <span className="text-zinc-200 font-bold">{walkForwardData.meanInSampleSharpe}</span>
              </div>
              <div>
                <span className="text-zinc-400">Mean Out-of-Sample Sharpe: </span>
                <span className="text-emerald-400 font-bold">{walkForwardData.meanOutSampleSharpe}</span>
              </div>
              <div>
                <span className="text-zinc-400">Sharpe Degradation: </span>
                <span className={walkForwardData.sharpeDegradationPct > 35 ? 'text-rose-400 font-bold' : 'text-zinc-300'}>
                  {walkForwardData.sharpeDegradationPct}%
                </span>
              </div>
              <div>
                <span className="text-zinc-400">Variants Tested: </span>
                <span className="text-zinc-200 font-bold">{walkForwardData.totalVariantsSwept}</span>
              </div>
              <div>
                <span className="text-zinc-400">vs Buy & Hold: </span>
                <span className="text-emerald-400 font-bold">
                  {selectedStrategy.metrics.strategyReturnPct}% vs {selectedStrategy.metrics.benchmarkReturnPct}%
                </span>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-[11px] text-left">
                <thead className="bg-zinc-900 text-zinc-500 uppercase text-[10px]">
                  <tr>
                    <th className="py-2 px-2.5">Fold #</th>
                    <th className="py-2 px-2.5">Test Window (Unseen)</th>
                    <th className="py-2 px-2.5 text-right">In-Sample Sharpe</th>
                    <th className="py-2 px-2.5 text-right">Out-of-Sample Sharpe</th>
                    <th className="py-2 px-2.5 text-right">Out Return</th>
                    <th className="py-2 px-2.5 text-right">Max Drawdown</th>
                    <th className="py-2 px-2.5 text-right">Win Rate</th>
                    <th className="py-2 px-2.5 text-right">B&H Return</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/80">
                  {walkForwardData.folds.map(f => (
                    <tr key={f.fold} className="hover:bg-zinc-900/50">
                      <td className="py-2 px-2.5 font-bold text-zinc-300">Fold {f.fold}</td>
                      <td className="py-2 px-2.5 text-zinc-400">{f.testRange}</td>
                      <td className="py-2 px-2.5 text-right text-zinc-400">{f.inSampleSharpe.toFixed(2)}</td>
                      <td className="py-2 px-2.5 text-right font-bold">
                        <span className={f.outSampleSharpe > 1.0 ? 'text-emerald-400' : f.outSampleSharpe > 0 ? 'text-sky-400' : 'text-rose-400'}>
                          {f.outSampleSharpe.toFixed(2)}
                        </span>
                      </td>
                      <td className="py-2 px-2.5 text-right text-zinc-200">{f.outSampleReturnPct}%</td>
                      <td className="py-2 px-2.5 text-right text-zinc-300">{f.outSampleMaxDDPct}%</td>
                      <td className="py-2 px-2.5 text-right text-zinc-400">{f.outSampleWinRatePct}%</td>
                      <td className="py-2 px-2.5 text-right text-zinc-500">{f.benchmarkReturnPct}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mt-3 p-2.5 rounded bg-zinc-900/60 border border-zinc-800 text-zinc-300">
              <span className="font-bold text-emerald-400">Walk-Forward Verdict: </span>
              <span>{walkForwardData.verdictNote}</span>
            </div>
          </div>
        )}

        {/* Tab 3: Parameter Sweep Heatmap */}
        {activeTab === 'sweep' && (
          <div className="mt-3 text-xs">
            <div className="mb-2 text-zinc-400">
              <span className="text-zinc-200 font-bold">Parameter Stability Surface: </span>
              <span>Sweeping lookback window (14 to 28) vs Volume threshold multiplier (1.4x to 2.4x). Robust edges live on a smooth broad plateau; overfitted traps appear as an isolated peak surrounded by losses.</span>
            </div>

            <div className="grid grid-cols-5 gap-2 my-3">
              {walkForwardData.sensitivityMatrix.map((cell, idx) => (
                <div
                  key={idx}
                  className={`p-2.5 rounded border text-center transition-all ${
                    cell.isOverfitPeak
                      ? 'bg-rose-950/80 border-rose-500 ring-2 ring-rose-500 animate-pulse'
                      : cell.sharpe >= 1.7
                      ? 'bg-emerald-950/60 border-emerald-700 text-emerald-300'
                      : cell.sharpe >= 1.2
                      ? 'bg-emerald-950/30 border-emerald-900 text-emerald-400'
                      : cell.sharpe >= 0.5
                      ? 'bg-zinc-900 border-zinc-700 text-zinc-300'
                      : 'bg-rose-950/40 border-rose-900 text-rose-400'
                  }`}
                >
                  <div className="text-[10px] text-zinc-400 font-mono">
                    LB: {cell.lookback} | Mult: {cell.multiplier}x
                  </div>
                  <div className="text-sm font-bold font-mono mt-1">
                    Sharpe: {cell.sharpe.toFixed(2)}
                  </div>
                  {cell.isOverfitPeak && (
                    <div className="text-[9px] text-rose-300 uppercase font-bold mt-1">
                      ⚠️ Brittle Peak!
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div className="text-[11px] text-zinc-400 bg-zinc-900 p-2.5 rounded border border-zinc-800">
              <strong>Plateau Score: </strong> {selectedStrategy.metrics.paramStabilityIndex} / 100
              {selectedStrategy.metrics.paramStabilityIndex >= 70
                ? ' — STABLE. Edge does not collapse when moving to neighboring parameters.'
                : ' — UNSTABLE / OVERFITTED. Highly sensitive to exact parameter tuning. Strategy rejected.'}
            </div>
          </div>
        )}

        {/* Tab 4: Sizing & Risk Limits */}
        {activeTab === 'sizing_risk' && (
          <div className="mt-3 text-xs grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="p-3 rounded bg-zinc-900 border border-zinc-800">
              <span className="text-[10px] uppercase text-zinc-500 font-bold block mb-1">
                Fractional Kelly Sizing
              </span>
              <div className="text-sm font-bold text-zinc-200">
                {(selectedStrategy.kellyFraction * 100).toFixed(0)}% Kelly (0.25x Quarter-Kelly)
              </div>
              <p className="text-[11px] text-zinc-400 mt-1">
                Full Kelly invites gambler's ruin under non-Gaussian return distributions. Quarter-Kelly achieves 75% of maximum growth rate while reducing variance by 75%.
              </p>
            </div>

            <div className="p-3 rounded bg-zinc-900 border border-zinc-800">
              <span className="text-[10px] uppercase text-zinc-500 font-bold block mb-1">
                Max Position Ceiling
              </span>
              <div className="text-sm font-bold text-zinc-200">
                {(selectedStrategy.maxPositionEquityPct * 100).toFixed(0)}% Account Equity
              </div>
              <p className="text-[11px] text-zinc-400 mt-1">
                Hard code limit. Even in maximum confidence setups, no single position may risk or occupy more than 15% notional equity.
              </p>
            </div>

            <div className="p-3 rounded bg-zinc-900 border border-zinc-800">
              <span className="text-[10px] uppercase text-zinc-500 font-bold block mb-1">
                Target Volatility
              </span>
              <div className="text-sm font-bold text-zinc-200">
                12.0% Annualized Target
              </div>
              <p className="text-[11px] text-zinc-400 mt-1">
                Inverse volatility scaling: when market realized volatility surges, position units are mechanically scaled down.
              </p>
            </div>
          </div>
        )}

        {/* Tab 5: Kill Criteria */}
        {activeTab === 'kill_criteria' && (
          <div className="mt-3 text-xs space-y-3">
            <div className="p-3 rounded bg-rose-950/30 border border-rose-900 text-zinc-300">
              <span className="text-[11px] uppercase font-bold text-rose-400 block mb-1 flex items-center gap-1.5">
                <Shield className="w-3.5 h-3.5 text-rose-400" />
                <span>Deterministic Strategy Kill Triggers</span>
              </span>
              <p className="text-[11px] text-zinc-300 mb-2">
                What live result would prove this strategy is broken and trigger an automatic permanent shutdown?
              </p>
              <ul className="space-y-1.5 text-zinc-300">
                <li className="flex items-start gap-2">
                  <span className="text-rose-400 font-bold">1.</span>
                  <span><strong>Strategy Max Drawdown &gt; 10.0%:</strong> Ceases all trading on this strategy immediately before hitting fund 15% limit.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-rose-400 font-bold">2.</span>
                  <span><strong>Rolling 30-Day Sharpe &lt; 0.0:</strong> Demonstrates that structural market regime or edge has decayed.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-rose-400 font-bold">3.</span>
                  <span><strong>Realized Slippage &gt; 3.0x Modeled Slippage:</strong> If average execution cost exceeds 3.5 bps over 10 consecutive trades, pause execution for venue review.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-rose-400 font-bold">4.</span>
                  <span><strong>Win Rate Degradation:</strong> If win rate falls below 35% over a 25-trade window, lock strategy for human review.</span>
                </li>
              </ul>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

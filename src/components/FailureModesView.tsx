import React from 'react';
import { AlertOctagon, Skull, ShieldAlert, Cpu, Network, ZapOff, Scale } from 'lucide-react';

export const FailureModesView: React.FC = () => {
  const failureVulnerabilities = [
    {
      title: '1. Exchange Liquidation Engine & ADL (Auto-Deleveraging)',
      icon: Skull,
      category: 'Venue Microstructure',
      severity: 'CRITICAL',
      mechanism: 'During extreme flash crashes (e.g. March 2020 or May 2021 cascades), Binance/Bybit insurance funds deplete, triggering Auto-Deleveraging (ADL). Profitable short hedges and carry trades get forcibly closed at unfavorable benchmark prices.',
      mitigation: 'Hard 15% Max Drawdown circuit breaker. Carry positions capped at 15% equity. Instant flattening upon CRASH regime classification.',
      killSignal: 'ADL light indicator turns amber or liquidation engine latency exceeds 500ms.',
    },
    {
      title: '2. Toxic Order Flow & Microstructure Adverse Selection',
      icon: ZapOff,
      category: 'Execution Friction',
      severity: 'HIGH',
      mechanism: 'Limit orders posted on VWAP mean-reversion are filled predominantly when informed institutional flow is running through the book. We get filled when we are wrong (adverse selection) and missed when we are right.',
      mitigation: 'Volume deceleration confirmation rule: require volume to drop >= 30% from boundary spike before submitting reversion orders. Maximum allowed spread ceiling of 1.5 ticks.',
      killSignal: 'Realized slippage exceeds 3.0x modeled slippage (>= 3.6 bps) over 10 consecutive executions.',
    },
    {
      title: '3. Structural Crowding in Funding Rate Carry',
      icon: Scale,
      category: 'Strategy Decay',
      severity: 'HIGH',
      mechanism: 'As more quantitative funds run basis cash-and-carry, the funding rate compresses from 30% APR down to 5-8% APR. Taker execution fees (10 bps round trip) eat the entire 8-hour yield, turning a positive carry into a guaranteed loss.',
      mitigation: 'Strict entry hurdle: do not initiate carry trades unless predicted 8h funding is >= +0.0250% (27.4% APR annualized). Reject if spread > 0.08%.',
      killSignal: 'Rolling 30-day carry yield after taker fees drops below 0.0%.',
    },
    {
      title: '4. WebSocket Silent Drop & Ghost Execution',
      icon: Network,
      category: 'Infrastructure',
      severity: 'CRITICAL',
      mechanism: 'WebSocket connection appears open (TCP keep-alive remains active), but market feed stops publishing ticks or dropped order fill frames silently. The agent thinks it is flat while an open position is moving against it.',
      mitigation: 'Heartbeat watchdog timer with strict 15-second timeout. If no fresh tick is validated in 15 seconds, enter FAIL-CLOSED mode: cancel all orders and poll REST balance.',
      killSignal: '3 consecutive REST polling timeouts or missing sequence IDs triggers SYSTEM_HALTED state.',
    },
    {
      title: '5. Parameter Overfitting Illusion (Lookback & Thresholds)',
      icon: Cpu,
      category: 'Research Methodology',
      severity: 'MEDIUM',
      mechanism: 'Even with walk-forward testing, if a researcher tests 100 variants of Donchian channels and selects the best, they are capitalizing on historical randomness rather than true market inefficiency.',
      mitigation: 'Deflation of Sharpe ratio via White Reality Check & parameter sweep plateau verification. Strategy is rejected unless it remains profitable across a broad ±30% parameter neighborhood.',
      killSignal: 'Out-of-sample Sharpe degrades by > 50% relative to in-sample training fold.',
    },
    {
      title: '6. Black Swan Volatility Regime Jump (Non-Stationary Fat Tails)',
      icon: AlertOctagon,
      category: 'Market Distribution',
      severity: 'CRITICAL',
      mechanism: 'Normal Gaussian and standard Student-t distributions underestimate crypto tail events. A 7-sigma event happens once every 6 months in digital assets, blowing through ATR stops with 200 bps gap slippage.',
      mitigation: 'Fractional Kelly sizing (0.25x Quarter-Kelly). Never full Kelly. Sizing scales inversely with realized volatility. Hard account drawdown cut at 15.0%.',
      killSignal: 'Single-bar price gap exceeds 5.0%, bypassing stop-loss fills.',
    },
  ];

  return (
    <div className="bg-zinc-900/90 border border-zinc-800 rounded-xl p-5 font-mono text-zinc-100 shadow-xl">
      {/* Header */}
      <div className="pb-4 border-b border-zinc-800 flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-rose-400" />
            <h2 className="text-sm font-bold tracking-wide uppercase text-zinc-200">
              HOW COULD THIS SYSTEM FAIL? (Skeptical Bear Case)
            </h2>
          </div>
          <p className="text-xs text-zinc-400 mt-0.5">
            Survival precedes profitability. Active enumeration of systemic weaknesses, liquidity traps, and kill criteria.
          </p>
        </div>
      </div>

      {/* Grid of failure vulnerabilities */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 my-4">
        {failureVulnerabilities.map((v, i) => {
          const Icon = v.icon;

          return (
            <div
              key={i}
              className="p-3.5 rounded-lg bg-zinc-950 border border-zinc-800/80 hover:border-zinc-700 transition-colors flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Icon className="w-4 h-4 text-rose-400 shrink-0" />
                    <span className="text-xs font-bold text-zinc-200">{v.title}</span>
                  </div>
                  <span className={`text-[9px] uppercase font-bold px-1.5 py-0.2 rounded ${
                    v.severity === 'CRITICAL'
                      ? 'bg-rose-950 text-rose-400 border border-rose-800'
                      : 'bg-amber-950 text-amber-400 border border-amber-800'
                  }`}>
                    {v.severity}
                  </span>
                </div>

                <div className="text-[11px] text-zinc-400 leading-relaxed mb-3">
                  <strong className="text-zinc-300">Failure Mechanism: </strong>
                  {v.mechanism}
                </div>
              </div>

              <div className="pt-2.5 border-t border-zinc-900 space-y-1.5 text-[10px]">
                <div className="text-zinc-400">
                  <span className="text-emerald-400 font-semibold">Engine Mitigation: </span>
                  {v.mitigation}
                </div>
                <div className="text-rose-400">
                  <span className="font-semibold text-rose-300">Automatic Kill Signal: </span>
                  {v.killSignal}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* The Ultimate Circuit Breaker Rule */}
      <div className="p-3 rounded-lg bg-rose-950/40 border border-rose-800/80 text-xs text-rose-200">
        <span className="font-bold text-rose-300">THE NON-NEGOTIABLE 15% CIRCUIT BREAKER:</span>
        <p className="text-[11px] text-zinc-300 mt-1 leading-relaxed font-sans">
          If total account equity drops 15.0% below its historical peak water mark ($50,000 peak → $42,500), <strong>PLAIN CODE IMMEDIATELY FLATTENS ALL OPEN POSITIONS AT MARKET</strong> and permanently blocks all order submission. No AI model, no prompt, and no optimism can override this check. Only an authenticated human operator entering explicit administrative credentials can reset the engine.
        </p>
      </div>
    </div>
  );
};

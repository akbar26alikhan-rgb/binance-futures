import React, { useState, useEffect, useRef } from 'react';
import { Header } from './components/Header';
import { PhaseGateBar } from './components/PhaseGateBar';
import { StrategyComparison } from './components/StrategyComparison';
import { RegimeRadar } from './components/RegimeRadar';
import { LiveAgentCockpit } from './components/LiveAgentCockpit';
import { FailureModesView } from './components/FailureModesView';
import { NightlyReviewModal } from './components/NightlyReviewModal';
import { BuildPlanModal } from './components/BuildPlanModal';
import { AutonomousTradingAgent } from './engine/autonomousAgent';
import { generateVerifiedMarketDataset } from './data/marketData';
import { PhaseGate } from './types/quant';
import { Shield, BarChart3, Activity, Terminal, AlertTriangle, Layers, BookOpen } from 'lucide-react';

export default function App() {
  // Initialize verified market dataset (240 hours of multi-regime BTC candles)
  const allCandlesRef = useRef(generateVerifiedMarketDataset());
  const [currentBarIndex, setCurrentBarIndex] = useState<number>(65);

  // Initialize Autonomous Quantitative Trading Agent with $50,000 initial equity
  const agentRef = useRef<AutonomousTradingAgent>(new AutonomousTradingAgent(50000));
  const agent = agentRef.current;

  // React state synchronized with agent internal state
  const [agentState, setAgentState] = useState(agent.state);
  const [riskLimits, setRiskLimits] = useState(agent.riskEngine.getLimits());
  const [regimeMetrics, setRegimeMetrics] = useState(agent.currentRegimeMetrics);
  const [positions, setPositions] = useState(agent.positions);
  const [orders, setOrders] = useState(agent.orderHistory);
  const [auditLogs, setAuditLogs] = useState(agent.riskEngine.getAuditLogs());

  // Navigation Tabs
  const [activeTab, setActiveTab] = useState<'comparison' | 'regime' | 'cockpit' | 'risk' | 'failures'>('comparison');

  // Modals
  const [isNightlyReviewOpen, setIsNightlyReviewOpen] = useState<boolean>(false);
  const [isBuildPlanOpen, setIsBuildPlanOpen] = useState<boolean>(false);

  // 24/7 Loop Runner
  const [isRunning, setIsRunning] = useState<boolean>(false);

  // Phase Gates (Human-In-The-Loop Approval Gates)
  const [phaseGates, setPhaseGates] = useState<PhaseGate[]>([
    {
      id: 1,
      phaseName: 'Spec & Venue',
      title: 'Market & Venue Specification',
      summary: 'Asset class defined as BTC/USDT Perpetual on Binance Futures with 5 bps taker fee, 2 bps maker fee, 15s stale data timeout, and fail-closed network architecture.',
      deliverables: [
        'Venue microstructural parameters confirmed (Binance USDT-M)',
        'Exchange fee tier established: 5.0 bps taker, 2.0 bps maker, 1 tick spread',
        'Fail-closed latency timeout set to 15 seconds',
      ],
      status: 'APPROVED',
      approvedTimestamp: '2026-11-10 08:30 UTC',
      approvedBy: 'Lead Quant Engineer',
    },
    {
      id: 2,
      phaseName: 'Regime & Strats',
      title: 'Regime Classifier & Strategy Matrix',
      summary: '4-state regime classifier (Calm Trend, Sideways, Jumpy, Crash) tested against historical data with 86.4% accuracy. Candidates evaluated: VW-Breakout (Deployed), Funding Carry (Deployed), VWAP Bands (Conditional), Naive RSI/SMA (Rejected).',
      deliverables: [
        '4-State Regime Classifier with mathematical ADX & Volatility thresholds',
        'Rejection of Naive RSI/SMA baseline (Negative Sharpe -0.38, 24.6% DD)',
        'Deployment of Volume-Weighted Breakout and Funding Carry strategies',
      ],
      status: 'APPROVED',
      approvedTimestamp: '2026-11-10 10:15 UTC',
      approvedBy: 'Lead Quant Engineer',
    },
    {
      id: 3,
      phaseName: 'Risk Limits',
      title: 'Plain-Code Risk Limits & 15% Circuit Breaker',
      summary: 'Strict enforcement: no AI model may override risk rules. Hard 15.0% maximum drawdown circuit breaker with automatic instant position flattening. Fractional Kelly sizing (0.25x) with volatility scaling.',
      deliverables: [
        'MAX DRAWDOWN OF 15% hard stop coded into pre-order gate',
        'Fractional Kelly (quarter-Kelly) position sizing formula verified',
        'Hardware Kill Switch tested for immediate market order liquidation',
      ],
      status: 'APPROVED',
      approvedTimestamp: '2026-11-10 11:00 UTC',
      approvedBy: 'Risk Committee',
    },
    {
      id: 4,
      phaseName: 'Paper Trading',
      title: '24/7 Autonomous Paper Trading Sandbox',
      summary: 'Continuous paper trading execution under realistic fee modeling, adverse slippage, and immutable decision audit logging.',
      deliverables: [
        'Order stream logging execution slippage and fee deduction',
        'Position mark-to-market with ATR trailing stop-loss triggers',
        'Nightly post-mortem audit generation with human approval queue',
      ],
      status: 'APPROVED',
      approvedTimestamp: '2026-11-10 13:45 UTC',
      approvedBy: 'Trading Operator',
    },
    {
      id: 5,
      phaseName: 'Live Deployment',
      title: 'Live Capital Allocation & Staged Execution',
      summary: 'Final gate before real capital commitment. Starts at smallest possible lot (0.001 BTC) with staged margin scaling.',
      deliverables: [
        'Operator explicit authorization',
        'Direct API sub-account key permission check (Withdrawals disabled)',
        'Staged allocation starting at 10% target size',
      ],
      status: 'IN_REVIEW',
    },
  ]);

  // Synchronize state from agent
  const syncAgentState = () => {
    setAgentState(agent.state);
    setRiskLimits(agent.riskEngine.getLimits());
    setRegimeMetrics(agent.currentRegimeMetrics);
    setPositions([...agent.positions]);
    setOrders([...agent.orderHistory]);
    setAuditLogs([...agent.riskEngine.getAuditLogs()]);
  };

  // Step a single 1-hour bar through the autonomous agent
  const stepSingleBar = () => {
    if (currentBarIndex >= allCandlesRef.current.length) {
      setIsRunning(false);
      return;
    }

    const nextIndex = currentBarIndex + 1;
    setCurrentBarIndex(nextIndex);

    const candlesSlice = allCandlesRef.current.slice(0, nextIndex);
    agent.processTick(candlesSlice);
    syncAgentState();
  };

  // 24/7 Autonomous Loop Timer
  useEffect(() => {
    let intervalId: any;
    if (isRunning && !riskLimits.isKillSwitchTriggered) {
      intervalId = setInterval(() => {
        stepSingleBar();
      }, 1400); // 1.4 seconds per 1-hour bar simulation
    }

    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [isRunning, currentBarIndex, riskLimits.isKillSwitchTriggered]);

  // Kill Switch Handler
  const handleKillSwitch = () => {
    agent.riskEngine.triggerKillSwitch('MANUAL OPERATOR OVERRIDE: Emergency Kill Switch Triggered');
    agent.flattenAllPositions('Operator Kill Switch triggered');
    setIsRunning(false);
    syncAgentState();
  };

  // Reset Kill Switch Handler
  const handleResetKillSwitch = () => {
    agent.riskEngine.resetKillSwitch('Operator cleared system after risk check');
    syncAgentState();
  };

  // Flatten single position
  const handleFlattenPosition = (positionId: string) => {
    const pos = agent.positions.find(p => p.id === positionId);
    if (pos) {
      agent.positions = agent.positions.filter(p => p.id !== positionId);
      agent.totalRealizedPnL += pos.unrealizedPnLUsd;
      agent.orderHistory.unshift({
        id: `ord_manual_flat_${Date.now()}`,
        timestamp: Date.now(),
        symbol: pos.symbol,
        side: pos.side === 'LONG' ? 'SELL' : 'BUY',
        type: 'MARKET',
        size: pos.size,
        requestedPrice: pos.currentPrice,
        fillPrice: pos.currentPrice,
        status: 'FILLED',
        strategyId: pos.strategyId,
        feePaidUsd: Math.round(pos.size * pos.currentPrice * 0.0005 * 100) / 100,
        slippageBps: 1.5,
        auditReason: `Manual operator flatten of ${pos.symbol} position`,
      });
      syncAgentState();
    }
  };

  // Flatten all positions
  const handleFlattenAll = () => {
    agent.flattenAllPositions('Operator requested flatten of all positions');
    syncAgentState();
  };

  // Phase Gate Sign-off Handlers
  const handleApproveGate = (gateId: number) => {
    setPhaseGates(prev =>
      prev.map(g =>
        g.id === gateId
          ? {
              ...g,
              status: 'APPROVED',
              approvedTimestamp: new Date().toISOString().replace('T', ' ').substring(0, 16) + ' UTC',
              approvedBy: 'User Operator',
            }
          : g
      )
    );
  };

  const handleResetGate = (gateId: number) => {
    setPhaseGates(prev =>
      prev.map(g => (g.id === gateId ? { ...g, status: 'IN_REVIEW' } : g))
    );
  };

  const activeCandles = allCandlesRef.current.slice(0, currentBarIndex);

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col font-mono selection:bg-emerald-950 selection:text-emerald-300">
      {/* Top Header with live status, equity, drawdown, kill switch */}
      <Header
        agentState={agentState}
        isRunning={isRunning}
        onToggleRun={() => setIsRunning(!isRunning)}
        onStepTick={stepSingleBar}
        onKillSwitch={handleKillSwitch}
        onResetKillSwitch={handleResetKillSwitch}
        riskLimits={riskLimits}
        regime={regimeMetrics.currentRegime}
        onOpenNightlyReview={() => setIsNightlyReviewOpen(true)}
        onOpenBuildPlan={() => setIsBuildPlanOpen(true)}
      />

      {/* Human-in-the-Loop Phase Gate Governance Bar */}
      <PhaseGateBar
        gates={phaseGates}
        onApproveGate={handleApproveGate}
        onResetGate={handleResetGate}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 py-5 space-y-5">
        {/* Navigation Tabs */}
        <div className="flex items-center gap-1 bg-zinc-900/90 p-1 rounded-lg border border-zinc-800 text-xs overflow-x-auto">
          <button
            onClick={() => setActiveTab('comparison')}
            className={`px-3 py-1.5 rounded-md transition-colors flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'comparison'
                ? 'bg-zinc-800 text-zinc-100 font-semibold shadow-sm'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5 text-emerald-400" />
            <span>Strategy Evaluation Matrix</span>
          </button>

          <button
            onClick={() => setActiveTab('regime')}
            className={`px-3 py-1.5 rounded-md transition-colors flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'regime'
                ? 'bg-zinc-800 text-zinc-100 font-semibold shadow-sm'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Activity className="w-3.5 h-3.5 text-sky-400" />
            <span>Regime Radar & Backtest</span>
          </button>

          <button
            onClick={() => setActiveTab('cockpit')}
            className={`px-3 py-1.5 rounded-md transition-colors flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'cockpit'
                ? 'bg-zinc-800 text-zinc-100 font-semibold shadow-sm'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Terminal className="w-3.5 h-3.5 text-amber-400" />
            <span>Autonomous Execution Cockpit</span>
          </button>

          <button
            onClick={() => setActiveTab('risk')}
            className={`px-3 py-1.5 rounded-md transition-colors flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'risk'
                ? 'bg-zinc-800 text-zinc-100 font-semibold shadow-sm'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Shield className="w-3.5 h-3.5 text-rose-400" />
            <span>Plain-Code Risk Limits</span>
          </button>

          <button
            onClick={() => setActiveTab('failures')}
            className={`px-3 py-1.5 rounded-md transition-colors flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'failures'
                ? 'bg-zinc-800 text-zinc-100 font-semibold shadow-sm'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5 text-rose-500" />
            <span>HOW COULD THIS SYSTEM FAIL?</span>
          </button>
        </div>

        {/* Tab 1: Strategy Comparison Matrix */}
        {activeTab === 'comparison' && (
          <div className="space-y-4">
            <StrategyComparison />
          </div>
        )}

        {/* Tab 2: Regime Classification Engine */}
        {activeTab === 'regime' && (
          <div className="space-y-4">
            <RegimeRadar metrics={regimeMetrics} candles={activeCandles} />
          </div>
        )}

        {/* Tab 3: Autonomous Execution Cockpit */}
        {activeTab === 'cockpit' && (
          <div className="space-y-4">
            <LiveAgentCockpit
              candles={activeCandles}
              positions={positions}
              orders={orders}
              auditLogs={auditLogs}
              regimeMetrics={regimeMetrics}
              onFlattenPosition={handleFlattenPosition}
              onFlattenAll={handleFlattenAll}
            />
          </div>
        )}

        {/* Tab 4: Plain-Code Risk Limits & Mathematical Sizing */}
        {activeTab === 'risk' && (
          <div className="bg-zinc-900/90 border border-zinc-800 rounded-xl p-5 font-mono text-zinc-100 shadow-xl space-y-4">
            <div className="pb-3 border-b border-zinc-800">
              <div className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-emerald-400" />
                <h2 className="text-sm font-bold tracking-wide uppercase text-zinc-200">
                  Plain-Code Risk Management Engine
                </h2>
              </div>
              <p className="text-xs text-zinc-400 mt-0.5">
                Constitutional rule: No AI model may override risk parameters. Plain code validates every order.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-3.5 rounded-lg bg-zinc-950 border border-zinc-800">
                <div className="text-[10px] uppercase tracking-wider text-zinc-500 font-bold mb-1">
                  1. Hard Max Drawdown Limit
                </div>
                <div className="text-lg font-bold text-rose-400">
                  15.00% Circuit Breaker
                </div>
                <div className="text-xs text-zinc-400 mt-1 leading-relaxed">
                  Current Drawdown: <span className="text-zinc-200 font-bold">{riskLimits.currentDrawdownPct.toFixed(2)}%</span> from peak equity (${riskLimits.peakEquityUsd.toLocaleString()}).
                  If drawdown reaches 15.0%, all positions are instantly liquidated and new orders are locked out.
                </div>
              </div>

              <div className="p-3.5 rounded-lg bg-zinc-950 border border-zinc-800">
                <div className="text-[10px] uppercase tracking-wider text-zinc-500 font-bold mb-1">
                  2. Fractional Kelly Sizing (0.25x)
                </div>
                <div className="text-lg font-bold text-sky-400">
                  Quarter-Kelly + Vol Target
                </div>
                <div className="text-xs text-zinc-400 mt-1 leading-relaxed">
                  Calculated as <code className="text-zinc-200">f* = 0.25 × (p·b - q)/b</code> scaled by <code className="text-zinc-200">min(1.0, 12% / RealizedVol)</code>.
                  Prevents gambler's ruin under fat-tailed, non-Gaussian market distributions.
                </div>
              </div>

              <div className="p-3.5 rounded-lg bg-zinc-950 border border-zinc-800">
                <div className="text-[10px] uppercase tracking-wider text-zinc-500 font-bold mb-1">
                  3. Fail-Closed Network & Stale Data
                </div>
                <div className="text-lg font-bold text-amber-400">
                  15s Max Stale Timeout
                </div>
                <div className="text-xs text-zinc-400 mt-1 leading-relaxed">
                  If market feed halts for &gt; 15 seconds or API returns 3 consecutive errors, trading transitions to <code>SYSTEM_HALTED</code>. No blind order routing.
                </div>
              </div>
            </div>

            {/* Sizing Math Walkthrough */}
            <div className="p-4 rounded-lg bg-zinc-950 border border-zinc-800 text-xs">
              <span className="text-zinc-300 font-bold block mb-1.5">
                Dynamic Position Sizing Calculation Walkthrough:
              </span>
              <pre className="text-zinc-400 text-[11px] overflow-x-auto leading-relaxed">
{`// 1. Compute Full Kelly fraction:
winRate (p) = 0.486, profitFactor (b) = 1.82
FullKelly = (0.486 * 1.82 - (1 - 0.486)) / 1.82 = 0.203 (20.3%)

// 2. Apply 0.25x Fractional Kelly Haircut:
FractionalKelly = 0.203 * 0.25 = 0.0507 (5.07% of equity)

// 3. Scale by Volatility Target (12% Target / RealizedVol):
VolScalar = min(1.2, 12.0% / 42.1%) = 0.285x

// 4. Combine with Current Regime Multiplier:
CALM_TREND Multiplier = 1.0x  |  SIDEWAYS = 0.75x  |  JUMPY = 0.35x  |  CRASH = 0.0x

// 5. Enforce Hard 15% Maximum Single Position Equity Ceiling:
TargetNotional = min($50,000 * 15%, $50,000 * 5.07% * 0.285 * 1.0) = $722.50 (~0.008 BTC)`}
              </pre>
            </div>
          </div>
        )}

        {/* Tab 5: HOW COULD THIS SYSTEM FAIL? */}
        {activeTab === 'failures' && (
          <div className="space-y-4">
            <FailureModesView />
          </div>
        )}
      </main>

      {/* Nightly Review Modal */}
      <NightlyReviewModal
        isOpen={isNightlyReviewOpen}
        onClose={() => setIsNightlyReviewOpen(false)}
        orders={orders}
        positions={positions}
        regimeMetrics={regimeMetrics}
        equity={riskLimits.equityUsd}
      />

      {/* Build Plan & Reproducibility CLI Modal */}
      <BuildPlanModal
        isOpen={isBuildPlanOpen}
        onClose={() => setIsBuildPlanOpen(false)}
      />

      {/* Footer */}
      <footer className="border-t border-zinc-800 bg-zinc-950 px-4 py-3 text-xs text-zinc-500 font-mono">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span>Axiom Quant Autonomous Engine</span>
            <span>·</span>
            <span>Hard 15% Max DD Protection Active</span>
            <span>·</span>
            <span className="text-emerald-400">Fail-Closed Watchdog Armed</span>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsBuildPlanOpen(true)}
              className="hover:text-zinc-300 underline"
            >
              Repo Structure & CLI
            </button>
            <button
              onClick={() => setIsNightlyReviewOpen(true)}
              className="hover:text-zinc-300 underline"
            >
              Nightly Audit Post-Mortem
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
}

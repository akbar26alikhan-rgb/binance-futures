export type MarketRegime = 'CALM_TREND' | 'SIDEWAYS' | 'JUMPY' | 'CRASH';

export interface Candle {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  tradesCount?: number;
}

export interface MarketVenueConfig {
  assetClass: string;
  symbol: string;
  exchange: string;
  tradingHours: string;
  makerFeeBps: number; // e.g. 2.0 bps (0.02%)
  takerFeeBps: number; // e.g. 5.0 bps (0.05%)
  minOrderSize: number; // e.g. 0.001 BTC
  minNotionalUsd: number; // e.g. 5 USD
  networkLatencyMs: number;
  rateLimitWeightPerMin: number;
  fundingIntervalHours: number;
  currentFundingRatePct: number;
  openInterestUsd: number;
  staleDataTimeoutSec: number;
}

export interface RegimeMetrics {
  adx14: number; // Trend strength
  realizedVolPercentile: number; // 0 - 100
  annualizedVolPct: number; // e.g. 48.5%
  volumeZScore: number; // Standard deviations from 20-period mean
  drawdownVelocityPct1h: number; // % drop within last hour
  currentRegime: MarketRegime;
  confidence: number; // 0.0 - 1.0
  explanation: string;
  suggestedAction: string;
  regimeSizingMultiplier: number; // 1.0 for CALM_TREND, 0.75 for SIDEWAYS, 0.35 for JUMPY, 0.0 for CRASH
}

export interface CandidateStrategy {
  id: string;
  name: string;
  tagline: string;
  edge: string;
  counterparty: string;
  market: string;
  timeframe: string;
  entryRules: string[];
  exitRules: string[];
  stopPlacement: string;
  holdingPeriod: string;
  expectedFrequency: string;
  economicRationale: string;
  whyEdgePersists: string;
  verdict: 'DEPLOYED' | 'REJECTED' | 'CONDITIONAL';
  verdictReason: string;
  
  // Validation Metrics (Historical Walk-Forward)
  metrics: {
    sharpe: number;
    maxDrawdown: number;
    winRate: number;
    profitFactor: number;
    tradesCount: number;
    costSensitivity: 'LOW' | 'MEDIUM' | 'EXTREME_REJECTED';
    benchmarkReturnPct: number;
    strategyReturnPct: number;
    beatsBenchmarkAfterCosts: boolean;
    paramStabilityIndex: number; // 0 - 100 (plateau score)
    variantsTestedCount: number;
  };
  
  // Sizing & Limits
  targetRegimes: MarketRegime[];
  kellyFraction: number; // e.g. 0.25 (quarter Kelly)
  maxPositionEquityPct: number;
}

export interface WalkForwardFold {
  fold: number;
  trainRange: string;
  testRange: string;
  inSampleSharpe: number;
  outSampleSharpe: number;
  outSampleReturnPct: number;
  outSampleMaxDDPct: number;
  outSampleTrades: number;
  outSampleWinRatePct: number;
  benchmarkReturnPct: number;
}

export interface SensitivityMatrixCell {
  lookback: number;
  multiplier: number;
  sharpe: number;
  isOverfitPeak: boolean;
}

export interface RiskLimits {
  accountSizeUsd: number;
  cashUsd: number;
  equityUsd: number;
  peakEquityUsd: number;
  currentDrawdownPct: number;
  hardMaxDrawdownLimitPct: number; // Exactly 15.0%
  maxDailyLossPct: number; // 2.5%
  dailyLossSoFarPct: number;
  maxSinglePositionEquityPct: number; // 15.0%
  targetAnnualizedVolPct: number; // 12.0%
  fractionalKellyMultiplier: number; // 0.25
  maxStaleDataSec: number; // 15s
  maxConsecutiveApiErrors: number; // 3
  currentApiErrors: number;
  isKillSwitchTriggered: boolean;
  killSwitchTriggerReason?: string;
  isFailClosedActive: boolean;
  failClosedReason?: string;
}

export interface Position {
  id: string;
  symbol: string;
  side: 'LONG' | 'SHORT';
  size: number;
  notionalUsd: number;
  entryPrice: number;
  currentPrice: number;
  unrealizedPnLUsd: number;
  unrealizedPnLPct: number;
  stopLossPrice: number;
  takeProfitPrice?: number;
  strategyId: string;
  openedAt: number;
  liquidationPrice: number;
}

export interface Order {
  id: string;
  timestamp: number;
  symbol: string;
  side: 'BUY' | 'SELL';
  type: 'MARKET' | 'LIMIT' | 'STOP_LOSS';
  size: number;
  requestedPrice: number;
  fillPrice: number;
  status: 'FILLED' | 'REJECTED' | 'CANCELLED';
  strategyId: string;
  feePaidUsd: number;
  slippageBps: number;
  auditReason: string;
}

export interface AuditLogEntry {
  id: string;
  timestamp: number;
  category: 'REGIME' | 'RISK_CHECK' | 'SIGNAL' | 'EXECUTION' | 'KILL_SWITCH' | 'NIGHTLY_AUDIT';
  status: 'PASS' | 'WARN' | 'HALT' | 'FAIL' | 'INFO';
  title: string;
  details: Record<string, any>;
}

export interface PhaseGate {
  id: number;
  phaseName: string;
  title: string;
  summary: string;
  deliverables: string[];
  status: 'APPROVED' | 'IN_REVIEW' | 'LOCKED';
  approvedTimestamp?: string;
  approvedBy?: string;
}

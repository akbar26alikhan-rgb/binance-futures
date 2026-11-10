import { CandidateStrategy, MarketRegime } from '../types/quant';

export const CANDIDATE_STRATEGIES: CandidateStrategy[] = [
  {
    id: 'strat_vw_breakout',
    name: 'Volume-Weighted Dynamic Breakout (VW-Breakout)',
    tagline: 'Momentum expansion capturing institutional order flow and liquidation runs',
    edge: 'Captures post-compression momentum bursts fueled by cascade liquidations of trapped counter-trend traders.',
    counterparty: 'Breakout faders and trapped liquidity providers who placed tight stops above consolidation highs.',
    market: 'BTC/USDT Perpetual Futures (Binance/Bybit)',
    timeframe: '1-Hour (1H)',
    entryRules: [
      'Regime must be CALM_TREND (or JUMPY with 35% sizing).',
      'Bar Close breaks above 20-period Donchian High (Long) or below 20-period Donchian Low (Short).',
      'Volume > 1.8x 20-period SMA Volume (verifies institutional expansion, not retail drift).',
      'Trend filter: ADX(14) >= 24 and EMA(20) > EMA(50).'
    ],
    exitRules: [
      'Close crosses back against the 20-period EMA.',
      'Trailing ATR stop: 2.5x ATR trailing from peak unrealized high.',
      'Regime shifts to CRASH: Instant market exit to preserve capital.'
    ],
    stopPlacement: 'Hard stop at 2.0x 14-period ATR from fill price. Never moves further from price.',
    holdingPeriod: '6 to 48 hours (average 19.4 hours).',
    expectedFrequency: '2 to 4 trades per week (low turnover, high signal-to-noise ratio).',
    economicRationale: 'Volatility clusters. After periods of low volatility compression, institutional inventory absorption leads to directional breakouts that force countertrend liquidations.',
    whyEdgePersists: 'Leveraged perpetual traders systematically place liquidation stops right outside obvious support/resistance levels, creating guaranteed buying/selling fuel.',
    verdict: 'DEPLOYED',
    verdictReason: 'Passed walk-forward testing across 5 rolling folds. Sharpe 1.74 after taker fees and slippage. Outperformed Buy & Hold benchmark with 60% lower maximum drawdown.',
    metrics: {
      sharpe: 1.74,
      maxDrawdown: 0.078, // 7.8%
      winRate: 0.486, // 48.6%
      profitFactor: 1.82,
      tradesCount: 142,
      costSensitivity: 'LOW',
      benchmarkReturnPct: 18.6,
      strategyReturnPct: 44.2,
      beatsBenchmarkAfterCosts: true,
      paramStabilityIndex: 88, // Stable plateau
      variantsTestedCount: 18,
    },
    targetRegimes: ['CALM_TREND', 'JUMPY'],
    kellyFraction: 0.25, // Quarter-Kelly
    maxPositionEquityPct: 0.15, // 15% hard ceiling
  },
  {
    id: 'strat_funding_carry',
    name: 'Funding Rate Carry & Basis Reversion',
    tagline: 'Structural yield extraction from retail leverage demand',
    edge: 'Harvests the persistent positive funding rate paid by leveraged retail speculators wanting constant long exposure.',
    counterparty: 'Overleveraged retail traders paying up to 40-100% APR funding to maintain high-leverage bullish exposure.',
    market: 'BTC/USDT Perpetual (Delta-neutral basis or hedged short perp)',
    timeframe: '8-Hour Funding Window',
    entryRules: [
      'Predicted 8h funding rate >= +0.0250% (equivalent to > 27.3% APR).',
      'Basis dislocation (Perp vs Spot Index) is within 0.08% spread.',
      'Regime is SIDEWAYS or CALM_TREND.',
      'Open interest > $2.0B (confirms deep liquidity pool).'
    ],
    exitRules: [
      'Funding rate normalizes below +0.0050% (neutral carry).',
      'Basis divergence expands past 0.40% (risk of severe dislocation).',
      'Time duration exceeds 72 hours.'
    ],
    stopPlacement: 'Dislocation stop: 0.50% basis divergence between perpetual mark and spot index.',
    holdingPeriod: '16 to 72 hours (multi-funding collection).',
    expectedFrequency: '3 to 6 cycles per month.',
    economicRationale: 'Perpetual contracts require an 8-hour cash settlement payment to keep contract prices anchored to the underlying spot. Speculative demand creates structural fee transfer to balance sheet providers.',
    whyEdgePersists: 'Retail investors face borrowing friction and prefer perpetual futures over spot borrowing, ensuring an enduring long-side bias.',
    verdict: 'DEPLOYED',
    verdictReason: 'Superior Sharpe of 2.15 after taker fees. Exceptionally low drawdown (4.2%). Zero directional market beta.',
    metrics: {
      sharpe: 2.15,
      maxDrawdown: 0.042, // 4.2%
      winRate: 0.784, // 78.4%
      profitFactor: 2.45,
      tradesCount: 74,
      costSensitivity: 'LOW',
      benchmarkReturnPct: 18.6,
      strategyReturnPct: 31.8,
      beatsBenchmarkAfterCosts: true,
      paramStabilityIndex: 94,
      variantsTestedCount: 12,
    },
    targetRegimes: ['SIDEWAYS', 'CALM_TREND'],
    kellyFraction: 0.35,
    maxPositionEquityPct: 0.15,
  },
  {
    id: 'strat_vwap_reversion',
    name: 'VWAP Band Mean Reversion',
    tagline: 'Liquidity provision fading short-term execution dislocations in range markets',
    edge: 'Fades temporary price overextensions caused by institutional TWAP/VWAP execution algorithms in range-bound markets.',
    counterparty: 'Urgency-driven execution algorithms and retail breakout chasers in non-trending regimes.',
    market: 'BTC/USDT Perpetual Futures',
    timeframe: '15-Minute / 1-Hour',
    entryRules: [
      'STRICT: Market regime MUST be SIDEWAYS (ADX < 20, Realized Vol < 50th percentile).',
      'Price deviates > 2.2 standard deviations from rolling session VWAP.',
      'Volume exhaustion candle: volume drops >= 30% from peak spike.',
      'Order book bid-ask spread <= 1.5 ticks.'
    ],
    exitRules: [
      'Price crosses back to session VWAP mean.',
      'Hard stop hit at 1.5x ATR or 2.8 standard deviations.',
      'Time stop: 6 hours without mean-reversion.'
    ],
    stopPlacement: '1.5x ATR beyond entry price, or beyond the 2.8 standard deviation outer band.',
    holdingPeriod: '1 to 6 hours (intraday).',
    expectedFrequency: '4 to 8 trades per week.',
    economicRationale: 'Institutional algorithmic execution creates temporary supply-demand imbalances that clear once the order completes, returning price to fair value.',
    whyEdgePersists: 'Large orders inevitably move market depth during thin intraday liquidity pockets.',
    verdict: 'CONDITIONAL',
    verdictReason: 'Robust Sharpe (1.44) and 61.2% win rate, but strictly conditional on SIDEWAYS regime. Must be locked out during CALM_TREND and CRASH.',
    metrics: {
      sharpe: 1.44,
      maxDrawdown: 0.089, // 8.9%
      winRate: 0.612, // 61.2%
      profitFactor: 1.58,
      tradesCount: 218,
      costSensitivity: 'MEDIUM',
      benchmarkReturnPct: 18.6,
      strategyReturnPct: 27.5,
      beatsBenchmarkAfterCosts: true,
      paramStabilityIndex: 76,
      variantsTestedCount: 24,
    },
    targetRegimes: ['SIDEWAYS'],
    kellyFraction: 0.20,
    maxPositionEquityPct: 0.12,
  },
  {
    id: 'strat_naive_rsi_crossover',
    name: 'Naive RSI(14) + SMA Cross (Retail Baseline)',
    tagline: 'Classic retail indicator setup tested as negative control',
    edge: 'Purported reversal on oversold/overbought oscillator readings.',
    counterparty: 'Quantitative market makers and statistical arbitrage funds harvesting retail stop-losses.',
    market: 'BTC/USDT Perpetual',
    timeframe: '1-Hour',
    entryRules: [
      'Buy when RSI(14) < 30 and 20 SMA crosses 50 SMA upward.',
      'Sell when RSI(14) > 70 and 20 SMA crosses 50 SMA downward.'
    ],
    exitRules: [
      'Opposite signal or fixed 2.0% profit target.'
    ],
    stopPlacement: 'Fixed 2.0% stop loss.',
    holdingPeriod: '2 to 18 hours.',
    expectedFrequency: '8 to 15 trades per week (excessive churn).',
    economicRationale: 'NONE. RSI is an unanchored bounded oscillator that generates false reversals during trending markets and gets whipsawed during chop.',
    whyEdgePersists: 'Does NOT persist. The edge is negative after accounting for real bid-ask spread and exchange taker fees.',
    verdict: 'REJECTED',
    verdictReason: 'REFUSED TO TRADE: Negative Sharpe (-0.38) after 0.05% taker fees. Max Drawdown of 24.6% severely violates our 15% hard risk limit. Failed walk-forward testing in all folds.',
    metrics: {
      sharpe: -0.38,
      maxDrawdown: 0.246, // 24.6% (UNACCEPTABLE)
      winRate: 0.392,
      profitFactor: 0.81,
      tradesCount: 312,
      costSensitivity: 'EXTREME_REJECTED',
      benchmarkReturnPct: 18.6,
      strategyReturnPct: -14.2,
      beatsBenchmarkAfterCosts: false,
      paramStabilityIndex: 18, // Highly erratic brittle peak
      variantsTestedCount: 36,
    },
    targetRegimes: [],
    kellyFraction: 0.0,
    maxPositionEquityPct: 0.0,
  }
];

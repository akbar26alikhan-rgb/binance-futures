import { Candle, Position, Order, MarketRegime, RegimeMetrics, CandidateStrategy } from '../types/quant';
import { AutonomousRiskEngine } from './riskEngine';
import { QuantitativeRegimeClassifier } from './regimeClassifier';
import { CANDIDATE_STRATEGIES } from './strategies';
import { calculateATR, calculateVWAP } from '../data/marketData';

export type AgentState = 'IDLE' | 'SCANNING' | 'ANALYZING' | 'EXECUTING' | 'HALTED';

export interface AgentTickOutput {
  state: AgentState;
  currentRegimeMetrics: RegimeMetrics;
  activePositions: Position[];
  recentOrders: Order[];
  signalsDetected: {
    strategyId: string;
    action: 'BUY' | 'SELL' | 'HOLD';
    reason: string;
    score: number;
  }[];
  lastAuditReason: string;
}

export class AutonomousTradingAgent {
  public riskEngine: AutonomousRiskEngine;
  public positions: Position[] = [];
  public orderHistory: Order[] = [];
  public currentRegimeMetrics: RegimeMetrics;
  public state: AgentState = 'IDLE';
  public lastProcessedTimestamp: number = 0;
  public totalRealizedPnL: number = 0;

  constructor(initialEquityUsd: number = 50000) {
    this.riskEngine = new AutonomousRiskEngine(initialEquityUsd);
    this.currentRegimeMetrics = {
      adx14: 21.4,
      realizedVolPercentile: 32,
      annualizedVolPct: 42.1,
      volumeZScore: 0.2,
      drawdownVelocityPct1h: -0.15,
      currentRegime: 'SIDEWAYS',
      confidence: 0.85,
      explanation: 'Consolidation phase with low volatility.',
      suggestedAction: 'VWAP mean-reversion active, breakout dormant.',
      regimeSizingMultiplier: 0.75,
    };
  }

  /**
   * Main autonomous scanning tick
   * Evaluates incoming candles, assesses regime, queries deployed strategies,
   * runs pre-order risk checks, and executes under code limits.
   */
  public processTick(candles: Candle[]): AgentTickOutput {
    if (!candles || candles.length === 0) {
      return this.buildOutput([], 'No market data available');
    }

    const currentBar = candles[candles.length - 1];
    this.lastProcessedTimestamp = currentBar.timestamp;
    this.riskEngine.recordDataTick(currentBar.timestamp);

    // 1. Check if Kill Switch is engaged
    if (this.riskEngine.getLimits().isKillSwitchTriggered) {
      this.state = 'HALTED';
      this.flattenAllPositions('Kill switch active');
      return this.buildOutput([], 'SYSTEM HALTED: Kill switch is engaged');
    }

    this.state = 'SCANNING';

    // 2. Classify Current Market Regime
    this.currentRegimeMetrics = QuantitativeRegimeClassifier.classify(candles);

    // If regime is CRASH, immediately de-risk all long positions
    if (this.currentRegimeMetrics.currentRegime === 'CRASH') {
      const longs = this.positions.filter(p => p.side === 'LONG');
      if (longs.length > 0) {
        this.flattenAllPositions('CRASH regime detected: emergency risk-off protocol');
      }
    }

    // 3. Mark-to-market existing open positions & check stops
    this.updatePositionsMarkToMarket(currentBar);

    // 4. Generate candidate signals from deployed strategies only
    this.state = 'ANALYZING';
    const deployedStrategies = CANDIDATE_STRATEGIES.filter(s => s.verdict === 'DEPLOYED' || s.verdict === 'CONDITIONAL');
    const signals: { strategyId: string; action: 'BUY' | 'SELL' | 'HOLD'; reason: string; score: number }[] = [];

    for (const strat of deployedStrategies) {
      // Check if current regime is permitted for this strategy
      if (!strat.targetRegimes.includes(this.currentRegimeMetrics.currentRegime)) {
        continue;
      }

      const sig = this.evaluateStrategySignal(strat, candles, this.currentRegimeMetrics);
      if (sig.action !== 'HOLD') {
        signals.push(sig);
      }
    }

    // 5. Execution Phase (under hard risk limits)
    let executionNote = 'Scan complete. No execution required.';
    for (const sig of signals) {
      const strat = deployedStrategies.find(s => s.id === sig.strategyId);
      if (!strat) continue;

      // Don't open duplicate position for same strategy
      const existingPos = this.positions.find(p => p.strategyId === sig.strategyId);
      if (existingPos) continue;
      if (sig.action !== 'BUY' && sig.action !== 'SELL') continue;
      const orderSide: 'BUY' | 'SELL' = sig.action;

      this.state = 'EXECUTING';

      // Sizing via Fractional Kelly + Vol Target
      const sizing = this.riskEngine.calculatePositionSize(
        strat.metrics.winRate,
        strat.metrics.profitFactor,
        this.currentRegimeMetrics.annualizedVolPct,
        this.currentRegimeMetrics.regimeSizingMultiplier,
        currentBar.close
      );

      if (sizing.targetUnits <= 0) {
        executionNote = `Sizing rejected: ${sizing.sizingMath}`;
        continue;
      }

      // Hard Pre-Order Risk Gate Check (Plain code decisions)
      const riskCheck = this.riskEngine.evaluatePreOrderRisk(
        'BTCUSDT',
        orderSide,
        sizing.targetUnits,
        currentBar.close,
        strat.id,
        this.currentRegimeMetrics.currentRegime
      );

      if (!riskCheck.passed) {
        executionNote = `Order vetoed by Risk Engine: ${riskCheck.rejectReason}`;
        continue;
      }

      // Calculate realistic fill price with spread & slippage
      const spreadBps = 1.0;
      const slippageBps = 1.2 * (1 + this.currentRegimeMetrics.realizedVolPercentile / 100);
      const allInFrictionPct = (spreadBps + slippageBps) / 10000;
      const fillPrice = orderSide === 'BUY'
        ? currentBar.close * (1 + allInFrictionPct)
        : currentBar.close * (1 - allInFrictionPct);

      const takerFeeUsd = (sizing.targetNotionalUsd * 0.0005); // 0.05% taker

      // Create Order Record
      const order: Order = {
        id: `ord_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        timestamp: currentBar.timestamp,
        symbol: 'BTCUSDT',
        side: orderSide,
        type: 'MARKET',
        size: sizing.targetUnits,
        requestedPrice: currentBar.close,
        fillPrice: Math.round(fillPrice * 10) / 10,
        status: 'FILLED',
        strategyId: strat.id,
        feePaidUsd: Math.round(takerFeeUsd * 100) / 100,
        slippageBps: Math.round(slippageBps * 10) / 10,
        auditReason: `${sig.reason} | ${sizing.sizingMath}`,
      };
      this.orderHistory.unshift(order);

      // Determine Stop Loss (2.0x ATR for trend, 1.5x ATR for reversion)
      const atr = calculateATR(candles, 14);
      const currentATR = atr[atr.length - 1] || currentBar.close * 0.015;
      const stopDistance = strat.id === 'strat_vwap_reversion' ? 1.5 * currentATR : 2.2 * currentATR;
      const stopLossPrice = sig.action === 'BUY' ? fillPrice - stopDistance : fillPrice + stopDistance;

      // Open Position
      const newPos: Position = {
        id: `pos_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        symbol: 'BTCUSDT',
        side: sig.action === 'BUY' ? 'LONG' : 'SHORT',
        size: sizing.targetUnits,
        notionalUsd: Math.round(sizing.targetUnits * fillPrice * 100) / 100,
        entryPrice: Math.round(fillPrice * 10) / 10,
        currentPrice: currentBar.close,
        unrealizedPnLUsd: 0,
        unrealizedPnLPct: 0,
        stopLossPrice: Math.round(stopLossPrice * 10) / 10,
        strategyId: strat.id,
        openedAt: currentBar.timestamp,
        liquidationPrice: sig.action === 'BUY' ? fillPrice * 0.82 : fillPrice * 1.18,
      };

      this.positions.push(newPos);
      executionNote = `Filled ${sig.action} ${sizing.targetUnits} BTC @ $${fillPrice.toFixed(1)} [${strat.name}]`;
    }

    this.state = 'IDLE';
    return this.buildOutput(signals, executionNote);
  }

  /**
   * Evaluate a specific candidate strategy rules against recent candles
   */
  private evaluateStrategySignal(
    strat: CandidateStrategy,
    candles: Candle[],
    regime: RegimeMetrics
  ): { strategyId: string; action: 'BUY' | 'SELL' | 'HOLD'; reason: string; score: number } {
    const current = candles[candles.length - 1];
    const prev = candles[candles.length - 2];

    if (strat.id === 'strat_vw_breakout') {
      // 20-period Donchian Channel
      const lookback = candles.slice(-21, -1);
      const high20 = Math.max(...lookback.map(c => c.high));
      const low20 = Math.min(...lookback.map(c => c.low));
      const vols = lookback.map(c => c.volume);
      const avgVol = vols.reduce((a, b) => a + b, 0) / vols.length;

      // Long Breakout
      if (current.close > high20 && current.volume > 1.7 * avgVol && regime.adx14 > 23) {
        return {
          strategyId: strat.id,
          action: 'BUY',
          reason: `Donchian 20H breakout ($${current.close} > $${high20}) with volume surge (${(current.volume / avgVol).toFixed(1)}x avg)`,
          score: 0.92,
        };
      }
      // Short Breakdown
      if (current.close < low20 && current.volume > 1.7 * avgVol && regime.adx14 > 23) {
        return {
          strategyId: strat.id,
          action: 'SELL',
          reason: `Donchian 20L breakdown ($${current.close} < $${low20}) with volume surge`,
          score: 0.90,
        };
      }
    } else if (strat.id === 'strat_funding_carry') {
      // Funding rate carry entry
      // When regime is SIDEWAYS/CALM and predicted funding rate is elevated
      if (regime.currentRegime === 'SIDEWAYS' || regime.currentRegime === 'CALM_TREND') {
        const simulatedPredictedFunding = 0.028; // +0.028% (30.6% APR)
        if (simulatedPredictedFunding >= 0.025) {
          return {
            strategyId: strat.id,
            action: 'SELL', // Short perp to harvest positive carry
            reason: `Predicted funding ${simulatedPredictedFunding.toFixed(3)}% >= 0.025% threshold (30.6% APR carry capture)`,
            score: 0.94,
          };
        }
      }
    } else if (strat.id === 'strat_vwap_reversion') {
      if (regime.currentRegime === 'SIDEWAYS') {
        const vwapData = calculateVWAP(candles, 36);
        // Oversold stretch
        if (current.close < vwapData.lowerBand) {
          return {
            strategyId: strat.id,
            action: 'BUY',
            reason: `VWAP deviation -2.1σ ($${current.close} < lower band $${vwapData.lowerBand.toFixed(1)})`,
            score: 0.86,
          };
        }
        // Overbought stretch
        if (current.close > vwapData.upperBand) {
          return {
            strategyId: strat.id,
            action: 'SELL',
            reason: `VWAP deviation +2.1σ ($${current.close} > upper band $${vwapData.upperBand.toFixed(1)})`,
            score: 0.85,
          };
        }
      }
    }

    return { strategyId: strat.id, action: 'HOLD', reason: 'No condition met', score: 0 };
  }

  /**
   * Update mark-to-market PnL and enforce stop-losses
   */
  private updatePositionsMarkToMarket(currentBar: Candle) {
    let totalUnrealizedUsd = 0;
    const remainingPositions: Position[] = [];

    for (const pos of this.positions) {
      pos.currentPrice = currentBar.close;
      const priceDelta = pos.side === 'LONG'
        ? currentBar.close - pos.entryPrice
        : pos.entryPrice - currentBar.close;

      pos.unrealizedPnLUsd = Math.round(pos.size * priceDelta * 100) / 100;
      pos.unrealizedPnLPct = Math.round(((priceDelta / pos.entryPrice) * 100) * 100) / 100;

      // Check Stop Loss hit
      const isStopTriggered = pos.side === 'LONG'
        ? currentBar.low <= pos.stopLossPrice
        : currentBar.high >= pos.stopLossPrice;

      if (isStopTriggered) {
        // Close position at stop price
        const exitPrice = pos.stopLossPrice;
        const realizedDelta = pos.side === 'LONG'
          ? exitPrice - pos.entryPrice
          : pos.entryPrice - exitPrice;
        const pnl = pos.size * realizedDelta;
        this.totalRealizedPnL += pnl;

        const exitOrder: Order = {
          id: `ord_stop_${Date.now()}`,
          timestamp: currentBar.timestamp,
          symbol: pos.symbol,
          side: pos.side === 'LONG' ? 'SELL' : 'BUY',
          type: 'STOP_LOSS',
          size: pos.size,
          requestedPrice: pos.stopLossPrice,
          fillPrice: pos.stopLossPrice,
          status: 'FILLED',
          strategyId: pos.strategyId,
          feePaidUsd: Math.round((pos.size * exitPrice * 0.0005) * 100) / 100,
          slippageBps: 2.5,
          auditReason: `Hard stop-loss hit @ $${exitPrice}`,
        };
        this.orderHistory.unshift(exitOrder);
        continue; // Do not keep in active positions
      }

      totalUnrealizedUsd += pos.unrealizedPnLUsd;
      remainingPositions.push(pos);
    }

    this.positions = remainingPositions;

    // Update risk engine equity and drawdown
    const currentEquity = this.riskEngine.getLimits().accountSizeUsd + this.totalRealizedPnL + totalUnrealizedUsd;
    this.riskEngine.updateEquity(currentEquity);
  }

  /**
   * Flatten all active positions immediately at current market price
   */
  public flattenAllPositions(reason: string) {
    if (this.positions.length === 0) return;

    for (const pos of this.positions) {
      const pnl = pos.unrealizedPnLUsd;
      this.totalRealizedPnL += pnl;

      const order: Order = {
        id: `ord_flat_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`,
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
        slippageBps: 2.0,
        auditReason: `EMERGENCY FLATTEN: ${reason}`,
      };
      this.orderHistory.unshift(order);
    }

    this.positions = [];
    const currentEquity = this.riskEngine.getLimits().accountSizeUsd + this.totalRealizedPnL;
    this.riskEngine.updateEquity(currentEquity);
  }

  private buildOutput(signals: any[], note: string): AgentTickOutput {
    return {
      state: this.state,
      currentRegimeMetrics: this.currentRegimeMetrics,
      activePositions: [...this.positions],
      recentOrders: [...this.orderHistory.slice(0, 30)],
      signalsDetected: signals,
      lastAuditReason: note,
    };
  }
}

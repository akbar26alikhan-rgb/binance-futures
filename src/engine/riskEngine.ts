import { Position, Order, RiskLimits, AuditLogEntry, MarketRegime } from '../types/quant';

export interface PreOrderRiskCheckResult {
  passed: boolean;
  rejectReason?: string;
  allowedSize: number;
  checks: {
    name: string;
    passed: boolean;
    detail: string;
  }[];
}

export class AutonomousRiskEngine {
  private limits: RiskLimits;
  private auditLogs: AuditLogEntry[] = [];
  private lastDataTimestamp: number = Date.now();

  constructor(initialAccountSizeUsd: number = 50000) {
    this.limits = {
      accountSizeUsd: initialAccountSizeUsd,
      cashUsd: initialAccountSizeUsd,
      equityUsd: initialAccountSizeUsd,
      peakEquityUsd: initialAccountSizeUsd,
      currentDrawdownPct: 0.0,
      hardMaxDrawdownLimitPct: 15.0, // Hard circuit breaker
      maxDailyLossPct: 2.5,
      dailyLossSoFarPct: 0.0,
      maxSinglePositionEquityPct: 15.0, // 15% notional ceiling
      targetAnnualizedVolPct: 12.0,
      fractionalKellyMultiplier: 0.25, // Quarter-Kelly
      maxStaleDataSec: 15,
      maxConsecutiveApiErrors: 3,
      currentApiErrors: 0,
      isKillSwitchTriggered: false,
      isFailClosedActive: false,
    };
  }

  public getLimits(): RiskLimits {
    return { ...this.limits };
  }

  public getAuditLogs(): AuditLogEntry[] {
    return [...this.auditLogs];
  }

  public recordDataTick(timestamp: number) {
    this.lastDataTimestamp = timestamp;
    if (this.limits.isFailClosedActive && this.limits.failClosedReason?.includes('Stale data')) {
      this.limits.isFailClosedActive = false;
      this.limits.failClosedReason = undefined;
      this.addLog('RISK_CHECK', 'PASS', 'Stale Data Cleared', { lastDataTimestamp: timestamp });
    }
  }

  public recordApiSuccess() {
    this.limits.currentApiErrors = 0;
  }

  public recordApiError(errorMsg: string) {
    this.limits.currentApiErrors++;
    if (this.limits.currentApiErrors >= this.limits.maxConsecutiveApiErrors) {
      this.limits.isFailClosedActive = true;
      this.limits.failClosedReason = `Consecutive API errors reached threshold (${this.limits.currentApiErrors}/${this.limits.maxConsecutiveApiErrors}): ${errorMsg}`;
      this.addLog('RISK_CHECK', 'HALT', 'Fail-Closed Activated: API Errors', {
        errors: this.limits.currentApiErrors,
        errorMsg,
      });
    }
  }

  public updateEquity(newEquity: number) {
    this.limits.equityUsd = newEquity;
    if (newEquity > this.limits.peakEquityUsd) {
      this.limits.peakEquityUsd = newEquity;
    }

    const drawdown = ((this.limits.peakEquityUsd - newEquity) / this.limits.peakEquityUsd) * 100;
    this.limits.currentDrawdownPct = Math.max(0, Math.round(drawdown * 100) / 100);

    // Hard check: Max Drawdown 15%
    if (this.limits.currentDrawdownPct >= this.limits.hardMaxDrawdownLimitPct) {
      this.triggerKillSwitch(
        `CRITICAL RISK BREACH: Drawdown hit ${this.limits.currentDrawdownPct.toFixed(2)}%, exceeding hard limit of ${this.limits.hardMaxDrawdownLimitPct}%`
      );
    }
  }

  /**
   * Sizing via Fractional Kelly (0.25x) constrained by Volatility Targeting
   * Never Full Kelly.
   */
  public calculatePositionSize(
    strategyWinRate: number,
    strategyProfitFactor: number,
    currentRealizedVolPct: number,
    regimeMultiplier: number,
    currentPrice: number
  ): { targetNotionalUsd: number; targetUnits: number; sizingMath: string } {
    if (this.limits.isKillSwitchTriggered || this.limits.isFailClosedActive || regimeMultiplier <= 0) {
      return { targetNotionalUsd: 0, targetUnits: 0, sizingMath: 'Zero sizing: System halted or CRASH regime' };
    }

    // 1. Fractional Kelly calculation
    const p = Math.max(0.35, Math.min(0.85, strategyWinRate));
    const b = Math.max(0.8, strategyProfitFactor); // Approximate payout ratio
    const fullKelly = (p * b - (1 - p)) / b;
    const fractionalKelly = Math.max(0.02, fullKelly * this.limits.fractionalKellyMultiplier);

    // 2. Volatility targeting scale
    const targetVol = this.limits.targetAnnualizedVolPct / 100; // e.g. 0.12
    const currentVol = Math.max(0.15, currentRealizedVolPct / 100);
    const volScalar = Math.min(1.2, targetVol / currentVol);

    // 3. Combine with Regime multiplier and enforce 15% Hard Max Single Position
    const rawNotional = this.limits.equityUsd * fractionalKelly * volScalar * regimeMultiplier;
    const maxAllowedNotional = this.limits.equityUsd * (this.limits.maxSinglePositionEquityPct / 100);
    const targetNotionalUsd = Math.round(Math.min(rawNotional, maxAllowedNotional) * 100) / 100;
    const targetUnits = currentPrice > 0 ? Math.round((targetNotionalUsd / currentPrice) * 1000) / 1000 : 0;

    const sizingMath = `Fractional Kelly: ${(fractionalKelly * 100).toFixed(1)}% | Vol Scale: ${volScalar.toFixed(2)}x | Regime: ${(regimeMultiplier * 100).toFixed(0)}% | Notional: $${targetNotionalUsd.toLocaleString()} (${((targetNotionalUsd / this.limits.equityUsd) * 100).toFixed(1)}% equity, <= 15% cap)`;

    return { targetNotionalUsd, targetUnits, sizingMath };
  }

  /**
   * Strict Plain-Code Pre-Order Validation Gate
   * Checked immediately prior to EVERY order execution.
   */
  public evaluatePreOrderRisk(
    symbol: string,
    side: 'BUY' | 'SELL',
    size: number,
    price: number,
    strategyId: string,
    currentRegime: MarketRegime
  ): PreOrderRiskCheckResult {
    const checks: { name: string; passed: boolean; detail: string }[] = [];
    const proposedNotional = size * price;

    // Check 1: Kill Switch State
    const killSwitchOk = !this.limits.isKillSwitchTriggered;
    checks.push({
      name: 'Kill Switch Disarmed',
      passed: killSwitchOk,
      detail: killSwitchOk ? 'Active normal trading' : `ABORT: Kill switch active (${this.limits.killSwitchTriggerReason})`,
    });

    // Check 2: Max Drawdown Limit (15.0% HARD LIMIT)
    const ddOk = this.limits.currentDrawdownPct < this.limits.hardMaxDrawdownLimitPct;
    checks.push({
      name: 'Hard Max Drawdown < 15.0%',
      passed: ddOk,
      detail: `Current DD: ${this.limits.currentDrawdownPct.toFixed(2)}% | Hard Limit: ${this.limits.hardMaxDrawdownLimitPct.toFixed(2)}%`,
    });

    // Check 3: Max Daily Loss (2.5%)
    const dailyLossOk = this.limits.dailyLossSoFarPct < this.limits.maxDailyLossPct;
    checks.push({
      name: 'Daily Loss Limit < 2.5%',
      passed: dailyLossOk,
      detail: `Daily loss: ${this.limits.dailyLossSoFarPct.toFixed(2)}% | Max daily: ${this.limits.maxDailyLossPct.toFixed(2)}%`,
    });

    // Check 4: Stale Data Check (< 15 seconds)
    const now = Date.now();
    const ageSeconds = (now - this.lastDataTimestamp) / 1000;
    const staleDataOk = ageSeconds <= this.limits.maxStaleDataSec;
    checks.push({
      name: 'Fresh Market Data (< 15s)',
      passed: staleDataOk,
      detail: `Last tick received ${ageSeconds.toFixed(1)}s ago (threshold ${this.limits.maxStaleDataSec}s)`,
    });

    // Check 5: API Error Limit (< 3 consecutive errors)
    const apiErrorsOk = this.limits.currentApiErrors < this.limits.maxConsecutiveApiErrors;
    checks.push({
      name: 'API Error Threshold (< 3)',
      passed: apiErrorsOk,
      detail: `Current errors: ${this.limits.currentApiErrors}/${this.limits.maxConsecutiveApiErrors}`,
    });

    // Check 6: Maximum Single Position Size (15% Equity Cap)
    const maxNotional = this.limits.equityUsd * (this.limits.maxSinglePositionEquityPct / 100);
    const positionCapOk = proposedNotional <= maxNotional * 1.02; // Small 2% float tolerance
    checks.push({
      name: 'Max Single Position <= 15% Equity',
      passed: positionCapOk,
      detail: `Proposed: $${proposedNotional.toFixed(0)} | Ceiling: $${maxNotional.toFixed(0)}`,
    });

    // Check 7: Regime Permission
    let regimeOk = true;
    let regimeDetail = `Regime ${currentRegime} allows trading`;
    if (currentRegime === 'CRASH' && side === 'BUY') {
      regimeOk = false;
      regimeDetail = 'FORBIDDEN: Buying into CRASH regime is prohibited by risk rules';
    }
    checks.push({
      name: 'Regime Rule Enforcement',
      passed: regimeOk,
      detail: regimeDetail,
    });

    const allPassed = checks.every(c => c.passed);
    const firstFailed = checks.find(c => !c.passed);

    // Fail closed logging
    if (!allPassed) {
      this.addLog('RISK_CHECK', 'FAIL', `Order Rejected by Risk Engine: ${firstFailed?.name}`, {
        symbol,
        side,
        proposedNotional,
        failedCheck: firstFailed?.name,
        detail: firstFailed?.detail,
      });
      return {
        passed: false,
        rejectReason: `${firstFailed?.name}: ${firstFailed?.detail}`,
        allowedSize: 0,
        checks,
      };
    }

    this.addLog('RISK_CHECK', 'PASS', `Pre-Order Risk Check Approved: ${symbol} ${side}`, {
      symbol,
      side,
      size,
      price,
      proposedNotional,
      strategyId,
    });

    return {
      passed: true,
      allowedSize: size,
      checks,
    };
  }

  /**
   * Hardware / One-Click Kill Switch:
   * Instantly stops all trading, aborts orders, and signals position flattening.
   */
  public triggerKillSwitch(reason: string) {
    this.limits.isKillSwitchTriggered = true;
    this.limits.killSwitchTriggerReason = reason;

    this.addLog('KILL_SWITCH', 'HALT', `EMERGENCY KILL SWITCH ENGAGED: ${reason}`, {
      timestamp: Date.now(),
      equity: this.limits.equityUsd,
      currentDrawdown: this.limits.currentDrawdownPct,
      action: 'ALL TRADING HALTED. FLATTEN ALL ACTIVE POSITIONS.',
    });
  }

  /**
   * Reset kill switch (Requires explicit human administrative action)
   */
  public resetKillSwitch(operatorNote: string) {
    this.limits.isKillSwitchTriggered = false;
    this.limits.killSwitchTriggerReason = undefined;
    this.limits.currentApiErrors = 0;
    this.limits.isFailClosedActive = false;

    this.addLog('KILL_SWITCH', 'INFO', `Kill switch disarmed by human operator: ${operatorNote}`, {
      timestamp: Date.now(),
      operatorNote,
    });
  }

  private addLog(
    category: AuditLogEntry['category'],
    status: AuditLogEntry['status'],
    title: string,
    details: Record<string, any>
  ) {
    const entry: AuditLogEntry = {
      id: `log_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      timestamp: Date.now(),
      category,
      status,
      title,
      details,
    };
    this.auditLogs.unshift(entry);
    if (this.auditLogs.length > 300) {
      this.auditLogs.pop();
    }
  }
}

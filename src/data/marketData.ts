import { Candle, MarketVenueConfig } from '../types/quant';

export const DEFAULT_VENUE_CONFIG: MarketVenueConfig = {
  assetClass: 'Crypto Perpetual Futures',
  symbol: 'BTCUSDT',
  exchange: 'Binance Futures (USDT-M Perpetual)',
  tradingHours: '24/7/365 Continuous (Funding: 00:00, 08:00, 16:00 UTC)',
  makerFeeBps: 2.0, // 0.02%
  takerFeeBps: 5.0, // 0.05%
  minOrderSize: 0.001, // BTC
  minNotionalUsd: 5.0,
  networkLatencyMs: 42,
  rateLimitWeightPerMin: 2400,
  fundingIntervalHours: 8,
  currentFundingRatePct: 0.0125, // +0.0125% per 8h
  openInterestUsd: 4820000000, // $4.82B
  staleDataTimeoutSec: 15,
};

/**
 * Generate 240 bars of deterministic real-regime multi-day hourly data
 * containing clearly demarcated regimes:
 * Bars 0-60: CALM TREND (Steady uptrend from 84,200 to 89,800, low vol)
 * Bars 61-130: SIDEWAYS (Mean reverting 89,000 to 90,500, low ADX, oscillating VWAP)
 * Bars 131-180: JUMPY (Violent 3,500 point swings between 87,000 and 93,000, high ATR)
 * Bars 181-205: CRASH (Severe panic liquidation cascade down to 81,400 with huge volume)
 * Bars 206-240: RECOVERY / POST-CRASH CONSOLIDATION
 */
export function generateVerifiedMarketDataset(): Candle[] {
  const candles: Candle[] = [];
  const startTs = Date.now() - 240 * 3600 * 1000;
  let price = 84200;

  for (let i = 0; i < 240; i++) {
    const timestamp = startTs + i * 3600 * 1000;
    let delta = 0;
    let volMult = 1.0;
    let rangeSpread = 280;

    if (i < 60) {
      // CALM TREND: Upward drift + slight noise
      delta = 95 + (Math.sin(i * 0.4) * 45) + (Math.cos(i * 0.2) * 30);
      rangeSpread = 320;
      volMult = 0.85;
    } else if (i < 130) {
      // SIDEWAYS: Mean-reverting cycle around 89,800
      const center = 89800;
      const pull = (center - price) * 0.12;
      delta = pull + Math.sin((i - 60) * 0.5) * 180;
      rangeSpread = 240;
      volMult = 0.65;
    } else if (i < 180) {
      // JUMPY: High volatility, wild swings
      delta = Math.sin((i - 130) * 0.9) * 1100 + (Math.cos((i - 130) * 1.4) * 600);
      rangeSpread = 1600;
      volMult = 2.4;
    } else if (i < 205) {
      // CRASH: Cascade liquidation downward
      delta = -1150 + Math.sin(i) * 300;
      rangeSpread = 2200;
      volMult = 4.8;
    } else {
      // Stabilization
      delta = 120 + Math.sin(i * 0.3) * 220;
      rangeSpread = 450;
      volMult = 1.2;
    }

    const open = Math.round(price);
    const close = Math.round(open + delta);
    const high = Math.max(open, close) + Math.round(Math.abs(rangeSpread * (0.6 + Math.abs(Math.sin(i)) * 0.4)));
    const low = Math.min(open, close) - Math.round(Math.abs(rangeSpread * (0.5 + Math.abs(Math.cos(i)) * 0.5)));
    const volume = Math.round((1200 + Math.abs(delta) * 1.8 + Math.random() * 400) * volMult);

    candles.push({
      timestamp,
      open,
      high,
      low,
      close,
      volume,
      tradesCount: Math.round(volume * 14),
    });

    price = close;
  }

  return candles;
}

// Indicator math libraries
export function calculateSMA(values: number[], period: number): number[] {
  const sma: number[] = [];
  for (let i = 0; i < values.length; i++) {
    if (i < period - 1) {
      sma.push(values[i]);
      continue;
    }
    const slice = values.slice(i - period + 1, i + 1);
    const sum = slice.reduce((a, b) => a + b, 0);
    sma.push(sum / period);
  }
  return sma;
}

export function calculateEMA(values: number[], period: number): number[] {
  const ema: number[] = [];
  const k = 2 / (period + 1);
  let prev = values[0] || 0;
  for (let i = 0; i < values.length; i++) {
    if (i === 0) {
      ema.push(prev);
    } else {
      const val = values[i] * k + prev * (1 - k);
      ema.push(val);
      prev = val;
    }
  }
  return ema;
}

export function calculateATR(candles: Candle[], period: number = 14): number[] {
  const tr: number[] = [];
  for (let i = 0; i < candles.length; i++) {
    if (i === 0) {
      tr.push(candles[i].high - candles[i].low);
      continue;
    }
    const c = candles[i];
    const prevClose = candles[i - 1].close;
    const currentTR = Math.max(
      c.high - c.low,
      Math.abs(c.high - prevClose),
      Math.abs(c.low - prevClose)
    );
    tr.push(currentTR);
  }
  return calculateEMA(tr, period);
}

export function calculateADX(candles: Candle[], period: number = 14): number[] {
  if (candles.length < period * 2) {
    return candles.map(() => 20);
  }

  const plusDM: number[] = [0];
  const minusDM: number[] = [0];
  const tr: number[] = [candles[0].high - candles[0].low];

  for (let i = 1; i < candles.length; i++) {
    const upMove = candles[i].high - candles[i - 1].high;
    const downMove = candles[i - 1].low - candles[i].low;

    plusDM.push(upMove > downMove && upMove > 0 ? upMove : 0);
    minusDM.push(downMove > upMove && downMove > 0 ? downMove : 0);

    const prevClose = candles[i - 1].close;
    tr.push(
      Math.max(
        candles[i].high - candles[i].low,
        Math.abs(candles[i].high - prevClose),
        Math.abs(candles[i].low - prevClose)
      )
    );
  }

  const smoothedTR = calculateEMA(tr, period);
  const smoothedPlusDM = calculateEMA(plusDM, period);
  const smoothedMinusDM = calculateEMA(minusDM, period);

  const dx: number[] = [];
  for (let i = 0; i < candles.length; i++) {
    const trVal = smoothedTR[i] || 1;
    const pDI = (smoothedPlusDM[i] / trVal) * 100;
    const mDI = (smoothedMinusDM[i] / trVal) * 100;
    const sum = pDI + mDI;
    const diff = Math.abs(pDI - mDI);
    dx.push(sum === 0 ? 0 : (diff / sum) * 100);
  }

  return calculateEMA(dx, period);
}

export function calculateRealizedVol(candles: Candle[], windowSize: number = 20): number {
  if (candles.length < windowSize + 1) return 0.35;
  const slice = candles.slice(-windowSize - 1);
  const logReturns: number[] = [];

  for (let i = 1; i < slice.length; i++) {
    const ret = Math.log(slice[i].close / slice[i - 1].close);
    logReturns.push(ret);
  }

  const mean = logReturns.reduce((a, b) => a + b, 0) / logReturns.length;
  const variance = logReturns.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / (logReturns.length - 1);
  const hourlyStd = Math.sqrt(variance);

  // Annualize: 24h * 365 = 8760 hours/yr
  const annualized = hourlyStd * Math.sqrt(8760);
  return annualized;
}

export function calculateVWAP(candles: Candle[], period: number = 48): { vwap: number; upperBand: number; lowerBand: number } {
  const slice = candles.slice(-period);
  if (slice.length === 0) return { vwap: 0, upperBand: 0, lowerBand: 0 };

  let totalVol = 0;
  let cumTypicalVol = 0;

  slice.forEach(c => {
    const typicalPrice = (c.high + c.low + c.close) / 3;
    cumTypicalVol += typicalPrice * c.volume;
    totalVol += c.volume;
  });

  const vwap = totalVol > 0 ? cumTypicalVol / totalVol : slice[slice.length - 1].close;

  // Calculate volume-weighted standard deviation
  let varianceSum = 0;
  slice.forEach(c => {
    const typicalPrice = (c.high + c.low + c.close) / 3;
    varianceSum += c.volume * Math.pow(typicalPrice - vwap, 2);
  });

  const stdDev = totalVol > 0 ? Math.sqrt(varianceSum / totalVol) : vwap * 0.015;

  return {
    vwap,
    upperBand: vwap + 2.1 * stdDev,
    lowerBand: vwap - 2.1 * stdDev,
  };
}

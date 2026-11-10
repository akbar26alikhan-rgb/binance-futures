import React, { useState } from 'react';
import { RegimeMetrics, MarketRegime, Candle } from '../types/quant';
import { QuantitativeRegimeClassifier, RegimeConfusionMatrix } from '../engine/regimeClassifier';
import { AlertOctagon, TrendingUp, Shuffle, Activity, ChevronDown, ChevronUp } from 'lucide-react';

interface RegimeRadarProps {
  metrics: RegimeMetrics;
  candles: Candle[];
}

export const RegimeRadar: React.FC<RegimeRadarProps> = ({ metrics, candles }) => {
  const [showMatrix, setShowMatrix] = useState<boolean>(false);
  const confusionData: RegimeConfusionMatrix = React.useMemo(() => {
    return QuantitativeRegimeClassifier.backtestClassifier(candles);
  }, [candles]);

  const regimesConfig: {
    id: MarketRegime;
    title: string;
    icon: any;
    desc: string;
    assignedStrategy: string;
    sizingMultiplier: string;
    action: string;
  }[] = [
    {
      id: 'CALM_TREND',
      title: 'CALM TREND',
      icon: TrendingUp,
      desc: 'ADX >= 24, low-to-moderate realized vol (<58th pct), clear EMA stack.',
      assignedStrategy: 'Volume-Weighted Breakout',
      sizingMultiplier: '100% (1.0x Nominal)',
      action: 'Full Risk Allocation. Trail stop via ATR.',
    },
    {
      id: 'SIDEWAYS',
      title: 'SIDEWAYS',
      icon: Shuffle,
      desc: 'ADX < 24, low volatility, tight Bollinger bands, mean-reverting.',
      assignedStrategy: 'VWAP Reversion & Funding Carry',
      sizingMultiplier: '75% (0.75x Prudent)',
      action: 'Harvest funding carry & fade VWAP extremes.',
    },
    {
      id: 'JUMPY',
      title: 'JUMPY (HIGH VOL)',
      icon: Activity,
      desc: 'Realized vol >= 75th pct, erratic spikes, wide intraday spreads.',
      assignedStrategy: 'Selective Breakout with Wide Stops',
      sizingMultiplier: '35% (0.35x Defensive)',
      action: 'Severe position haircut, expand stop buffers.',
    },
    {
      id: 'CRASH',
      title: 'CRASH / PANIC',
      icon: AlertOctagon,
      desc: 'Drawdown velocity > 3.2% 1h or vol explosion + liquidation cascades.',
      assignedStrategy: 'None (Stay Flat / Risk-Off)',
      sizingMultiplier: '0% (Flat / Zero Risk)',
      action: 'MANDATORY DE-RISK. Flatten longs, cancel buy limits.',
    },
  ];

  return (
    <div className="bg-zinc-900/90 border border-zinc-800 rounded-xl p-5 font-mono text-zinc-100 shadow-xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-zinc-800">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-bold tracking-wide uppercase text-zinc-200">
              Regime Classification Engine
            </h2>
            <span className="text-xs text-zinc-500">· Multi-Factor Explainable Classifier</span>
          </div>
          <p className="text-xs text-zinc-400 mt-0.5">
            Real-time market state determines allowable strategy family and position multiplier.
          </p>
        </div>

        <button
          onClick={() => setShowMatrix(!showMatrix)}
          className="self-start sm:self-auto px-2.5 py-1 text-xs border border-zinc-700 bg-zinc-800/80 hover:bg-zinc-800 text-zinc-300 rounded flex items-center gap-1.5 transition-colors"
        >
          <span>Classifier Backtest & Error Rate</span>
          {showMatrix ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </button>
      </div>

      {/* 4 Quadrants */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 my-4">
        {regimesConfig.map(rc => {
          const isActive = metrics.currentRegime === rc.id;
          const Icon = rc.icon;

          return (
            <div
              key={rc.id}
              className={`p-3.5 rounded-lg border transition-all ${
                isActive
                  ? 'bg-zinc-800/90 border-emerald-500/80 shadow-lg shadow-emerald-950/20 ring-1 ring-emerald-500/50'
                  : 'bg-zinc-950/60 border-zinc-800/80 opacity-70 hover:opacity-90'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Icon className={`w-4 h-4 ${isActive ? 'text-emerald-400' : 'text-zinc-500'}`} />
                  <span className={`text-xs font-bold ${isActive ? 'text-emerald-300' : 'text-zinc-300'}`}>
                    {rc.title}
                  </span>
                </div>
                {isActive && (
                  <span className="text-[10px] uppercase font-bold px-1.5 py-0.2 rounded bg-emerald-950 text-emerald-400 border border-emerald-800/60">
                    Active
                  </span>
                )}
              </div>

              <p className="text-[11px] text-zinc-400 leading-tight mb-2.5 min-h-[28px]">
                {rc.desc}
              </p>

              <div className="pt-2 border-t border-zinc-800/60 space-y-1 text-[11px]">
                <div className="flex items-center justify-between text-zinc-400">
                  <span>Strategy:</span>
                  <span className="text-zinc-200 font-medium truncate max-w-[130px] text-right">
                    {rc.assignedStrategy}
                  </span>
                </div>
                <div className="flex items-center justify-between text-zinc-400">
                  <span>Sizing Multiplier:</span>
                  <span className={`font-semibold ${rc.id === 'CRASH' ? 'text-rose-400' : 'text-zinc-200'}`}>
                    {rc.sizingMultiplier}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Real-time Explainable Metrics Gauges */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 p-3 rounded-lg bg-zinc-950 border border-zinc-800 text-xs">
        <div>
          <div className="text-[10px] text-zinc-500 uppercase tracking-wider">Trend Strength (ADX 14)</div>
          <div className="text-base font-bold text-zinc-200 mt-0.5 flex items-baseline gap-1.5">
            <span>{metrics.adx14.toFixed(1)}</span>
            <span className="text-[11px] font-normal text-zinc-500">
              {metrics.adx14 >= 24 ? '(Trending >= 24)' : '(Choppy < 24)'}
            </span>
          </div>
          <div className="w-full bg-zinc-800 h-1.5 rounded-full mt-1.5 overflow-hidden">
            <div
              className={`h-full ${metrics.adx14 >= 24 ? 'bg-emerald-400' : 'bg-sky-400'}`}
              style={{ width: `${Math.min(100, (metrics.adx14 / 50) * 100)}%` }}
            />
          </div>
        </div>

        <div>
          <div className="text-[10px] text-zinc-500 uppercase tracking-wider">Realized Volatility</div>
          <div className="text-base font-bold text-zinc-200 mt-0.5 flex items-baseline gap-1.5">
            <span>{metrics.annualizedVolPct.toFixed(1)}%</span>
            <span className="text-[11px] font-normal text-zinc-500">({metrics.realizedVolPercentile}th pct)</span>
          </div>
          <div className="w-full bg-zinc-800 h-1.5 rounded-full mt-1.5 overflow-hidden">
            <div
              className={`h-full ${
                metrics.realizedVolPercentile > 75
                  ? 'bg-rose-500'
                  : metrics.realizedVolPercentile > 50
                  ? 'bg-amber-400'
                  : 'bg-emerald-400'
              }`}
              style={{ width: `${metrics.realizedVolPercentile}%` }}
            />
          </div>
        </div>

        <div>
          <div className="text-[10px] text-zinc-500 uppercase tracking-wider">Volume Anomaly (Z-Score)</div>
          <div className="text-base font-bold text-zinc-200 mt-0.5 flex items-baseline gap-1.5">
            <span>{metrics.volumeZScore >= 0 ? `+${metrics.volumeZScore}` : metrics.volumeZScore}σ</span>
            <span className="text-[11px] font-normal text-zinc-500">vs 20H MA</span>
          </div>
          <div className="w-full bg-zinc-800 h-1.5 rounded-full mt-1.5 overflow-hidden">
            <div
              className={`h-full ${Math.abs(metrics.volumeZScore) > 2 ? 'bg-amber-400' : 'bg-zinc-400'}`}
              style={{ width: `${Math.min(100, Math.max(10, ((metrics.volumeZScore + 2) / 5) * 100))}%` }}
            />
          </div>
        </div>

        <div>
          <div className="text-[10px] text-zinc-500 uppercase tracking-wider">1H Drawdown Velocity</div>
          <div className="text-base font-bold text-zinc-200 mt-0.5 flex items-baseline gap-1.5">
            <span className={metrics.drawdownVelocityPct1h < -2 ? 'text-rose-400' : 'text-zinc-200'}>
              {metrics.drawdownVelocityPct1h.toFixed(2)}%
            </span>
            <span className="text-[11px] font-normal text-zinc-500">
              {metrics.drawdownVelocityPct1h < -3.2 ? 'CRASH VELOCITY' : 'NORMAL'}
            </span>
          </div>
          <div className="w-full bg-zinc-800 h-1.5 rounded-full mt-1.5 overflow-hidden">
            <div
              className={`h-full ${metrics.drawdownVelocityPct1h < -3.2 ? 'bg-rose-500' : 'bg-emerald-400'}`}
              style={{ width: `${Math.min(100, Math.abs(metrics.drawdownVelocityPct1h) * 20)}%` }}
            />
          </div>
        </div>
      </div>

      {/* Current Diagnostic Explanation */}
      <div className="mt-3 text-xs bg-zinc-950/60 p-2.5 rounded border border-zinc-800/80 text-zinc-300 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-emerald-400 font-bold">Classifier Output:</span>
          <span>{metrics.explanation}</span>
        </div>
        <div className="text-zinc-400 text-[11px] font-mono">
          Confidence: {(metrics.confidence * 100).toFixed(0)}%
        </div>
      </div>

      {/* Historical Backtest & Confusion Matrix (Collapsible) */}
      {showMatrix && (
        <div className="mt-4 pt-4 border-t border-zinc-800">
          <div className="flex items-center justify-between mb-3">
            <div>
              <span className="text-xs font-bold text-zinc-200">Historical Classification Backtest Report</span>
              <p className="text-[11px] text-zinc-500">
                Tested against 200+ out-of-sample bars with forward 4-hour ground-truth realization.
              </p>
            </div>
            <div className="flex items-center gap-4 text-xs">
              <div>
                <span className="text-zinc-500">Overall Accuracy: </span>
                <span className="text-emerald-400 font-bold">{confusionData.overallAccuracyPct}%</span>
              </div>
              <div>
                <span className="text-zinc-500">Error Rate: </span>
                <span className="text-rose-400 font-bold">{confusionData.errorRatePct}%</span>
              </div>
              <div>
                <span className="text-zinc-500">Crash Recall: </span>
                <span className="text-sky-400 font-bold">{confusionData.crashDetectionRecallPct}%</span>
              </div>
              <div>
                <span className="text-zinc-500">False Trend Rate: </span>
                <span className="text-amber-400 font-bold">{confusionData.falseTrendRatePct}%</span>
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left text-zinc-300">
              <thead className="bg-zinc-950 text-zinc-500 uppercase text-[10px]">
                <tr>
                  <th className="py-2 px-3">Actual Market State</th>
                  <th className="py-2 px-3">Predicted CALM_TREND</th>
                  <th className="py-2 px-3">Predicted SIDEWAYS</th>
                  <th className="py-2 px-3">Predicted JUMPY</th>
                  <th className="py-2 px-3">Predicted CRASH</th>
                  <th className="py-2 px-3">Misclassification Risk</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60 font-mono text-[11px]">
                {['CALM_TREND', 'SIDEWAYS', 'JUMPY', 'CRASH'].map(actual => {
                  const getCount = (pred: string) =>
                    confusionData.matrix.find(m => m.actual === actual && m.predicted === pred)?.count || 0;

                  const cTrend = getCount('CALM_TREND');
                  const cSide = getCount('SIDEWAYS');
                  const cJumpy = getCount('JUMPY');
                  const cCrash = getCount('CRASH');
                  const total = cTrend + cSide + cJumpy + cCrash || 1;

                  return (
                    <tr key={actual} className="hover:bg-zinc-800/40">
                      <td className="py-2 px-3 font-semibold text-zinc-200">{actual}</td>
                      <td className={`py-2 px-3 ${actual === 'CALM_TREND' ? 'text-emerald-400 font-bold' : 'text-zinc-400'}`}>
                        {cTrend} ({Math.round((cTrend / total) * 100)}%)
                      </td>
                      <td className={`py-2 px-3 ${actual === 'SIDEWAYS' ? 'text-emerald-400 font-bold' : 'text-zinc-400'}`}>
                        {cSide} ({Math.round((cSide / total) * 100)}%)
                      </td>
                      <td className={`py-2 px-3 ${actual === 'JUMPY' ? 'text-emerald-400 font-bold' : 'text-zinc-400'}`}>
                        {cJumpy} ({Math.round((cJumpy / total) * 100)}%)
                      </td>
                      <td className={`py-2 px-3 ${actual === 'CRASH' ? 'text-emerald-400 font-bold' : 'text-zinc-400'}`}>
                        {cCrash} ({Math.round((cCrash / total) * 100)}%)
                      </td>
                      <td className="py-2 px-3 text-zinc-400 text-[10px]">
                        {actual === 'CRASH' && cCrash / total < 0.9
                          ? 'Severe: Late crash detection risk'
                          : actual === 'SIDEWAYS' && cTrend / total > 0.1
                          ? 'Whipsaw risk in chop'
                          : 'Within acceptable boundary'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

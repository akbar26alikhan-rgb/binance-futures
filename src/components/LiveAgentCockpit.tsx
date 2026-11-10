import React, { useState } from 'react';
import { Position, Order, AuditLogEntry, Candle, RegimeMetrics } from '../types/quant';
import { Terminal, Shield, ArrowUpRight, ArrowDownRight, AlertTriangle, Layers, Clock, CheckCircle } from 'lucide-react';
import { calculateVWAP } from '../data/marketData';

interface LiveAgentCockpitProps {
  candles: Candle[];
  positions: Position[];
  orders: Order[];
  auditLogs: AuditLogEntry[];
  regimeMetrics: RegimeMetrics;
  onFlattenPosition: (positionId: string) => void;
  onFlattenAll: () => void;
}

export const LiveAgentCockpit: React.FC<LiveAgentCockpitProps> = ({
  candles,
  positions,
  orders,
  auditLogs,
  regimeMetrics,
  onFlattenPosition,
  onFlattenAll,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'positions' | 'orders' | 'audit'>('positions');

  const currentBar = candles[candles.length - 1];
  const vwap = calculateVWAP(candles, 36);

  return (
    <div className="bg-zinc-900/90 border border-zinc-800 rounded-xl p-5 font-mono text-zinc-100 shadow-xl">
      {/* Cockpit Top Bar */}
      <div className="pb-4 border-b border-zinc-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-bold tracking-wide uppercase text-zinc-200">
              Autonomous Execution Engine
            </h2>
            <span className="text-xs text-zinc-500">· Fail-Closed Microstructure Loop</span>
          </div>
          <p className="text-xs text-zinc-400 mt-0.5">
            Plain-code orders execute under fractional Kelly limits. All decisions logged to immutable audit trail.
          </p>
        </div>

        {/* Microstructure Bar */}
        <div className="flex items-center gap-3 bg-zinc-950 px-3 py-1.5 rounded-lg border border-zinc-800 text-xs">
          <div>
            <span className="text-[10px] text-zinc-500 uppercase">BTC Mark</span>
            <div className="font-bold text-zinc-100">
              ${currentBar ? currentBar.close.toLocaleString() : '89,450'}
            </div>
          </div>
          <div className="h-6 w-px bg-zinc-800" />
          <div>
            <span className="text-[10px] text-zinc-500 uppercase">Session VWAP</span>
            <div className="text-zinc-300">
              ${vwap.vwap.toFixed(0)}
            </div>
          </div>
          <div className="h-6 w-px bg-zinc-800" />
          <div>
            <span className="text-[10px] text-zinc-500 uppercase">Open Positions</span>
            <div className="font-semibold text-emerald-400">
              {positions.length} active
            </div>
          </div>
        </div>
      </div>

      {/* Mini Visual Chart Strip (Last 30 Bars) */}
      <div className="my-4 p-3 bg-zinc-950 border border-zinc-800 rounded-lg">
        <div className="flex items-center justify-between text-xs text-zinc-400 mb-2">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold text-zinc-300">1H PRICE TICK REPLAY</span>
            <span className="text-[10px] text-zinc-500">· Last 40 Bars</span>
          </div>
          <div className="flex items-center gap-3 text-[11px]">
            <span className="flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-emerald-400" />
              <span>Donchian Upper: ${(vwap.vwap * 1.018).toFixed(0)}</span>
            </span>
            <span className="flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-sky-400" />
              <span>VWAP: ${vwap.vwap.toFixed(0)}</span>
            </span>
          </div>
        </div>

        {/* CSS Sparkline Candles */}
        <div className="h-24 flex items-end gap-1 pt-2 overflow-x-auto">
          {candles.slice(-40).map((c, idx) => {
            const isUp = c.close >= c.open;
            const slice40 = candles.slice(-40);
            const minP = Math.min(...slice40.map(x => x.low));
            const maxP = Math.max(...slice40.map(x => x.high));
            const range = maxP - minP || 1;

            const bottomPct = ((c.low - minP) / range) * 100;
            const heightPct = Math.max(8, ((c.high - c.low) / range) * 100);

            return (
              <div
                key={idx}
                className="flex-1 flex flex-col justify-end items-center group relative min-w-[6px]"
                style={{ height: '100%' }}
              >
                <div
                  className={`w-full rounded-sm transition-all ${
                    isUp ? 'bg-emerald-500/80 hover:bg-emerald-400' : 'bg-rose-500/80 hover:bg-rose-400'
                  }`}
                  style={{
                    height: `${heightPct}%`,
                    marginBottom: `${bottomPct}%`,
                  }}
                />
                {/* Tooltip */}
                <div className="absolute bottom-full mb-1 hidden group-hover:flex flex-col bg-zinc-900 border border-zinc-700 text-[10px] p-1.5 rounded z-30 shadow-lg whitespace-nowrap text-zinc-200">
                  <span>C: ${c.close.toLocaleString()}</span>
                  <span>Vol: {c.volume.toLocaleString()}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Sub Tabs: Open Positions | Order Stream | Decision Audit Log */}
      <div className="flex items-center justify-between border-b border-zinc-800 pb-2 mb-3">
        <div className="flex items-center gap-1 bg-zinc-950 p-0.5 rounded border border-zinc-800 text-xs">
          <button
            onClick={() => setActiveSubTab('positions')}
            className={`px-3 py-1 rounded transition-colors ${
              activeSubTab === 'positions'
                ? 'bg-zinc-800 text-zinc-100 font-semibold'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            Active Positions ({positions.length})
          </button>
          <button
            onClick={() => setActiveSubTab('orders')}
            className={`px-3 py-1 rounded transition-colors ${
              activeSubTab === 'orders'
                ? 'bg-zinc-800 text-zinc-100 font-semibold'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            Recent Orders ({orders.length})
          </button>
          <button
            onClick={() => setActiveSubTab('audit')}
            className={`px-3 py-1 rounded transition-colors ${
              activeSubTab === 'audit'
                ? 'bg-zinc-800 text-zinc-100 font-semibold'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            Decision Audit Trail ({auditLogs.length})
          </button>
        </div>

        {positions.length > 0 && activeSubTab === 'positions' && (
          <button
            onClick={onFlattenAll}
            className="px-2.5 py-1 text-xs text-rose-400 hover:text-rose-300 border border-rose-900 bg-rose-950/40 rounded hover:bg-rose-950"
          >
            Flatten All Positions
          </button>
        )}
      </div>

      {/* SubTab 1: Positions */}
      {activeSubTab === 'positions' && (
        <div className="overflow-x-auto">
          {positions.length === 0 ? (
            <div className="text-center py-10 text-zinc-500 text-xs bg-zinc-950/40 rounded-lg border border-zinc-800/60">
              <Layers className="w-6 h-6 mx-auto mb-2 text-zinc-600 opacity-60" />
              <span>No open positions. Agent scanning for validated setups under active regime.</span>
            </div>
          ) : (
            <table className="w-full text-xs text-left">
              <thead className="bg-zinc-950 text-zinc-500 uppercase text-[10px]">
                <tr>
                  <th className="py-2 px-3">Symbol / Strategy</th>
                  <th className="py-2 px-3">Side</th>
                  <th className="py-2 px-3 text-right">Size</th>
                  <th className="py-2 px-3 text-right">Entry Price</th>
                  <th className="py-2 px-3 text-right">Mark Price</th>
                  <th className="py-2 px-3 text-right">Stop Loss</th>
                  <th className="py-2 px-3 text-right">Unrealized PnL</th>
                  <th className="py-2 px-3 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800 text-[11px]">
                {positions.map(p => {
                  const isProfit = p.unrealizedPnLUsd >= 0;

                  return (
                    <tr key={p.id} className="hover:bg-zinc-800/40">
                      <td className="py-2.5 px-3">
                        <div className="font-bold text-zinc-200">{p.symbol}</div>
                        <div className="text-[10px] text-zinc-500">{p.strategyId}</div>
                      </td>

                      <td className="py-2.5 px-3">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          p.side === 'LONG'
                            ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                            : 'bg-rose-950 text-rose-400 border border-rose-800'
                        }`}>
                          {p.side}
                        </span>
                      </td>

                      <td className="py-2.5 px-3 text-right text-zinc-200">
                        {p.size.toFixed(3)} BTC
                        <div className="text-[10px] text-zinc-500">${p.notionalUsd.toLocaleString()}</div>
                      </td>

                      <td className="py-2.5 px-3 text-right text-zinc-300">
                        ${p.entryPrice.toLocaleString()}
                      </td>

                      <td className="py-2.5 px-3 text-right text-zinc-200 font-bold">
                        ${p.currentPrice.toLocaleString()}
                      </td>

                      <td className="py-2.5 px-3 text-right text-rose-400">
                        ${p.stopLossPrice.toLocaleString()}
                      </td>

                      <td className="py-2.5 px-3 text-right font-bold">
                        <span className={isProfit ? 'text-emerald-400' : 'text-rose-400'}>
                          {isProfit ? '+' : ''}${p.unrealizedPnLUsd.toFixed(2)}
                        </span>
                        <div className={`text-[10px] ${isProfit ? 'text-emerald-500' : 'text-rose-500'}`}>
                          ({isProfit ? '+' : ''}{p.unrealizedPnLPct.toFixed(2)}%)
                        </div>
                      </td>

                      <td className="py-2.5 px-3 text-center">
                        <button
                          onClick={() => onFlattenPosition(p.id)}
                          className="px-2 py-0.5 text-[10px] text-zinc-400 hover:text-zinc-200 border border-zinc-700 rounded hover:bg-zinc-800"
                        >
                          Flatten
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* SubTab 2: Orders Stream */}
      {activeSubTab === 'orders' && (
        <div className="overflow-x-auto">
          {orders.length === 0 ? (
            <div className="text-center py-10 text-zinc-500 text-xs bg-zinc-950/40 rounded-lg">
              <span>No orders executed in this session.</span>
            </div>
          ) : (
            <table className="w-full text-xs text-left">
              <thead className="bg-zinc-950 text-zinc-500 uppercase text-[10px]">
                <tr>
                  <th className="py-2 px-3">Time</th>
                  <th className="py-2 px-3">Side / Type</th>
                  <th className="py-2 px-3 text-right">Size</th>
                  <th className="py-2 px-3 text-right">Fill Price</th>
                  <th className="py-2 px-3 text-right">Slippage</th>
                  <th className="py-2 px-3 text-right">Fee Paid</th>
                  <th className="py-2 px-3">Audit / Trigger</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800 text-[11px]">
                {orders.map(o => (
                  <tr key={o.id} className="hover:bg-zinc-800/40">
                    <td className="py-2 px-3 text-zinc-400 whitespace-nowrap">
                      {new Date(o.timestamp).toLocaleTimeString()}
                    </td>

                    <td className="py-2 px-3">
                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                        o.side === 'BUY' ? 'text-emerald-400 bg-emerald-950/60' : 'text-rose-400 bg-rose-950/60'
                      }`}>
                        {o.side} {o.type}
                      </span>
                    </td>

                    <td className="py-2 px-3 text-right text-zinc-300">
                      {o.size.toFixed(3)} BTC
                    </td>

                    <td className="py-2 px-3 text-right text-zinc-200 font-bold">
                      ${o.fillPrice.toLocaleString()}
                    </td>

                    <td className="py-2 px-3 text-right text-amber-400">
                      {o.slippageBps.toFixed(1)} bps
                    </td>

                    <td className="py-2 px-3 text-right text-zinc-400">
                      ${o.feePaidUsd.toFixed(2)}
                    </td>

                    <td className="py-2 px-3 text-zinc-400 text-[10px] max-w-xs truncate">
                      {o.auditReason}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* SubTab 3: Immutable Audit Trail */}
      {activeSubTab === 'audit' && (
        <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
          {auditLogs.map(l => {
            const statusColor = {
              PASS: 'text-emerald-400 border-emerald-900 bg-emerald-950/40',
              WARN: 'text-amber-400 border-amber-900 bg-amber-950/40',
              HALT: 'text-rose-400 border-rose-900 bg-rose-950/60 animate-pulse',
              FAIL: 'text-rose-400 border-rose-900 bg-rose-950/40',
              INFO: 'text-sky-400 border-sky-900 bg-sky-950/40',
            }[l.status];

            return (
              <div
                key={l.id}
                className="p-2.5 rounded bg-zinc-950 border border-zinc-800 text-xs flex items-start justify-between gap-3 font-mono"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className={`text-[9px] uppercase font-bold px-1.5 py-0.2 rounded border ${statusColor}`}>
                      {l.status}
                    </span>
                    <span className="text-zinc-500 text-[10px]">
                      [{l.category}] {new Date(l.timestamp).toLocaleTimeString()}
                    </span>
                    <span className="text-zinc-200 font-medium">{l.title}</span>
                  </div>
                  <div className="text-zinc-400 text-[11px] pl-1 font-sans">
                    {JSON.stringify(l.details)}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

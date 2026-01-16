"use client";

import React, { useState, useEffect } from 'react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { useCryptoSocket } from '@/hooks/useCryptoSocket';

interface DataPoint {
    time: string;
    price: number;
}

interface CandleChartProps {
    symbol: string;
    interval: string;
    limit: number;
}

export function CandleChart({ symbol, interval, limit }: CandleChartProps) {
    const { candles, isConnected, error } = useCryptoSocket(symbol.toLowerCase(), interval, limit);

    // Chart is already receiving real candles from the hook now
    const data = candles.map(c => ({
        ...c,
        timeStr: new Date(c.time).toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
            hour12: false
        })
    }));

    const lastPrice = data.length > 0 ? data[data.length - 1].close : 0;
    const startPrice = data.length > 0 ? data[0].close : 0;
    const isUp = lastPrice >= startPrice;
    const color = isUp ? '#10B981' : '#EF4444';

    return (
        <div className="w-full h-full min-h-[450px]">
            {data.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={data}>
                        <defs>
                            <linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor={color} stopOpacity={0.3} />
                                <stop offset="95%" stopColor={color} stopOpacity={0} />
                            </linearGradient>
                        </defs>
                        <XAxis
                            dataKey="timeStr"
                            hide={false}
                            axisLine={false}
                            tickLine={false}
                            tick={{ fill: '#6B7280', fontSize: 10 }}
                            minTickGap={30}
                            interval="preserveStartEnd"
                        />
                        <YAxis
                            domain={['auto', 'auto']}
                            orientation="right"
                            tick={{ fill: '#6B7280', fontSize: 12 }}
                            axisLine={false}
                            tickLine={false}
                            width={80}
                            tickFormatter={(val) => `$${val.toFixed(2)}`}
                            padding={{ top: 20, bottom: 20 }}
                        />
                        <Tooltip
                            contentStyle={{ backgroundColor: '#111827', borderColor: '#374151' }}
                            itemStyle={{ color: color }}
                            labelStyle={{ color: '#9CA3AF' }}
                            formatter={(value: any) => [`$${(Number(value) || 0).toFixed(2)}`, 'Price']}
                        />
                        <Area
                            type="monotone"
                            dataKey="close"
                            stroke={color}
                            strokeWidth={2}
                            fillOpacity={1}
                            fill="url(#colorPrice)"
                            isAnimationActive={false}
                        />
                    </AreaChart>
                </ResponsiveContainer>
            ) : (
                <div className="h-full flex flex-col items-center justify-center text-muted-foreground animate-pulse gap-2">
                    {error ? (
                        <div className="text-red-400 bg-red-400/10 px-4 py-2 rounded-lg border border-red-400/20 text-center max-w-[80%]">
                            <span className="block font-bold">Data Error</span>
                            <span className="text-xs">{error}</span>
                            <span className="block text-xs mt-2 text-muted-foreground">Try refreshing or check console</span>
                        </div>
                    ) : (
                        <>
                            <span className="loading loading-spinner text-primary"></span>
                            <span>{isConnected ? "Loading market data..." : "Connecting to exchange..."}</span>
                        </>
                    )}
                </div>
            )}
        </div>
    );
}

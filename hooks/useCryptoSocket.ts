"use client";

import { useEffect, useRef, useState } from 'react';

// Types for Binance Trade Stream
interface TradeData {
    e: string; // Event type
    s: string; // Symbol
    p: string; // Price
}

// Types for Candlestick (K-Line) Stream
interface KlineData {
    e: string; // Event type
    k: {
        t: number; // Open time
        o: string; // Open price
        c: string; // Close price
        h: string; // High price
        l: string; // Low price
        v: string; // Volume
        x: boolean; // Is this kline closed?
    }
}

// Types for our internal state
export interface TickerData {
    price: string;
    prevPrice: string;
    time: number;
}

export interface CandleData {
    time: number;
    open: number;
    high: number;
    low: number;
    close: number;
}

export const useCryptoSocket = (symbol: string = 'btcusdt', interval: string = '5m', limit: number = 288) => {
    const [ticker, setTicker] = useState<TickerData | null>(null);
    const [candles, setCandles] = useState<CandleData[]>([]);
    const [isConnected, setIsConnected] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const socketRef = useRef<WebSocket | null>(null);

    // Reset candles when interval changes
    useEffect(() => {
        setCandles([]);
    }, [interval]);

    useEffect(() => {
        // Fetch initial historical data so chart isn't empty
        const fetchHistory = async () => {
            try {
                console.log(`Fetching history for ${symbol} ${interval}`);
                // Use local proxy to avoid CORS issues
                const res = await fetch(`/api/proxy?symbol=${symbol}&interval=${interval}&limit=${limit}`);
                if (!res.ok) {
                    const text = await res.text();
                    throw new Error(`Proxy fetch failed: ${res.status} ${text}`);
                }

                const data = await res.json();
                console.log("History data received:", data.length);

                if (!Array.isArray(data)) {
                    throw new Error("Invalid data format received");
                }

                // Data format: [ [time, open, high, low, close, volume, ...], ... ]
                const history: CandleData[] = data.map((d: any) => ({
                    time: d[0],
                    open: parseFloat(d[1]),
                    high: parseFloat(d[2]),
                    low: parseFloat(d[3]),
                    close: parseFloat(d[4]),
                }));

                // Only set if we got valid data
                if (history.length > 0) {
                    setCandles(history);
                    setError(null);
                }
            } catch (e: any) {
                console.error("Failed to fetch history:", e);
                setError(e.message || "Failed to load chart data");
            }
        };

        fetchHistory();

        // Connect to Binance Public Stream
        // We want both trade (for price) and kline (for chart)
        // Stream Names: <symbol>@trade / <symbol>@kline_<interval>
        const streams = [`${symbol}@trade`, `${symbol}@kline_${interval}`].join('/');
        const ws = new WebSocket(`wss://stream.binance.com/stream?streams=${streams}`);

        socketRef.current = ws;

        ws.onopen = () => {
            console.log('Connected to Binance WebSocket');
            setIsConnected(true);
        };

        ws.onmessage = (event) => {
            const message = JSON.parse(event.data);
            if (!message.data) return; // invalid format

            const data = message.data; // Wrapper from combined stream

            if (data.e === 'trade') {
                setTicker(prev => ({
                    price: data.p,
                    prevPrice: prev?.price || data.p,
                    time: Number(message.data.E) || Date.now(), // Use event time if available
                }));
            } else if (data.e === 'kline') {
                const k = data.k;
                const candle: CandleData = {
                    time: k.t,
                    open: parseFloat(k.o),
                    high: parseFloat(k.h),
                    low: parseFloat(k.l),
                    close: parseFloat(k.c),
                };

                // Update candles state
                setCandles(prev => {
                    const lastCandle = prev[prev.length - 1];
                    // If same candle (same time), update it. Else append.
                    if (lastCandle && lastCandle.time === candle.time) {
                        return [...prev.slice(0, -1), candle];
                    } else {
                        // Keep roughly the limit + buffer
                        const maxCandles = limit + 10;
                        return [...prev.slice(-maxCandles), candle];
                    }
                });
            }
        };

        ws.onclose = () => {
            console.log('Disconnected from Binance WebSocket');
            setIsConnected(false);
        };

        ws.onerror = (evt) => {
            console.error("WebSocket Error:", evt);
        }

        return () => {
            console.log('Cleaning up WebSocket for', symbol);
            ws.close();
            setIsConnected(false);
        };
    }, [symbol, interval, limit]);

    return { ticker, candles, isConnected, error };
};

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

        // Use Coinbase WebSocket (Reliable, Global)
        const ws = new WebSocket('wss://ws-feed.exchange.coinbase.com');

        // Map symbol to Coinbase Product ID (e.g. BTCUSDT -> BTC-USD)
        const productId = symbol.toUpperCase().replace('USDT', '-USD').replace('BUSD', '-USD');

        socketRef.current = ws;

        ws.onopen = () => {
            console.log('Connected to Coinbase WebSocket for', productId);
            setIsConnected(true);

            const msg = {
                type: "subscribe",
                product_ids: [productId],
                channels: ["ticker"]
            };
            ws.send(JSON.stringify(msg));
        };

        ws.onmessage = (event) => {
            const data = JSON.parse(event.data);

            if (data.type === 'ticker' && data.product_id === productId) {
                // Parse Ticker Data
                setTicker(prev => ({
                    price: data.price,
                    prevPrice: prev?.price || data.price,
                    time: new Date(data.time).getTime(),
                }));

                // Note: Coinbase WebSocket doesn't stream candles (klines) on public feed easily.
                // We rely on the initial history fetch (via route.ts) for the chart.
                // The live price ticker will update the UI, but the chart won't "tick" live candles 
                // until the next history poll/refresh. This is a trade-off for reliability on Vercel.
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

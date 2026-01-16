"use client";

import { useEffect, useState } from 'react';
import { ArrowUp, ArrowDown } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CoinData {
    symbol: string;
    name: string;
    price: string;
    change24h: string;
}

// Map to Coinbase Product IDs
const COINS = [
    { id: 'BTC-USD', symbol: 'BTCUSDT', name: 'Bitcoin' },
    { id: 'ETH-USD', symbol: 'ETHUSDT', name: 'Ethereum' },
    { id: 'BNB-USD', symbol: 'BNBUSDT', name: 'BNB' }, // Coinbase lists BNB-USD on API
    { id: 'XRP-USD', symbol: 'XRPUSDT', name: 'XRP' },
    { id: 'SOL-USD', symbol: 'SOLUSDT', name: 'Solana' },
    { id: 'ADA-USD', symbol: 'ADAUSDT', name: 'Cardano' },
    { id: 'DOGE-USD', symbol: 'DOGEUSDT', name: 'Dogecoin' },
    { id: 'AVAX-USD', symbol: 'AVAXUSDT', name: 'Avalanche' },
    { id: 'DOT-USD', symbol: 'DOTUSDT', name: 'Polkadot' },
];

interface TopCoinsProps {
    onSelectSymbol: (symbol: string) => void;
    activeSymbol: string;
}

export function TopCoins({ onSelectSymbol, activeSymbol }: TopCoinsProps) {
    const [marketData, setMarketData] = useState<Record<string, CoinData>>({});

    useEffect(() => {
        // 1. Initial Snapshot via REST API (Instant Data)
        const fetchSnapshot = async () => {
            try {
                // Fetch ticker for each coin in parallel
                const promises = COINS.map(async (coin) => {
                    const res = await fetch(`https://api.exchange.coinbase.com/products/${coin.id}/ticker`);
                    if (!res.ok) return null;
                    const data = await res.json();
                    return { ...data, symbol: coin.symbol, name: coin.name };
                });

                const results = await Promise.all(promises);

                const updates: Record<string, CoinData> = {};
                results.forEach((item: any) => {
                    if (item && item.price) {
                        const price = parseFloat(item.price);

                        updates[item.symbol] = {
                            symbol: item.symbol,
                            name: item.name,
                            price: price.toFixed(price < 1 ? 4 : 2),
                            change24h: "..." // Placeholder until WS comes in
                        };
                    }
                });
                setMarketData(prev => ({ ...prev, ...updates }));

                // Fetch stats for 24h change (Second pass)
                COINS.forEach(async (coin) => {
                    try {
                        const res = await fetch(`https://api.exchange.coinbase.com/products/${coin.id}/stats`);
                        if (res.ok) {
                            const stats = await res.json();
                            setMarketData(prev => {
                                const current = prev[coin.symbol];
                                if (!current) return prev;
                                const last = parseFloat(current.price);
                                const open = parseFloat(stats.open);
                                const change = ((last - open) / open * 100).toFixed(2);
                                return {
                                    ...prev,
                                    [coin.symbol]: { ...current, change24h: change }
                                };
                            });
                        }
                    } catch (e) { /* ignore */ }
                });

            } catch (e) {
                console.error("TopCoins REST fetch failed", e);
            }
        };

        fetchSnapshot();

        // 2. WebSocket for Live Updates
        const ws = new WebSocket('wss://ws-feed.exchange.coinbase.com');

        const subscribe = () => {
            if (ws.readyState === WebSocket.OPEN) {
                const subscribeMessage = {
                    type: "subscribe",
                    product_ids: COINS.map(c => c.id),
                    channels: ["ticker"]
                };
                ws.send(JSON.stringify(subscribeMessage));
            }
        };

        ws.onopen = () => {
            console.log("TopCoins: Connected to Coinbase WS");
            subscribe();
        };

        ws.onerror = (err: any) => {
            console.error("TopCoins: WebSocket Error", err);
        };

        ws.onmessage = (event) => {
            const data = JSON.parse(event.data);

            if (data.type === 'ticker' && data.product_id) {
                const coin = COINS.find(c => c.id === data.product_id);
                if (coin) {
                    const price = parseFloat(data.price);
                    const openPrice = parseFloat(data.open_24h || data.price);
                    const change = openPrice > 0
                        ? ((price - openPrice) / openPrice * 100).toFixed(2)
                        : "0.00";

                    setMarketData(prev => ({
                        ...prev,
                        [coin.symbol]: {
                            symbol: coin.symbol,
                            name: coin.name,
                            price: price.toFixed(price < 1 ? 4 : 2),
                            change24h: change
                        }
                    }));
                }
            }
        };

        return () => {
            ws.close();
        };
    }, []);

    return (
        <div className="flex flex-col gap-3 h-full overflow-y-auto pr-2 custom-scrollbar">
            <h3 className="text-muted-foreground font-medium sticky top-0 bg-[#1e293b]/90 backdrop-blur-sm py-2 z-10 border-b border-white/5">
                Popular Markets
            </h3>

            {COINS.map(coin => {
                const data = marketData[coin.symbol];
                const isUp = data ? parseFloat(data.change24h) >= 0 : true;
                const isActive = activeSymbol === coin.symbol;

                return (
                    <button
                        key={coin.symbol}
                        onClick={() => onSelectSymbol(coin.symbol)}
                        className={cn(
                            "flex items-center justify-between p-3 rounded-xl transition-all border w-full text-left",
                            isActive
                                ? "bg-indigo-500/20 border-indigo-500/50 hover:bg-indigo-500/30"
                                : "bg-white/5 hover:bg-white/10 border-white/5 group"
                        )}
                    >
                        <div className="flex flex-col">
                            <span className={cn(
                                "font-bold text-sm transition-colors",
                                isActive ? "text-indigo-400" : "text-white group-hover:text-indigo-400"
                            )}>
                                {coin.name}
                            </span>
                            <span className="text-xs text-muted-foreground">{coin.symbol.replace('USDT', '')}</span>
                        </div>

                        <div className="flex flex-col items-end">
                            <span className="font-mono text-sm font-medium">
                                {data ? `$${data.price}` : <span className="animate-pulse bg-white/10 h-4 w-16 rounded block" />}
                            </span>
                            {data && (
                                <span className={cn(
                                    "text-xs flex items-center",
                                    isUp ? "text-green-400" : "text-red-400"
                                )}>
                                    {isUp ? <ArrowUp className="w-3 h-3 mr-0.5" /> : <ArrowDown className="w-3 h-3 mr-0.5" />}
                                    {data.change24h}%
                                </span>
                            )}
                        </div>
                    </button>
                );
            })}
        </div>
    );
}

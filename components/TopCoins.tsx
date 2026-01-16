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

// Top 10 Coins to track
const COINS = [
    { symbol: 'BTCUSDT', name: 'Bitcoin' },
    { symbol: 'ETHUSDT', name: 'Ethereum' },
    { symbol: 'BNBUSDT', name: 'BNB' },
    { symbol: 'XRPUSDT', name: 'XRP' },
    { symbol: 'SOLUSDT', name: 'Solana' },
    { symbol: 'ADAUSDT', name: 'Cardano' },
    { symbol: 'DOGEUSDT', name: 'Dogecoin' },
    { symbol: 'AVAXUSDT', name: 'Avalanche' },
    { symbol: 'DOTUSDT', name: 'Polkadot' },
];

interface TopCoinsProps {
    onSelectSymbol: (symbol: string) => void;
    activeSymbol: string;
}

export function TopCoins({ onSelectSymbol, activeSymbol }: TopCoinsProps) {
    const [marketData, setMarketData] = useState<Record<string, CoinData>>({});

    useEffect(() => {
        // We can use the !miniTicker@arr stream for all markets, filtering client side
        // OR just fetch REST API periodically. 
        // For "Live" feel, let's try the WebSocket miniTicker stream for all symbols

        const ws = new WebSocket('wss://stream.binance.com/ws/!miniTicker@arr');

        ws.onmessage = (event) => {
            const data = JSON.parse(event.data);
            // data is an array of objects
            // { s: symbol, c: close price, o: open price, h: high, l: low, v: volume, q: quote volume }

            const updates: Record<string, CoinData> = {};

            data.forEach((item: any) => {
                const knownCoin = COINS.find(c => c.symbol === item.s);
                if (knownCoin) {
                    const price = parseFloat(item.c);
                    const openPrice = parseFloat(item.o); // 24h open roughly
                    const change = ((price - openPrice) / openPrice * 100).toFixed(2);

                    updates[item.s] = {
                        symbol: item.s,
                        name: knownCoin.name,
                        price: price.toFixed(price < 1 ? 4 : 2),
                        change24h: change
                    };
                }
            });

            setMarketData(prev => ({ ...prev, ...updates }));
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
